-- Enable trigram search for case-insensitive "contains" product search
-- (Requirement 9.1, 29.8). A GIN index on Product.name accelerates ILIKE.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx"
  ON "Product" USING GIN ("name" gin_trgm_ops);
