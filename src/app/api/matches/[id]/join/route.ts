import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { MATCH_STATUS } from '@/lib/matchStatus';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'You must be logged in to join a match' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const matchId = params.id;

    // Get the match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        player1: true,
        player2: true,
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    // Check if the user is already the host
    if (match.player1Id === userId) {
      return NextResponse.json(
        { error: 'You cannot join your own match' },
        { status: 400 }
      );
    }

    // Check if the match already has a player2
    if (match.player2Id) {
      return NextResponse.json(
        { error: 'This match already has an opponent' },
        { status: 400 }
      );
    }

    // Check if the match is in a joinable state
    if (match.status !== MATCH_STATUS.OPEN && match.status !== MATCH_STATUS.WAITING_OPPONENT) {
      return NextResponse.json(
        { error: 'This match is not open for joining' },
        { status: 400 }
      );
    }

    // Check if the user has enough credits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, balance: true },
    });

    if (!user || Number(user.credits) < Number(match.entryFee)) {
      return NextResponse.json(
        { error: 'You do not have enough credits to join this match' },
        { status: 400 }
      );
    }

    // Update the match with the new player and change status
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        player2Id: userId,
        status: 'WAITING_START',
      },
    });

    // Deduct the entry fee from the user's credits and balance
    await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          decrement: Number(match.entryFee),
        },
        balance: {
          decrement: Number(match.entryFee),
        },
      },
    });

    // Create a transaction record for the match entry
    await prisma.transaction.create({
      data: {
        userId: userId,
        amount: -Number(match.entryFee), // Negative amount for payment
        type: 'MATCH_ENTRY',
        description: `Entry fee for match ${matchId}`,
        matchId: matchId,
      },
    });

    return NextResponse.json(updatedMatch);
  } catch (error) {
    console.error('Error joining match:', error);
    return NextResponse.json(
      { error: 'Failed to join match' },
      { status: 500 }
    );
  }
}
