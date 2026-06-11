CREATE TABLE "island_master" (
    "id" TEXT NOT NULL,
    "island_key" TEXT NOT NULL,
    "legal_dong_code" TEXT NOT NULL,
    "legal_dong_name" TEXT NOT NULL,
    "island_unique_no" TEXT NOT NULL,
    "island_name" TEXT NOT NULL,
    "island_type_code" TEXT,
    "island_type_name" TEXT,
    "connection_type_code" TEXT,
    "connection_type_name" TEXT,
    "bridge_count" INTEGER,
    "bridge_names" TEXT,
    "reference_date" DATE NOT NULL,
    "source_region_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "island_master_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "island_master_island_key_key" ON "island_master"("island_key");
CREATE INDEX "island_master_island_name_idx" ON "island_master"("island_name");
CREATE INDEX "island_master_legal_dong_name_idx" ON "island_master"("legal_dong_name");
CREATE INDEX "island_master_island_type_name_idx" ON "island_master"("island_type_name");
