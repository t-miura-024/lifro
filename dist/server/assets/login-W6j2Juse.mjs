import { jsx, jsxs } from "react/jsx-runtime";
import { s as signInWithGoogle } from "./auth-client-DCMH_loW.mjs";
import GoogleIcon from "@mui/icons-material/Google";
import { Container, Box, Stack, Typography, Alert, Button } from "@mui/material";
import { useState } from "react";
import { R as Route } from "./router-Bm5ENF0-.mjs";
import "./index-Bnn1A655.mjs";
import "@better-auth/core/env";
import "@better-auth/core/error";
import "@better-auth/kysely-adapter";
import "@better-auth/core/utils/url";
import "nanostores";
import "defu";
import "@better-fetch/fetch";
import "@better-auth/core/utils/string";
import "@tanstack/react-router";
import "@mui/icons-material/Close";
import "@mui/icons-material/GetApp";
import "@mui/material/styles";
import "../server.mjs";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
function StartLogin() {
  const {
    error: searchError
  } = Route.useSearch();
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const isInviteDenied = searchError === "access_denied";
  const showInviteError = isInviteDenied;
  const showGenericError = failed || searchError != null && !isInviteDenied;
  const handleLogin = async () => {
    setFailed(false);
    setPending(true);
    try {
      const res = await signInWithGoogle();
      if (res?.error) setFailed(true);
    } catch (error) {
      console.error("[login] signInWithGoogle failed", error);
      setFailed(true);
    } finally {
      setPending(false);
    }
  };
  return /* @__PURE__ */ jsx(Container, { maxWidth: "sm", children: /* @__PURE__ */ jsx(Box, { minHeight: "100dvh", display: "grid", sx: {
    placeItems: "center",
    paddingBottom: 16,
    // iOS下部安全領域 + 親指リーチ
    paddingTop: 8
  }, children: /* @__PURE__ */ jsxs(Stack, { spacing: 3, alignItems: "center", sx: {
    width: "100%"
  }, children: [
    /* @__PURE__ */ jsx(Typography, { variant: "h5", fontWeight: 700, align: "center", children: "ようこそ" }),
    /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "text.secondary", align: "center", children: "Google アカウントでログインして、筋トレを簡単に記録しましょう。" }),
    showInviteError && /* @__PURE__ */ jsx(Alert, { severity: "error", sx: {
      width: "100%"
    }, children: "ログインできませんでした。招待済みアカウントか確認してください。" }),
    showGenericError && /* @__PURE__ */ jsx(Alert, { severity: "error", sx: {
      width: "100%"
    }, children: "ログイン中にエラーが発生しました。再試行してください。" }),
    /* @__PURE__ */ jsx(Button, { type: "button", variant: "contained", color: "primary", startIcon: /* @__PURE__ */ jsx(GoogleIcon, {}), onClick: handleLogin, disabled: pending, sx: {
      textTransform: "none",
      fontWeight: 700,
      width: "100%"
    }, size: "large", children: "Google でログイン" })
  ] }) }) });
}
export {
  StartLogin as component
};
