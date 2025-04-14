import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, Session } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';
import { pusherServer } from '@/lib/pusherServer';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  if (!pusherServer) {
    console.warn('[Pusher Auth] Pusher not initialized');
    return new NextResponse('Pusher not initialized', { status: 503 });
  }

  const session = await getServerSession(authOptions) as Session | null;

  if (!session?.user?.id) {
    return new NextResponse('Unauthorized: No session found', { status: 401 });
  }

  const userId = session.user.id;
  const isAdmin = (session.user as any).isAdmin || false;

  const body = await req.formData();
  const socketId = body.get('socket_id') as string;
  const channel = body.get('channel_name') as string;

  if (!socketId || !channel) {
    return new NextResponse('Bad Request: Missing socket_id or channel_name', { status: 400 });
  }

  // Expecting channel format: private-match-<matchId>
  const matchId = channel.startsWith('private-match-') ? channel.substring('private-match-'.length) : null;

  if (!matchId) {
    console.warn(`[Pusher Auth] Invalid channel format: ${channel}`);
    return new NextResponse('Forbidden: Invalid channel format', { status: 403 });
  }

  try {
    let isAuthorized = false;

    // Admins are always authorized for match channels
    if (isAdmin) {
      isAuthorized = true;
      console.log(`[Pusher Auth] Admin ${userId} authorized for channel ${channel}`);
    } else {
      // Check if the user is a participant in the match
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: { player1Id: true, player2Id: true },
      });

      if (match && (match.player1Id === userId || match.player2Id === userId)) {
        isAuthorized = true;
        console.log(`[Pusher Auth] User ${userId} authorized for channel ${channel}`);
      } else {
        console.warn(`[Pusher Auth] User ${userId} NOT authorized for channel ${channel}`);
      }
    }

    if (!isAuthorized) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Prepare presence data (optional, can be empty for non-presence channels)
    const userData = {
      user_id: userId,
      user_info: {
        username: session.user.username || session.user.name, // Include username if available
        isAdmin: isAdmin,
      },
    };

    // Authorize the subscription
    const authResponse = pusherServer.authorizeChannel(socketId, channel, userData);
    return NextResponse.json(authResponse);

  } catch (error) {
    console.error('[Pusher Auth] Error authorizing channel:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
