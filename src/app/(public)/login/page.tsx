"use client";

import { signIn } from "next-auth/react";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";

export default function LoginPage() {
  return (
    <Container maxWidth="sm">
      <Box minHeight="100dvh" display="grid" sx={{ placeItems: "center" }}>
        <Stack spacing={3} alignItems="center">
          <Typography variant="h5" fontWeight={700}>
            ようこそ
          </Typography>
          <Button
            type="button"
            variant="contained"
            color="primary"
            startIcon={<GoogleIcon />}
            onClick={() => signIn("google")}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Google でログイン
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
