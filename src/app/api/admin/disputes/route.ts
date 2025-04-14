import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { MATCH_STATUS } from '@/lib/matchStatus';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) { // Check for admin status
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const disputedMatches = await prisma.match.findMany({
      where: {
        status: MATCH_STATUS.DISPUTED,
      },
      include: {
        player1: {
          select: {
            id: true,
            username: true,
          },
        },
        player2: {
          select: {
            id: true,
            username: true,
          },
        },
        messages: { // Include messages for the chat
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            user: {
              select: { username: true, id: true }
            }
          }
        },
      },
      orderBy: {
        updatedAt: 'desc', // Show most recently disputed first
      },
    });

    return NextResponse.json(disputedMatches);
  } catch (error) {
    console.error('ADMIN_GET_DISPUTES_ERROR:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
