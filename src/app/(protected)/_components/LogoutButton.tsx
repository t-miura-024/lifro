"use client";
import { signOut } from "next-auth/react";
import { Button } from "@mui/material";

export default function LogoutButton() {
  return (
    <Button
      variant="outlined"
      color="inherit"
      size="small"
      onClick={() => signOut({ callbackUrl: "/login" })}
      sx={{ textTransform: "none" }}
    >
      ログアウト
    </Button>
  );
}
