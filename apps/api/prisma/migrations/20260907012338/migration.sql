-- DropForeignKey
ALTER TABLE "complaints" DROP CONSTRAINT "complaints_opd_id_fkey";

-- DropForeignKey
ALTER TABLE "survey_responses" DROP CONSTRAINT "survey_responses_user_id_fkey";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "roles" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_opd_id_fkey" FOREIGN KEY ("opd_id") REFERENCES "opd"("id") ON DELETE SET NULL ON UPDATE CASCADE;
