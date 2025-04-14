import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, Session } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions) as Session | null;

  // Check if user is authenticated and is an admin
  const userIsAdmin = session?.user ? (session.user as any).isAdmin === true : false;
  if (!userIsAdmin) {
    return new NextResponse(JSON.stringify({ message: 'Unauthorized: Admin access required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { userId, amount } = body;

    if (!userId || typeof userId !== 'string') {
      return new NextResponse(JSON.stringify({ message: 'Bad Request: Missing or invalid userId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (typeof amount !== 'number' || !Number.isInteger(amount)) {
      return new NextResponse(JSON.stringify({ message: 'Bad Request: Amount must be an integer' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find the user first to ensure they exist
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, coins: true }, // Select current coins
    });

    if (!user) {
      return new NextResponse(JSON.stringify({ message: 'Not Found: User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Calculate new coin balance, prevent going below zero
    const newCoinBalance = Math.max(0, (user.coins ?? 0) + amount);

    // Update the user's coins
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        coins: newCoinBalance, // Update with the calculated balance
      },
      select: {
        id: true,
        username: true,
        email: true,
        coins: true,
      },
    });

    return NextResponse.json(updatedUser);

  } catch (error) {
    console.error('Error updating user coins:', error);
    // Handle potential JSON parsing errors or other unexpected issues
    if (error instanceof SyntaxError) {
        return new NextResponse(JSON.stringify({ message: 'Bad Request: Invalid JSON format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
