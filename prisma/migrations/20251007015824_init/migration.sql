-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "githubUsername" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "SkillGap" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repository" VARCHAR(255) NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "skillLevel" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillGap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technology" (
    "id" TEXT NOT NULL,
    "skillGapId" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "Technology_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillGapItem" (
    "id" TEXT NOT NULL,
    "skillGapId" TEXT NOT NULL,
    "skillName" VARCHAR(100) NOT NULL,
    "currentLevel" INTEGER NOT NULL,
    "targetLevel" INTEGER NOT NULL,
    "gap" INTEGER NOT NULL,
    "priority" VARCHAR(20) NOT NULL,

    CONSTRAINT "SkillGapItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "skillGapId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "priority" VARCHAR(20) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchResult" (
    "id" TEXT NOT NULL,
    "skillGapId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "resources" JSONB NOT NULL,
    "examples" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubIssue" (
    "id" TEXT NOT NULL,
    "skillGapId" TEXT NOT NULL,
    "issueUrl" VARCHAR(500) NOT NULL,
    "issueNumber" INTEGER,
    "repository" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubUsername_key" ON "User"("githubUsername");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_githubUsername_idx" ON "User"("githubUsername");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "SkillGap_userId_idx" ON "SkillGap"("userId");

-- CreateIndex
CREATE INDEX "SkillGap_createdAt_idx" ON "SkillGap"("createdAt");

-- CreateIndex
CREATE INDEX "SkillGap_userId_createdAt_idx" ON "SkillGap"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Technology_skillGapId_idx" ON "Technology"("skillGapId");

-- CreateIndex
CREATE INDEX "SkillGapItem_skillGapId_idx" ON "SkillGapItem"("skillGapId");

-- CreateIndex
CREATE INDEX "SkillGapItem_priority_idx" ON "SkillGapItem"("priority");

-- CreateIndex
CREATE INDEX "Recommendation_skillGapId_idx" ON "Recommendation"("skillGapId");

-- CreateIndex
CREATE INDEX "Recommendation_completed_idx" ON "Recommendation"("completed");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchResult_skillGapId_key" ON "ResearchResult"("skillGapId");

-- CreateIndex
CREATE INDEX "ResearchResult_skillGapId_idx" ON "ResearchResult"("skillGapId");

-- CreateIndex
CREATE INDEX "GitHubIssue_skillGapId_idx" ON "GitHubIssue"("skillGapId");

-- CreateIndex
CREATE INDEX "GitHubIssue_status_idx" ON "GitHubIssue"("status");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillGap" ADD CONSTRAINT "SkillGap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technology" ADD CONSTRAINT "Technology_skillGapId_fkey" FOREIGN KEY ("skillGapId") REFERENCES "SkillGap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillGapItem" ADD CONSTRAINT "SkillGapItem_skillGapId_fkey" FOREIGN KEY ("skillGapId") REFERENCES "SkillGap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_skillGapId_fkey" FOREIGN KEY ("skillGapId") REFERENCES "SkillGap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchResult" ADD CONSTRAINT "ResearchResult_skillGapId_fkey" FOREIGN KEY ("skillGapId") REFERENCES "SkillGap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubIssue" ADD CONSTRAINT "GitHubIssue_skillGapId_fkey" FOREIGN KEY ("skillGapId") REFERENCES "SkillGap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
