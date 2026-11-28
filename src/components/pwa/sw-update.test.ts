import { afterEach, describe, expect, it, vi } from 'vitest'
import { SW_UPDATE_CHECK_INTERVAL_MS, startSwUpdateMonitor } from './sw-update'

type FakeEventTarget = {
  addEventListener: (type: string, listener: EventListener) => void
  removeEventListener: (type: string, listener: EventListener) => void
  dispatch: (type: string) => void
  listenerCount: (type: string) => number
}

function createEventTarget(): FakeEventTarget {
  const listeners = new Map<string, Set<EventListener>>()
  return {
    addEventListener: (type, listener) => {
      const set = listeners.get(type) ?? new Set<EventListener>()
      set.add(listener)
      listeners.set(type, set)
    },
    removeEventListener: (type, listener) => {
      listeners.get(type)?.delete(listener)
    },
    dispatch: (type) => {
      for (const listener of listeners.get(type) ?? []) {
        listener(new Event(type))
      }
    },
    listenerCount: (type) => listeners.get(type)?.size ?? 0,
  }
}

function setup({ hasController }: { hasController: boolean }) {
  const windowTarget = createEventTarget()
  const documentTarget = {
    ...createEventTarget(),
    visibilityState: 'visible' as DocumentVisibilityState,
  }
  vi.stubGlobal('window', windowTarget)
  vi.stubGlobal('document', documentTarget)

  const containerTarget = createEventTarget()
  const update = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  const register = vi
    .fn<(url: string) => Promise<ServiceWorkerRegistration>>()
    .mockResolvedValue({ update } as unknown as ServiceWorkerRegistration)

  const container = {
    ...containerTarget,
    controller: hasController ? ({} as ServiceWorker) : null,
    register,
  } as unknown as ServiceWorkerContainer

  return {
    container,
    containerTarget,
    windowTarget,
    documentTarget,
    register,
    update,
  }
}

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('startSwUpdateMonitor', () => {
  it('/sw.js を登録し、pageshow・focus・可視化・60分間隔で update() を呼ぶ', async () => {
    vi.useFakeTimers()
    const { container, windowTarget, documentTarget, register, update } = setup({
      hasController: true,
    })
    const onUpdateAvailable = vi.fn()
    const stop = startSwUpdateMonitor({ container, onUpdateAvailable })
    await flushPromises()

    expect(register).toHaveBeenCalledWith('/sw.js')
    expect(update).not.toHaveBeenCalled()

    windowTarget.dispatch('pageshow')
    windowTarget.dispatch('focus')
    documentTarget.dispatch('visibilitychange')
    expect(update).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(SW_UPDATE_CHECK_INTERVAL_MS)
    expect(update).toHaveBeenCalledTimes(4)

    stop()
  })

  it('タブが非表示の間は update() を呼ばない', async () => {
    const { container, documentTarget, update } = setup({ hasController: true })
    const stop = startSwUpdateMonitor({ container, onUpdateAvailable: vi.fn() })
    await flushPromises()

    documentTarget.visibilityState = 'hidden'
    documentTarget.dispatch('visibilitychange')
    expect(update).not.toHaveBeenCalled()

    documentTarget.visibilityState = 'visible'
    documentTarget.dispatch('visibilitychange')
    expect(update).toHaveBeenCalledTimes(1)

    stop()
  })

  it('初回インストールの controllerchange は通知せず、2回目以降を通知する', async () => {
    const { container, containerTarget } = setup({ hasController: false })
    const onUpdateAvailable = vi.fn()
    const stop = startSwUpdateMonitor({ container, onUpdateAvailable })
    await flushPromises()

    containerTarget.dispatch('controllerchange')
    expect(onUpdateAvailable).not.toHaveBeenCalled()

    containerTarget.dispatch('controllerchange')
    expect(onUpdateAvailable).toHaveBeenCalledTimes(1)

    stop()
  })

  it('既存の controller がある場合は最初の controllerchange から通知する', async () => {
    const { container, containerTarget } = setup({ hasController: true })
    const onUpdateAvailable = vi.fn()
    const stop = startSwUpdateMonitor({ container, onUpdateAvailable })
    await flushPromises()

    containerTarget.dispatch('controllerchange')
    expect(onUpdateAvailable).toHaveBeenCalledTimes(1)

    stop()
  })

  it('停止後はリスナーと定期チェックを解除する', async () => {
    vi.useFakeTimers()
    const { container, containerTarget, windowTarget, documentTarget, update } = setup({
      hasController: true,
    })
    const onUpdateAvailable = vi.fn()
    const stop = startSwUpdateMonitor({ container, onUpdateAvailable })
    await flushPromises()
    stop()

    windowTarget.dispatch('pageshow')
    windowTarget.dispatch('focus')
    documentTarget.dispatch('visibilitychange')
    containerTarget.dispatch('controllerchange')
    await vi.advanceTimersByTimeAsync(SW_UPDATE_CHECK_INTERVAL_MS * 2)

    expect(update).not.toHaveBeenCalled()
    expect(onUpdateAvailable).not.toHaveBeenCalled()
    expect(windowTarget.listenerCount('pageshow')).toBe(0)
    expect(windowTarget.listenerCount('focus')).toBe(0)
    expect(documentTarget.listenerCount('visibilitychange')).toBe(0)
    expect(containerTarget.listenerCount('controllerchange')).toBe(0)
  })

  it('登録失敗時は警告を出す', async () => {
    const { container, register } = setup({ hasController: true })
    const error = new Error('registration failed')
    register.mockRejectedValue(error)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const stop = startSwUpdateMonitor({ container, onUpdateAvailable: vi.fn() })
    await flushPromises()

    expect(warn).toHaveBeenCalledWith('[pwa] service worker registration failed', error)
    stop()
  })

  it('更新チェック失敗時は警告を出して次回に任せる', async () => {
    const { container, windowTarget, update } = setup({ hasController: true })
    const error = new Error('offline')
    update.mockRejectedValue(error)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const stop = startSwUpdateMonitor({ container, onUpdateAvailable: vi.fn() })
    await flushPromises()
    windowTarget.dispatch('focus')
    await flushPromises()

    expect(warn).toHaveBeenCalledWith('[pwa] service worker update check failed', error)
    stop()
  })
})
