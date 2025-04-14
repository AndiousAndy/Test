import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/config';
import prisma from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const { content, matchId } = body

    if (!content || !matchId) {
      return new NextResponse('Missing content or matchId', { status: 400 })
    }

    // Check if user is part of the match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { player1Id: true, player2Id: true }
    })

    if (!match) {
      return new NextResponse('Match not found', { status: 404 })
    }

    if (match.player1Id !== session.user.id && match.player2Id !== session.user.id) {
      return new NextResponse('Not authorized to chat in this match', { status: 403 })
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        content,
        userId: session.user.id,
        matchId
      },
      include: {
        user: {
          select: {
            username: true
          }
        }
      }
    })

    // Trigger the new message event
    await pusherServer.trigger(`match-${matchId}`, 'new-message', {
      id: message.id,
      content: message.content,
      username: message.user.username,
      createdAt: message.createdAt
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error('CHAT_POST_ERROR:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
