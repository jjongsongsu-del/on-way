CREATE TABLE IF NOT EXISTS "ggtour_category" (
  "id" TEXT NOT NULL,
  "category_sn" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "path" TEXT,
  "category_level" INTEGER,
  "sort_no" INTEGER,
  "raw" JSONB,
  "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ggtour_category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ggtour_category_category_sn_key" ON "ggtour_category"("category_sn");
CREATE INDEX IF NOT EXISTS "ggtour_category_name_idx" ON "ggtour_category"("name");
CREATE INDEX IF NOT EXISTS "ggtour_category_path_idx" ON "ggtour_category"("path");

CREATE TABLE IF NOT EXISTS "ggtour_sigugun" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "raw" JSONB,
  "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ggtour_sigugun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ggtour_sigugun_code_key" ON "ggtour_sigugun"("code");
CREATE INDEX IF NOT EXISTS "ggtour_sigugun_name_idx" ON "ggtour_sigugun"("name");
