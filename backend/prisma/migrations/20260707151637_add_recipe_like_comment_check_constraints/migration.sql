ALTER TABLE "RecipeLike"
ADD CONSTRAINT recipelike_exactly_one_target
CHECK (
  ("recipeId" IS NOT NULL AND "externalId" IS NULL)
  OR
  ("recipeId" IS NULL AND "externalId" IS NOT NULL)
);

ALTER TABLE "RecipeComment"
ADD CONSTRAINT recipecomment_exactly_one_target
CHECK (
  ("recipeId" IS NOT NULL AND "externalId" IS NULL)
  OR
  ("recipeId" IS NULL AND "externalId" IS NOT NULL)
);