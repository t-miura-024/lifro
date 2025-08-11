import { getServerAuthSession } from "@/auth";
import { redirect } from "next/navigation";
import LogoutButton from "./_components/LogoutButton";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div>
      <header style={{ display: "flex", gap: 12, padding: 12, borderBottom: "1px solid #eee" }}>
        <div style={{ flex: 1 }}>ログイン中: {session.user?.email}</div>
        <LogoutButton />
      </header>
      <div>{children}</div>
    </div>
  );
}
