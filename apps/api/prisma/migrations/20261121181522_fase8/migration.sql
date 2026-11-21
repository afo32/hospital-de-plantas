-- AlterTable
ALTER TABLE "UserPlant" ADD COLUMN     "repotSigns" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "repotSignsCheckedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PropagationGuide" (
    "id" UUID NOT NULL,
    "speciesId" UUID NOT NULL,
    "method" TEXT NOT NULL,
    "guide" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropagationGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Propagation" (
    "id" UUID NOT NULL,
    "gardenId" UUID NOT NULL,
    "speciesId" UUID NOT NULL,
    "method" TEXT NOT NULL,
    "name" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "successCount" INTEGER,
    "startDay" TEXT NOT NULL,
    "stageIndex" INTEGER NOT NULL DEFAULT 0,
    "stageStartDay" TEXT NOT NULL,
    "plan" JSONB NOT NULL,
    "tasksDone" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "finishedAt" TIMESTAMP(3),
    "plantId" UUID,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Propagation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropagationLog" (
    "id" UUID NOT NULL,
    "propagationId" UUID NOT NULL,
    "authorId" UUID,
    "kind" TEXT NOT NULL DEFAULT 'note',
    "stageIndex" INTEGER NOT NULL,
    "text" TEXT,
    "photoKeys" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropagationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentReport" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropagationGuide_speciesId_method_key" ON "PropagationGuide"("speciesId", "method");

-- CreateIndex
CREATE INDEX "Propagation_gardenId_status_idx" ON "Propagation"("gardenId", "status");

-- CreateIndex
CREATE INDEX "PropagationLog_propagationId_createdAt_idx" ON "PropagationLog"("propagationId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentReport_status_createdAt_idx" ON "ContentReport"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "PropagationGuide" ADD CONSTRAINT "PropagationGuide_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Species"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Propagation" ADD CONSTRAINT "Propagation_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Propagation" ADD CONSTRAINT "Propagation_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropagationLog" ADD CONSTRAINT "PropagationLog_propagationId_fkey" FOREIGN KEY ("propagationId") REFERENCES "Propagation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
