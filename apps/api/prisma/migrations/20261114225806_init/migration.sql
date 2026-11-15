-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "city" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "reminderHour" INTEGER NOT NULL DEFAULT 9,
    "notifyWater" BOOLEAN NOT NULL DEFAULT true,
    "notifyCare" BOOLEAN NOT NULL DEFAULT true,
    "notifyWeather" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAccount" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Garden" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Garden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GardenMember" (
    "gardenId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GardenMember_pkey" PRIMARY KEY ("gardenId","userId")
);

-- CreateTable
CREATE TABLE "GardenInvite" (
    "id" UUID NOT NULL,
    "gardenId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedBy" UUID,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GardenInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Species" (
    "id" UUID NOT NULL,
    "scientificName" TEXT NOT NULL,
    "commonNames" TEXT[],
    "family" TEXT,
    "category" TEXT NOT NULL,
    "imageUrl" TEXT,
    "externalIds" JSONB NOT NULL DEFAULT '{}',
    "care" JSONB,
    "profileEs" JSONB,
    "profileVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPlant" (
    "id" UUID NOT NULL,
    "gardenId" UUID NOT NULL,
    "speciesId" UUID NOT NULL,
    "nickname" TEXT,
    "photoUrl" TEXT,
    "location" TEXT NOT NULL,
    "room" TEXT,
    "lightLevel" TEXT NOT NULL,
    "lightLux" INTEGER,
    "potShape" TEXT NOT NULL DEFAULT 'round',
    "potDiameterCm" DOUBLE PRECISION NOT NULL,
    "potHeightCm" DOUBLE PRECISION NOT NULL,
    "potLengthCm" DOUBLE PRECISION,
    "potMaterial" TEXT,
    "hasDrainage" BOOLEAN NOT NULL,
    "soilType" TEXT,
    "overwateringGuard" TEXT[],
    "plantHeightCm" DOUBLE PRECISION,
    "plantWidthCm" DOUBLE PRECISION,
    "lastRepottedAt" TIMESTAMP(3),
    "lastWateredAt" TIMESTAMP(3),
    "waterEveryDays" INTEGER NOT NULL,
    "waterAmountMl" INTEGER NOT NULL,
    "fertilizeEveryDays" INTEGER,
    "repotEveryMonths" INTEGER,
    "snoozedUntil" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPlant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareEvent" (
    "id" UUID NOT NULL,
    "plantId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "doneAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskDay" TEXT,
    "doneById" UUID NOT NULL,
    "snoozeDays" INTEGER,
    "amountMl" INTEGER,

    CONSTRAINT "CareEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" UUID NOT NULL,
    "plantId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "text" TEXT,
    "photoUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diagnosis" (
    "id" UUID NOT NULL,
    "plantId" UUID NOT NULL,
    "photoUrls" TEXT[],
    "answers" JSONB NOT NULL DEFAULT '[]',
    "apiResult" JSONB,
    "result" JSONB,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "followUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherCache" (
    "id" UUID NOT NULL,
    "latKey" DOUBLE PRECISION NOT NULL,
    "lonKey" DOUBLE PRECISION NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeatherCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiUsage" (
    "userId" UUID NOT NULL,
    "day" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("userId","day","kind")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_provider_providerId_key" ON "AuthAccount"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE INDEX "GardenMember_userId_idx" ON "GardenMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GardenInvite_code_key" ON "GardenInvite"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Species_scientificName_key" ON "Species"("scientificName");

-- CreateIndex
CREATE INDEX "Species_category_idx" ON "Species"("category");

-- CreateIndex
CREATE INDEX "UserPlant_gardenId_idx" ON "UserPlant"("gardenId");

-- CreateIndex
CREATE INDEX "CareEvent_plantId_type_doneAt_idx" ON "CareEvent"("plantId", "type", "doneAt");

-- CreateIndex
CREATE UNIQUE INDEX "CareEvent_plantId_type_taskDay_key" ON "CareEvent"("plantId", "type", "taskDay");

-- CreateIndex
CREATE INDEX "Note_plantId_createdAt_idx" ON "Note"("plantId", "createdAt");

-- CreateIndex
CREATE INDEX "Diagnosis_plantId_createdAt_idx" ON "Diagnosis"("plantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WeatherCache_latKey_lonKey_key" ON "WeatherCache"("latKey", "lonKey");

-- AddForeignKey
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GardenMember" ADD CONSTRAINT "GardenMember_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GardenMember" ADD CONSTRAINT "GardenMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GardenInvite" ADD CONSTRAINT "GardenInvite_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlant" ADD CONSTRAINT "UserPlant_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlant" ADD CONSTRAINT "UserPlant_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareEvent" ADD CONSTRAINT "CareEvent_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "UserPlant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareEvent" ADD CONSTRAINT "CareEvent_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "UserPlant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "UserPlant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiUsage" ADD CONSTRAINT "ApiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
