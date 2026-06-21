/*
  Warnings:

  - A unique constraint covering the columns `[userId,externalId]` on the table `Favorite` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Favorite" DROP CONSTRAINT "Favorite_recipeId_fkey";

-- AlterTable
ALTER TABLE "Favorite" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalImage" TEXT,
ADD COLUMN     "externalName" TEXT,
ADD COLUMN     "isExternal" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "recipeId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_externalId_key" ON "Favorite"("userId", "externalId");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
