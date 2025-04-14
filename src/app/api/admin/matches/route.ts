import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, Session } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
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
    // Fetch all matches, including related player and winner data
    // TODO: Add pagination later if the number of matches grows large
    const matches = await prisma.match.findMany({
      include: {
        player1: { select: { id: true, username: true } },
        player2: { select: { id: true, username: true } },
        winner: { select: { id: true, username: true } }, // Include winner
      },
      orderBy: {
        createdAt: 'desc', // Show most recent matches first
      },
      // take: 100, // Consider limiting initially
    });

    return NextResponse.json(matches);

  } catch (error) {
    console.error('Error fetching all matches:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
