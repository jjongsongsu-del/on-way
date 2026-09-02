CREATE TABLE IF NOT EXISTS "ggtour_content" (
  "id" TEXT NOT NULL,
  "content_id" TEXT,
  "title" TEXT NOT NULL,
  "category" TEXT,
  "sigungu_name" TEXT,
  "address" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "tel" TEXT,
  "homepage_url" TEXT,
  "image_url" TEXT,
  "summary" TEXT,
  "description" TEXT,
  "source_url" TEXT,
  "raw" JSONB,
  "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ggtour_content_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ggtour_content_content_id_idx" ON "ggtour_content"("content_id");
CREATE INDEX IF NOT EXISTS "ggtour_content_title_idx" ON "ggtour_content"("title");
CREATE INDEX IF NOT EXISTS "ggtour_content_category_idx" ON "ggtour_content"("category");
CREATE INDEX IF NOT EXISTS "ggtour_content_sigungu_name_idx" ON "ggtour_content"("sigungu_name");
CREATE INDEX IF NOT EXISTS "ggtour_content_address_idx" ON "ggtour_content"("address");
