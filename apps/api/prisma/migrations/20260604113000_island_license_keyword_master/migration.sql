CREATE TABLE "island_license_keyword" (
    "id" TEXT NOT NULL,
    "island_key" TEXT NOT NULL,
    "island_name" TEXT NOT NULL,
    "legal_dong_name" TEXT,
    "match_keyword" TEXT NOT NULL,
    "normalized_keyword" TEXT NOT NULL,
    "source_match_count" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "island_license_keyword_pkey" PRIMARY KEY ("id")
);

INSERT INTO "island_license_keyword" (
    "id",
    "island_key",
    "island_name",
    "legal_dong_name",
    "match_keyword",
    "normalized_keyword",
    "source_match_count"
)
SELECT
    md5("island_key" || '|' || "match_keyword") AS "id",
    "island_key",
    "island_name",
    MIN("legal_dong_name") AS "legal_dong_name",
    "match_keyword",
    regexp_replace("match_keyword", '\s+', '', 'g') AS "normalized_keyword",
    COUNT(*)::integer AS "source_match_count"
FROM "island_license_match"
GROUP BY "island_key", "island_name", "match_keyword";

CREATE UNIQUE INDEX "island_license_keyword_island_key_match_keyword_key"
    ON "island_license_keyword"("island_key", "match_keyword");
CREATE INDEX "island_license_keyword_island_name_idx" ON "island_license_keyword"("island_name");
CREATE INDEX "island_license_keyword_legal_dong_name_idx" ON "island_license_keyword"("legal_dong_name");
CREATE INDEX "island_license_keyword_match_keyword_idx" ON "island_license_keyword"("match_keyword");
CREATE INDEX "island_license_keyword_normalized_keyword_idx" ON "island_license_keyword"("normalized_keyword");
