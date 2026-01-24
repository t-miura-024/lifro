import { SOUND_NONE } from '@/constants/sounds'

/**
 * Web Audio API を使用した正確なサウンドスケジューラー
 * メトロノームアプリと同じアプローチで、サブミリ秒精度のタイミングを実現
 */
class AudioScheduler {
  private audioContext: AudioContext | null = null
  private buffers: Map<string, AudioBuffer> = new Map()
  private loadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map()

  /**
   * AudioContext を初期化（ユーザーインタラクション時に呼び出す必要がある）
   */
  init(): AudioContext | null {
    if (this.audioContext) {
      // suspended 状態の場合は resume
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {
          // ignore
        })
      }
      return this.audioContext
    }

    try {
      this.audioContext = new AudioContext()
      return this.audioContext
    } catch (error) {
      console.error('Failed to create AudioContext:', error)
      return null
    }
  }

  /**
   * AudioContext の現在時刻を取得
   */
  getCurrentTime(): number {
    return this.audioContext?.currentTime ?? 0
  }

  /**
   * 音声ファイルをプリロード
   * @param filename 音声ファイル名
   */
  async preloadSound(filename: string | null): Promise<AudioBuffer | null> {
    if (!filename || filename === SOUND_NONE) {
      return null
    }

    // 既にロード済み
    if (this.buffers.has(filename)) {
      return this.buffers.get(filename) ?? null
    }

    // ロード中なら待機
    if (this.loadingPromises.has(filename)) {
      return this.loadingPromises.get(filename) ?? null
    }

    // 新規ロード
    const loadPromise = this.loadAudioBuffer(filename)
    this.loadingPromises.set(filename, loadPromise)

    try {
      const buffer = await loadPromise
      if (buffer) {
        this.buffers.set(filename, buffer)
      }
      return buffer
    } finally {
      this.loadingPromises.delete(filename)
    }
  }

  /**
   * 音声ファイルをフェッチしてデコード
   */
  private async loadAudioBuffer(filename: string): Promise<AudioBuffer | null> {
    if (!this.audioContext) {
      this.init()
    }

    if (!this.audioContext) {
      return null
    }

    try {
      const response = await fetch(`/sounds/${filename}`)
      if (!response.ok) {
        console.error(`Failed to fetch sound: ${filename}`)
        return null
      }
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      return audioBuffer
    } catch (error) {
      console.error(`Failed to load sound ${filename}:`, error)
      return null
    }
  }

  /**
   * 指定した AudioContext 時刻に音を再生（先読みスケジューリング）
   * @param filename 音声ファイル名
   * @param when AudioContext.currentTime 基準の再生時刻（省略時は即座に再生）
   */
  playAt(filename: string | null, when?: number): void {
    if (!filename || filename === SOUND_NONE) {
      return
    }

    if (!this.audioContext) {
      this.init()
    }

    if (!this.audioContext) {
      return
    }

    const buffer = this.buffers.get(filename)
    if (!buffer) {
      // バッファがない場合はロードしてから再生
      this.preloadSound(filename).then(() => {
        const loadedBuffer = this.buffers.get(filename)
        if (loadedBuffer) {
          this.playBuffer(loadedBuffer, when)
        }
      })
      return
    }

    this.playBuffer(buffer, when)
  }

  /**
   * 即座に音を再生
   * @param filename 音声ファイル名
   */
  playNow(filename: string | null): void {
    this.playAt(filename, undefined)
  }

  /**
   * AudioBuffer を再生
   */
  private playBuffer(buffer: AudioBuffer, when?: number): void {
    if (!this.audioContext) return

    try {
      const source = this.audioContext.createBufferSource()
      source.buffer = buffer
      source.connect(this.audioContext.destination)

      // when が指定されていない、または過去の時刻の場合は即座に再生
      const playTime = when ?? this.audioContext.currentTime
      const actualPlayTime = Math.max(playTime, this.audioContext.currentTime)
      source.start(actualPlayTime)
    } catch (error) {
      console.error('Failed to play buffer:', error)
    }
  }

  /**
   * 複数の音声ファイルを一括プリロード
   */
  async preloadSounds(filenames: (string | null)[]): Promise<void> {
    const validFilenames = filenames.filter(
      (f): f is string => f !== null && f !== SOUND_NONE
    )
    await Promise.all(validFilenames.map((f) => this.preloadSound(f)))
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close().catch(() => {
        // ignore
      })
      this.audioContext = null
    }
    this.buffers.clear()
    this.loadingPromises.clear()
  }
}

// シングルトンインスタンス
export const audioScheduler = new AudioScheduler()

/**
 * 音声ファイルを再生（後方互換性のため維持）
 * @param filename 音声ファイル名（例: "beep.mp3"）。nullまたは"none"の場合は何もしない
 */
export function playSound(filename: string | null): void {
  audioScheduler.playNow(filename)
}

/**
 * 音声を初期化（ユーザーインタラクション後に呼び出す）
 * iOSなどでは最初のユーザーインタラクション後に音声を再生する必要がある
 */
export function initAudioContext(): void {
  audioScheduler.init()
}
