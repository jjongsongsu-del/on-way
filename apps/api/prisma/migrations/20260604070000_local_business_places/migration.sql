CREATE TABLE "local_business_place" (
    "id" TEXT NOT NULL,
    "source_file" TEXT NOT NULL,
    "source_category" TEXT NOT NULL,
    "place_type" TEXT NOT NULL,
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
    "x" DECIMAL(14,7),
    "y" DECIMAL(14,7),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "matched_island_name" TEXT,
    "matched_legal_dong_name" TEXT,
    "extra" JSONB,
    "reference_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_business_place_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "local_business_place_source_category_management_no_place_name_key"
    ON "local_business_place"("source_category", "management_no", "place_name");
CREATE INDEX "local_business_place_place_type_matched_island_name_idx"
    ON "local_business_place"("place_type", "matched_island_name");
CREATE INDEX "local_business_place_matched_island_name_idx"
    ON "local_business_place"("matched_island_name");
CREATE INDEX "local_business_place_matched_legal_dong_name_idx"
    ON "local_business_place"("matched_legal_dong_name");
CREATE INDEX "local_business_place_place_name_idx"
    ON "local_business_place"("place_name");
