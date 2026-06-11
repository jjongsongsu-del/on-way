ALTER TABLE "island_master"
  ADD COLUMN IF NOT EXISTS "forecast_location_id" TEXT,
  ADD COLUMN IF NOT EXISTS "forecast_location_name" TEXT,
  ADD COLUMN IF NOT EXISTS "forecast_match_type" TEXT,
  ADD COLUMN IF NOT EXISTS "forecast_match_score" INTEGER,
  ADD COLUMN IF NOT EXISTS "vworld_feature_id" TEXT;

CREATE TABLE IF NOT EXISTS "marine_forecast_location" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "helper" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "aliases" TEXT[],
    "nx" INTEGER NOT NULL,
    "ny" INTEGER NOT NULL,
    "station_code" TEXT NOT NULL,
    "station_name" TEXT NOT NULL,
    "salinity_grid_code" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "source_note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marine_forecast_location_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "vworld_island_feature" (
    "id" TEXT NOT NULL,
    "island_unique_no" TEXT,
    "island_name" TEXT NOT NULL,
    "legal_dong_code" TEXT,
    "legal_dong_name" TEXT,
    "province_name" TEXT,
    "city_name" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "area_square_meters" DECIMAL(18,3),
    "coastline_length_meters" DECIMAL(18,3),
    "population" INTEGER,
    "raw" JSONB NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vworld_island_feature_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "island_master_forecast_location_id_idx" ON "island_master"("forecast_location_id");
CREATE INDEX IF NOT EXISTS "island_master_vworld_feature_id_idx" ON "island_master"("vworld_feature_id");
CREATE INDEX IF NOT EXISTS "marine_forecast_location_label_idx" ON "marine_forecast_location"("label");
CREATE INDEX IF NOT EXISTS "vworld_island_feature_island_unique_no_idx" ON "vworld_island_feature"("island_unique_no");
CREATE INDEX IF NOT EXISTS "vworld_island_feature_island_name_idx" ON "vworld_island_feature"("island_name");
CREATE INDEX IF NOT EXISTS "vworld_island_feature_legal_dong_code_idx" ON "vworld_island_feature"("legal_dong_code");
