-- CreateEnum
CREATE TYPE "BodyPartCategory" AS ENUM ('CHEST', 'BACK', 'SHOULDER', 'ARM', 'ABS', 'LEG');

-- CreateTable
CREATE TABLE "body_parts" (
    "id" SERIAL NOT NULL,
    "category" "BodyPartCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "sort_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "body_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_body_parts" (
    "id" SERIAL NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "body_part_id" INTEGER NOT NULL,
    "load_ratio" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_body_parts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "body_parts_category_idx" ON "body_parts"("category");

-- CreateIndex
CREATE UNIQUE INDEX "body_parts_category_name_key" ON "body_parts"("category", "name");

-- CreateIndex
CREATE INDEX "exercise_body_parts_exercise_id_idx" ON "exercise_body_parts"("exercise_id");

-- CreateIndex
CREATE INDEX "exercise_body_parts_body_part_id_idx" ON "exercise_body_parts"("body_part_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_body_parts_exercise_id_body_part_id_key" ON "exercise_body_parts"("exercise_id", "body_part_id");

-- AddForeignKey
ALTER TABLE "exercise_body_parts" ADD CONSTRAINT "exercise_body_parts_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_body_parts" ADD CONSTRAINT "exercise_body_parts_body_part_id_fkey" FOREIGN KEY ("body_part_id") REFERENCES "body_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
