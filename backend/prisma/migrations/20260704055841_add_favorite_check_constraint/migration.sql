ALTER TABLE "Favorite"
ADD CONSTRAINT favorite_exactly_one_target
CHECK (
  ("recipeId" IS NOT NULL AND "externalId" IS NULL)
  OR
  ("recipeId" IS NULL AND "externalId" IS NOT NULL)
);