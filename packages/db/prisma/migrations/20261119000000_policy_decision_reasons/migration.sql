-- Record why a purchase policy required human approval. Existing rows get an
-- empty array; behavior is unchanged.
ALTER TABLE "CheckoutIntent" ADD COLUMN "policyDecisionReasons" TEXT[] DEFAULT ARRAY[]::TEXT[];
