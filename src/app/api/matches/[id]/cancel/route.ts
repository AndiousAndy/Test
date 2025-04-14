import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const matchId = params.id;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Check if user is the host (player1)
    if (match.player1Id !== userId) {
      return NextResponse.json({ error: 'Only the host can cancel the match' }, { status: 403 });
    }

    // Check if an opponent has joined
    if (match.player2Id) {
      return NextResponse.json({ error: 'Cannot cancel a match with an opponent' }, { status: 400 });
    }
    
    // Check if match status is OPEN (implicitly means no opponent)
    if (match.status !== 'OPEN') {
        return NextResponse.json({ error: 'Match cannot be cancelled in its current state' }, { status: 400 });
    }

    // Check if the match is scheduled for the future
    if (new Date() >= match.scheduledFor) {
      return NextResponse.json({ error: 'Cannot cancel a match that has already started or passed its scheduled time' }, { status: 400 });
    }

    // Perform cancellation: Refund entry fee and delete match
    await prisma.$transaction([
      // Refund entry fee to player1
      prisma.user.update({
        where: { id: userId },
        data: {
          credits: {
            increment: match.entryFee.toNumber(),
          },
        },
      }),
      // Delete the match
      prisma.match.delete({
        where: { id: matchId },
      }),
    ]);

    return NextResponse.json({ message: 'Match cancelled successfully' });

  } catch (error) {
    console.error('Error cancelling match:', error);
    return NextResponse.json({ error: 'Failed to cancel match' }, { status: 500 });
  }
}
