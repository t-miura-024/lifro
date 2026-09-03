import { and, eq } from 'drizzle-orm'
import { closeDb, db } from '@/server/infrastructure/database/drizzle/client'
import { bodyParts, exercises, sets, users } from '@/server/infrastructure/database/drizzle/schema'
import { toLocalDateString } from '@/server/infrastructure/repositories/drizzle/helper'

/**
 * 部位マスタデータ
 */
const bodyPartMasterData: {
  category: 'CHEST' | 'BACK' | 'SHOULDER' | 'ARM' | 'ABS' | 'LEG'
  parts: string[]
}[] = [
  { category: 'CHEST', parts: ['上部', '中部', '下部'] },
  { category: 'BACK', parts: ['広背筋', '僧帽筋', '脊柱起立筋'] },
  { category: 'SHOULDER', parts: ['前部', '中部', '後部'] },
  { category: 'ARM', parts: ['二頭筋', '三頭筋', '前腕筋'] },
  { category: 'ABS', parts: ['上部', '下部', '横腹'] },
  { category: 'LEG', parts: ['太もも前', '太もも裏', '臀部', 'ふくらはぎ'] },
]

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
export async function main() {
  console.log('🌱 Seeding database...')

  // 部位マスタデータを作成
  console.log('📍 Seeding body parts...')
  let sortIndex = 0
  for (const { category, parts } of bodyPartMasterData) {
    for (const name of parts) {
      await db
        .insert(bodyParts)
        .values({ category, name, sortIndex, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [bodyParts.category, bodyParts.name],
          set: { sortIndex },
        })
      sortIndex++
    }
  }
  console.log('  ✅ Body parts seeded')

  // 開発用ユーザーを作成（存在しない場合のみ）
  // 旧prisma/seed.tsは無条件フォールバックだったが、productionでの誤投入防止のため
  // productionではDEV_USER_EMAIL未設定時に即失敗させる。開発環境では従来通り
  // フォールバックを使い、警告ログを出す。
  let devEmail = process.env.DEV_USER_EMAIL
  if (!devEmail) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DEV_USER_EMAIL is not set (fallback is disabled in production)')
    }
    console.warn('⚠️  DEV_USER_EMAIL is not set, falling back to dev@example.com (development only)')
    devEmail = 'dev@example.com'
  }

  const existingUsers = await db.select().from(users).where(eq(users.email, devEmail)).limit(1)
  let user = existingUsers[0]
  if (!user) {
    const [created] = await db
      .insert(users)
      .values({ email: devEmail, updatedAt: new Date() })
      .returning()
    if (!created) throw new Error('Failed to create user')
    user = created
  }

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
    const existing = await db
      .select({ id: exercises.id })
      .from(exercises)
      .where(and(eq(exercises.userId, user.id), eq(exercises.name, name)))
      .limit(1)

    if (existing.length === 0) {
      await db.insert(exercises).values({
        userId: user.id,
        name,
        updatedAt: new Date(),
      })
      console.log(`  📝 Exercise created: ${name}`)
    } else {
      console.log(`  ⏭️  Exercise exists: ${name}`)
    }
  }

  // サンプルトレーニングデータを作成
  const userExercises = await db
    .select()
    .from(exercises)
    .where(eq(exercises.userId, user.id))

  const benchPress = userExercises.find((e) => e.name === 'ベンチプレス')
  const squat = userExercises.find((e) => e.name === 'スクワット')

  if (benchPress && squat) {
    const todayStr = toLocalDateString(new Date())

    // 今日のデータが無ければサンプルデータを作成
    const existingSets = await db
      .select({ id: sets.id })
      .from(sets)
      .where(and(eq(sets.userId, user.id), eq(sets.date, todayStr)))
      .limit(1)

    if (existingSets.length === 0) {
      const now = new Date()
      await db.insert(sets).values([
        {
          userId: user.id,
          exerciseId: benchPress.id,
          weight: 60,
          reps: 10,
          date: todayStr,
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          userId: user.id,
          exerciseId: benchPress.id,
          weight: 70,
          reps: 8,
          date: todayStr,
          sortIndex: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          userId: user.id,
          exerciseId: squat.id,
          weight: 80,
          reps: 8,
          date: todayStr,
          sortIndex: 2,
          createdAt: now,
          updatedAt: now,
        },
      ])
      console.log('  🏋️ Sample training data created for today')
    }
  }

  console.log('🎉 Seeding complete!')
}

const isDirectRun = process.argv[1]?.endsWith('seed.ts') ?? false
if (isDirectRun) {
  main()
    .catch((e) => {
      console.error('❌ Seeding failed:', e)
      process.exit(1)
    })
    .finally(async () => {
      await closeDb()
    })
}
