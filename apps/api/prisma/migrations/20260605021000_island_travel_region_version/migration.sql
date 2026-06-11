ALTER TABLE "island_travel_region"
  ADD COLUMN IF NOT EXISTS "version" TEXT NOT NULL DEFAULT '1.0';
