import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { u as useTimer, a as audioScheduler, b as useTimerStatus } from "./router-Bm5ENF0-.mjs";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RepeatIcon from "@mui/icons-material/Repeat";
import StopIcon from "@mui/icons-material/Stop";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { Paper, Box, Stack, IconButton, Typography, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, Popover, Slider, Container, BottomNavigation, BottomNavigationAction } from "@mui/material";
import { useState, useEffect } from "react";
import { a as authClient } from "./auth-client-DCMH_loW.mjs";
import BarChartIcon from "@mui/icons-material/BarChart";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import ListAltIcon from "@mui/icons-material/ListAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import TimerIcon from "@mui/icons-material/Timer";
import { useLocation, useNavigate, Outlet } from "@tanstack/react-router";
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
import "./index-Bnn1A655.mjs";
import "@better-auth/core/env";
import "@better-auth/core/error";
import "@better-auth/kysely-adapter";
import "@better-auth/core/utils/url";
import "nanostores";
import "defu";
import "@better-fetch/fetch";
import "@better-auth/core/utils/string";
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
function TimerOverlay() {
  const {
    status,
    timer,
    currentUnitIndex,
    remainingSeconds,
    totalDuration,
    isRepeat,
    pause,
    resume,
    stop,
    toggleRepeat
  } = useTimer();
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);
  const [volume, setVolume] = useState(100);
  const [volumeAnchorEl, setVolumeAnchorEl] = useState(null);
  useEffect(() => {
    setVolume(audioScheduler.getVolume());
  }, []);
  const handleVolumeClick = (event) => {
    setVolumeAnchorEl(event.currentTarget);
  };
  const handleVolumeClose = () => {
    setVolumeAnchorEl(null);
  };
  const handleVolumeChange = (_event, newValue) => {
    const newVolume = newValue;
    setVolume(newVolume);
    audioScheduler.setVolume(newVolume);
  };
  const getVolumeIcon = () => {
    if (volume === 0) return /* @__PURE__ */ jsx(VolumeOffIcon, {});
    if (volume <= 50) return /* @__PURE__ */ jsx(VolumeDownIcon, {});
    return /* @__PURE__ */ jsx(VolumeUpIcon, {});
  };
  const volumePopoverOpen = Boolean(volumeAnchorEl);
  if (status === "idle" || !timer) {
    return null;
  }
  const currentUnit = timer.unitTimers[currentUnitIndex];
  const progress = totalDuration > 0 ? (totalDuration - remainingSeconds) / totalDuration * 100 : 0;
  const handlePlayPause = () => {
    if (status === "playing") {
      pause();
    } else {
      resume();
    }
  };
  const handleStop = () => {
    setStopConfirmOpen(true);
  };
  const handleStopConfirm = () => {
    stop();
    setStopConfirmOpen(false);
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(
      Paper,
      {
        elevation: 8,
        sx: {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.modal + 1,
          borderRadius: 0,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          pt: "env(safe-area-inset-top)"
        },
        children: [
          /* @__PURE__ */ jsx(Box, { sx: { px: 2, py: 1.5 }, children: /* @__PURE__ */ jsxs(Stack, { direction: "row", alignItems: "center", spacing: 2, children: [
            /* @__PURE__ */ jsx(
              IconButton,
              {
                size: "small",
                onClick: handleStop,
                sx: { color: "inherit" },
                "aria-label": "タイマーを停止",
                children: /* @__PURE__ */ jsx(StopIcon, {})
              }
            ),
            /* @__PURE__ */ jsx(
              IconButton,
              {
                size: "small",
                onClick: toggleRepeat,
                sx: {
                  color: isRepeat ? "primary.contrastText" : "rgba(0, 0, 0, 0.35)"
                },
                "aria-label": isRepeat ? "リピート再生を無効にする" : "リピート再生を有効にする",
                children: /* @__PURE__ */ jsx(RepeatIcon, {})
              }
            ),
            /* @__PURE__ */ jsx(
              IconButton,
              {
                size: "small",
                onClick: handleVolumeClick,
                sx: { color: "inherit" },
                "aria-label": "音量調整",
                children: getVolumeIcon()
              }
            ),
            /* @__PURE__ */ jsxs(Box, { sx: { flex: 1, minWidth: 0 }, children: [
              /* @__PURE__ */ jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, children: [
                /* @__PURE__ */ jsx(
                  Typography,
                  {
                    variant: "body2",
                    sx: {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1
                    },
                    children: timer.name
                  }
                ),
                /* @__PURE__ */ jsxs(Typography, { variant: "caption", sx: { opacity: 0.8 }, children: [
                  currentUnitIndex + 1,
                  "/",
                  timer.unitTimers.length
                ] })
              ] }),
              /* @__PURE__ */ jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, children: [
                /* @__PURE__ */ jsx(
                  Typography,
                  {
                    variant: "h5",
                    fontWeight: 700,
                    sx: { fontVariantNumeric: "tabular-nums", flexShrink: 0 },
                    children: formatTime(remainingSeconds)
                  }
                ),
                /* @__PURE__ */ jsx(
                  Typography,
                  {
                    variant: "body2",
                    sx: {
                      opacity: 0.8,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1
                    },
                    children: currentUnit?.name || "名前なし"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              IconButton,
              {
                size: "large",
                onClick: handlePlayPause,
                sx: {
                  color: "inherit",
                  bgcolor: "rgba(255, 255, 255, 0.2)",
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.3)"
                  }
                },
                "aria-label": status === "playing" ? "一時停止" : "再開",
                children: status === "playing" ? /* @__PURE__ */ jsx(PauseIcon, {}) : /* @__PURE__ */ jsx(PlayArrowIcon, {})
              }
            )
          ] }) }),
          /* @__PURE__ */ jsx(
            LinearProgress,
            {
              variant: "determinate",
              value: progress,
              sx: {
                height: 4,
                bgcolor: "rgba(255, 255, 255, 0.2)",
                "& .MuiLinearProgress-bar": {
                  bgcolor: "rgba(255, 255, 255, 0.8)"
                }
              }
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxs(
      Dialog,
      {
        open: stopConfirmOpen,
        onClose: (_event, reason) => {
          if (reason === "backdropClick") return;
          setStopConfirmOpen(false);
        },
        maxWidth: "xs",
        fullWidth: true,
        children: [
          /* @__PURE__ */ jsx(DialogTitle, { children: "タイマーを停止" }),
          /* @__PURE__ */ jsx(DialogContent, { children: /* @__PURE__ */ jsx(Typography, { children: "タイマーを停止しますか？" }) }),
          /* @__PURE__ */ jsxs(DialogActions, { sx: { px: 3, py: 2 }, children: [
            /* @__PURE__ */ jsx(Button, { onClick: () => setStopConfirmOpen(false), children: "キャンセル" }),
            /* @__PURE__ */ jsx(Button, { variant: "contained", color: "error", onClick: handleStopConfirm, children: "停止" })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx(
      Popover,
      {
        open: volumePopoverOpen,
        anchorEl: volumeAnchorEl,
        onClose: handleVolumeClose,
        anchorOrigin: {
          vertical: "bottom",
          horizontal: "center"
        },
        transformOrigin: {
          vertical: "top",
          horizontal: "center"
        },
        sx: { zIndex: (theme) => theme.zIndex.modal + 2 },
        children: /* @__PURE__ */ jsx(Box, { sx: { p: 2, width: 200 }, children: /* @__PURE__ */ jsxs(Stack, { direction: "row", alignItems: "center", spacing: 2, children: [
          /* @__PURE__ */ jsx(
            Slider,
            {
              value: volume,
              onChange: handleVolumeChange,
              min: 0,
              max: 500,
              step: 10,
              "aria-label": "音量",
              sx: { flex: 1 }
            }
          ),
          /* @__PURE__ */ jsxs(Typography, { variant: "body2", sx: { minWidth: 45, textAlign: "right" }, children: [
            volume,
            "%"
          ] })
        ] }) })
      }
    )
  ] });
}
const navItems = [
  { label: "種目", icon: /* @__PURE__ */ jsx(ListAltIcon, {}), path: "/exercises" },
  { label: "ログ", icon: /* @__PURE__ */ jsx(FitnessCenterIcon, {}), path: "/logs" },
  { label: "統計", icon: /* @__PURE__ */ jsx(BarChartIcon, {}), path: "/statistics" },
  { label: "タイマー", icon: /* @__PURE__ */ jsx(TimerIcon, {}), path: "/timers" },
  { label: "設定", icon: /* @__PURE__ */ jsx(SettingsIcon, {}), path: "/settings" }
];
function ProtectedShell({
  children
}) {
  const pathname = useLocation({ select: (s) => s.pathname });
  const navigate = useNavigate();
  const status = useTimerStatus();
  const { data: session, isPending, error } = authClient.useSession();
  useEffect(() => {
    if (error != null) {
      console.error("[protected-shell] useSession failed", error);
    }
  }, [error]);
  useEffect(() => {
    if (!isPending && error == null && !session) {
      void navigate({ to: "/login" });
    }
  }, [isPending, error, session, navigate]);
  if (error != null) {
    return /* @__PURE__ */ jsx(Box, { sx: { display: "flex", flexDirection: "column", minHeight: "100dvh" }, children: /* @__PURE__ */ jsxs(Container, { maxWidth: "sm", sx: { py: 8, flexGrow: 1 }, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "h6", fontWeight: 700, gutterBottom: true, children: "セッションの確認に失敗しました" }),
      /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: "ネットワークやサーバの一時的な障害の可能性があります。再読み込みしても改善しない場合は時間をおいて試してください。" }),
      /* @__PURE__ */ jsx(
        Button,
        {
          variant: "contained",
          onClick: () => window.location.reload(),
          sx: { minHeight: 48 },
          children: "再読み込みする"
        }
      )
    ] }) });
  }
  if (isPending || !session) return null;
  const currentNavIndex = navItems.findIndex((item) => pathname.startsWith(item.path));
  const isTimerActive = status !== "idle";
  return /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", flexDirection: "column", minHeight: "100dvh" }, children: [
    /* @__PURE__ */ jsx(TimerOverlay, {}),
    /* @__PURE__ */ jsx(
      Container,
      {
        maxWidth: "sm",
        sx: {
          py: 2,
          flexGrow: 1,
          pb: "calc(56px + env(safe-area-inset-bottom) + 16px)",
          // タイマー実行中は上部にパディングを追加（オーバーレイの高さ分）
          pt: isTimerActive ? "calc(env(safe-area-inset-top) + 80px)" : 2,
          transition: "padding-top 0.3s ease"
        },
        children
      }
    ),
    /* @__PURE__ */ jsx(
      Paper,
      {
        sx: {
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          pb: "env(safe-area-inset-bottom)"
        },
        elevation: 3,
        children: /* @__PURE__ */ jsx(
          BottomNavigation,
          {
            showLabels: true,
            value: currentNavIndex >= 0 ? currentNavIndex : 0,
            onChange: (_, newValue) => {
              navigate({ to: navItems[newValue].path });
            },
            children: navItems.map((item) => /* @__PURE__ */ jsx(
              BottomNavigationAction,
              {
                label: item.label,
                icon: item.icon,
                sx: { minWidth: 60 }
              },
              item.path
            ))
          }
        )
      }
    )
  ] });
}
function ProtectedLayoutComponent() {
  return /* @__PURE__ */ jsx(ProtectedShell, { children: /* @__PURE__ */ jsx(Outlet, {}) });
}
export {
  ProtectedLayoutComponent as component
};
