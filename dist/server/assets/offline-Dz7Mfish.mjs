import { jsx, jsxs } from "react/jsx-runtime";
import { Container, Box, Typography, Button } from "@mui/material";
import CloudOffIcon from "@mui/icons-material/CloudOff";
function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };
  return /* @__PURE__ */ jsx(Container, { maxWidth: "sm", children: /* @__PURE__ */ jsxs(
    Box,
    {
      sx: {
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 3
      },
      children: [
        /* @__PURE__ */ jsx(CloudOffIcon, { sx: { fontSize: 80, color: "text.secondary" } }),
        /* @__PURE__ */ jsx(Typography, { variant: "h5", component: "h1", fontWeight: "bold", children: "オフラインです" }),
        /* @__PURE__ */ jsxs(Typography, { variant: "body1", color: "text.secondary", children: [
          "インターネット接続がありません。",
          /* @__PURE__ */ jsx("br", {}),
          "接続を確認してもう一度お試しください。"
        ] }),
        /* @__PURE__ */ jsx(Button, { variant: "contained", onClick: handleRetry, size: "large", children: "再読み込み" })
      ]
    }
  ) });
}
const SplitComponent = () => /* @__PURE__ */ jsx(OfflinePage, {});
export {
  SplitComponent as component
};
