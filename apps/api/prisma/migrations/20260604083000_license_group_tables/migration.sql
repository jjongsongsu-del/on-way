DROP TABLE IF EXISTS "local_business_place";

CREATE TABLE "license_lodging" (
    "id" TEXT NOT NULL,
    "source_file" TEXT NOT NULL,
    "license_type" TEXT NOT NULL,
    "management_no" TEXT,
    "place_name" TEXT NOT NULL,
    "business_status" TEXT,
    "detail_status" TEXT,
    "category_name" TEXT,
    "road_address" TEXT,
    "lot_address" TEXT,
    "phone" TEXT,
    "permit_date" DATE,
    "close_date" DATE,
    "room_count" INTEGER,
    "korean_room_count" INTEGER,
    "western_room_count" INTEGER,
    "breakfast_available" TEXT,
    "toilet_count" INTEGER,
    "x" DECIMAL(14,7),
    "y" DECIMAL(14,7),
    "extra" JSONB,
    "reference_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "license_lodging_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "license_restaurant" (
    "id" TEXT NOT NULL,
    "source_file" TEXT NOT NULL,
    "license_type" TEXT NOT NULL,
    "management_no" TEXT,
    "place_name" TEXT NOT NULL,
    "business_status" TEXT,
    "detail_status" TEXT,
    "category_name" TEXT,
    "hygiene_category" TEXT,
    "main_food" TEXT,
    "road_address" TEXT,
    "lot_address" TEXT,
    "phone" TEXT,
    "homepage" TEXT,
    "permit_date" DATE,
    "close_date" DATE,
    "facility_scale" DECIMAL(14,3),
    "x" DECIMAL(14,7),
    "y" DECIMAL(14,7),
    "extra" JSONB,
    "reference_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "license_restaurant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "license_camping" (
    "id" TEXT NOT NULL,
    "source_file" TEXT NOT NULL,
    "license_type" TEXT NOT NULL,
    "management_no" TEXT,
    "place_name" TEXT NOT NULL,
    "business_status" TEXT,
    "detail_status" TEXT,
    "category_name" TEXT,
    "road_address" TEXT,
    "lot_address" TEXT,
    "phone" TEXT,
    "permit_date" DATE,
    "close_date" DATE,
    "room_count" INTEGER,
    "facility_scale" DECIMAL(14,3),
    "facility_area" DECIMAL(14,3),
    "insurance_org" TEXT,
    "environment_name" TEXT,
    "x" DECIMAL(14,7),
    "y" DECIMAL(14,7),
    "extra" JSONB,
    "reference_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "license_camping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "license_facility" (
    "id" TEXT NOT NULL,
    "source_file" TEXT NOT NULL,
    "license_type" TEXT NOT NULL,
    "management_no" TEXT,
    "place_name" TEXT NOT NULL,
    "category_name" TEXT,
    "road_address" TEXT,
    "lot_address" TEXT,
    "phone" TEXT,
    "manager_name" TEXT,
    "open_hours" TEXT,
    "fee" TEXT,
    "fish_species" TEXT,
    "amenities" TEXT,
    "safety_facilities" TEXT,
    "nearby_attractions" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "extra" JSONB,
    "reference_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "license_facility_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "license_medical" (
    "id" TEXT NOT NULL,
    "source_file" TEXT NOT NULL,
    "license_type" TEXT NOT NULL,
    "management_no" TEXT,
    "place_name" TEXT NOT NULL,
    "business_status" TEXT,
    "detail_status" TEXT,
    "category_name" TEXT,
    "medical_type" TEXT,
    "departments" TEXT,
    "road_address" TEXT,
    "lot_address" TEXT,
    "phone" TEXT,
    "permit_date" DATE,
    "close_date" DATE,
    "bed_count" INTEGER,
    "doctor_count" INTEGER,
    "room_count" INTEGER,
    "x" DECIMAL(14,7),
    "y" DECIMAL(14,7),
    "extra" JSONB,
    "reference_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "license_medical_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "island_license_match" (
    "id" TEXT NOT NULL,
    "island_key" TEXT NOT NULL,
    "island_name" TEXT NOT NULL,
    "legal_dong_name" TEXT,
    "license_group" TEXT NOT NULL,
    "license_table" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "match_type" TEXT NOT NULL,
    "match_keyword" TEXT NOT NULL,
    "match_score" INTEGER NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "island_license_match_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "license_lodging_place_name_idx" ON "license_lodging"("place_name");
CREATE INDEX "license_lodging_road_address_idx" ON "license_lodging"("road_address");
CREATE INDEX "license_lodging_lot_address_idx" ON "license_lodging"("lot_address");

CREATE INDEX "license_restaurant_place_name_idx" ON "license_restaurant"("place_name");
CREATE INDEX "license_restaurant_road_address_idx" ON "license_restaurant"("road_address");
CREATE INDEX "license_restaurant_lot_address_idx" ON "license_restaurant"("lot_address");

CREATE INDEX "license_camping_place_name_idx" ON "license_camping"("place_name");
CREATE INDEX "license_camping_road_address_idx" ON "license_camping"("road_address");
CREATE INDEX "license_camping_lot_address_idx" ON "license_camping"("lot_address");

CREATE INDEX "license_facility_place_name_idx" ON "license_facility"("place_name");
CREATE INDEX "license_facility_road_address_idx" ON "license_facility"("road_address");
CREATE INDEX "license_facility_lot_address_idx" ON "license_facility"("lot_address");

CREATE INDEX "license_medical_place_name_idx" ON "license_medical"("place_name");
CREATE INDEX "license_medical_road_address_idx" ON "license_medical"("road_address");
CREATE INDEX "license_medical_lot_address_idx" ON "license_medical"("lot_address");

CREATE UNIQUE INDEX "island_license_match_island_key_license_group_license_id_key"
    ON "island_license_match"("island_key", "license_group", "license_id");
CREATE INDEX "island_license_match_island_name_license_group_idx"
    ON "island_license_match"("island_name", "license_group");
CREATE INDEX "island_license_match_license_group_license_id_idx"
    ON "island_license_match"("license_group", "license_id");
