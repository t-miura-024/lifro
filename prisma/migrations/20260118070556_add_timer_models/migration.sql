-- CreateTable
CREATE TABLE "timers" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sort_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_timers" (
    "id" SERIAL NOT NULL,
    "timer_id" INTEGER NOT NULL,
    "sort_index" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL,
    "count_sound" TEXT,
    "count_sound_last_3_sec" TEXT,
    "end_sound" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_timers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timers_user_id_idx" ON "timers"("user_id");

-- CreateIndex
CREATE INDEX "unit_timers_timer_id_idx" ON "unit_timers"("timer_id");

-- AddForeignKey
ALTER TABLE "timers" ADD CONSTRAINT "timers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_timers" ADD CONSTRAINT "unit_timers_timer_id_fkey" FOREIGN KEY ("timer_id") REFERENCES "timers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
