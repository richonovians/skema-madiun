-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('kabupaten', 'opd', 'responden');

-- CreateEnum
CREATE TYPE "jenis_kelamin" AS ENUM ('laki_laki', 'perempuan');

-- CreateEnum
CREATE TYPE "survey_status" AS ENUM ('draft', 'aktif', 'ditutup');

-- CreateEnum
CREATE TYPE "question_type" AS ENUM ('skala', 'pilihan', 'teks');

-- CreateEnum
CREATE TYPE "ikm_mutu" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "complaint_status" AS ENUM ('diterima', 'diproses', 'selesai', 'ditolak');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "sso_subject" TEXT NOT NULL,
    "nama" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'responden',
    "opd_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "consent_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respondent_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "jenis_kelamin" "jenis_kelamin" NOT NULL,
    "kelompok_umur" VARCHAR(20) NOT NULL,
    "pendidikan" VARCHAR(20) NOT NULL,
    "pekerjaan" VARCHAR(25) NOT NULL,

    CONSTRAINT "respondent_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opd" (
    "id" SERIAL NOT NULL,
    "external_id" TEXT,
    "nama" VARCHAR(80) NOT NULL,
    "kode" VARCHAR(10) NOT NULL,
    "jenis_layanan" VARCHAR(50),
    "penanggung_jawab" VARCHAR(40),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surveys" (
    "id" SERIAL NOT NULL,
    "opd_id" INTEGER NOT NULL,
    "judul" VARCHAR(100) NOT NULL,
    "periode" VARCHAR(20) NOT NULL,
    "status" "survey_status" NOT NULL DEFAULT 'draft',
    "allow_multiple_submit" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" SERIAL NOT NULL,
    "survey_id" INTEGER NOT NULL,
    "teks" TEXT NOT NULL,
    "tipe" "question_type" NOT NULL,
    "is_ikm_unsur" BOOLEAN NOT NULL DEFAULT false,
    "kode_unsur" VARCHAR(5),
    "urutan" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "nilai" INTEGER,
    "urutan" INTEGER NOT NULL,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" SERIAL NOT NULL,
    "survey_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" SERIAL NOT NULL,
    "response_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "nilai" INTEGER,
    "teks" TEXT,
    "selected_option_id" INTEGER,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ikm_results" (
    "id" SERIAL NOT NULL,
    "survey_id" INTEGER NOT NULL,
    "periode" VARCHAR(20) NOT NULL,
    "nrr_per_unsur" JSONB NOT NULL,
    "nilai_ikm" DECIMAL(5,2) NOT NULL,
    "mutu" "ikm_mutu" NOT NULL,
    "jumlah_responden" INTEGER NOT NULL,
    "dihitung_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ikm_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" SERIAL NOT NULL,
    "ticket_no" VARCHAR(20) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "opd_id" INTEGER NOT NULL,
    "kategori" VARCHAR(50) NOT NULL,
    "judul" VARCHAR(255) NOT NULL,
    "uraian" TEXT NOT NULL,
    "status" "complaint_status" NOT NULL DEFAULT 'diterima',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_attachments" (
    "id" SERIAL NOT NULL,
    "complaint_id" INTEGER NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100),
    "size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_replies" (
    "id" SERIAL NOT NULL,
    "complaint_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "pesan" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "aksi" VARCHAR(30) NOT NULL,
    "entitas" VARCHAR(25) NOT NULL,
    "detail" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_sso_subject_key" ON "users"("sso_subject");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_opd_id_idx" ON "users"("opd_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "respondent_profiles_user_id_key" ON "respondent_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "opd_external_id_key" ON "opd"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "opd_kode_key" ON "opd"("kode");

-- CreateIndex
CREATE INDEX "surveys_opd_id_idx" ON "surveys"("opd_id");

-- CreateIndex
CREATE INDEX "surveys_status_idx" ON "surveys"("status");

-- CreateIndex
CREATE INDEX "questions_survey_id_idx" ON "questions"("survey_id");

-- CreateIndex
CREATE INDEX "question_options_question_id_idx" ON "question_options"("question_id");

-- CreateIndex
CREATE INDEX "survey_responses_survey_id_idx" ON "survey_responses"("survey_id");

-- CreateIndex
CREATE INDEX "survey_responses_user_id_idx" ON "survey_responses"("user_id");

-- CreateIndex
CREATE INDEX "answers_question_id_idx" ON "answers"("question_id");

-- CreateIndex
CREATE INDEX "answers_selected_option_id_idx" ON "answers"("selected_option_id");

-- CreateIndex
CREATE UNIQUE INDEX "answers_response_id_question_id_key" ON "answers"("response_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "ikm_results_survey_id_periode_key" ON "ikm_results"("survey_id", "periode");

-- CreateIndex
CREATE UNIQUE INDEX "complaints_ticket_no_key" ON "complaints"("ticket_no");

-- CreateIndex
CREATE INDEX "complaints_user_id_idx" ON "complaints"("user_id");

-- CreateIndex
CREATE INDEX "complaints_opd_id_idx" ON "complaints"("opd_id");

-- CreateIndex
CREATE INDEX "complaints_status_idx" ON "complaints"("status");

-- CreateIndex
CREATE INDEX "complaint_attachments_complaint_id_idx" ON "complaint_attachments"("complaint_id");

-- CreateIndex
CREATE INDEX "complaint_replies_complaint_id_idx" ON "complaint_replies"("complaint_id");

-- CreateIndex
CREATE INDEX "complaint_replies_author_id_idx" ON "complaint_replies"("author_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_entitas_idx" ON "audit_logs"("entitas");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_opd_id_fkey" FOREIGN KEY ("opd_id") REFERENCES "opd"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respondent_profiles" ADD CONSTRAINT "respondent_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_opd_id_fkey" FOREIGN KEY ("opd_id") REFERENCES "opd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ikm_results" ADD CONSTRAINT "ikm_results_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_opd_id_fkey" FOREIGN KEY ("opd_id") REFERENCES "opd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_attachments" ADD CONSTRAINT "complaint_attachments_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_replies" ADD CONSTRAINT "complaint_replies_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_replies" ADD CONSTRAINT "complaint_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
