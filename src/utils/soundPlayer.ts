import { SOUND_NONE } from '@/constants/sounds'

/**
 * 音声ファイルを再生
 * @param filename 音声ファイル名（例: "beep.mp3"）。nullまたは"none"の場合は何もしない
 */
export function playSound(filename: string | null): void {
  if (!filename || filename === SOUND_NONE) {
    return
  }

  try {
    const audio = new Audio(`/sounds/${filename}`)
    audio.play().catch((error) => {
      console.error('Failed to play sound:', error)
    })
  } catch (error) {
    console.error('Failed to create audio:', error)
  }
}

/**
 * 音声を初期化（ユーザーインタラクション後に呼び出す）
 * iOSなどでは最初のユーザーインタラクション後に音声を再生する必要がある
 * 無音を再生することで音声再生を許可させる
 */
export function initAudioContext(): void {
  try {
    const audio = new Audio()
    audio.volume = 0
    audio.play().catch(() => {
      // 無視（ユーザーインタラクションがまだの場合エラーになる）
    })
  } catch (error) {
    console.error('Failed to init audio:', error)
  }
}
