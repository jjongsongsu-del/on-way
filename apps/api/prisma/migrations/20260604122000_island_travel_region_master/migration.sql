ALTER TABLE "island_master"
  ADD COLUMN IF NOT EXISTS "travel_region_id" TEXT,
  ADD COLUMN IF NOT EXISTS "travel_region_name" TEXT,
  ADD COLUMN IF NOT EXISTS "travel_region_match_type" TEXT,
  ADD COLUMN IF NOT EXISTS "travel_region_match_score" INTEGER;

CREATE TABLE IF NOT EXISTS "island_travel_region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region_group" TEXT NOT NULL,
    "description" TEXT,
    "province_names" TEXT[] NOT NULL,
    "city_names" TEXT[] NOT NULL,
    "main_port_names" TEXT[] NOT NULL,
    "aliases" TEXT[] NOT NULL,
    "primary_forecast_region_id" TEXT,
    "forecast_region_ids" TEXT[] NOT NULL,
    "center_latitude" DECIMAL(10,7),
    "center_longitude" DECIMAL(10,7),
    "sort_order" INTEGER NOT NULL,
    "source_note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "island_travel_region_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "island_master_travel_region_id_idx" ON "island_master"("travel_region_id");
CREATE INDEX IF NOT EXISTS "island_travel_region_name_idx" ON "island_travel_region"("name");
CREATE INDEX IF NOT EXISTS "island_travel_region_region_group_idx" ON "island_travel_region"("region_group");
CREATE INDEX IF NOT EXISTS "island_travel_region_primary_forecast_region_id_idx" ON "island_travel_region"("primary_forecast_region_id");
