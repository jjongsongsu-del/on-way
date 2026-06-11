CREATE TABLE "address_master" (
    "id" TEXT NOT NULL,
    "zip_code" TEXT NOT NULL,
    "sido" TEXT NOT NULL,
    "sido_english" TEXT,
    "sigungu" TEXT,
    "sigungu_english" TEXT,
    "eupmyeon" TEXT,
    "eupmyeon_english" TEXT,
    "road_name_code" TEXT,
    "road_name" TEXT,
    "road_name_english" TEXT,
    "basement_flag" BOOLEAN NOT NULL DEFAULT false,
    "building_main_no" INTEGER,
    "building_sub_no" INTEGER,
    "building_management_no" TEXT,
    "bulk_delivery_name" TEXT,
    "building_name" TEXT,
    "legal_dong_code" TEXT,
    "legal_dong_name" TEXT,
    "ri_name" TEXT,
    "administrative_dong_name" TEXT,
    "mountain_flag" BOOLEAN NOT NULL DEFAULT false,
    "lot_main_no" INTEGER,
    "eupmyeondong_serial_no" TEXT,
    "lot_sub_no" INTEGER,
    "old_zip_code" TEXT,
    "zip_serial_no" TEXT,
    "full_road_address" TEXT NOT NULL,
    "full_lot_address" TEXT NOT NULL,
    "normalized_address" TEXT NOT NULL,
    "marine_region_id" TEXT,
    "marine_region_name" TEXT,
    "marine_region_match_type" TEXT,
    "marine_region_match_score" INTEGER,
    "source_file" TEXT NOT NULL,
    "reference_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "address_master_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "address_master_zip_code_idx" ON "address_master"("zip_code");
CREATE INDEX "address_master_sido_sigungu_idx" ON "address_master"("sido", "sigungu");
CREATE INDEX "address_master_eupmyeon_idx" ON "address_master"("eupmyeon");
CREATE INDEX "address_master_legal_dong_code_idx" ON "address_master"("legal_dong_code");
CREATE INDEX "address_master_legal_dong_name_idx" ON "address_master"("legal_dong_name");
CREATE INDEX "address_master_road_name_idx" ON "address_master"("road_name");
CREATE INDEX "address_master_building_management_no_idx" ON "address_master"("building_management_no");
CREATE INDEX "address_master_marine_region_id_idx" ON "address_master"("marine_region_id");
