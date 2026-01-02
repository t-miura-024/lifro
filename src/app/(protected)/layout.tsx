import { getServerAuthSession } from '@/auth'
import { redirect } from 'next/navigation'
import ProtectedShell from './_components/ProtectedShell'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerAuthSession()
  if (!session?.user) {
    redirect('/login')
  }

  return <ProtectedShell email={session.user?.email ?? ''}>{children}</ProtectedShell>
}
