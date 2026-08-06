-- CreateTable
CREATE TABLE "statistics_insight" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "text" TEXT NOT NULL,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "statistics_insight_pkey" PRIMARY KEY ("id")
);
