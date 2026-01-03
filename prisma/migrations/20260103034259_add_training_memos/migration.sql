-- CreateTable
CREATE TABLE "training_memos" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_memos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_memos_user_id_date_idx" ON "training_memos"("user_id", "date");

-- AddForeignKey
ALTER TABLE "training_memos" ADD CONSTRAINT "training_memos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
