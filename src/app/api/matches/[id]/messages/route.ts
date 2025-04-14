import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusherServer'; // Import Pusher server instance

// GET /api/matches/[id]/messages - Fetch messages for a match
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = params.id;
    const messages = await prisma.message.findMany({
      where: { matchId },
      include: {
        user: { select: { username: true } }, // Include username
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/matches/[id]/messages - Send a message in a match
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'You must be logged in to send messages' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const matchId = params.id;
    const { content } = await request.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content cannot be empty' },
        { status: 400 }
      );
    }

    // Check if user is part of the match OR an admin
    const isAdmin = (session.user as any).isAdmin || false;
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { player1Id: true, player2Id: true }
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Allow sending if user is player 1, player 2, or an admin
    if (!isAdmin && match.player1Id !== userId && match.player2Id !== userId) {
      return NextResponse.json(
        { error: 'You are not authorized to send messages in this match' },
        { status: 403 }
      );
    }

    const newMessage = await prisma.message.create({
      data: {
        content: content.trim(),
        userId,
        matchId,
        type: 'USER',
        isSystem: false, // Explicitly set to false for user messages
      },
      include: {
        user: { select: { username: true, id: true } }, // Include username AND id
      },
    });

    // Broadcast message via Pusher
    try {
      if (pusherServer) {
        await pusherServer.trigger(
          `private-match-${matchId}`, // Channel name
          'new-message',            // Event name
          newMessage                // Data to send
        );
        console.log(`[Pusher Trigger] Sent message ${newMessage.id} to channel private-match-${matchId}`);
      } else {
        console.warn('[Pusher] Message not broadcast - Pusher not initialized');
      }
    } catch (pusherError) {
      console.error('[Pusher Trigger Error] Failed to trigger Pusher event:', pusherError);
      // Don't fail the whole request if Pusher fails, but log it
    }

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
