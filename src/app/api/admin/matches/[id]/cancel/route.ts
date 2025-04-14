import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth'; 
import { authOptions } from '@/app/api/auth/config';
import prisma from '@/lib/prisma';
import { MATCH_STATUS } from '@/lib/matchStatus';
import { updateBalance } from '@/lib/balanceService';
import { TransactionType, Prisma } from '@prisma/client'; 
import { Decimal } from '@prisma/client/runtime/library';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions) as Session | null;
  const matchId = params.id;

  // 1. Check Admin Authorization
  const userIsAdmin = session?.user ? (session.user as any).isAdmin === true : false;
  if (!userIsAdmin) {
    return new NextResponse(JSON.stringify({ message: 'Unauthorized: Admin access required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!matchId) {
    return new NextResponse(JSON.stringify({ message: 'Bad Request: Match ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 2. Use a transaction to ensure atomicity (update match status + refund players)
    const updatedMatch = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 3. Find the match and check its current status
      const match = await tx.match.findUnique({
        where: { id: matchId },
        select: {
          id: true,
          status: true,
          player1Id: true,
          player2Id: true, 
          entryFee: true, 
        },
      });

      if (!match) {
        throw new Error('Match not found'); 
      }

      // 4. Check if the match is in a cancellable state
      if (
        match.status !== MATCH_STATUS.OPEN &&
        match.status !== MATCH_STATUS.WAITING_OPPONENT
      ) {
        throw new Error(`Match cannot be cancelled by admin in status: ${match.status}`);
      }

      // 5. Update Match Status
      const cancelledMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          status: MATCH_STATUS.CANCELLED_BY_ADMIN,
        },
        select: { id: true, status: true }, 
      });

      // 6. Refund Players (if entryFee > 0 and player exists)
      const entryFee = match.entryFee;
      // Ensure entryFee is treated as a number for comparison
      if (Number(entryFee) > 0) {
        if (match.player1Id) {
          console.log(`[Admin Cancel] Refunding ${entryFee} to player ${match.player1Id} for match ${matchId}`);
          await updateBalance({
            userId: match.player1Id,
            amount: entryFee,
            type: TransactionType.MATCH_ADMIN_CANCEL_REFUND, 
            description: `Admin cancellation refund for match ${matchId}`,
            prismaTx: tx, 
          });
        }
        // Only refund player 2 if they exist (i.e., match was not just OPEN)
        if (match.player2Id) {
          console.log(`[Admin Cancel] Refunding ${entryFee} to player ${match.player2Id} for match ${matchId}`);
          await updateBalance({
            userId: match.player2Id,
            amount: entryFee,
            type: TransactionType.MATCH_ADMIN_CANCEL_REFUND, 
            description: `Admin cancellation refund for match ${matchId}`,
            prismaTx: tx, 
          });
        }
      }

      return cancelledMatch; 
    });

    return NextResponse.json(updatedMatch);

  } catch (error: any) {
    console.error(`Error cancelling match ${matchId}:`, error);
    let status = 500;
    let message = 'Internal Server Error';

    if (error.message === 'Match not found') {
      status = 404;
      message = error.message;
    } else if (error.message.startsWith('Match cannot be cancelled')) {
      status = 409; 
      message = error.message;
    }

    return new NextResponse(JSON.stringify({ message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
