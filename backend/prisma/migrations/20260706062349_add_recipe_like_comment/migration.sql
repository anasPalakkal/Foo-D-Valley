-- CreateTable
CREATE TABLE "RecipeLike" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "recipeId" INTEGER,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "externalId" TEXT,

    CONSTRAINT "RecipeLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeComment" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "recipeId" INTEGER,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "externalId" TEXT,

    CONSTRAINT "RecipeComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecipeLike_userId_recipeId_key" ON "RecipeLike"("userId", "recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeLike_userId_externalId_key" ON "RecipeLike"("userId", "externalId");

-- AddForeignKey
ALTER TABLE "RecipeLike" ADD CONSTRAINT "RecipeLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeLike" ADD CONSTRAINT "RecipeLike_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeComment" ADD CONSTRAINT "RecipeComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeComment" ADD CONSTRAINT "RecipeComment_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
