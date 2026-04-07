-- CreateTable
CREATE TABLE "DocumentRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "requestedBy" INTEGER NOT NULL,
    "documentType" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilledAt" TIMESTAMP(3),

    CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentRequest_userId_idx" ON "DocumentRequest"("userId");

-- CreateIndex
CREATE INDEX "DocumentRequest_status_idx" ON "DocumentRequest"("status");

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
