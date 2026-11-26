-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'hr_message';

-- CreateTable
CREATE TABLE "TalentShortlist" (
    "hrUserId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalentShortlist_pkey" PRIMARY KEY ("hrUserId","studentProfileId")
);

-- CreateTable
CREATE TABLE "HrMessage" (
    "id" TEXT NOT NULL,
    "hrUserId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HrMessage_hrUserId_studentUserId_idx" ON "HrMessage"("hrUserId", "studentUserId");

-- CreateIndex
CREATE INDEX "HrMessage_studentUserId_createdAt_idx" ON "HrMessage"("studentUserId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "TalentShortlist" ADD CONSTRAINT "TalentShortlist_hrUserId_fkey" FOREIGN KEY ("hrUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentShortlist" ADD CONSTRAINT "TalentShortlist_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrMessage" ADD CONSTRAINT "HrMessage_hrUserId_fkey" FOREIGN KEY ("hrUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrMessage" ADD CONSTRAINT "HrMessage_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
