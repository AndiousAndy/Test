import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';
import prisma from '@/lib/prisma';
import { updateBalance } from '@/lib/balanceService'; 
import { TransactionType } from '@prisma/client'; 
import { Decimal } from '@prisma/client/runtime/library'; 
import { Prisma } from '@prisma/client'; // Ensure Prisma namespace is imported

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get matches where the user is either player1 or player2
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { player1Id: session.user.id },
          { player2Id: session.user.id }
        ]
      },
      include: {
        player1: {
          select: {
            username: true
          }
        },
        player2: {
          select: {
            username: true
          }
        }
      },
      orderBy: {
        scheduledFor: 'asc'
      }
    });

    return NextResponse.json(matches);
  } catch (error) {
    console.error('MATCHES_GET_ERROR:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) { 
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const entryFee = new Decimal(body.entryFee ?? 0);
    const scheduledFor = new Date(body.scheduledFor); 
    const roundDurationMinutes = parseInt(body.roundDurationMinutes ?? 3); 
    const numberOfRounds = parseInt(body.numberOfRounds ?? 5);       
    const isPrivate = !!body.isPrivate; 
    const region = body.region as string | undefined; 
    const isPractice = !!body.isPractice;            

    // --- Conditional Validation --- 
    if (!isPractice) {
      // Validate entry fee only for non-practice matches
      if (entryFee.isNaN() || entryFee.lessThan(new Decimal(10))) { 
        return new NextResponse('Entry fee must be a valid number and at least 10 Credits for ranked matches.', { status: 400 });
      }
    } else {
      // Ensure entryFee is exactly 0 for practice matches coming from API
      if (!entryFee.isZero()) {
        return new NextResponse('Entry fee must be 0 for practice matches.', { status: 400 });
      }
    }

    // Validate scheduled time
    if (isNaN(scheduledFor.getTime()) || scheduledFor < new Date(Date.now() + 60000)) { 
      return new NextResponse('Invalid or past scheduled time (must be at least 1 minute from now)', { status: 400 });
    }

    // Validate round settings
    if (![1, 2, 3].includes(roundDurationMinutes)) {
      return new NextResponse('Invalid round duration. Must be 1, 2, or 3 minutes.', { status: 400 });
    }

    if (numberOfRounds < 3 || numberOfRounds > 12) {
      return new NextResponse('Invalid number of rounds. Must be between 3 and 12.', { status: 400 });
    }

    // Perform match creation and balance deduction in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      
      // --- Conditional Balance Check --- 
      if (!isPractice) {
        const user = await tx.user.findUnique({ 
          where: { id: userId },
          select: { balance: true }
        });

        if (!user || user.balance.lessThan(entryFee)) {
          throw new Error('Insufficient balance'); 
        }
      }

      // Create the match using the transaction client
      const newMatch = await tx.match.create({
        data: {
          entryFee: entryFee, 
          scheduledFor: scheduledFor,
          isPrivate: isPrivate, 
          roundDurationMinutes: roundDurationMinutes, 
          numberOfRounds: numberOfRounds,          
          player1Id: userId,
          status: 'OPEN', 
          region: region === 'ANY' ? null : region, 
          isPractice: isPractice,                   
        },
        include: { 
          player1: {
            select: { username: true }
          }
        }
      });

      // --- Conditional Balance Deduction --- 
      if (!isPractice) {
        await updateBalance({
          userId: userId,
          amount: entryFee.negated(), 
          type: TransactionType.MATCH_ENTRY,
          matchId: newMatch.id,
          description: `Entry fee for match #${newMatch.id}`,
          prismaTx: tx 
        });

        // Update status after fee deduction for non-practice matches
        return tx.match.update({
          where: { id: newMatch.id },
          data: { status: 'WAITING_OPPONENT' },
          include: { player1: { select: { username: true } } }
        });

      } else {
        // For practice matches, status remains OPEN (or set directly to WAITING_OPPONENT if preferred)
        // Let's set it to WAITING_OPPONENT directly for consistency in display
         return tx.match.update({
          where: { id: newMatch.id },
          data: { status: 'WAITING_OPPONENT' },
          include: { player1: { select: { username: true } } }
        });
        // Or just return newMatch if OPEN is desired initial state for practice
        // return newMatch; 
      }
    });

    // If transaction is successful, return the created match
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('MATCH_CREATE_ERROR:', error);
    // Handle specific errors like insufficient balance
    if (error.message === 'Insufficient balance') {
      return new NextResponse('Insufficient balance to create match', { status: 400 });
    }
    return new NextResponse('Failed to create match', { status: 500 });
  }
}
