import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 例: ユーザーを取得する
async function main() {
    const allUsers = await prisma.periodVolumeGoal.findMany();
    console.log(allUsers);
}

main()
    .catch(e => {
        throw e;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
