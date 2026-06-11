DROP INDEX IF EXISTS "ferry_route_master_route_key_key";

ALTER TABLE "ferry_route_master"
ADD COLUMN IF NOT EXISTS "route_pair_key" TEXT;

UPDATE "ferry_route_master"
SET "route_pair_key" = "route_key" || ':' || "departure_port_name" || ':' || "arrival_port_name"
WHERE "route_pair_key" IS NULL;

ALTER TABLE "ferry_route_master"
ALTER COLUMN "route_pair_key" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ferry_route_master_route_pair_key_key" ON "ferry_route_master"("route_pair_key");
CREATE INDEX IF NOT EXISTS "ferry_route_master_route_key_idx" ON "ferry_route_master"("route_key");
