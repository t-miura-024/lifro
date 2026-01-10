-- CreateIndex
CREATE INDEX "sets_user_id_date_idx" ON "sets"("user_id", "date");

-- CreateIndex
CREATE INDEX "sets_user_id_exercise_id_date_idx" ON "sets"("user_id", "exercise_id", "date");
