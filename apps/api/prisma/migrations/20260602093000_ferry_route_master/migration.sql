CREATE TABLE "ferry_route_master" (
    "id" TEXT NOT NULL,
    "route_key" TEXT NOT NULL,
    "route_name" TEXT NOT NULL,
    "normalized_route_name" TEXT NOT NULL,
    "departure_port_name" TEXT NOT NULL,
    "arrival_port_name" TEXT NOT NULL,
    "stop_port_names" TEXT[],
    "vessel_names" TEXT[],
    "operator_names" TEXT[],
    "waypoint_count" INTEGER NOT NULL DEFAULT 0,
    "min_latitude" DECIMAL(10,7),
    "max_latitude" DECIMAL(10,7),
    "min_longitude" DECIMAL(10,7),
    "max_longitude" DECIMAL(10,7),
    "source" TEXT NOT NULL,
    "reference_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ferry_route_master_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ferry_port_master" (
    "id" TEXT NOT NULL,
    "port_key" TEXT NOT NULL,
    "port_name" TEXT NOT NULL,
    "normalized_port_name" TEXT NOT NULL,
    "route_count" INTEGER NOT NULL DEFAULT 0,
    "departure_route_count" INTEGER NOT NULL DEFAULT 0,
    "arrival_route_count" INTEGER NOT NULL DEFAULT 0,
    "island_key" TEXT,
    "island_name" TEXT,
    "legal_dong_name" TEXT,
    "forecast_location_id" TEXT,
    "forecast_location_name" TEXT,
    "source" TEXT NOT NULL,
    "reference_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ferry_port_master_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ferry_route_master_route_key_key" ON "ferry_route_master"("route_key");
CREATE INDEX "ferry_route_master_departure_port_name_idx" ON "ferry_route_master"("departure_port_name");
CREATE INDEX "ferry_route_master_arrival_port_name_idx" ON "ferry_route_master"("arrival_port_name");
CREATE INDEX "ferry_route_master_route_name_idx" ON "ferry_route_master"("route_name");

CREATE UNIQUE INDEX "ferry_port_master_port_key_key" ON "ferry_port_master"("port_key");
CREATE INDEX "ferry_port_master_port_name_idx" ON "ferry_port_master"("port_name");
CREATE INDEX "ferry_port_master_normalized_port_name_idx" ON "ferry_port_master"("normalized_port_name");
CREATE INDEX "ferry_port_master_island_name_idx" ON "ferry_port_master"("island_name");
