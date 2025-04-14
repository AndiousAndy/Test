import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, Session } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
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

  const { searchParams } = new URL(req.url);
  const searchTerm = searchParams.get('search') || '';

  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: searchTerm,
              mode: 'insensitive', // Case-insensitive search
            },
          },
          {
            email: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        coins: true,
      },
      orderBy: {
        username: 'asc', // Order by username
      },
      take: 50, // Limit results for performance
    });

    return NextResponse.json(users);

  } catch (error) {
    console.error('Error fetching users:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
