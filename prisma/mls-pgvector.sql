CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Listing"
  ADD COLUMN IF NOT EXISTS "embeddingVector" vector(1536);

CREATE INDEX IF NOT EXISTS "Listing_embeddingVector_hnsw_idx"
  ON "Listing"
  USING hnsw ("embeddingVector" vector_cosine_ops);
