CREATE TABLE "travel_data_source" (
  "public_data_pk" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "organization" TEXT,
  "source_keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "formats" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "local_file_path" TEXT,
  "file_size_bytes" BIGINT,
  "column_count" INTEGER NOT NULL DEFAULT 0,
  "sample_headers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "capabilities" JSONB,
  "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "style_scores" JSONB,
  "usability_score" INTEGER NOT NULL DEFAULT 0,
  "usability_grade" TEXT NOT NULL DEFAULT 'D',
  "recommendation_use" TEXT NOT NULL DEFAULT 'metadata-only',
  "reasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "cautions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "raw_inventory" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "travel_data_source_pkey" PRIMARY KEY ("public_data_pk")
);

CREATE TABLE "travel_asset" (
  "id" TEXT NOT NULL,
  "source_dataset_pk" TEXT NOT NULL,
  "source_title" TEXT NOT NULL,
  "source_file_path" TEXT,
  "source_row_index" INTEGER,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "province" TEXT,
  "city" TEXT,
  "legal_dong_name" TEXT,
  "address" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "matched_island_id" TEXT,
  "matched_island_name" TEXT,
  "travel_region_id" TEXT,
  "travel_region_name" TEXT,
  "match_type" TEXT,
  "match_score" INTEGER NOT NULL DEFAULT 0,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "evidence" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "travel_asset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "travel_asset_match" (
  "id" TEXT NOT NULL,
  "travel_asset_id" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT,
  "target_name" TEXT,
  "match_type" TEXT NOT NULL,
  "match_score" INTEGER NOT NULL DEFAULT 0,
  "evidence" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "travel_asset_match_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "travel_data_source_recommendation_use_idx" ON "travel_data_source"("recommendation_use");
CREATE INDEX "travel_data_source_usability_score_idx" ON "travel_data_source"("usability_score");
CREATE INDEX "travel_data_source_organization_idx" ON "travel_data_source"("organization");

CREATE INDEX "travel_asset_source_dataset_pk_idx" ON "travel_asset"("source_dataset_pk");
CREATE INDEX "travel_asset_name_idx" ON "travel_asset"("name");
CREATE INDEX "travel_asset_category_idx" ON "travel_asset"("category");
CREATE INDEX "travel_asset_province_city_idx" ON "travel_asset"("province", "city");
CREATE INDEX "travel_asset_travel_region_id_idx" ON "travel_asset"("travel_region_id");
CREATE INDEX "travel_asset_matched_island_id_idx" ON "travel_asset"("matched_island_id");
CREATE INDEX "travel_asset_match_score_idx" ON "travel_asset"("match_score");

CREATE INDEX "travel_asset_match_travel_asset_id_idx" ON "travel_asset_match"("travel_asset_id");
CREATE INDEX "travel_asset_match_target_type_target_id_idx" ON "travel_asset_match"("target_type", "target_id");
CREATE INDEX "travel_asset_match_match_score_idx" ON "travel_asset_match"("match_score");

ALTER TABLE "travel_asset"
  ADD CONSTRAINT "travel_asset_source_dataset_pk_fkey"
  FOREIGN KEY ("source_dataset_pk") REFERENCES "travel_data_source"("public_data_pk")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "travel_asset_match"
  ADD CONSTRAINT "travel_asset_match_travel_asset_id_fkey"
  FOREIGN KEY ("travel_asset_id") REFERENCES "travel_asset"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
