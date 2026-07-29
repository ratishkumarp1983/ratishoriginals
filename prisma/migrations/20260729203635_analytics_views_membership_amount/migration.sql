-- AlterTable
ALTER TABLE "UserMembership" ADD COLUMN     "amount" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "DocumentView" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentView_documentId_idx" ON "DocumentView"("documentId");

-- CreateIndex
CREATE INDEX "DocumentView_createdAt_idx" ON "DocumentView"("createdAt");

-- AddForeignKey
ALTER TABLE "DocumentView" ADD CONSTRAINT "DocumentView_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

