import { RoutineFormPage } from '@/components/routine/routine-form'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/routines/new')({
  component: () => <RoutineFormPage routineId={null} />,
})
