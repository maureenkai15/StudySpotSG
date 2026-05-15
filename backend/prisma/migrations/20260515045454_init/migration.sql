-- CreateEnum
CREATE TYPE "SpotCategory" AS ENUM ('NLB_LIBRARY', 'UNIVERSITY_LIBRARY', 'COMMUNITY_CENTER', 'CAFE', 'COWORKING', 'MAKERSPACE', 'SHOPPING_MALL', 'HAWKER_CENTER', 'MCDONALDS_24H', 'OTHER');

-- CreateEnum
CREATE TYPE "NoiseLevel" AS ENUM ('SILENT', 'QUIET', 'MODERATE', 'LIVELY');

-- CreateEnum
CREATE TYPE "WifiSpeed" AS ENUM ('SLOW', 'MODERATE', 'FAST', 'VERY_FAST');

-- CreateEnum
CREATE TYPE "CrowdLevel" AS ENUM ('EMPTY', 'QUIET', 'MODERATE', 'BUSY', 'FULL');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('NLB_API', 'GOOGLE_POPULAR_TIMES', 'COMMUNITY_REPORT', 'MANUAL_CHECK', 'SCRAPER', 'SENSOR');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('CROWD_UPDATE', 'SPOT_CLOSED', 'SPOT_OPEN', 'INACCURATE_INFO', 'NEW_AMENITY', 'PHOTO_UPDATE');

-- CreateTable
CREATE TABLE "StudySpot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "SpotCategory" NOT NULL,
    "address" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "hasWifi" BOOLEAN NOT NULL DEFAULT false,
    "wifiSpeed" "WifiSpeed",
    "hasPowerSockets" BOOLEAN NOT NULL DEFAULT false,
    "powerSocketCount" INTEGER,
    "isAirCon" BOOLEAN NOT NULL DEFAULT false,
    "noiseLevel" "NoiseLevel" NOT NULL DEFAULT 'MODERATE',
    "is24Hours" BOOLEAN NOT NULL DEFAULT false,
    "requiresBooking" BOOLEAN NOT NULL DEFAULT false,
    "bookingUrl" TEXT,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "pricePerHour" DOUBLE PRECISION,
    "totalSeats" INTEGER,
    "groupStudy" BOOLEAN NOT NULL DEFAULT false,
    "soloStudy" BOOLEAN NOT NULL DEFAULT true,
    "privateRooms" INTEGER NOT NULL DEFAULT 0,
    "nearestMrt" TEXT,
    "mrtWalkMins" INTEGER,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dataSource" TEXT,
    "externalId" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudySpot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeningHours" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OpeningHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NlbBranch" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "nlbBranchId" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "hasStudyArea" BOOLEAN NOT NULL DEFAULT true,
    "studySeats" INTEGER,

    CONSTRAINT "NlbBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingSlot" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "nlbBranchId" TEXT,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "totalSlots" INTEGER NOT NULL,
    "bookedSlots" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "bookingUrl" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OccupancyLog" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occupancyPct" INTEGER NOT NULL,
    "estimatedSeats" INTEGER,
    "crowdLevel" "CrowdLevel" NOT NULL,
    "source" "DataSource" NOT NULL,
    "sourceConfidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "rawData" JSONB,

    CONSTRAINT "OccupancyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OccupancyPrediction" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "predictedFor" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "predictedOccupancyPct" INTEGER NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "crowdLevel" "CrowdLevel" NOT NULL,
    "seatProbability" DOUBLE PRECISION NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "features" JSONB,

    CONSTRAINT "OccupancyPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "quietness" INTEGER,
    "wifiRating" INTEGER,
    "cleanliness" INTEGER,
    "comment" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReport" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "occupancyPct" INTEGER,
    "comment" TEXT,
    "imageUrl" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "reliability" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourlyAggregate" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hour" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "avgOccupancy" DOUBLE PRECISION NOT NULL,
    "maxOccupancy" INTEGER NOT NULL,
    "minOccupancy" INTEGER NOT NULL,
    "sampleCount" INTEGER NOT NULL,

    CONSTRAINT "HourlyAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudySpot_slug_key" ON "StudySpot"("slug");

-- CreateIndex
CREATE INDEX "StudySpot_lat_lng_idx" ON "StudySpot"("lat", "lng");

-- CreateIndex
CREATE INDEX "StudySpot_category_idx" ON "StudySpot"("category");

-- CreateIndex
CREATE INDEX "StudySpot_isActive_idx" ON "StudySpot"("isActive");

-- CreateIndex
CREATE INDEX "OpeningHours_spotId_idx" ON "OpeningHours"("spotId");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningHours_spotId_dayOfWeek_key" ON "OpeningHours"("spotId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "NlbBranch_spotId_key" ON "NlbBranch"("spotId");

-- CreateIndex
CREATE UNIQUE INDEX "NlbBranch_nlbBranchId_key" ON "NlbBranch"("nlbBranchId");

-- CreateIndex
CREATE UNIQUE INDEX "NlbBranch_branchCode_key" ON "NlbBranch"("branchCode");

-- CreateIndex
CREATE INDEX "NlbBranch_nlbBranchId_idx" ON "NlbBranch"("nlbBranchId");

-- CreateIndex
CREATE INDEX "BookingSlot_spotId_date_idx" ON "BookingSlot"("spotId", "date");

-- CreateIndex
CREATE INDEX "BookingSlot_date_isAvailable_idx" ON "BookingSlot"("date", "isAvailable");

-- CreateIndex
CREATE INDEX "OccupancyLog_spotId_timestamp_idx" ON "OccupancyLog"("spotId", "timestamp");

-- CreateIndex
CREATE INDEX "OccupancyLog_timestamp_idx" ON "OccupancyLog"("timestamp");

-- CreateIndex
CREATE INDEX "OccupancyPrediction_spotId_predictedFor_idx" ON "OccupancyPrediction"("spotId", "predictedFor");

-- CreateIndex
CREATE INDEX "OccupancyPrediction_predictedFor_idx" ON "OccupancyPrediction"("predictedFor");

-- CreateIndex
CREATE INDEX "Review_spotId_idx" ON "Review"("spotId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "CommunityReport_spotId_createdAt_idx" ON "CommunityReport"("spotId", "createdAt");

-- CreateIndex
CREATE INDEX "HourlyAggregate_spotId_dayOfWeek_hour_idx" ON "HourlyAggregate"("spotId", "dayOfWeek", "hour");

-- CreateIndex
CREATE UNIQUE INDEX "HourlyAggregate_spotId_date_hour_key" ON "HourlyAggregate"("spotId", "date", "hour");

-- AddForeignKey
ALTER TABLE "OpeningHours" ADD CONSTRAINT "OpeningHours_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "StudySpot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NlbBranch" ADD CONSTRAINT "NlbBranch_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "StudySpot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSlot" ADD CONSTRAINT "BookingSlot_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "StudySpot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSlot" ADD CONSTRAINT "BookingSlot_nlbBranchId_fkey" FOREIGN KEY ("nlbBranchId") REFERENCES "NlbBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccupancyLog" ADD CONSTRAINT "OccupancyLog_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "StudySpot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccupancyPrediction" ADD CONSTRAINT "OccupancyPrediction_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "StudySpot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "StudySpot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReport" ADD CONSTRAINT "CommunityReport_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "StudySpot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
