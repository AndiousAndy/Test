import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const matchIdToCheck = 'cm9g9n2xe000fxdsbxetg9osf'; // The ID of the match to check

async function checkMatch() {
    console.log(`Checking status for match ID: ${matchIdToCheck}...`);
    try {
        const match = await prisma.match.findUnique({
            where: { id: matchIdToCheck },
            include: {
                player1: { select: { username: true } },
                player2: { select: { username: true } },
            }
        });

        if (!match) {
            console.error(`Match with ID ${matchIdToCheck} not found.`);
            return;
        }

        console.log('--- Match Details ---');
        console.log(`ID: ${match.id}`);
        console.log(`Status: ${match.status}`);
        console.log(`Scheduled For: ${match.scheduledFor.toISOString()} (Current Time: ${new Date().toISOString()})`);
        console.log(`Entry Fee: ${match.entryFee}`);
        console.log(`Player 1: ${match.player1?.username} (ID: ${match.player1Id})`);
        console.log(`Player 2: ${match.player2 ? match.player2.username : 'None'} (ID: ${match.player2Id})`);
        console.log(`Created At: ${match.createdAt.toISOString()}`);
        console.log('---------------------');

        const isExpired = new Date() > match.scheduledFor;
        const shouldBeCancelled = match.status === 'WAITING_OPPONENT' && isExpired && !match.player2Id;

        console.log(`\nIs scheduled time passed? ${isExpired}`);
        console.log(`Should it be cancelled by cron? ${shouldBeCancelled}`);

        if (shouldBeCancelled) {
            console.log('\nRecommendation: The cron job should have cancelled this match. Check if the cron job ran successfully after the scheduled time.');
        } else if (match.status === 'CANCELLED_EXPIRED') {
            console.log('\nStatus is already CANCELLED_EXPIRED as expected.');
        } else {
             console.log('\nMatch does not meet the criteria for automatic cancellation currently.');
        }

    } catch (error) {
        console.error('Error checking match status:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkMatch();
