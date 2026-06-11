CREATE TABLE "recommended_island" (
  "id" TEXT NOT NULL,
  "island_name" TEXT NOT NULL,
  "display_name" TEXT,
  "province_name" TEXT,
  "city_name" TEXT,
  "island_key" TEXT,
  "description" TEXT NOT NULL,
  "address" TEXT,
  "contact" TEXT,
  "photo_description" TEXT,
  "ferry_summary" TEXT,
  "traffic_info" TEXT,
  "lodging_info" TEXT,
  "food_info" TEXT,
  "nearby_attractions" TEXT,
  "photo_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "source_data" JSONB,
  "highlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "travel_styles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "source_title" TEXT NOT NULL,
  "source_url" TEXT NOT NULL,
  "source_type" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 50,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "recommended_island_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recommended_island_island_name_idx" ON "recommended_island"("island_name");
CREATE INDEX "recommended_island_province_name_city_name_idx" ON "recommended_island"("province_name", "city_name");
CREATE INDEX "recommended_island_source_type_idx" ON "recommended_island"("source_type");
CREATE INDEX "recommended_island_priority_idx" ON "recommended_island"("priority");
CREATE INDEX "recommended_island_active_idx" ON "recommended_island"("active");
