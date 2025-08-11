"use client";

import { AppBar, Toolbar, Container, Typography } from "@mui/material";
import LogoutButton from "./LogoutButton";

export default function ProtectedShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <AppBar position="sticky" color="default" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="body2" sx={{ flexGrow: 1 }}>
            ログイン中: {email}
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
