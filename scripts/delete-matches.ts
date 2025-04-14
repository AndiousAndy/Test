import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllMatches() {
    try {
        // First, count how many matches exist
        const matchCount = await prisma.match.count();
        console.log(`Found ${matchCount} matches to delete.`);

        // Get all match IDs first
        const matchIds = await prisma.match.findMany({
            select: { id: true }
        });
        const ids = matchIds.map(m => m.id);

        if (ids.length > 0) {
            // Delete all messages related to matches first
            const deletedMessages = await prisma.message.deleteMany({
                where: {
                    matchId: { in: ids }
                }
            });
            console.log(`Deleted ${deletedMessages.count} match-related messages.`);

            // Delete all transactions related to matches
            const deletedTransactions = await prisma.transaction.deleteMany({
                where: {
                    matchId: { in: ids }
                }
            });
            console.log(`Deleted ${deletedTransactions.count} match-related transactions.`);

            // Now delete all matches
            const deletedMatches = await prisma.match.deleteMany();
            console.log(`Successfully deleted ${deletedMatches.count} matches.`);
        } else {
            console.log('No matches found to delete.');
        }

    } catch (error) {
        console.error('Error deleting matches:', error);
    } finally {
        await prisma.$disconnect();
    }
}

deleteAllMatches();
