import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { MATCH_STATUS } from '@/lib/matchStatus'; // Assuming you have status constants
import { TransactionType } from '@prisma/client'; // Import TransactionType
import { updateBalance } from '@/lib/balanceService';

// Helper function to create system message
async function createSystemMessage(matchId: string, hostUserId: string, content: string) {
  try {
    await prisma.message.create({
      data: {
        matchId: matchId,
        userId: hostUserId, // Assign to host for now
        content: content,
        isSystem: true,
        type: 'SYSTEM',
      },
    });
  } catch (error) {
    console.error(`[MATCH ${matchId}] Failed to create system message:`, error);
    // Decide if this error should block the response or just be logged
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const userId = session.user.id;
  const matchId = params.id;

  try {
    const body = await req.json();
    const { outcome } = body;

    if (outcome !== 'WIN' && outcome !== 'LOSS') {
      return new NextResponse('Invalid outcome value. Must be WIN or LOSS.', { status: 400 });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        player1Id: true,
        player2Id: true,
        status: true,
        player1Outcome: true,
        player2Outcome: true,
        winnerId: true, // Check if already finalized
      },
    });

    if (!match) {
      return new NextResponse('Match not found', { status: 404 });
    }

    // Validation: User must be part of the match
    if (userId !== match.player1Id && userId !== match.player2Id) {
      return new NextResponse('Forbidden: You are not a participant in this match.', { status: 403 });
    }

    // Validation: Prevent submission if already disputed, cancelled, or fully completed
    if (match.status === MATCH_STATUS.DISPUTED || 
        match.status === MATCH_STATUS.CANCELLED_BY_HOST || 
        (match.status === MATCH_STATUS.COMPLETED && match.winnerId)) { // Check if winner is set
         return new NextResponse(`Cannot submit outcome for match with status: ${match.status}`, { status: 400 });
    }

    // Validation: Check if this user already submitted an outcome
    const alreadySubmitted = (userId === match.player1Id && match.player1Outcome) || (userId === match.player2Id && match.player2Outcome);
    if (alreadySubmitted) {
        return new NextResponse('You have already submitted an outcome for this match.', { status: 400 });
    }

    // Determine which outcome field to update
    const outcomeField = userId === match.player1Id ? 'player1Outcome' : 'player2Outcome';
    const updateData = { [outcomeField]: outcome };

    // Update the outcome in the database
    await prisma.match.update({
      where: { id: matchId },
      data: updateData,
    });

    // Fetch the match *again* to get the latest outcomes after update
    const updatedMatch = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        player1Id: true, // Needed for system message
        player1Outcome: true,
        player2Outcome: true,
        status: true, // Needed for re-checking status before conflict logic
      },
    });

    if (!updatedMatch) {
      // Should not happen if previous update succeeded, but handle defensively
      throw new Error('Failed to fetch updated match data after outcome submission.');
    }

    // --- Conflict Detection --- 
    // Check ONLY if both outcomes are now filled and status is not already DISPUTED
    if (
      updatedMatch.player1Outcome &&
      updatedMatch.player2Outcome &&
      updatedMatch.status !== MATCH_STATUS.DISPUTED // Avoid repeat dispute messages
    ) {
        if (updatedMatch.player1Outcome === updatedMatch.player2Outcome) {
          console.log(`[MATCH ${matchId}] Conflict detected: P1 (${updatedMatch.player1Outcome}) vs P2 (${updatedMatch.player2Outcome}). Setting status to DISPUTED.`);
          
          // Set status to DISPUTED
          await prisma.match.update({
            where: { id: matchId },
            data: { status: MATCH_STATUS.DISPUTED },
          });

          // Send system message
          await createSystemMessage(
            matchId,
            updatedMatch.player1Id, // Use host ID
            '⚠️ Match result conflict detected. An administrator has been notified.'
          );
          // Return a specific conflict response
          return NextResponse.json({ message: 'Outcome submitted. Conflict detected and logged.', status: MATCH_STATUS.DISPUTED });

        } else {
             // --- Match Resolution Logic --- 
             console.log(`[MATCH ${matchId}] Outcomes differ: P1 (${updatedMatch.player1Outcome}), P2 (${updatedMatch.player2Outcome}). Resolving match.`);
             
             // Determine winner based on submitted outcomes
             let winnerId: string | null = null;
             
             // If player1 claims WIN and player2 claims LOSS, player1 wins
             if (updatedMatch.player1Outcome === 'WIN' && updatedMatch.player2Outcome === 'LOSS') {
               winnerId = match.player1Id;
             } 
             // If player2 claims WIN and player1 claims LOSS, player2 wins
             else if (updatedMatch.player1Outcome === 'LOSS' && updatedMatch.player2Outcome === 'WIN') {
               winnerId = match.player2Id;
             }
             
             if (winnerId) {
               // Get match details for payout calculation
               const matchDetails = await prisma.match.findUnique({
                 where: { id: matchId },
                 select: {
                   entryFee: true,
                   player1Id: true,
                   player2Id: true,
                 },
               });
               
               if (matchDetails) {
                 // Calculate prize amount (entry fee from both players)
                 const prizeAmount = Number(matchDetails.entryFee) * 2;
                 
                 console.log(`[MATCH_OUTCOME] Match ${matchId} completed. Winner: ${winnerId}, Prize amount: ${prizeAmount}`);
                 
                 // Get winner's current balance for verification
                 const winnerBefore = await prisma.user.findUnique({
                   where: { id: winnerId },
                   select: { balance: true, credits: true, username: true }
                 });
                 
                 console.log(`[MATCH_OUTCOME] Winner ${winnerBefore?.username} (${winnerId}) before prize: Balance=${winnerBefore?.balance}, Credits=${winnerBefore?.credits}`);
                 
                 // Update match status to COMPLETED and set winner
                 await prisma.match.update({
                   where: { id: matchId },
                   data: { 
                     status: MATCH_STATUS.COMPLETED,
                     winnerId: winnerId,
                   },
                 });
                 
                 // Award prize to winner using the updateBalance function
                 await updateBalance({
                   userId: winnerId,
                   amount: prizeAmount,
                   type: TransactionType.MATCH_WINNING,
                   description: `Prize for winning match ${matchId}`,
                   matchId: matchId,
                 });
                 
                 // Verify winner's balance was updated correctly
                 const winnerAfter = await prisma.user.findUnique({
                   where: { id: winnerId },
                   select: { balance: true, credits: true }
                 });
                 
                 if (winnerBefore && winnerAfter) {
                   const expectedBalance = Number(winnerBefore.balance) + prizeAmount;
                   const expectedCredits = winnerBefore.credits + prizeAmount;
                   
                   console.log(`[MATCH_OUTCOME] Winner after prize: Balance=${winnerAfter.balance}, Credits=${winnerAfter.credits}`);
                   console.log(`[MATCH_OUTCOME] Expected: Balance=${expectedBalance}, Credits=${expectedCredits}`);
                   
                   if (Number(winnerAfter.balance) !== expectedBalance || winnerAfter.credits !== expectedCredits) {
                     console.error(`[MATCH_OUTCOME_ERROR] Winner balance or credits not updated correctly!`);
                   } else {
                     console.log(`[MATCH_OUTCOME] Winner balance and credits updated successfully!`);
                   }
                 }
                 
                 // Send system message about match completion
                 const winnerUsername = winnerId === matchDetails.player1Id ? 'Player 1' : 'Player 2';
                 await createSystemMessage(
                   matchId,
                   matchDetails.player1Id, // Use host ID
                   `🏆 Match completed! ${winnerUsername} has won the match and received ${prizeAmount} credits.`
                 );
                 
                 return NextResponse.json({ 
                   message: 'Outcome submitted and match completed.',
                   status: MATCH_STATUS.COMPLETED,
                   winnerId: winnerId
                 });
               }
             }
        }
    }

    return NextResponse.json({ message: 'Outcome submitted successfully.' });

  } catch (error: any) {
    console.error(`[MATCH_OUTCOME_ERROR ${matchId}]:`, error);
    return new NextResponse('Failed to submit outcome', { status: 500 });
  }
}
