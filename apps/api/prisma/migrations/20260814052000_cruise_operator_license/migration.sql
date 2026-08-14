CREATE TABLE "cruise_operator_license" (
  "id" TEXT NOT NULL,
  "license_key" TEXT NOT NULL,
  "port_id" TEXT,
  "management_no" TEXT,
  "business_name" TEXT NOT NULL,
  "business_status" TEXT,
  "detail_status" TEXT,
  "road_address" TEXT,
  "lot_address" TEXT,
  "phone" TEXT,
  "permit_date" DATE,
  "close_date" DATE,
  "local_government_code" TEXT,
  "local_government_name" TEXT,
  "x" DECIMAL(14,7),
  "y" DECIMAL(14,7),
  "source_name" TEXT NOT NULL,
  "source_url" TEXT,
  "raw" JSONB,
  "collected_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cruise_operator_license_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cruise_operator_license_license_key_key" ON "cruise_operator_license"("license_key");
CREATE INDEX "cruise_operator_license_business_name_idx" ON "cruise_operator_license"("business_name");
CREATE INDEX "cruise_operator_license_business_status_idx" ON "cruise_operator_license"("business_status");
CREATE INDEX "cruise_operator_license_road_address_idx" ON "cruise_operator_license"("road_address");
CREATE INDEX "cruise_operator_license_lot_address_idx" ON "cruise_operator_license"("lot_address");

ALTER TABLE "cruise_operator_license"
  ADD CONSTRAINT "cruise_operator_license_port_id_fkey"
  FOREIGN KEY ("port_id") REFERENCES "cruise_port"("id") ON DELETE SET NULL ON UPDATE CASCADE;
