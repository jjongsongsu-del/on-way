CREATE TABLE IF NOT EXISTS "public_data_file_dataset" (
  "public_data_pk" TEXT NOT NULL,
  "public_data_detail_pk" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "organization" TEXT,
  "category" TEXT,
  "service_type" TEXT,
  "formats" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "license" TEXT,
  "detail_url" TEXT NOT NULL,
  "download_url" TEXT,
  "download_action" TEXT,
  "atch_file_id" TEXT,
  "file_detail_sn" TEXT,
  "original_file_name" TEXT,
  "file_extension" TEXT,
  "file_size_text" TEXT,
  "view_count" INTEGER,
  "download_count" INTEGER,
  "modified_date" DATE,
  "registered_at_source" TIMESTAMP(3),
  "updated_at_source" TIMESTAMP(3),
  "next_update_date" DATE,
  "update_cycle" TEXT,
  "suitability_score" INTEGER NOT NULL DEFAULT 0,
  "island_relevance" TEXT,
  "download_status" TEXT NOT NULL DEFAULT 'PENDING',
  "local_file_path" TEXT,
  "file_sha256" TEXT,
  "file_size_bytes" BIGINT,
  "downloaded_at" TIMESTAMP(3),
  "raw_metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "public_data_file_dataset_pkey" PRIMARY KEY ("public_data_pk")
);

CREATE INDEX IF NOT EXISTS "public_data_file_dataset_organization_idx" ON "public_data_file_dataset"("organization");
CREATE INDEX IF NOT EXISTS "public_data_file_dataset_modified_date_idx" ON "public_data_file_dataset"("modified_date");
CREATE INDEX IF NOT EXISTS "public_data_file_dataset_suitability_score_idx" ON "public_data_file_dataset"("suitability_score");
CREATE INDEX IF NOT EXISTS "public_data_file_dataset_download_status_idx" ON "public_data_file_dataset"("download_status");
