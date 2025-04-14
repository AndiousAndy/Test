import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/config';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionType } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check if the user is an admin
    const session = await getServerSession(authOptions);
    const userIsAdmin = session?.user ? (session.user as any).isAdmin === true : false;

    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Get the user ID from the route params
    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get the amount from the request body
    const { amount } = await request.json();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Valid positive amount is required' },
        { status: 400 }
      );
    }

    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update the user's balance
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        balance: {
          increment: new Decimal(amount),
        },
        credits: {
          increment: amount,
        },
      },
    });

    // Create a transaction record
    await prisma.transaction.create({
      data: {
        userId: userId,
        type: TransactionType.ADJUSTMENT,
        amount: new Decimal(amount),
        description: `Admin granted ${amount} coins`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully granted ${amount} coins to user`,
      newBalance: updatedUser.balance.toString(),
      newCredits: updatedUser.credits,
    });
  } catch (error) {
    console.error('Error granting coins:', error);
    return NextResponse.json(
      { error: 'Failed to grant coins' },
      { status: 500 }
    );
  }
}
