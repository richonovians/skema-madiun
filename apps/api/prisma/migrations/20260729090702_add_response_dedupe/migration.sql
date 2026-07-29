-- AlterTable
ALTER TABLE "survey_responses" ADD COLUMN     "dedupe_user_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "survey_responses_survey_id_dedupe_user_id_key" ON "survey_responses"("survey_id", "dedupe_user_id");

