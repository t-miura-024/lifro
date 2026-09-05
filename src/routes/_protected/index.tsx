import { createFileRoute, redirect } from '@tanstack/react-router'

/** `/` は `/logs` へ遷移する（`_protected` layout 配下）。 */
export const Route = createFileRoute('/_protected/')({
  beforeLoad: () => {
    throw redirect({ to: '/logs' })
  },
})
