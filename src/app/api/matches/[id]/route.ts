import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/config';
import prisma from '@/lib/prisma';
import { updateBalance } from '@/lib/balanceService'; 
import { TransactionType } from '@prisma/client'; 
import { Decimal } from '@prisma/client/runtime/library';
import { MATCH_STATUS } from '@/lib/matchStatus';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const match = await prisma.match.findUnique({
      where: { id: params.id },
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
      },
    });

    if (!match) {
      return new NextResponse('Match not found', { status: 404 });
    }

    // --- Auto-update status to IN_PROGRESS if scheduled time has passed --- 
    const now = new Date();
    let updatedMatch = match; // Use a new variable to hold potentially updated match

    if (
      match.scheduledFor <= now &&
      match.player2Id && // Ensure player 2 exists!
      (match.status === MATCH_STATUS.OPEN || 
       match.status === MATCH_STATUS.WAITING_OPPONENT || 
       match.status === MATCH_STATUS.WAITING_START)
    ) {
      try {
        updatedMatch = await prisma.match.update({
          where: { id: match.id },
          data: { status: MATCH_STATUS.IN_PROGRESS },
          include: {
            player1: { select: { id: true, username: true } },
            player2: { select: { id: true, username: true } },
          },
        });
        console.log(`Match ${match.id} status auto-updated to IN_PROGRESS.`);
      } catch (updateError) {
        console.error(`Failed to auto-update status for match ${match.id}:`, updateError);
        // Proceed with the original match data if update fails
        updatedMatch = match; 
      }
    }
    // --- End auto-update --- 

    return NextResponse.json(updatedMatch); // Return the potentially updated match

  } catch (error) {
    console.error('MATCH_GET_ERROR:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    // Check if user is logged in and has an ID and potentially admin status
    if (!session?.user?.id) { 
      return new NextResponse('Unauthorized', { status: 401 });
    }
    // We'll add admin check later if needed for setting winner

    const body = await req.json();
    const { lobbyNumber, winnerId, status } = body; // Destructure potential updates
    const matchId = params.id;

    // Data to update
    const updateData: { lobbyNumber?: string; winnerId?: string; status?: string } = {};

    // Find the match first to perform checks
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { 
        player1Id: true, 
        player2Id: true, 
        entryFee: true, 
        status: true, 
        winnerId: true // Check if already completed
      },
    });

    if (!match) {
      return new NextResponse('Match not found', { status: 404 });
    }

    // --- Handle Lobby Number Update --- 
    if (lobbyNumber !== undefined) {
      // Only allow match participants to update lobby number
      if (match.player1Id !== session.user.id && match.player2Id !== session.user.id) {
        return new NextResponse('Not authorized to update lobby number for this match', { status: 403 });
      }
      updateData.lobbyNumber = lobbyNumber;
      
      // Create a system message for the lobby number update (outside transaction if only lobby number)
      if (!winnerId && !status) { // Only update lobby number
        await prisma.message.create({
            data: {
              content: `Lobby number set to: ${lobbyNumber}`,
              userId: session.user.id,
              matchId: matchId,
              isSystem: true,
            },
          });
      }
    }

    // --- Handle Winner/Status Update (Requires Transaction) ---
    if (winnerId !== undefined || status === MATCH_STATUS.COMPLETED) {
      // Authorization: Ensure only admin can set the winner (or adjust as needed)
      // Assuming session.user has an 'isAdmin' boolean (needs adding to session type)
      /*
      if (!session.user.isAdmin) { 
        return new NextResponse('Forbidden: Only admins can declare winners', { status: 403 });
      }
      */
      if (match.status === MATCH_STATUS.COMPLETED && match.winnerId) {
        return new NextResponse('Match already completed', { status: 400 });
      }
      if (winnerId && winnerId !== match.player1Id && winnerId !== match.player2Id) {
        return new NextResponse('Invalid winner ID', { status: 400 });
      }

      updateData.winnerId = winnerId;
      updateData.status = MATCH_STATUS.COMPLETED; // Force status to COMPLETED if winner is set

      console.log(`[MATCH ${matchId}] Starting transaction for winner/status update.`);
      const updatedMatch = await prisma.$transaction(async (tx) => {
        console.log(`[MATCH ${matchId}] Inside transaction - Updating match status and winner.`);
        // 1. Update Match Status and Winner
        const finalisedMatch = await tx.match.update({
          where: { id: matchId },
          data: updateData,
          include: { player1: true, player2: true } // Include player data for debugging/logic
        });
        console.log(`[MATCH ${matchId}] Match updated:`, finalisedMatch);

        // 2. Award Prize Pool to Winner
        if (finalisedMatch.winnerId && finalisedMatch.status === MATCH_STATUS.COMPLETED) {
          console.log(`[MATCH ${matchId}] Processing prize payout for winner: ${finalisedMatch.winnerId}`);
          let prizePool = new Decimal(0);
          // Only award double entry fee if BOTH players were involved
          if (finalisedMatch.player1Id && finalisedMatch.player2Id) {
            prizePool = match.entryFee.mul(new Decimal(2));
            console.log(`[MATCH ${matchId}] Both players present, calculated prize pool (2x entry): ${prizePool}`);
          } else {
            console.log(`[MATCH ${matchId}] Only one player present, prize pool is 0.`);
            // Alternative: Award entry fee back? prizePool = match.entryFee;
          }
          console.log(`[MATCH ${matchId}] Calculated prize pool: ${prizePool}`);

          // Only attempt payout if prize pool > 0
          if (prizePool.greaterThan(0)) {
            try {
              console.log(`[MATCH ${matchId}] Attempting to update winner balance...`);
              await updateBalance({
                prismaTx: tx, // Use the transaction client
                userId: finalisedMatch.winnerId,
                amount: prizePool,
                type: 'MATCH_WINNING' as TransactionType,
                description: `Winnings for match #${matchId}`,
                matchId: matchId,
              });
              console.log(`[MATCH ${matchId}] Winner balance update successful.`);
            } catch (payoutError) {
              console.error(`[MATCH ${matchId}] ERROR updating winner balance within transaction:`, payoutError);
              // Decide if this error should cause the transaction to fail
              throw new Error(`Failed to pay out winnings for match ${matchId}: ${payoutError instanceof Error ? payoutError.message : payoutError}`); 
            }
          } else {
             console.log(`[MATCH ${matchId}] Prize pool is 0, skipping winner balance update.`);
          }
        }
        
        // Handle potential system message for lobby number if set in same request
        if (lobbyNumber !== undefined) {
          await tx.message.create({
            data: {
              content: `Lobby number set to: ${lobbyNumber}. Winner declared: ${winnerId ? 'Yes' : 'No'}.`, // Adjust msg
              userId: session.user.id,
              matchId: matchId,
              isSystem: true,
            },
          });
        }

        return finalisedMatch;
      });

      return NextResponse.json(updatedMatch);
    } else if (Object.keys(updateData).length > 0) {
      // --- Handle only non-winner updates (e.g., just lobby number) ---
      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: updateData,
      });
      return NextResponse.json(updatedMatch);
    } else {
      // No valid fields to update provided
      return new NextResponse('No valid fields to update', { status: 400 });
    }

  } catch (error: any) {
    console.error('MATCH_PATCH_ERROR:', error);
    // Add more specific error handling if needed
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const matchId = params.id;
    const userId = session.user.id;

    console.log(`[DELETE /api/matches/${matchId}] Cancellation initiated by user: ${userId}`);

    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      console.log(`[DELETE /api/matches/${matchId}] Match not found.`);
      return new NextResponse('Match not found', { status: 404 });
    }

    console.log(`[DELETE /api/matches/${matchId}] Match found:`, match);

    // Authorization: Only player1 (host) can cancel
    if (match.player1Id !== session.user.id) {
      console.log(`[DELETE /api/matches/${matchId}] Unauthorized attempt by user ${session.user.id}. Host is ${match.player1Id}.`);
      return new NextResponse('Unauthorized', { status: 403 });
    }

    // Status check: Can only cancel OPEN or WAITING_OPPONENT matches
    if (match.status !== 'OPEN' && match.status !== 'WAITING_OPPONENT') {
      console.log(`[DELETE /api/matches/${matchId}] Invalid status for cancellation: ${match.status}`);
      return new NextResponse(`Cannot cancel match with status: ${match.status}`, { status: 400 });
    }

    // Cancellation logic
    try {
      console.log(`[DELETE /api/matches/${matchId}] Starting cancellation transaction for match ${matchId}. Entry fee: ${match.entryFee}`);
      
      const result = await prisma.$transaction(async (tx) => {
        console.log(`[DELETE /api/matches/${matchId}] Inside transaction.`);

        // 1. Refund Player 1 (Host)
        console.log(`[DELETE /api/matches/${matchId}] Refunding player 1: ${match.player1Id}, Amount: ${match.entryFee}`);
        await updateBalance({
          prismaTx: tx, // Pass the transaction client
          userId: match.player1Id,
          amount: match.entryFee,
          type: 'REFUND_MATCH_ENTRY' as TransactionType,
          description: `Refund for cancelled match ${matchId}`,
          matchId: matchId, // Include matchId if needed by transaction log
        });
        console.log(`[DELETE /api/matches/${matchId}] Player 1 refund processed.`);

        // 2. Refund Player 2 (if they joined)
        if (match.player2Id) {
          console.log(`[DELETE /api/matches/${matchId}] Refunding player 2: ${match.player2Id}, Amount: ${match.entryFee}`);
          await updateBalance({
            prismaTx: tx,
            userId: match.player2Id,
            amount: match.entryFee,
            type: 'REFUND_MATCH_ENTRY' as TransactionType,
            description: `Refund for cancelled match ${matchId}`,
            matchId: matchId,
          });
          console.log(`[DELETE /api/matches/${matchId}] Player 2 refund processed.`);
        } else {
          console.log(`[DELETE /api/matches/${matchId}] No player 2 to refund.`);
        }

        // 3. Update Match Status
        console.log(`[DELETE /api/matches/${matchId}] Updating match status to CANCELLED_BY_HOST.`);
        const updatedMatch = await tx.match.update({
          where: { id: matchId },
          data: { status: 'CANCELLED_BY_HOST' },
        });
        console.log(`[DELETE /api/matches/${matchId}] Match status updated:`, updatedMatch);

        return { updatedMatch }; // Only need to return the updated match
      });

      console.log(`[DELETE /api/matches/${matchId}] Transaction successful. Result:`, result);
      return NextResponse.json(result.updatedMatch);

    } catch (error) {
      console.error(`[DELETE /api/matches/${matchId}] Cancellation failed:`, error);
      return new NextResponse('Failed to cancel match and process refunds.', { status: 500 });
    }
  } catch (error) {
    console.error(`[DELETE /api/matches/${params?.id || 'UNKNOWN'}] General error:`, error);
    return new NextResponse('An unexpected error occurred', { status: 500 });
  }
}
