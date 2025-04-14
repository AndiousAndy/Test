import { prisma } from './prisma';
import { Prisma, TransactionType, User } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Options for updating a user's balance.
 */
interface UpdateBalanceOptions {
  userId: string;
  amount: Decimal | number; // Amount to add (positive) or subtract (negative)
  type: TransactionType;    // Type of transaction
  description?: string;     // Optional description
  matchId?: string;         // Optional related match ID
  prismaTx?: Prisma.TransactionClient; // Optional Prisma transaction client
}

/**
 * Updates a user's balance and logs the transaction.
 * Can be used within a Prisma transaction for atomicity.
 * 
 * @param options - The details for the balance update.
 * @returns The updated user object.
 * @throws Error if user not found or update fails.
 */
export async function updateBalance(options: UpdateBalanceOptions): Promise<User> {
  const { userId, amount, type, description, matchId, prismaTx } = options;
  const prismaClient = prismaTx || prisma; // Use transaction client if provided

  const amountDecimal = new Decimal(amount);

  try {
    // Log the balance update request
    console.log(`[BALANCE_UPDATE] Starting balance update for user ${userId}. Type: ${type}, Amount: ${amountDecimal}`);

    // Get current user data for validation and logging
    const currentUser = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { balance: true, credits: true }
    });

    if (!currentUser) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    console.log(`[BALANCE_UPDATE] Current balance: ${currentUser.balance}, Current credits: ${currentUser.credits}`);

    // 1. Update User Balance and Credits
    const updatedUser = await prismaClient.user.update({
      where: { id: userId },
      data: {
        balance: {
          increment: amountDecimal, // Use increment for atomic update
        },
        credits: {
          increment: Number(amountDecimal), // Also update credits field
        },
      },
    });

    // Verify the update was successful by comparing before and after values
    const expectedBalance = new Decimal(currentUser.balance).plus(amountDecimal);
    const expectedCredits = currentUser.credits + Number(amountDecimal);
    
    const balanceUpdatedCorrectly = updatedUser.balance.equals(expectedBalance);
    const creditsUpdatedCorrectly = updatedUser.credits === expectedCredits;

    if (!balanceUpdatedCorrectly || !creditsUpdatedCorrectly) {
      console.error(`[BALANCE_UPDATE_ERROR] Balance or credits update did not match expected values!`);
      console.error(`Expected balance: ${expectedBalance}, Actual: ${updatedUser.balance}`);
      console.error(`Expected credits: ${expectedCredits}, Actual: ${updatedUser.credits}`);
    }

    // 2. Create Transaction Log
    await prismaClient.transaction.create({ // Use prismaClient (which could be tx) directly
      data: {
        userId,
        type,
        amount: amountDecimal,
        description,
        matchId,
      },
    });

    console.log(`Balance updated for user ${userId}. Type: ${type}, Amount: ${amountDecimal}, New Balance: ${updatedUser.balance}`);
    return updatedUser;

  } catch (error) {
    console.error(`Failed to update balance for user ${userId}:`, error);
    // Consider more specific error handling or re-throwing
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific Prisma errors if needed
      if (error.code === 'P2025') { // Record not found
        throw new Error(`User with ID ${userId} not found.`);
      }
    }
    throw new Error(`Failed to update balance for user ${userId}.`);
  }
}

/**
 * Gets the current balance for a user.
 * 
 * @param userId - The ID of the user.
 * @returns The user's current balance.
 * @throws Error if user not found.
 */
export async function getUserBalance(userId: string): Promise<Decimal> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });

  if (!user) {
    throw new Error(`User with ID ${userId} not found.`);
  }

  return user.balance;
}

// Example Usage (within an API route or server action):
// try {
//   // Deposit example
//   await updateBalance({
//     userId: 'user_id_here',
//     amount: new Decimal(100.50),
//     type: TransactionType.DEPOSIT,
//     description: 'User deposit via Stripe',
//   });

//   // Match entry fee example (within a transaction)
//   await prisma.$transaction(async (tx) => {
//     await updateBalance({
//       userId: 'player1_id',
//       amount: new Decimal(-50), // Negative amount for deduction
//       type: TransactionType.MATCH_ENTRY,
//       matchId: 'match_id_here',
//       prismaTx: tx, // Pass the transaction client
//     });
//     // Potentially update match status or other actions within the same transaction
//   });
// } catch (error) {
//   console.error('Balance update failed:', error);
//   // Handle error appropriately (e.g., return error response)
// } 
