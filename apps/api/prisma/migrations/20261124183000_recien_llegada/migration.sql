-- AlterTable
ALTER TABLE "UserPlant" ADD COLUMN     "arrivalDone" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "arrivedAt" TIMESTAMP(3);
