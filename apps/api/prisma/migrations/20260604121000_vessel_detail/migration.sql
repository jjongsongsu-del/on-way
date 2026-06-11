CREATE TABLE IF NOT EXISTS "vessel_detail" (
    "id" TEXT NOT NULL,
    "ship_no" TEXT NOT NULL,
    "vessel_name" TEXT NOT NULL,
    "image_url" TEXT,
    "image_data_url" TEXT,
    "source_url" TEXT NOT NULL,
    "gross_tonnage" TEXT,
    "dimensions" TEXT,
    "ship_type" TEXT,
    "ship_kind" TEXT,
    "max_speed" TEXT,
    "cruise_speed" TEXT,
    "engine_type" TEXT,
    "engine_power" TEXT,
    "navigation_area" TEXT,
    "passenger_capacity" TEXT,
    "route_name" TEXT,
    "operator_name" TEXT,
    "collected_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vessel_detail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vessel_detail_ship_no_key" ON "vessel_detail"("ship_no");
CREATE INDEX IF NOT EXISTS "vessel_detail_vessel_name_idx" ON "vessel_detail"("vessel_name");
