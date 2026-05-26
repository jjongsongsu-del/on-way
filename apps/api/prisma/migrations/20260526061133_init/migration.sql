-- CreateEnum
CREATE TYPE "SailingStatusCode" AS ENUM ('NORMAL', 'SCHEDULED', 'DELAYED', 'CANCELED', 'CONTROLLED', 'COMPLETED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ForecastStatusCode" AS ENUM ('AVAILABLE', 'CAUTION', 'UNCERTAIN', 'CONTROL_POSSIBLE', 'UNAVAILABLE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FavoriteType" AS ENUM ('ROUTE', 'VESSEL', 'TERMINAL', 'PORT');

-- CreateTable
CREATE TABLE "route" (
    "id" TEXT NOT NULL,
    "license_route_code" TEXT,
    "license_route_name" TEXT,
    "operation_route_code" TEXT,
    "operation_route_name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_stop" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "stop_sequence" INTEGER NOT NULL,
    "port_code" TEXT,
    "port_name" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),

    CONSTRAINT "route_stop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vessel" (
    "id" TEXT NOT NULL,
    "vessel_code" TEXT,
    "vessel_name" TEXT NOT NULL,
    "passenger_capacity" INTEGER,
    "operator_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vessel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sailing_schedule" (
    "id" TEXT NOT NULL,
    "sailing_date" DATE NOT NULL,
    "departure_time" TEXT NOT NULL,
    "departure_port_name" TEXT NOT NULL,
    "arrival_port_name" TEXT NOT NULL,
    "route_id" TEXT,
    "vessel_id" TEXT,
    "control_reason" TEXT,
    "passenger_capacity" INTEGER,
    "status" "SailingStatusCode" NOT NULL DEFAULT 'UNKNOWN',
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sailing_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sailing_status" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT,
    "sailing_date" DATE NOT NULL,
    "vessel_name" TEXT,
    "route_name" TEXT,
    "status_code" "SailingStatusCode" NOT NULL DEFAULT 'UNKNOWN',
    "status_name" TEXT NOT NULL,
    "delay_minutes" INTEGER,
    "control_reason" TEXT,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sailing_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sailing_forecast" (
    "id" TEXT NOT NULL,
    "forecast_date" DATE NOT NULL,
    "route_id" TEXT,
    "vessel_id" TEXT,
    "forecast_status" "ForecastStatusCode" NOT NULL DEFAULT 'UNKNOWN',
    "forecast_reason" TEXT,
    "weather_summary" TEXT,
    "risk_level" "RiskLevel" NOT NULL DEFAULT 'UNKNOWN',
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sailing_forecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorite" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "favorite_type" "FavoriteType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "notification_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_rule" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "favorite_id" TEXT,
    "notify_status_change" BOOLEAN NOT NULL DEFAULT true,
    "notify_departure_minutes_before" INTEGER,
    "notify_forecast_update" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_event" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "route_stop_route_id_stop_sequence_idx" ON "route_stop"("route_id", "stop_sequence");

-- CreateIndex
CREATE INDEX "sailing_schedule_sailing_date_departure_port_name_arrival_p_idx" ON "sailing_schedule"("sailing_date", "departure_port_name", "arrival_port_name");

-- CreateIndex
CREATE INDEX "sailing_status_sailing_date_status_code_idx" ON "sailing_status"("sailing_date", "status_code");

-- CreateIndex
CREATE INDEX "sailing_forecast_forecast_date_forecast_status_idx" ON "sailing_forecast"("forecast_date", "forecast_status");

-- CreateIndex
CREATE INDEX "user_favorite_user_id_favorite_type_idx" ON "user_favorite"("user_id", "favorite_type");

-- CreateIndex
CREATE INDEX "notification_rule_user_id_idx" ON "notification_rule"("user_id");

-- CreateIndex
CREATE INDEX "notification_event_user_id_event_type_idx" ON "notification_event"("user_id", "event_type");

-- AddForeignKey
ALTER TABLE "route_stop" ADD CONSTRAINT "route_stop_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sailing_schedule" ADD CONSTRAINT "sailing_schedule_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sailing_schedule" ADD CONSTRAINT "sailing_schedule_vessel_id_fkey" FOREIGN KEY ("vessel_id") REFERENCES "vessel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sailing_status" ADD CONSTRAINT "sailing_status_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "sailing_schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sailing_forecast" ADD CONSTRAINT "sailing_forecast_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sailing_forecast" ADD CONSTRAINT "sailing_forecast_vessel_id_fkey" FOREIGN KEY ("vessel_id") REFERENCES "vessel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
