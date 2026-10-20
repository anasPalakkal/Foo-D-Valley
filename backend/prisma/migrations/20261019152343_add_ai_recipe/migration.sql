/*
  Warnings:

  - A unique constraint covering the columns `[aiRecipeId]` on the table `Favorite` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Favorite" ADD COLUMN     "aiRecipeId" INTEGER;

-- CreateTable
CREATE TABLE "AiRecipe" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "servings" INTEGER,
    "prepTimeMinutes" INTEGER,
    "cookTimeMinutes" INTEGER,
    "ingredients" JSONB NOT NULL,
    "steps" JSONB NOT NULL,
    "nutrition" JSONB,
    "imageUrl" TEXT,
    "imageCredit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "AiRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiRecipe_userId_idx" ON "AiRecipe"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_aiRecipeId_key" ON "Favorite"("aiRecipeId");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_aiRecipeId_fkey" FOREIGN KEY ("aiRecipeId") REFERENCES "AiRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRecipe" ADD CONSTRAINT "AiRecipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Favorite" DROP CONSTRAINT favorite_exactly_one_target;
ALTER TABLE "Favorite" ADD CONSTRAINT favorite_exactly_one_target
  CHECK (num_nonnulls("recipeId", "externalId", "aiRecipeId") = 1);