-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('IOS', 'ANDROID', 'WEB', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PushProvider" AS ENUM ('EXPO', 'FCM', 'APNS');

-- CreateTable
CREATE TABLE "port" (
    "id" TEXT NOT NULL,
    "port_code" TEXT NOT NULL,
    "port_name" TEXT NOT NULL,
    "region_name" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "port_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminal" (
    "id" TEXT NOT NULL,
    "port_id" TEXT,
    "terminal_code" TEXT,
    "terminal_name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "map_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terminal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_user" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_token" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "provider" "PushProvider" NOT NULL,
    "platform" "Platform" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "port_port_code_key" ON "port"("port_code");

-- CreateIndex
CREATE INDEX "port_port_name_idx" ON "port"("port_name");

-- CreateIndex
CREATE INDEX "terminal_terminal_name_idx" ON "terminal"("terminal_name");

-- CreateIndex
CREATE UNIQUE INDEX "device_user_device_id_key" ON "device_user"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_token_token_key" ON "push_token"("token");

-- CreateIndex
CREATE INDEX "push_token_user_id_enabled_idx" ON "push_token"("user_id", "enabled");

-- CreateIndex
CREATE INDEX "route_provider_operation_route_code_idx" ON "route"("provider", "operation_route_code");

-- AddForeignKey
ALTER TABLE "route_stop" ADD CONSTRAINT "route_stop_port_code_fkey" FOREIGN KEY ("port_code") REFERENCES "port"("port_code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminal" ADD CONSTRAINT "terminal_port_id_fkey" FOREIGN KEY ("port_id") REFERENCES "port"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_token" ADD CONSTRAINT "push_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "device_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
