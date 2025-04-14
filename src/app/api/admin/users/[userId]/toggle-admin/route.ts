import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

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

    // Check if the user exists and get current admin status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Toggle the admin status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isAdmin: !user.isAdmin,
      },
      select: {
        id: true,
        username: true,
        isAdmin: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User admin status ${updatedUser.isAdmin ? 'granted' : 'revoked'} successfully`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error toggling admin status:', error);
    return NextResponse.json(
      { error: 'Failed to toggle admin status' },
      { status: 500 }
    );
  }
}
