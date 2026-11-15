-- AlterTable
ALTER TABLE "Diagnosis" ADD COLUMN     "symptoms" TEXT,
ALTER COLUMN "status" SET DEFAULT 'questions';
