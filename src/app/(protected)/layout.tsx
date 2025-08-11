import { getServerAuthSession } from "@/auth";
import { redirect } from "next/navigation";
import LogoutButton from "./_components/LogoutButton";
import { AppBar, Toolbar, Container, Typography } from "@mui/material";

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
    <>
      <AppBar position="sticky" color="default" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="body2" sx={{ flexGrow: 1 }}>
            ログイン中: {session.user?.email}
          </Typography>
          <LogoutButton />
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 3 }}>
        {children}
      </Container>
    </>
  );
}
