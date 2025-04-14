/*
  Warnings:

  - You are about to drop the column `winner` on the `Match` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Match" DROP COLUMN "winner",
ADD COLUMN     "player1Outcome" TEXT,
ADD COLUMN     "player2Outcome" TEXT,
ADD COLUMN     "winnerId" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 1000;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
