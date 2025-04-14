import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { MATCH_STATUS } from '@/lib/matchStatus';
import { updateBalance } from '@/lib/balanceService';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { matchId, winnerId } = body;

    if (!matchId || !winnerId) {
      return new NextResponse('Missing matchId or winnerId', { status: 400 });
    }

    console.log(`[ADMIN_RESOLVE] Attempting to resolve dispute for match ${matchId}, declaring winner ${winnerId}`);

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        status: true,
        player1Id: true,
        player2Id: true,
        entryFee: true,
      },
    });

    if (!match) {
      return new NextResponse('Match not found', { status: 404 });
    }

    if (match.status !== MATCH_STATUS.DISPUTED) {
      return new NextResponse(`Match status is not DISPUTED (currently ${match.status})`, { status: 400 });
    }

    if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
      return new NextResponse('Invalid winnerId. Must be player1 or player2.', { status: 400 });
    }

    // Use a transaction to ensure atomicity
    const resolvedMatch = await prisma.$transaction(async (tx) => {
      // 1. Update Match Status and Winner
      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          status: MATCH_STATUS.COMPLETED,
          winnerId: winnerId,
        },
      });

      // 2. Award Prize using updateBalance (which handles transaction logging)
      const prizeAmount = new Decimal(match.entryFee).times(2);
      console.log(`[ADMIN_RESOLVE] Awarding prize of ${prizeAmount} to winner ${winnerId}`);
      await updateBalance({
        userId: winnerId,
        amount: prizeAmount,
        type: TransactionType.MATCH_WINNING,
        description: `Prize for admin-resolved match ${matchId}`,
        matchId: matchId,
        prismaTx: tx, // Pass the transaction client
      });

      // Return the updated match (could include more details if needed)
      return updatedMatch;
    });

    console.log(`[ADMIN_RESOLVE] Match ${matchId} successfully resolved. Winner: ${winnerId}`);
    return NextResponse.json(resolvedMatch);

  } catch (error) {
    console.error('ADMIN_RESOLVE_DISPUTE_ERROR:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
