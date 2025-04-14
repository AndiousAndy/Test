import { PrismaClient } from '@prisma/client';
import { MATCH_STATUS } from '../src/lib/matchStatus'; 

const prisma = new PrismaClient();
const matchIdToFix = 'cm9g9n2xe000fxdsbxetg9osf'; // The ID of the match to fix
const correctStatus = MATCH_STATUS.WAITING_OPPONENT; // The status it should have

async function fixMatch() {
    console.log(`Attempting to fix status for match ID: ${matchIdToFix}...`);
    try {
        const match = await prisma.match.findUnique({
            where: { id: matchIdToFix },
            select: { status: true, player2Id: true }
        });

        if (!match) {
            console.error(`Match with ID ${matchIdToFix} not found.`);
            return;
        }

        if (match.status === correctStatus) {
            console.log(`Match ${matchIdToFix} already has the correct status (${correctStatus}). No update needed.`);
            return;
        }
        
        if (match.player2Id) {
             console.log(`Match ${matchIdToFix} has a second player (ID: ${match.player2Id}). It should not be ${correctStatus}. Status: ${match.status}. Aborting fix.`);
             return;
        }

        console.log(`Current status of match ${matchIdToFix} is ${match.status}. Player 2 ID: ${match.player2Id}. Updating to ${correctStatus}.`);

        const updatedMatch = await prisma.match.update({
            where: { id: matchIdToFix },
            data: { status: correctStatus },
        });

        console.log(`Successfully updated status for match ${updatedMatch.id} to ${updatedMatch.status}.`);

    } catch (error) {
        console.error('Error fixing match status:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixMatch();
