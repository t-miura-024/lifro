import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 初期データ投入スクリプト
 *
 * 使用方法:
 *   bun run db:seed
 *
 * 注意:
 *   - 招待制のため、ユーザーは手動で作成する必要があります
 *   - このスクリプトは開発環境での動作確認用です
 */
async function main() {
  console.log('🌱 Seeding database...')

  // 開発用ユーザーを作成（存在しない場合のみ）
  const devEmail = process.env.DEV_USER_EMAIL || 'dev@example.com'

  const user = await prisma.user.upsert({
    where: { email: devEmail },
    update: {},
    create: {
      email: devEmail,
    },
  })

  console.log(`✅ User created/found: ${user.email} (ID: ${user.id})`)

  // 基本種目を作成
  const defaultExercises = [
    'ベンチプレス',
    'スクワット',
    'デッドリフト',
    'ショルダープレス',
    'バーベルロウ',
    'ラットプルダウン',
    'レッグプレス',
    'ダンベルカール',
    'トライセプスエクステンション',
    'サイドレイズ',
  ]

  for (const name of defaultExercises) {
    const existing = await prisma.exercise.findFirst({
      where: { userId: user.id, name },
    })

    if (!existing) {
      await prisma.exercise.create({
        data: {
          userId: user.id,
          name,
        },
      })
      console.log(`  📝 Exercise created: ${name}`)
    } else {
      console.log(`  ⏭️  Exercise exists: ${name}`)
    }
  }

  // サンプルトレーニングデータを作成
  const exercises = await prisma.exercise.findMany({
    where: { userId: user.id },
  })

  const benchPress = exercises.find((e) => e.name === 'ベンチプレス')
  const squat = exercises.find((e) => e.name === 'スクワット')

  if (benchPress && squat) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 今日のデータが無ければサンプルデータを作成
    const existingSets = await prisma.set.findFirst({
      where: { userId: user.id, date: today },
    })

    if (!existingSets) {
      await prisma.set.createMany({
        data: [
          {
            userId: user.id,
            exerciseId: benchPress.id,
            weight: 60,
            reps: 10,
            date: today,
            sortIndex: 0,
          },
          {
            userId: user.id,
            exerciseId: benchPress.id,
            weight: 70,
            reps: 8,
            date: today,
            sortIndex: 1,
          },
          {
            userId: user.id,
            exerciseId: squat.id,
            weight: 80,
            reps: 8,
            date: today,
            sortIndex: 2,
          },
        ],
      })
      console.log('  🏋️ Sample training data created for today')
    }
  }

  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
