/*
  Warnings:

  - You are about to drop the column `discordUsername` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `tofId` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_tofId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "discordUsername",
DROP COLUMN "tofId";
