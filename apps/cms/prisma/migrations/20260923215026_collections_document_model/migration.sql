-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "slug" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "data" JSONB NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_collection_status_idx" ON "Document"("collection", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Document_collection_slug_key" ON "Document"("collection", "slug");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
