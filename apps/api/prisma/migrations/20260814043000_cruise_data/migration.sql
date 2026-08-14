CREATE TABLE "cruise_port" (
  "id" TEXT NOT NULL,
  "port_key" TEXT NOT NULL,
  "port_name" TEXT NOT NULL,
  "region_name" TEXT,
  "city_name" TEXT,
  "terminal_name" TEXT,
  "source_name" TEXT NOT NULL,
  "source_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cruise_port_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cruise_vessel" (
  "id" TEXT NOT NULL,
  "vessel_key" TEXT NOT NULL,
  "vessel_name" TEXT NOT NULL,
  "operator_name" TEXT,
  "registry_country" TEXT,
  "gross_tonnage" DECIMAL(14,3),
  "length_meter" DECIMAL(10,3),
  "max_draft_meter" DECIMAL(10,3),
  "air_draft_meter" DECIMAL(10,3),
  "crew_count" INTEGER,
  "passenger_capacity" INTEGER,
  "source_name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cruise_vessel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cruise_schedule" (
  "id" TEXT NOT NULL,
  "schedule_key" TEXT NOT NULL,
  "port_id" TEXT NOT NULL,
  "vessel_id" TEXT,
  "vessel_name" TEXT NOT NULL,
  "operator_name" TEXT,
  "arrival_date" DATE NOT NULL,
  "arrival_time" TEXT,
  "departure_date" DATE,
  "departure_time" TEXT,
  "home_port_code" TEXT,
  "home_port_name" TEXT,
  "previous_port_code" TEXT,
  "previous_port_name" TEXT,
  "next_port_code" TEXT,
  "next_port_name" TEXT,
  "berth_name" TEXT,
  "schedule_type" TEXT,
  "agent_name" TEXT,
  "agent_tel" TEXT,
  "source_name" TEXT NOT NULL,
  "source_url" TEXT,
  "raw" JSONB,
  "collected_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cruise_schedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cruise_tour_product" (
  "id" TEXT NOT NULL,
  "product_key" TEXT NOT NULL,
  "port_id" TEXT,
  "product_name" TEXT NOT NULL,
  "address" TEXT,
  "price_text" TEXT,
  "operating_hours" TEXT,
  "closed_days" TEXT,
  "travel_time_text" TEXT,
  "image_included" BOOLEAN NOT NULL DEFAULT false,
  "accessibility" JSONB,
  "description" TEXT,
  "source_name" TEXT NOT NULL,
  "source_url" TEXT,
  "reference_date" DATE,
  "raw" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cruise_tour_product_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cruise_port_port_key_key" ON "cruise_port"("port_key");
CREATE INDEX "cruise_port_port_name_idx" ON "cruise_port"("port_name");
CREATE INDEX "cruise_port_region_name_idx" ON "cruise_port"("region_name");

CREATE UNIQUE INDEX "cruise_vessel_vessel_key_key" ON "cruise_vessel"("vessel_key");
CREATE INDEX "cruise_vessel_vessel_name_idx" ON "cruise_vessel"("vessel_name");
CREATE INDEX "cruise_vessel_operator_name_idx" ON "cruise_vessel"("operator_name");

CREATE UNIQUE INDEX "cruise_schedule_schedule_key_key" ON "cruise_schedule"("schedule_key");
CREATE INDEX "cruise_schedule_arrival_date_idx" ON "cruise_schedule"("arrival_date");
CREATE INDEX "cruise_schedule_port_id_arrival_date_idx" ON "cruise_schedule"("port_id", "arrival_date");
CREATE INDEX "cruise_schedule_vessel_name_idx" ON "cruise_schedule"("vessel_name");
CREATE INDEX "cruise_schedule_schedule_type_idx" ON "cruise_schedule"("schedule_type");

CREATE UNIQUE INDEX "cruise_tour_product_product_key_key" ON "cruise_tour_product"("product_key");
CREATE INDEX "cruise_tour_product_product_name_idx" ON "cruise_tour_product"("product_name");
CREATE INDEX "cruise_tour_product_address_idx" ON "cruise_tour_product"("address");

ALTER TABLE "cruise_schedule"
  ADD CONSTRAINT "cruise_schedule_port_id_fkey"
  FOREIGN KEY ("port_id") REFERENCES "cruise_port"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cruise_schedule"
  ADD CONSTRAINT "cruise_schedule_vessel_id_fkey"
  FOREIGN KEY ("vessel_id") REFERENCES "cruise_vessel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cruise_tour_product"
  ADD CONSTRAINT "cruise_tour_product_port_id_fkey"
  FOREIGN KEY ("port_id") REFERENCES "cruise_port"("id") ON DELETE SET NULL ON UPDATE CASCADE;
