-- DropForeignKey
ALTER TABLE "CareEvent" DROP CONSTRAINT "CareEvent_doneById_fkey";

-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_authorId_fkey";

-- AlterTable
ALTER TABLE "CareEvent" ALTER COLUMN "doneById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Diagnosis" ADD COLUMN     "createdById" UUID;

-- AlterTable
ALTER TABLE "GardenInvite" ADD COLUMN     "createdById" UUID;

-- AlterTable
ALTER TABLE "Note" ALTER COLUMN "authorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeGardenId" UUID,
ADD COLUMN     "notifyGarden" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "UserPlant" ADD COLUMN     "addedById" UUID;

-- AddForeignKey
ALTER TABLE "UserPlant" ADD CONSTRAINT "UserPlant_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareEvent" ADD CONSTRAINT "CareEvent_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
