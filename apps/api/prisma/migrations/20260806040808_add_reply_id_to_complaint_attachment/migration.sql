-- AlterTable
ALTER TABLE "complaint_attachments" ADD COLUMN     "reply_id" INTEGER;

-- CreateIndex
CREATE INDEX "complaint_attachments_reply_id_idx" ON "complaint_attachments"("reply_id");

-- AddForeignKey
ALTER TABLE "complaint_attachments" ADD CONSTRAINT "complaint_attachments_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "complaint_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
