import { RoutineFormPage } from '@/components/routine/routine-form'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/routines/$routineId')({
  component: RoutineEditPage,
})

function RoutineEditPage() {
  const { routineId } = Route.useParams()
  return <RoutineFormPage routineId={Number(routineId)} />
}
