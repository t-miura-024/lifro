import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'lifro - 筋トレログ',
    short_name: 'lifro',
    description: '筋トレログ管理アプリ',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1976d2',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/maskable-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/mobile.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
      },
      {
        src: '/screenshots/desktop.png',
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide',
      },
    ],
  }
}
