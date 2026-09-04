import { createRootRoute, HeadContent, Outlet, Scripts, createFileRoute, lazyRouteComponent, redirect, createRouter } from "@tanstack/react-router";
import { jsxs, jsx } from "react/jsx-runtime";
import { Paper, Box, Typography, Button, IconButton, ThemeProvider, CssBaseline } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import GetAppIcon from "@mui/icons-material/GetApp";
import { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from "react";
import { createTheme } from "@mui/material/styles";
import { T as TSS_SERVER_FUNCTION, a as getServerFnById, c as createServerFn } from "../server.mjs";
const DISMISSED_KEY = "pwa-install-dismissed";
const DISMISSED_EXPIRY_DAYS = 7;
function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const now = /* @__PURE__ */ new Date();
      const diffDays = (now.getTime() - dismissedDate.getTime()) / (1e3 * 60 * 60 * 24);
      if (diffDays < DISMISSED_EXPIRY_DAYS) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem(DISMISSED_KEY);
      }
    }
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);
  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, [deferredPrompt]);
  const dismiss = useCallback(() => {
    setIsDismissed(true);
    localStorage.setItem(DISMISSED_KEY, (/* @__PURE__ */ new Date()).toISOString());
  }, []);
  const canShowPrompt = isInstallable && !isInstalled && !isDismissed;
  return {
    isInstallable,
    isInstalled,
    isDismissed,
    canShowPrompt,
    install,
    dismiss
  };
}
function InstallPrompt() {
  const { canShowPrompt, install, dismiss } = usePwaInstall();
  if (!canShowPrompt) {
    return null;
  }
  return /* @__PURE__ */ jsxs(
    Paper,
    {
      elevation: 8,
      sx: {
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 1300,
        p: 2,
        display: "flex",
        alignItems: "center",
        gap: 2,
        borderRadius: 3,
        maxWidth: 400,
        mx: "auto"
      },
      children: [
        /* @__PURE__ */ jsx(GetAppIcon, { color: "primary", sx: { fontSize: 32 } }),
        /* @__PURE__ */ jsxs(Box, { sx: { flex: 1 }, children: [
          /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", fontWeight: "bold", children: "アプリをインストール" }),
          /* @__PURE__ */ jsx(Typography, { variant: "caption", color: "text.secondary", children: "ホーム画面に追加してすぐにアクセス" })
        ] }),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "contained",
            size: "small",
            onClick: install,
            sx: { minWidth: "auto", px: 2 },
            children: "追加"
          }
        ),
        /* @__PURE__ */ jsx(IconButton, { size: "small", onClick: dismiss, "aria-label": "閉じる", children: /* @__PURE__ */ jsx(CloseIcon, { fontSize: "small" }) })
      ]
    }
  );
}
function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[pwa] service worker registration failed", error);
    });
  }, []);
  return null;
}
const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      // Pixel 9 の実質論理幅は約 411dp 前後。モバイル標準を強めるため sm をやや狭める。
      sm: 480,
      md: 768,
      lg: 1200,
      xl: 1536
    }
  },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#1976d2" },
        secondary: { main: "#9c27b0" }
      }
    },
    dark: {
      palette: {
        primary: { main: "#90caf9" },
        secondary: { main: "#ce93d8" }
      }
    }
  },
  cssVariables: true,
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: ({ theme: theme2 }) => ({
          borderRadius: 12,
          textTransform: "none",
          fontWeight: 700,
          minHeight: 44,
          // タッチターゲット確保
          paddingInline: theme2.spacing(2)
        })
      }
    },
    MuiContainer: {
      defaultProps: { maxWidth: "sm" },
      styleOverrides: {
        root: ({ theme: theme2 }) => ({
          paddingLeft: theme2.spacing(2),
          paddingRight: theme2.spacing(2),
          [theme2.breakpoints.up("sm")]: {
            paddingLeft: theme2.spacing(3),
            paddingRight: theme2.spacing(3)
          }
        })
      }
    },
    MuiToolbar: {
      styleOverrides: {
        root: ({ theme: theme2 }) => ({
          minHeight: 56,
          [theme2.breakpoints.up("sm")]: { minHeight: 64 }
        })
      }
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          lineHeight: 1.35
        }
      }
    }
  },
  shape: { borderRadius: 12 },
  typography: {
    fontSize: 14,
    // モバイル基準の相対サイズ
    h5: { fontSize: "1.25rem", fontWeight: 700 },
    button: { fontWeight: 700 }
  }
});
const SOUND_NONE = "none";
const VOLUME_STORAGE_KEY = "lifro:volume";
const DEFAULT_VOLUME_PERCENT = 100;
class AudioScheduler {
  constructor() {
    this.audioContext = null;
    this.buffers = /* @__PURE__ */ new Map();
    this.loadingPromises = /* @__PURE__ */ new Map();
    this.volumePercent = DEFAULT_VOLUME_PERCENT;
    this.loadVolumeFromStorage();
  }
  /**
   * localStorageから音量設定を読み込む
   */
  loadVolumeFromStorage() {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
      if (stored !== null) {
        const parsed = Number.parseInt(stored, 10);
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 500) {
          this.volumePercent = parsed;
        }
      }
    } catch {
    }
  }
  /**
   * localStorageに音量設定を保存する
   */
  saveVolumeToStorage() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(this.volumePercent));
    } catch {
    }
  }
  /**
   * 音量を設定する（0-300%）
   * @param percent 音量パーセント（0-300）
   */
  setVolume(percent) {
    this.volumePercent = Math.max(0, Math.min(500, percent));
    this.saveVolumeToStorage();
  }
  /**
   * 現在の音量を取得する（0-300%）
   */
  getVolume() {
    return this.volumePercent;
  }
  /**
   * AudioContext を初期化（ユーザーインタラクション時に呼び出す必要がある）
   */
  init() {
    if (this.audioContext) {
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume().catch(() => {
        });
      }
      return this.audioContext;
    }
    try {
      this.audioContext = new AudioContext();
      return this.audioContext;
    } catch (error) {
      console.error("Failed to create AudioContext:", error);
      return null;
    }
  }
  /**
   * AudioContext の現在時刻を取得
   */
  getCurrentTime() {
    return this.audioContext?.currentTime ?? 0;
  }
  /**
   * 音声ファイルをプリロード
   * @param filename 音声ファイル名
   */
  async preloadSound(filename) {
    if (!filename || filename === SOUND_NONE) {
      return null;
    }
    if (this.buffers.has(filename)) {
      return this.buffers.get(filename) ?? null;
    }
    if (this.loadingPromises.has(filename)) {
      return this.loadingPromises.get(filename) ?? null;
    }
    const loadPromise = this.loadAudioBuffer(filename);
    this.loadingPromises.set(filename, loadPromise);
    try {
      const buffer = await loadPromise;
      if (buffer) {
        this.buffers.set(filename, buffer);
      }
      return buffer;
    } finally {
      this.loadingPromises.delete(filename);
    }
  }
  /**
   * 音声ファイルをフェッチしてデコード
   */
  async loadAudioBuffer(filename) {
    if (!this.audioContext) {
      this.init();
    }
    if (!this.audioContext) {
      return null;
    }
    try {
      const response = await fetch(`/sounds/${filename}`);
      if (!response.ok) {
        console.error(`Failed to fetch sound: ${filename}`);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      console.error(`Failed to load sound ${filename}:`, error);
      return null;
    }
  }
  /**
   * 指定した AudioContext 時刻に音を再生（先読みスケジューリング）
   * @param filename 音声ファイル名
   * @param when AudioContext.currentTime 基準の再生時刻（省略時は即座に再生）
   */
  playAt(filename, when) {
    if (!filename || filename === SOUND_NONE) {
      return;
    }
    if (!this.audioContext) {
      this.init();
    }
    if (!this.audioContext) {
      return;
    }
    const buffer = this.buffers.get(filename);
    if (!buffer) {
      this.preloadSound(filename).then(() => {
        const loadedBuffer = this.buffers.get(filename);
        if (loadedBuffer) {
          this.playBuffer(loadedBuffer, when);
        }
      });
      return;
    }
    this.playBuffer(buffer, when);
  }
  /**
   * 即座に音を再生
   * @param filename 音声ファイル名
   */
  playNow(filename) {
    this.playAt(filename, void 0);
  }
  /**
   * AudioBuffer を再生
   */
  playBuffer(buffer, when) {
    if (!this.audioContext) return;
    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = this.volumePercent / 100;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      const playTime = when ?? this.audioContext.currentTime;
      const actualPlayTime = Math.max(playTime, this.audioContext.currentTime);
      source.start(actualPlayTime);
    } catch (error) {
      console.error("Failed to play buffer:", error);
    }
  }
  /**
   * 複数の音声ファイルを一括プリロード
   */
  async preloadSounds(filenames) {
    const validFilenames = filenames.filter(
      (f) => f !== null && f !== SOUND_NONE
    );
    await Promise.all(validFilenames.map((f) => this.preloadSound(f)));
  }
  /**
   * リソースを解放
   */
  dispose() {
    if (this.audioContext) {
      this.audioContext.close().catch(() => {
      });
      this.audioContext = null;
    }
    this.buffers.clear();
    this.loadingPromises.clear();
  }
}
const audioScheduler = new AudioScheduler();
function initAudioContext() {
  audioScheduler.init();
}
const TimerContext = createContext(null);
const TimerStatusContext = createContext(null);
const initialState = {
  status: "idle",
  timer: null,
  currentUnitIndex: 0,
  remainingSeconds: 0,
  totalDuration: 0,
  isRepeat: false
};
function TimerProvider({ children }) {
  const [state, setState] = useState(initialState);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(0);
  const elapsedSecondsRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  const moveToNextUnit = useCallback(() => {
    setState((prev) => {
      if (!prev.timer) return prev;
      const nextIndex = prev.currentUnitIndex + 1;
      if (nextIndex >= prev.timer.unitTimers.length) {
        if (prev.isRepeat) {
          const firstUnit = prev.timer.unitTimers[0];
          startTimeRef.current = Date.now();
          elapsedSecondsRef.current = 0;
          audioScheduler.preloadSounds([
            firstUnit.countSound,
            firstUnit.countSoundLast3Sec,
            firstUnit.endSound
          ]);
          return {
            ...prev,
            currentUnitIndex: 0,
            remainingSeconds: firstUnit.duration,
            totalDuration: firstUnit.duration
          };
        }
        setTimeout(() => clearTimer(), 0);
        return initialState;
      }
      const nextUnit = prev.timer.unitTimers[nextIndex];
      startTimeRef.current = Date.now();
      elapsedSecondsRef.current = 0;
      audioScheduler.preloadSounds([
        nextUnit.countSound,
        nextUnit.countSoundLast3Sec,
        nextUnit.endSound
      ]);
      return {
        ...prev,
        currentUnitIndex: nextIndex,
        remainingSeconds: nextUnit.duration,
        totalDuration: nextUnit.duration
      };
    });
  }, [clearTimer]);
  const tick = useCallback(() => {
    const now = Date.now();
    const totalElapsedMs = now - startTimeRef.current;
    const totalElapsedSeconds = Math.floor(totalElapsedMs / 1e3);
    if (totalElapsedSeconds <= elapsedSecondsRef.current) return;
    const secondsToProcess = totalElapsedSeconds - elapsedSecondsRef.current;
    elapsedSecondsRef.current = totalElapsedSeconds;
    setState((prev) => {
      if (prev.status !== "playing" || !prev.timer) return prev;
      if (isTransitioningRef.current) return prev;
      const currentUnit = prev.timer.unitTimers[prev.currentUnitIndex];
      if (!currentUnit) return prev;
      const newRemaining = Math.max(0, prev.remainingSeconds - secondsToProcess);
      for (let i = 1; i <= secondsToProcess; i++) {
        const remainingAtThisTick = prev.remainingSeconds - i;
        if (remainingAtThisTick > 3) {
          audioScheduler.playNow(currentUnit.countSound);
        } else if (remainingAtThisTick > 0 && remainingAtThisTick <= 3) {
          audioScheduler.playNow(currentUnit.countSoundLast3Sec);
        } else if (remainingAtThisTick === 0) {
          isTransitioningRef.current = true;
          audioScheduler.playNow(currentUnit.endSound);
          setTimeout(() => {
            moveToNextUnit();
            isTransitioningRef.current = false;
          }, 500);
        }
      }
      return {
        ...prev,
        remainingSeconds: newRemaining
      };
    });
  }, [moveToNextUnit]);
  const startTimer = useCallback(
    (timer2) => {
      if (timer2.unitTimers.length === 0) return;
      initAudioContext();
      clearTimer();
      isTransitioningRef.current = false;
      const firstUnit = timer2.unitTimers[0];
      audioScheduler.preloadSounds([
        firstUnit.countSound,
        firstUnit.countSoundLast3Sec,
        firstUnit.endSound
      ]);
      setState((prev) => ({
        status: "playing",
        timer: timer2,
        currentUnitIndex: 0,
        remainingSeconds: firstUnit.duration,
        totalDuration: firstUnit.duration,
        isRepeat: prev.isRepeat
        // リピート状態を維持
      }));
      startTimeRef.current = Date.now();
      elapsedSecondsRef.current = 0;
      intervalRef.current = setInterval(tick, 100);
    },
    [clearTimer, tick]
  );
  const pause = useCallback(() => {
    clearTimer();
    setState((prev) => ({
      ...prev,
      status: "paused"
    }));
  }, [clearTimer]);
  const resume = useCallback(() => {
    setState((prev) => {
      const elapsed = prev.totalDuration - prev.remainingSeconds;
      startTimeRef.current = Date.now() - elapsed * 1e3;
      elapsedSecondsRef.current = elapsed;
      return {
        ...prev,
        status: "playing"
      };
    });
    intervalRef.current = setInterval(tick, 100);
  }, [tick]);
  const stop = useCallback(() => {
    clearTimer();
    isTransitioningRef.current = false;
    setState(initialState);
  }, [clearTimer]);
  const toggleRepeat = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRepeat: !prev.isRepeat
    }));
  }, []);
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);
  const { status, timer, currentUnitIndex, remainingSeconds, totalDuration, isRepeat } = state;
  const value = useMemo(
    () => ({
      status,
      timer,
      currentUnitIndex,
      remainingSeconds,
      totalDuration,
      isRepeat,
      startTimer,
      pause,
      resume,
      stop,
      toggleRepeat
    }),
    [
      status,
      timer,
      currentUnitIndex,
      remainingSeconds,
      totalDuration,
      isRepeat,
      startTimer,
      pause,
      resume,
      stop,
      toggleRepeat
    ]
  );
  return /* @__PURE__ */ jsx(TimerStatusContext.Provider, { value: state.status, children: /* @__PURE__ */ jsx(TimerContext.Provider, { value, children }) });
}
function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
}
function useTimerStatus() {
  const status = useContext(TimerStatusContext);
  if (status === null) {
    throw new Error("useTimerStatus must be used within a TimerProvider");
  }
  return status;
}
function Providers({ children }) {
  return /* @__PURE__ */ jsxs(ThemeProvider, { theme, children: [
    /* @__PURE__ */ jsx(CssBaseline, {}),
    /* @__PURE__ */ jsx(TimerProvider, { children }),
    /* @__PURE__ */ jsx(InstallPrompt, {}),
    /* @__PURE__ */ jsx(SwRegister, {})
  ] });
}
const Route$c = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover"
      },
      { title: "lifro" },
      { name: "description", content: "筋トレログ管理アプリ" },
      {
        name: "theme-color",
        media: "(prefers-color-scheme: light)",
        content: "#ffffff"
      },
      {
        name: "theme-color",
        media: "(prefers-color-scheme: dark)",
        content: "#0a0a0a"
      }
    ],
    links: [
      // Next 版は `src/app/manifest.ts` から自動で同リンクを出力していた。
      // Start では静的 `public/manifest.webmanifest` を明示的に結線する。
      { rel: "manifest", href: "/manifest.webmanifest" }
    ]
  }),
  component: RootComponent
});
function RootComponent() {
  return /* @__PURE__ */ jsxs("html", { lang: "ja", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsx(Providers, { children: /* @__PURE__ */ jsx(Outlet, {}) }),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
var createSsrRpc = (functionId) => {
  const url = "/_serverFn/" + functionId;
  const serverFnMeta = { id: functionId };
  const fn = async (...args) => {
    return (await getServerFnById(functionId))(...args);
  };
  return Object.assign(fn, {
    url,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
const getSessionUserIdServerFn = createServerFn({
  method: "GET"
}).handler(createSsrRpc("d7f7afd587c2e73a5fabe15fd9dde630f3813b9d6699f72c3e89c216fe6aeb19"));
const $$splitComponentImporter$7 = () => import("./route-D_paYztY.mjs");
const $$splitErrorComponentImporter = () => import("./route-Bcr_Ih87.mjs");
const Route$b = createFileRoute("/_protected")({
  beforeLoad: async () => {
    let result;
    try {
      result = await getSessionUserIdServerFn();
    } catch (error) {
      console.error("[protected-layout] session check failed", error);
      throw error;
    }
    if (result.userId == null) {
      throw redirect({
        to: "/login"
      });
    }
    return {
      userId: result.userId
    };
  },
  errorComponent: lazyRouteComponent($$splitErrorComponentImporter, "errorComponent"),
  component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
const $$splitComponentImporter$6 = () => import("./login-W6j2Juse.mjs");
const Route$a = createFileRoute("/login")({
  validateSearch: (search) => ({
    error: typeof search.error === "string" ? search.error : void 0
  }),
  component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
const $$splitComponentImporter$5 = () => import("./offline-Dz7Mfish.mjs");
const Route$9 = createFileRoute("/offline")({
  component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
const Route$8 = createFileRoute("/_protected/")({
  beforeLoad: () => {
    throw redirect({ to: "/logs" });
  }
});
const $$splitComponentImporter$4 = () => import("./exercises-CpYQgAjH.mjs");
const Route$7 = createFileRoute("/_protected/exercises")({
  component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
const $$splitComponentImporter$3 = () => import("./logs-DGr0DJDV.mjs");
const Route$6 = createFileRoute("/_protected/logs")({
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const $$splitComponentImporter$2 = () => import("./settings-zvuuPUHI.mjs");
const Route$5 = createFileRoute("/_protected/settings")({
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import("./statistics-BZ7_VZ9D.mjs");
const Route$4 = createFileRoute("/_protected/statistics")({
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./timers-BSQOku_W.mjs");
const Route$3 = createFileRoute("/_protected/timers")({
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const HEALTH_PAYLOAD = { status: "ok" };
function healthResponse() {
  return Response.json({ ...HEALTH_PAYLOAD });
}
let appPromise = null;
function getApp() {
  if (appPromise === null) {
    appPromise = (async () => {
      try {
        const [{ buildApp }, { authMiddleware }] = await Promise.all([
          import("./hono-app-fTdWUSs_.mjs"),
          import("./auth-BOcUbhSd.mjs")
        ]);
        return buildApp(authMiddleware);
      } catch (error) {
        appPromise = null;
        throw error;
      }
    })();
  }
  return appPromise;
}
async function handleRequest(request) {
  const { pathname } = new URL(request.url);
  if (pathname === "/api/health") {
    console.warn("[start-api] unexpected /api/health request; api.health.tsx should handle it");
    if (request.method !== "GET") {
      return Response.json({ error: "Not Found" }, { status: 404 });
    }
    return healthResponse();
  }
  if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) {
    console.warn("[start-api] unexpected /api/auth/* request; api.auth.$.tsx should handle it");
    return Response.json({ error: "Not Found" }, { status: 404 });
  }
  try {
    const app = await getApp();
    return await app.fetch(request);
  } catch (error) {
    console.error("[start-api] handleRequest failed", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
const Route$2 = createFileRoute("/api/$")({
  server: {
    handlers: {
      // NOTE（F4）: GET/POST/PUT/PATCH/DELETE の5動詞は新規公開ではない。
      // 現行 Next 版 `src/app/api/[...route]/route.ts:11-15` が同一の5動詞 export
      // （GET/POST/PUT/DELETE/PATCH）であり parity。Hono 側の `_api` 群が扱う
      // 動詞範囲と一致させるための再現。動詞の追加・削除は Human 判断とする。
      GET: ({ request }) => handleRequest(request),
      POST: ({ request }) => handleRequest(request),
      PUT: ({ request }) => handleRequest(request),
      PATCH: ({ request }) => handleRequest(request),
      DELETE: ({ request }) => handleRequest(request)
    }
  }
});
async function handleHealth() {
  return Response.json({ ...HEALTH_PAYLOAD });
}
const Route$1 = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: () => handleHealth()
    }
  }
});
async function handleAuth(request) {
  try {
    const { auth } = await import("./auth-sbdKgJv0.mjs");
    return await auth.handler(request);
  } catch (error) {
    console.error("[start-auth] handleAuth failed", error);
    if (error instanceof Error && error.message.includes("USER_NOT_ALLOWED")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleAuth(request),
      POST: ({ request }) => handleAuth(request)
    }
  }
});
const ProtectedRouteRoute = Route$b.update({
  id: "/_protected",
  getParentRoute: () => Route$c
});
const LoginRoute = Route$a.update({
  id: "/login",
  path: "/login",
  getParentRoute: () => Route$c
});
const OfflineRoute = Route$9.update({
  id: "/offline",
  path: "/offline",
  getParentRoute: () => Route$c
});
const ProtectedIndexRoute = Route$8.update({
  id: "/",
  path: "/",
  getParentRoute: () => ProtectedRouteRoute
});
const ProtectedExercisesRoute = Route$7.update({
  id: "/exercises",
  path: "/exercises",
  getParentRoute: () => ProtectedRouteRoute
});
const ProtectedLogsRoute = Route$6.update({
  id: "/logs",
  path: "/logs",
  getParentRoute: () => ProtectedRouteRoute
});
const ProtectedSettingsRoute = Route$5.update({
  id: "/settings",
  path: "/settings",
  getParentRoute: () => ProtectedRouteRoute
});
const ProtectedStatisticsRoute = Route$4.update({
  id: "/statistics",
  path: "/statistics",
  getParentRoute: () => ProtectedRouteRoute
});
const ProtectedTimersRoute = Route$3.update({
  id: "/timers",
  path: "/timers",
  getParentRoute: () => ProtectedRouteRoute
});
const ApiSplatRoute = Route$2.update({
  id: "/api/$",
  path: "/api/$",
  getParentRoute: () => Route$c
});
const ApiHealthRoute = Route$1.update({
  id: "/api/health",
  path: "/api/health",
  getParentRoute: () => Route$c
});
const ApiAuthSplatRoute = Route.update({
  id: "/api/auth/$",
  path: "/api/auth/$",
  getParentRoute: () => Route$c
});
const ProtectedRouteRouteChildren = {
  ProtectedExercisesRoute,
  ProtectedLogsRoute,
  ProtectedSettingsRoute,
  ProtectedStatisticsRoute,
  ProtectedTimersRoute,
  ProtectedIndexRoute
};
const ProtectedRouteRouteWithChildren = ProtectedRouteRoute._addFileChildren(
  ProtectedRouteRouteChildren
);
const rootRouteChildren = {
  ProtectedRouteRoute: ProtectedRouteRouteWithChildren,
  LoginRoute,
  OfflineRoute,
  ApiSplatRoute,
  ApiHealthRoute,
  ApiAuthSplatRoute
};
const routeTree = Route$c._addFileChildren(rootRouteChildren)._addFileTypes();
function getRouter() {
  const router2 = createRouter({ routeTree });
  return router2;
}
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  HEALTH_PAYLOAD as H,
  Route$a as R,
  SOUND_NONE as S,
  audioScheduler as a,
  useTimerStatus as b,
  router as r,
  useTimer as u
};
