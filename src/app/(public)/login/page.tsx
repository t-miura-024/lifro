"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh" }}>
      <button
        type="button"
        onClick={() => signIn("google")}
        style={{
          padding: "12px 16px",
          borderRadius: 8,
          background: "#4285F4",
          color: "white",
          fontWeight: 600,
        }}
      >
        Google でログイン
      </button>
    </main>
  );
}
