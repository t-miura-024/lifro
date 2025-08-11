"use client";

import { AppBar, Toolbar, Container, Typography, Box } from "@mui/material";
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ color: "text.secondary" }}>
              ログイン中
            </Typography>
            <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
              {email}
            </Typography>
          </Box>
          <LogoutButton />
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm" sx={{ py: 2 }}>
        {children}
      </Container>
    </>
  );
}
