import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const userEmail = 'redpillgamba@gmail.com'; // The email of the user to make admin

async function makeUserAdmin() {
    console.log(`Attempting to make user ${userEmail} an admin...`);
    try {
        const user = await prisma.user.findUnique({
            where: { email: userEmail },
        });

        if (!user) {
            console.error(`User with email ${userEmail} not found.`);
            return;
        }

        if (user.isAdmin) {
            console.log(`User ${userEmail} is already an admin.`);
            return;
        }

        const updatedUser = await prisma.user.update({
            where: { email: userEmail },
            data: { isAdmin: true },
        });

        console.log(`Successfully granted admin privileges to user ${updatedUser.email} (ID: ${updatedUser.id}).`);

    } catch (error) {
        console.error('Error making user admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

makeUserAdmin();
