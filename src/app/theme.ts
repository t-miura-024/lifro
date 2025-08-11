import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      // Pixel 9 の実質論理幅は約 411dp 前後。モバイル標準を強めるため sm をやや狭める。
      sm: 480,
      md: 768,
      lg: 1200,
      xl: 1536,
    },
  },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#1976d2" },
        secondary: { main: "#9c27b0" },
      },
    },
    dark: {
      palette: {
        primary: { main: "#90caf9" },
        secondary: { main: "#ce93d8" },
      },
    },
  },
  cssVariables: true,
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12,
          textTransform: "none",
          fontWeight: 700,
          minHeight: 44, // タッチターゲット確保
          paddingInline: theme.spacing(2),
        }),
      },
    },
    MuiContainer: {
      defaultProps: { maxWidth: "sm" },
      styleOverrides: {
        root: ({ theme }) => ({
          paddingLeft: theme.spacing(2),
          paddingRight: theme.spacing(2),
          [theme.breakpoints.up("sm")]: {
            paddingLeft: theme.spacing(3),
            paddingRight: theme.spacing(3),
          },
        }),
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: ({ theme }) => ({
          minHeight: 56,
          [theme.breakpoints.up("sm")]: { minHeight: 64 },
        }),
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          lineHeight: 1.35,
        },
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontSize: 14, // モバイル基準の相対サイズ
    h5: { fontSize: "1.25rem", fontWeight: 700 },
    button: { fontWeight: 700 },
  },
});

export default theme;
