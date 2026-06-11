ALTER TABLE "address_master"
  ADD COLUMN IF NOT EXISTS "travel_region_id" TEXT,
  ADD COLUMN IF NOT EXISTS "travel_region_name" TEXT,
  ADD COLUMN IF NOT EXISTS "travel_region_match_type" TEXT,
  ADD COLUMN IF NOT EXISTS "travel_region_match_score" INTEGER;

CREATE INDEX IF NOT EXISTS "address_master_travel_region_id_idx" ON "address_master"("travel_region_id");
