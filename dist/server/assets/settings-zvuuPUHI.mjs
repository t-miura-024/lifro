import { jsxs, jsx } from "react/jsx-runtime";
import { a as authClient, b as signOut } from "./auth-client-DCMH_loW.mjs";
import EmailIcon from "@mui/icons-material/Email";
import InfoIcon from "@mui/icons-material/Info";
import LogoutIcon from "@mui/icons-material/Logout";
import { Stack, Paper, Box, Avatar, Typography, List, ListItem, ListItemIcon, ListItemText, Divider, Button } from "@mui/material";
import { useState } from "react";
import "./index-Bnn1A655.mjs";
import "@better-auth/core/env";
import "@better-auth/core/error";
import "@better-auth/kysely-adapter";
import "@better-auth/core/utils/url";
import "nanostores";
import "defu";
import "@better-fetch/fetch";
import "@better-auth/core/utils/string";
function StartSettingsPage() {
  const { data: session } = authClient.useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(null);
  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await signOut();
    } catch (error) {
      console.error("[settings] signOut failed", error);
      setLogoutError("ログアウトに失敗しました。再試行してください。");
    } finally {
      setIsLoggingOut(false);
    }
  };
  const userEmail = session?.user?.email || "不明";
  const userName = session?.user?.name || userEmail.split("@")[0];
  const userImage = session?.user?.image;
  return /* @__PURE__ */ jsxs(Stack, { spacing: 3, children: [
    /* @__PURE__ */ jsx(Paper, { variant: "outlined", children: /* @__PURE__ */ jsx(Box, { p: 3, children: /* @__PURE__ */ jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", children: [
      /* @__PURE__ */ jsx(Avatar, { src: userImage || void 0, alt: userName, sx: { width: 56, height: 56 }, children: userName[0]?.toUpperCase() }),
      /* @__PURE__ */ jsxs(Box, { children: [
        /* @__PURE__ */ jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: userName }),
        /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "text.secondary", children: userEmail })
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsx(Paper, { variant: "outlined", children: /* @__PURE__ */ jsxs(List, { disablePadding: true, children: [
      /* @__PURE__ */ jsxs(ListItem, { children: [
        /* @__PURE__ */ jsx(ListItemIcon, { children: /* @__PURE__ */ jsx(EmailIcon, {}) }),
        /* @__PURE__ */ jsx(ListItemText, { primary: "メールアドレス", secondary: userEmail })
      ] }),
      /* @__PURE__ */ jsx(Divider, { component: "li" }),
      /* @__PURE__ */ jsxs(ListItem, { children: [
        /* @__PURE__ */ jsx(ListItemIcon, { children: /* @__PURE__ */ jsx(InfoIcon, {}) }),
        /* @__PURE__ */ jsx(ListItemText, { primary: "アプリバージョン", secondary: "0.1.0" })
      ] })
    ] }) }),
    logoutError != null && /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "error", role: "alert", children: logoutError }),
    /* @__PURE__ */ jsx(
      Button,
      {
        variant: "outlined",
        color: "error",
        startIcon: /* @__PURE__ */ jsx(LogoutIcon, {}),
        onClick: handleLogout,
        disabled: isLoggingOut,
        sx: { minHeight: 48 },
        children: isLoggingOut ? "ログアウト中..." : "ログアウト"
      }
    )
  ] });
}
const SplitComponent = StartSettingsPage;
export {
  SplitComponent as component
};
