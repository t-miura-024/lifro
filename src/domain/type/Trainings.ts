import type { PrismaClient, Exercise } from "@prisma/client";

export type Trainings = {
  exerciseId: Exercise["id"];
  sets: Pick<
    Parameters<PrismaClient["set"]["create"]>[0]["data"],
    "weight" | "reps"
  >[];
  volume: number;
}[];

const training: Trainings = [
  {
    exerciseId: 1,
    sets: [
      {
        weight: 100,
        reps: 10,
      },
    ],
    volume: 100,
  },
];
