'use client'

import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa-install-dismissed'
const DISMISSED_EXPIRY_DAYS = 7

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true

    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    // Check if user dismissed the prompt recently
    const dismissedAt = localStorage.getItem(DISMISSED_KEY)
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt)
      const now = new Date()
      const diffDays =
        (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      if (diffDays < DISMISSED_EXPIRY_DAYS) {
        setIsDismissed(true)
      } else {
        localStorage.removeItem(DISMISSED_KEY)
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      )
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return false

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      return true
    }

    return false
  }, [deferredPrompt])

  const dismiss = useCallback(() => {
    setIsDismissed(true)
    localStorage.setItem(DISMISSED_KEY, new Date().toISOString())
  }, [])

  const canShowPrompt = isInstallable && !isInstalled && !isDismissed

  return {
    isInstallable,
    isInstalled,
    isDismissed,
    canShowPrompt,
    install,
    dismiss,
  }
}
