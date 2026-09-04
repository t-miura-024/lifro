import { createFileRoute, redirect } from '@tanstack/react-router'

/** `/` は現行 (`src/app/(protected)/page.tsx`) と同様 `/logs` へ遷移する。 */
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/logs' })
  },
})
