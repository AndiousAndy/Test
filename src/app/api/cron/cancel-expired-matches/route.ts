import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; 
import { MATCH_STATUS } from '@/lib/matchStatus';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionType } from '@prisma/client';

// IMPORTANT: Protect this endpoint in production! 
// Use a secret query parameter, IP allowlisting, or a secure cron service.

export async function GET(request: NextRequest) {
  // Optional: Check for a secret query parameter for security
  // const secret = request.nextUrl.searchParams.get('secret');
  // if (secret !== process.env.CRON_SECRET) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }
  
  console.log('CRON JOB (GET): Starting cancel-expired-matches...');
  const now = new Date();
  let cancelledCount = 0;
  let refundedCount = 0;
  let manualFixResult = null;

  try {
    // First, attempt to manually fix the specific match that was reported as not being cancelled correctly
    const specificMatchId = 'cm9gaerh50002ers2js0mb7yg';
    try {
      const specificMatch = await prisma.match.findUnique({
        where: { id: specificMatchId },
        select: {
          id: true,
          player1Id: true,
          entryFee: true,
          isPractice: true,
          status: true,
          player2Id: true,
          scheduledFor: true,
        },
      });

      if (specificMatch && 
          (specificMatch.status === MATCH_STATUS.OPEN || specificMatch.status === MATCH_STATUS.WAITING_OPPONENT) && 
          specificMatch.player2Id === null && 
          specificMatch.scheduledFor < now) {
        
        console.log(`MANUAL FIX: Match ${specificMatchId} found in ${specificMatch.status} state and past scheduled time. Fixing...`);
        
        await prisma.$transaction(async (tx) => {
          // 1. Update the match status to CANCELLED_EXPIRED
          await tx.match.update({
            where: { id: specificMatchId },
            data: {
              status: MATCH_STATUS.CANCELLED_EXPIRED,
            },
          });

          // 2. Refund the host (player1) ONLY if it's NOT a practice match and entry fee > 0
          if (!specificMatch.isPractice && specificMatch.entryFee.greaterThan(0)) {
            console.log(`MANUAL FIX: Refunding player ${specificMatch.player1Id} for match ${specificMatchId} (Amount: ${specificMatch.entryFee})`);
            await tx.user.update({
              where: { id: specificMatch.player1Id },
              data: {
                balance: {
                  increment: specificMatch.entryFee,
                },
              },
            });

            // 3. Create a transaction record for the refund
            await tx.transaction.create({
              data: {
                userId: specificMatch.player1Id,
                matchId: specificMatchId,
                type: TransactionType.REFUND,
                amount: specificMatch.entryFee,
                description: `Refund for expired match ${specificMatchId} (manual fix)`,
              },
            });
          }
        });
        
        manualFixResult = {
          matchId: specificMatchId,
          success: true,
          message: "Match manually cancelled and refunded if applicable"
        };
        console.log(`MANUAL FIX: Successfully fixed match ${specificMatchId}`);
      } else if (specificMatch) {
        manualFixResult = {
          matchId: specificMatchId,
          success: false,
          message: `Match exists but doesn't need fixing. Status: ${specificMatch.status}, Has opponent: ${specificMatch.player2Id !== null}, Past scheduled time: ${specificMatch.scheduledFor < now}`
        };
        console.log(`MANUAL FIX: Match ${specificMatchId} exists but doesn't need fixing. Status: ${specificMatch.status}`);
      } else {
        manualFixResult = {
          matchId: specificMatchId,
          success: false,
          message: "Match not found"
        };
        console.log(`MANUAL FIX: Match ${specificMatchId} not found`);
      }
    } catch (manualFixError) {
      console.error(`MANUAL FIX: Error fixing specific match ${specificMatchId}:`, manualFixError);
      manualFixResult = {
        matchId: specificMatchId,
        success: false,
        message: `Error: ${manualFixError instanceof Error ? manualFixError.message : String(manualFixError)}`
      };
    }

    // Find matches waiting for an opponent where the scheduled time has passed
    // Look for matches that are either in OPEN or WAITING_OPPONENT status
    const expiredMatches = await prisma.match.findMany({
      where: {
        status: {
          in: [MATCH_STATUS.OPEN, MATCH_STATUS.WAITING_OPPONENT]
        },
        scheduledFor: { lt: now },
        player2Id: null, // Ensure no opponent joined
      },
      select: {
        id: true,
        player1Id: true,
        entryFee: true,
        isPractice: true,
        status: true,
      },
    });

    if (expiredMatches.length === 0) {
      console.log('CRON JOB (GET): No expired matches found.');
      return NextResponse.json({ 
        success: true, 
        message: 'No expired matches found.', 
        cancelledCount, 
        refundedCount,
        manualFix: manualFixResult
      });
    }

    console.log(`CRON JOB (GET): Found ${expiredMatches.length} expired matches to process.`);

    // Process each expired match within a transaction
    for (const match of expiredMatches) {
      try {
        console.log(`CRON JOB (GET): Processing match ${match.id} with status ${match.status}`);
        await prisma.$transaction(async (tx) => {
          // 1. Update the match status to CANCELLED_EXPIRED
          await tx.match.update({
            where: { id: match.id },
            data: {
              status: MATCH_STATUS.CANCELLED_EXPIRED,
            },
          });
          cancelledCount++; // Increment cancellation counter

          // 2. Refund the host (player1) ONLY if it's NOT a practice match and entry fee > 0
          if (!match.isPractice && match.entryFee.greaterThan(0)) {
            console.log(`CRON JOB (GET): Refunding player ${match.player1Id} for match ${match.id} (Amount: ${match.entryFee})`);
            await tx.user.update({
              where: { id: match.player1Id },
              data: {
                balance: {
                  increment: match.entryFee,
                },
              },
            });

            // 3. Create a transaction record for the refund
            await tx.transaction.create({
              data: {
                userId: match.player1Id,
                matchId: match.id,
                type: TransactionType.REFUND,
                amount: match.entryFee,
                description: `Refund for expired match ${match.id} (no opponent)`,
              },
            });
            refundedCount++; // Increment refund counter
          } else {
            console.log(`CRON JOB (GET): Skipping refund for match ${match.id} (Practice: ${match.isPractice}, Fee: ${match.entryFee})`);
          }
        });
        console.log(`CRON JOB (GET): Successfully processed match ${match.id}. Cancelled. Refund skipped/processed.`);
      } catch (txError) {
        console.error(`CRON JOB (GET): Failed to process match ${match.id} in transaction:`, txError);
        // Continue to the next match even if one fails
      }
    }

    console.log(`CRON JOB (GET): Finished. Cancelled ${cancelledCount} matches. Refunded ${refundedCount} hosts.`);
    return NextResponse.json({ 
      success: true, 
      message: `Processed ${expiredMatches.length} matches, cancelled ${cancelledCount}, refunded ${refundedCount} hosts.`, 
      cancelledCount, 
      refundedCount,
      manualFix: manualFixResult
    });

  } catch (error) {
    console.error('CRON JOB (GET): Error running cancel-expired-matches:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process expired matches',
        manualFix: manualFixResult
      },
      { status: 500 }
    );
  }
}
