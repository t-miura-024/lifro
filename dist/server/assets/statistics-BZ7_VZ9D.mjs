import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { c as client } from "./hono-client-D2iVJXCF.mjs";
import ScaleIcon from "@mui/icons-material/Scale";
import { Box, Paper, Typography, List, ListItem, Stack, Grid, ToggleButtonGroup, ToggleButton, FormControl, Select, MenuItem, Tabs, Tab, Skeleton } from "@mui/material";
import { useRef, useState, useEffect, useTransition, useCallback } from "react";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DateRangeIcon from "@mui/icons-material/DateRange";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Legend } from "recharts";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import "dayjs/locale/ja.js";
import "hono/client";
function PillToggle({ value, options, onChange }) {
  const containerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  useEffect(() => {
    if (!containerRef.current) return;
    const selectedIndex = options.findIndex((opt) => opt.value === value);
    const buttons = containerRef.current.querySelectorAll("[data-pill-button]");
    if (buttons[selectedIndex]) {
      const button = buttons[selectedIndex];
      setIndicatorStyle({
        left: button.offsetLeft,
        width: button.offsetWidth
      });
    }
  }, [value, options]);
  return /* @__PURE__ */ jsxs(
    Box,
    {
      ref: containerRef,
      sx: {
        display: "inline-flex",
        position: "relative",
        bgcolor: "action.hover",
        borderRadius: "16px",
        p: "3px"
      },
      children: [
        /* @__PURE__ */ jsx(
          Box,
          {
            sx: {
              position: "absolute",
              top: "3px",
              height: "calc(100% - 6px)",
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              bgcolor: "background.paper",
              borderRadius: "13px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              transition: "left 0.2s ease-out, width 0.2s ease-out"
            }
          }
        ),
        options.map((option) => /* @__PURE__ */ jsx(
          Box,
          {
            "data-pill-button": true,
            onClick: () => onChange(option.value),
            sx: {
              position: "relative",
              zIndex: 1,
              px: 1.5,
              py: 0.5,
              fontSize: "0.8125rem",
              fontWeight: value === option.value ? 600 : 400,
              color: value === option.value ? "text.primary" : "text.secondary",
              cursor: "pointer",
              userSelect: "none",
              transition: "color 0.15s ease",
              whiteSpace: "nowrap",
              "&:hover": {
                color: "text.primary"
              }
            },
            children: option.label
          },
          option.value
        ))
      ]
    }
  );
}
const categoryLabels$2 = {
  CHEST: "胸",
  BACK: "背中",
  SHOULDER: "肩",
  ARM: "腕",
  ABS: "腹筋",
  LEG: "脚"
};
function BodyPartTrainingDaysList({
  data,
  granularity,
  onGranularityChange
}) {
  if (data.length === 0) {
    return /* @__PURE__ */ jsxs(Paper, { variant: "outlined", sx: { p: 2 }, children: [
      /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }, children: [
        /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", children: "部位別トレーニング日数" }),
        /* @__PURE__ */ jsx(
          PillToggle,
          {
            value: granularity,
            options: [
              { value: "category", label: "カテゴリ" },
              { value: "bodyPart", label: "部位" }
            ],
            onChange: onGranularityChange
          }
        )
      ] }),
      /* @__PURE__ */ jsx(
        Box,
        {
          sx: {
            py: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          },
          children: /* @__PURE__ */ jsx(Typography, { color: "text.secondary", variant: "body2", children: "データがありません" })
        }
      )
    ] });
  }
  const maxDays = Math.max(...data.map((d) => d.days));
  return /* @__PURE__ */ jsxs(Paper, { variant: "outlined", sx: { p: 2 }, children: [
    /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", children: "部位別トレーニング日数" }),
      /* @__PURE__ */ jsx(
        PillToggle,
        {
          value: granularity,
          options: [
            { value: "category", label: "カテゴリ" },
            { value: "bodyPart", label: "部位" }
          ],
          onChange: onGranularityChange
        }
      )
    ] }),
    /* @__PURE__ */ jsx(List, { dense: true, disablePadding: true, children: data.map((item, index) => {
      const percentage = item.days / maxDays * 100;
      const displayName = granularity === "category" ? categoryLabels$2[item.category] || item.category : `${categoryLabels$2[item.category] || item.category} - ${item.bodyPartName}`;
      return /* @__PURE__ */ jsx(
        ListItem,
        {
          sx: {
            px: 1,
            py: 0.75,
            borderRadius: 1,
            "&:hover": { bgcolor: "action.hover" }
          },
          children: /* @__PURE__ */ jsxs(Box, { sx: { width: "100%" }, children: [
            /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", mb: 0.5 }, children: [
              /* @__PURE__ */ jsxs(Typography, { variant: "body2", fontWeight: 500, children: [
                index + 1,
                ". ",
                displayName
              ] }),
              /* @__PURE__ */ jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                item.days,
                "日"
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              Box,
              {
                sx: {
                  height: 4,
                  bgcolor: "grey.200",
                  borderRadius: 2,
                  overflow: "hidden"
                },
                children: /* @__PURE__ */ jsx(
                  Box,
                  {
                    sx: {
                      height: "100%",
                      width: `${percentage}%`,
                      bgcolor: "success.main",
                      borderRadius: 2
                    }
                  }
                )
              }
            )
          ] })
        },
        granularity === "category" ? item.category : item.bodyPartId
      );
    }) })
  ] });
}
const categoryLabels$1 = {
  CHEST: "胸",
  BACK: "背中",
  SHOULDER: "肩",
  ARM: "腕",
  ABS: "腹筋",
  LEG: "脚"
};
function BodyPartVolumeList({ data, granularity, onGranularityChange }) {
  if (data.length === 0) {
    return /* @__PURE__ */ jsxs(Paper, { variant: "outlined", sx: { p: 2 }, children: [
      /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }, children: [
        /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", children: "部位別ボリューム" }),
        /* @__PURE__ */ jsx(
          PillToggle,
          {
            value: granularity,
            options: [
              { value: "category", label: "カテゴリ" },
              { value: "bodyPart", label: "部位" }
            ],
            onChange: onGranularityChange
          }
        )
      ] }),
      /* @__PURE__ */ jsx(
        Box,
        {
          sx: {
            py: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          },
          children: /* @__PURE__ */ jsx(Typography, { color: "text.secondary", variant: "body2", children: "データがありません" })
        }
      )
    ] });
  }
  const maxVolume = Math.max(...data.map((d) => d.volume));
  return /* @__PURE__ */ jsxs(Paper, { variant: "outlined", sx: { p: 2 }, children: [
    /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", children: "部位別ボリューム" }),
      /* @__PURE__ */ jsx(
        PillToggle,
        {
          value: granularity,
          options: [
            { value: "category", label: "カテゴリ" },
            { value: "bodyPart", label: "部位" }
          ],
          onChange: onGranularityChange
        }
      )
    ] }),
    /* @__PURE__ */ jsx(List, { dense: true, disablePadding: true, children: data.map((item, index) => {
      const percentage = item.volume / maxVolume * 100;
      const displayName = granularity === "category" ? categoryLabels$1[item.category] || item.category : `${categoryLabels$1[item.category] || item.category} - ${item.bodyPartName}`;
      return /* @__PURE__ */ jsx(
        ListItem,
        {
          sx: {
            px: 1,
            py: 0.75,
            borderRadius: 1,
            "&:hover": { bgcolor: "action.hover" }
          },
          children: /* @__PURE__ */ jsxs(Box, { sx: { width: "100%" }, children: [
            /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", mb: 0.5 }, children: [
              /* @__PURE__ */ jsxs(Typography, { variant: "body2", fontWeight: 500, children: [
                index + 1,
                ". ",
                displayName
              ] }),
              /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "text.secondary", children: item.volume >= 1e3 ? `${(item.volume / 1e3).toFixed(1)}t` : `${item.volume.toLocaleString()}kg` })
            ] }),
            /* @__PURE__ */ jsx(
              Box,
              {
                sx: {
                  height: 4,
                  bgcolor: "grey.200",
                  borderRadius: 2,
                  overflow: "hidden"
                },
                children: /* @__PURE__ */ jsx(
                  Box,
                  {
                    sx: {
                      height: "100%",
                      width: `${percentage}%`,
                      bgcolor: "secondary.main",
                      borderRadius: 2
                    }
                  }
                )
              }
            ),
            /* @__PURE__ */ jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
              item.setCount,
              "セット"
            ] })
          ] })
        },
        `${item.category}-${item.bodyPartId}`
      );
    }) })
  ] });
}
function StatsCard({ title, value, icon, color = "primary.main" }) {
  return /* @__PURE__ */ jsxs(
    Paper,
    {
      variant: "outlined",
      sx: {
        p: 2,
        display: "flex",
        alignItems: "center",
        gap: 2
      },
      children: [
        icon && /* @__PURE__ */ jsx(
          Box,
          {
            sx: {
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: `${color}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color
            },
            children: icon
          }
        ),
        /* @__PURE__ */ jsxs(Box, { children: [
          /* @__PURE__ */ jsx(Typography, { variant: "caption", color: "text.secondary", children: title }),
          /* @__PURE__ */ jsx(Typography, { variant: "h5", fontWeight: 700, children: typeof value === "number" ? value.toLocaleString() : value })
        ] })
      ]
    }
  );
}
function formatPeriodLabel$3(period) {
  if (period.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [, month, day] = period.split("-");
    return `${Number(month)}/${Number(day)}`;
  }
  if (period.match(/^\d{4}-W\d{2}$/)) {
    const week = period.split("-W")[1];
    return `${Number(week)}週`;
  }
  if (period.match(/^\d{4}-\d{2}$/)) {
    const [, month] = period.split("-");
    return `${Number(month)}月`;
  }
  return period;
}
function ContinuityTab({ stats, daysByPeriod, exerciseDays }) {
  const chartData = daysByPeriod.map((d) => ({
    period: d.period,
    periodLabel: formatPeriodLabel$3(d.period),
    days: d.days
  }));
  const maxDays = exerciseDays.length > 0 ? Math.max(...exerciseDays.map((d) => d.days)) : 0;
  return /* @__PURE__ */ jsxs(Stack, { spacing: 2, children: [
    /* @__PURE__ */ jsxs(Grid, { container: true, spacing: 2, children: [
      /* @__PURE__ */ jsx(Grid, { size: { xs: 12 }, children: /* @__PURE__ */ jsx(
        StatsCard,
        {
          title: "トレーニング日数",
          value: stats?.totalDays || 0,
          icon: /* @__PURE__ */ jsx(CalendarMonthIcon, {}),
          color: "#2e7d32"
        }
      ) }),
      /* @__PURE__ */ jsx(Grid, { size: { xs: 6 }, children: /* @__PURE__ */ jsx(
        StatsCard,
        {
          title: "連続週数",
          value: stats?.currentStreakWeeks || 0,
          icon: /* @__PURE__ */ jsx(DateRangeIcon, {}),
          color: "#ed6c02"
        }
      ) }),
      /* @__PURE__ */ jsx(Grid, { size: { xs: 6 }, children: /* @__PURE__ */ jsx(
        StatsCard,
        {
          title: "連続月数",
          value: stats?.currentStreakMonths || 0,
          icon: /* @__PURE__ */ jsx(EventRepeatIcon, {}),
          color: "#d32f2f"
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxs(Paper, { variant: "outlined", sx: { p: 2 }, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", gutterBottom: true, sx: { pl: 1 }, children: "トレーニング日数推移" }),
      chartData.length === 0 || chartData.every((d) => d.days === 0) ? /* @__PURE__ */ jsx(
        Box,
        {
          sx: {
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          },
          children: /* @__PURE__ */ jsx(Typography, { color: "text.secondary", children: "データがありません" })
        }
      ) : /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 200, children: /* @__PURE__ */ jsxs(BarChart, { data: chartData, margin: { top: 10, right: 10, left: -10, bottom: 0 }, children: [
        /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", vertical: false }),
        /* @__PURE__ */ jsx(
          XAxis,
          {
            dataKey: "periodLabel",
            tick: { fontSize: 11 },
            tickLine: false,
            axisLine: false
          }
        ),
        /* @__PURE__ */ jsx(
          YAxis,
          {
            tick: { fontSize: 11 },
            tickLine: false,
            axisLine: false,
            allowDecimals: false
          }
        ),
        /* @__PURE__ */ jsx(
          Tooltip,
          {
            formatter: (value) => [`${value}日`, "トレーニング日数"],
            labelFormatter: (label) => `${label}`
          }
        ),
        /* @__PURE__ */ jsx(Bar, { dataKey: "days", fill: "#2e7d32", radius: [4, 4, 0, 0] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs(Paper, { variant: "outlined", sx: { p: 2 }, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "種目別トレーニング日数" }),
      exerciseDays.length === 0 ? /* @__PURE__ */ jsx(
        Box,
        {
          sx: {
            py: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          },
          children: /* @__PURE__ */ jsx(Typography, { color: "text.secondary", variant: "body2", children: "データがありません" })
        }
      ) : /* @__PURE__ */ jsx(List, { dense: true, disablePadding: true, children: exerciseDays.map((item, index) => {
        const percentage = maxDays > 0 ? item.days / maxDays * 100 : 0;
        return /* @__PURE__ */ jsx(
          ListItem,
          {
            sx: {
              px: 1,
              py: 0.75,
              borderRadius: 1,
              "&:hover": { bgcolor: "action.hover" }
            },
            children: /* @__PURE__ */ jsxs(Box, { sx: { width: "100%" }, children: [
              /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", mb: 0.5 }, children: [
                /* @__PURE__ */ jsxs(Typography, { variant: "body2", fontWeight: 500, children: [
                  index + 1,
                  ". ",
                  item.exerciseName
                ] }),
                /* @__PURE__ */ jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                  item.days,
                  "日"
                ] })
              ] }),
              /* @__PURE__ */ jsx(
                Box,
                {
                  sx: {
                    height: 4,
                    bgcolor: "grey.200",
                    borderRadius: 2,
                    overflow: "hidden"
                  },
                  children: /* @__PURE__ */ jsx(
                    Box,
                    {
                      sx: {
                        height: "100%",
                        width: `${percentage}%`,
                        bgcolor: "success.main",
                        borderRadius: 2
                      }
                    }
                  )
                }
              )
            ] })
          },
          item.exerciseId
        );
      }) })
    ] })
  ] });
}
function ExerciseVolumeList({ data }) {
  if (data.length === 0) {
    return /* @__PURE__ */ jsxs(Paper, { variant: "outlined", sx: { p: 2 }, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "種目別ボリューム" }),
      /* @__PURE__ */ jsx(
        Box,
        {
          sx: {
            py: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          },
          children: /* @__PURE__ */ jsx(Typography, { color: "text.secondary", variant: "body2", children: "データがありません" })
        }
      )
    ] });
  }
  const maxVolume = Math.max(...data.map((d) => d.volume));
  return /* @__PURE__ */ jsxs(Paper, { variant: "outlined", sx: { p: 2 }, children: [
    /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "種目別ボリューム" }),
    /* @__PURE__ */ jsx(List, { dense: true, disablePadding: true, children: data.map((item, index) => {
      const percentage = item.volume / maxVolume * 100;
      return /* @__PURE__ */ jsx(
        ListItem,
        {
          sx: {
            px: 1,
            py: 0.75,
            borderRadius: 1,
            "&:hover": { bgcolor: "action.hover" }
          },
          children: /* @__PURE__ */ jsxs(Box, { sx: { width: "100%" }, children: [
            /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", mb: 0.5 }, children: [
              /* @__PURE__ */ jsxs(Typography, { variant: "body2", fontWeight: 500, children: [
                index + 1,
                ". ",
                item.exerciseName
              ] }),
              /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "text.secondary", children: item.volume >= 1e3 ? `${(item.volume / 1e3).toFixed(1)}t` : `${item.volume.toLocaleString()}kg` })
            ] }),
            /* @__PURE__ */ jsx(
              Box,
              {
                sx: {
                  height: 4,
                  bgcolor: "grey.200",
                  borderRadius: 2,
                  overflow: "hidden"
                },
                children: /* @__PURE__ */ jsx(
                  Box,
                  {
                    sx: {
                      height: "100%",
                      width: `${percentage}%`,
                      bgcolor: "primary.main",
                      borderRadius: 2
                    }
                  }
                )
              }
            ),
            /* @__PURE__ */ jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
              item.setCount,
              "セット"
            ] })
          ] })
        },
        item.exerciseId
      );
    }) })
  ] });
}
const PRESETS = [
  { value: "1month", label: "過去1ヶ月" },
  { value: "3months", label: "過去3ヶ月" },
  { value: "6months", label: "過去6ヶ月" },
  { value: "1year", label: "過去1年" },
  { value: "all", label: "全期間" },
  { value: "custom", label: "カスタム" }
];
function GlobalFilter({
  granularity,
  onGranularityChange,
  timeRange,
  onTimeRangeChange
}) {
  const handleGranularityChange = (_, newGranularity) => {
    if (newGranularity !== null) {
      onGranularityChange(newGranularity);
    }
  };
  const handlePresetChange = (preset) => {
    if (preset === "custom") {
      onTimeRangeChange({
        preset: "custom",
        customStartDate: dayjs().subtract(1, "month").format("YYYY-MM-DD"),
        customEndDate: dayjs().format("YYYY-MM-DD")
      });
    } else {
      onTimeRangeChange({ preset });
    }
  };
  const handleStartDateChange = (date) => {
    if (date) {
      onTimeRangeChange({
        ...timeRange,
        customStartDate: date.format("YYYY-MM-DD")
      });
    }
  };
  const handleEndDateChange = (date) => {
    if (date) {
      onTimeRangeChange({
        ...timeRange,
        customEndDate: date.format("YYYY-MM-DD")
      });
    }
  };
  return /* @__PURE__ */ jsx(Paper, { variant: "outlined", sx: { p: 2 }, children: /* @__PURE__ */ jsxs(Stack, { spacing: 2, children: [
    /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsxs(
      ToggleButtonGroup,
      {
        value: granularity,
        exclusive: true,
        onChange: handleGranularityChange,
        size: "small",
        fullWidth: true,
        children: [
          /* @__PURE__ */ jsx(ToggleButton, { value: "day", children: "日" }),
          /* @__PURE__ */ jsx(ToggleButton, { value: "week", children: "週" }),
          /* @__PURE__ */ jsx(ToggleButton, { value: "month", children: "月" })
        ]
      }
    ) }),
    /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsx(FormControl, { fullWidth: true, size: "small", children: /* @__PURE__ */ jsx(
      Select,
      {
        value: timeRange.preset,
        onChange: (e) => handlePresetChange(e.target.value),
        sx: { fontSize: 14 },
        children: PRESETS.map((preset) => /* @__PURE__ */ jsx(MenuItem, { value: preset.value, sx: { fontSize: 14 }, children: preset.label }, preset.value))
      }
    ) }) }),
    timeRange.preset === "custom" && /* @__PURE__ */ jsx(LocalizationProvider, { dateAdapter: AdapterDayjs, adapterLocale: "ja", children: /* @__PURE__ */ jsxs(Stack, { direction: "row", spacing: 1, children: [
      /* @__PURE__ */ jsx(
        DatePicker,
        {
          label: "開始日",
          value: timeRange.customStartDate ? dayjs(timeRange.customStartDate) : null,
          onChange: handleStartDateChange,
          slotProps: {
            textField: {
              size: "small",
              fullWidth: true,
              sx: { "& input": { fontSize: 14 } }
            }
          }
        }
      ),
      /* @__PURE__ */ jsx(
        DatePicker,
        {
          label: "終了日",
          value: timeRange.customEndDate ? dayjs(timeRange.customEndDate) : null,
          onChange: handleEndDateChange,
          slotProps: {
            textField: {
              size: "small",
              fullWidth: true,
              sx: { "& input": { fontSize: 14 } }
            }
          }
        }
      )
    ] }) })
  ] }) });
}
const categoryLabels = {
  CHEST: "胸",
  BACK: "背中",
  SHOULDER: "肩",
  ARM: "腕",
  ABS: "腹筋",
  LEG: "脚"
};
const CATEGORY_COLORS = {
  CHEST: "#1976d2",
  // 青
  BACK: "#2e7d32",
  // 緑
  SHOULDER: "#ed6c02",
  // オレンジ
  ARM: "#9c27b0",
  // 紫
  ABS: "#d32f2f",
  // 赤
  LEG: "#0288d1"
  // 水色
};
const BODY_PART_COLORS = [
  "#1976d2",
  "#2e7d32",
  "#ed6c02",
  "#d32f2f",
  "#9c27b0",
  "#0288d1",
  "#388e3c",
  "#f57c00",
  "#c62828",
  "#7b1fa2",
  "#0277bd",
  "#1b5e20",
  "#ff5722",
  "#673ab7",
  "#00796b"
];
function formatPeriodLabel$2(period) {
  if (period.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [, month, day] = period.split("-");
    return `${Number(month)}/${Number(day)}`;
  }
  if (period.match(/^\d{4}-W\d{2}$/)) {
    const week = period.split("-W")[1];
    return `${Number(week)}週`;
  }
  if (period.match(/^\d{4}-\d{2}$/)) {
    const [, month] = period.split("-");
    return `${Number(month)}月`;
  }
  return period;
}
function StackedBodyPartVolumeChart({
  data,
  granularity,
  onGranularityChange
}) {
  const toggleButton = /* @__PURE__ */ jsx(
    PillToggle,
    {
      value: granularity,
      options: [
        { value: "category", label: "カテゴリ" },
        { value: "bodyPart", label: "部位" }
      ],
      onChange: onGranularityChange
    }
  );
  if (data.length === 0) {
    return /* @__PURE__ */ jsxs(Paper, { variant: "outlined", sx: { p: 2 }, children: [
      /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }, children: [
        /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", children: "部位別ボリューム推移" }),
        toggleButton
      ] }),
      /* @__PURE__ */ jsx(
        Box,
        {
          sx: {
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          },
          children: /* @__PURE__ */ jsx(Typography, { color: "text.secondary", children: "データがありません" })
        }
      )
    ] });
  }
  const periodMap = /* @__PURE__ */ new Map();
  const bodyPartKeys = /* @__PURE__ */ new Set();
  for (const item of data) {
    const displayKey = granularity === "category" ? categoryLabels[item.category] || item.category : `${categoryLabels[item.category] || item.category}-${item.bodyPartName}`;
    bodyPartKeys.add(displayKey);
    if (!periodMap.has(item.period)) {
      periodMap.set(item.period, {});
    }
    const periodData = periodMap.get(item.period);
    if (periodData) {
      periodData[displayKey] = item.volume;
    }
  }
  const chartData = Array.from(periodMap.entries()).map(([period, volumes]) => ({
    period,
    periodLabel: formatPeriodLabel$2(period),
    ...volumes
  })).sort((a, b) => a.period.localeCompare(b.period));
  const bodyPartList = Array.from(bodyPartKeys);
  const bodyPartColors = {};
  if (granularity === "category") {
    for (const displayKey of bodyPartList) {
      const category = Object.entries(categoryLabels).find(([, label]) => label === displayKey)?.[0];
      bodyPartColors[displayKey] = category ? CATEGORY_COLORS[category] : "#999999";
    }
  } else {
    bodyPartList.forEach((key, index) => {
      bodyPartColors[key] = BODY_PART_COLORS[index % BODY_PART_COLORS.length];
    });
  }
  const CustomTooltip = ({
    active,
    payload,
    label
  }) => {
    if (active && payload && payload.length > 0) {
      return /* @__PURE__ */ jsxs(Paper, { sx: { p: 1.5 }, children: [
        /* @__PURE__ */ jsx(Typography, { variant: "body2", fontWeight: 600, sx: { mb: 0.5 }, children: label }),
        payload.map((entry) => /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
          /* @__PURE__ */ jsx(
            Box,
            {
              sx: {
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: entry.fill
              }
            }
          ),
          /* @__PURE__ */ jsxs(Typography, { variant: "caption", children: [
            entry.name,
            ": ",
            Math.round(entry.value).toLocaleString(),
            "kg"
          ] })
        ] }, entry.dataKey))
      ] });
    }
    return null;
  };
  return /* @__PURE__ */ jsxs(Paper, { variant: "outlined", sx: { p: 2 }, children: [
    /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, pl: 1 }, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", children: "部位別ボリューム推移" }),
      toggleButton
    ] }),
    /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 280, children: /* @__PURE__ */ jsxs(BarChart, { data: chartData, margin: { top: 10, right: 10, left: -10, bottom: 0 }, children: [
      /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", vertical: false }),
      /* @__PURE__ */ jsx(XAxis, { dataKey: "periodLabel", tick: { fontSize: 11 }, tickLine: false, axisLine: false }),
      /* @__PURE__ */ jsx(
        YAxis,
        {
          tick: { fontSize: 11 },
          tickLine: false,
          axisLine: false,
          tickFormatter: (v) => v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : v
        }
      ),
      /* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(CustomTooltip, {}) }),
      /* @__PURE__ */ jsx(
        Legend,
        {
          wrapperStyle: { fontSize: 11, paddingTop: 8 },
          iconSize: 10,
          formatter: (value) => /* @__PURE__ */ jsx("span", { style: { fontSize: 11 }, children: value })
        }
      ),
      bodyPartList.map((key) => /* @__PURE__ */ jsx(
        Bar,
        {
          dataKey: key,
          stackId: "volume",
          fill: bodyPartColors[key],
          radius: [0, 0, 0, 0]
        },
        key
      ))
    ] }) })
  ] });
}
const COLORS = [
  "#1976d2",
  "#2e7d32",
  "#ed6c02",
  "#d32f2f",
  "#9c27b0",
  "#0288d1",
  "#388e3c",
  "#f57c00",
  "#c62828",
  "#7b1fa2",
  "#0277bd",
  "#1b5e20"
];
function formatPeriodLabel$1(period) {
  if (period.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [, month, day] = period.split("-");
    return `${Number(month)}/${Number(day)}`;
  }
  if (period.match(/^\d{4}-W\d{2}$/)) {
    const week = period.split("-W")[1];
    return `${Number(week)}週`;
  }
  if (period.match(/^\d{4}-\d{2}$/)) {
    const [, month] = period.split("-");
    return `${Number(month)}月`;
  }
  return period;
}
function StackedVolumeChart({ data }) {
  if (data.length === 0) {
    return /* @__PURE__ */ jsxs(Paper, { variant: "outlined", sx: { p: 3 }, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "ボリューム推移" }),
      /* @__PURE__ */ jsx(
        Box,
        {
          sx: {
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          },
          children: /* @__PURE__ */ jsx(Typography, { color: "text.secondary", children: "データがありません" })
        }
      )
    ] });
  }
  const periodMap = /* @__PURE__ */ new Map();
  const exerciseNames = /* @__PURE__ */ new Set();
  const exerciseSetCounts = /* @__PURE__ */ new Map();
  for (const item of data) {
    exerciseNames.add(item.exerciseName);
    if (!periodMap.has(item.period)) {
      periodMap.set(item.period, {});
    }
    periodMap.get(item.period)[item.exerciseName] = item.volume;
    if (!exerciseSetCounts.has(item.period)) {
      exerciseSetCounts.set(item.period, /* @__PURE__ */ new Map());
    }
    exerciseSetCounts.get(item.period).set(item.exerciseName, item.setCount);
  }
  const chartData = Array.from(periodMap.entries()).map(([period, volumes]) => ({
    period,
    periodLabel: formatPeriodLabel$1(period),
    ...volumes
  })).sort((a, b) => a.period.localeCompare(b.period));
  const exerciseList = Array.from(exerciseNames);
  const exerciseColors = {};
  exerciseList.forEach((name, index) => {
    exerciseColors[name] = COLORS[index % COLORS.length];
  });
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length > 0) {
      const period = payload[0]?.payload?.period;
      return /* @__PURE__ */ jsxs(Paper, { sx: { p: 1.5 }, children: [
        /* @__PURE__ */ jsx(Typography, { variant: "body2", fontWeight: 600, sx: { mb: 0.5 }, children: label }),
        payload.map((entry) => {
          const setCount = exerciseSetCounts.get(period)?.get(entry.dataKey) || 0;
          return /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
            /* @__PURE__ */ jsx(
              Box,
              {
                sx: {
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: entry.fill
                }
              }
            ),
            /* @__PURE__ */ jsxs(Typography, { variant: "caption", children: [
              entry.name,
              ": ",
              entry.value.toLocaleString(),
              "kg (",
              setCount,
              "セット)"
            ] })
          ] }, entry.dataKey);
        })
      ] });
    }
    return null;
  };
  return /* @__PURE__ */ jsxs(Paper, { variant: "outlined", sx: { p: 2 }, children: [
    /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", gutterBottom: true, sx: { pl: 1 }, children: "ボリューム推移" }),
    /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 280, children: /* @__PURE__ */ jsxs(BarChart, { data: chartData, margin: { top: 10, right: 10, left: -10, bottom: 0 }, children: [
      /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", vertical: false }),
      /* @__PURE__ */ jsx(XAxis, { dataKey: "periodLabel", tick: { fontSize: 11 }, tickLine: false, axisLine: false }),
      /* @__PURE__ */ jsx(
        YAxis,
        {
          tick: { fontSize: 11 },
          tickLine: false,
          axisLine: false,
          tickFormatter: (v) => v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : v
        }
      ),
      /* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(CustomTooltip, {}) }),
      /* @__PURE__ */ jsx(
        Legend,
        {
          wrapperStyle: { fontSize: 11, paddingTop: 8 },
          iconSize: 10,
          formatter: (value) => /* @__PURE__ */ jsx("span", { style: { fontSize: 11 }, children: value })
        }
      ),
      exerciseList.map((name) => /* @__PURE__ */ jsx(
        Bar,
        {
          dataKey: name,
          stackId: "volume",
          fill: exerciseColors[name],
          radius: [0, 0, 0, 0]
        },
        name
      ))
    ] }) })
  ] });
}
function formatPeriodLabel(period) {
  if (period.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [, month, day] = period.split("-");
    return `${Number(month)}/${Number(day)}`;
  }
  if (period.match(/^\d{4}-W\d{2}$/)) {
    const week = period.split("-W")[1];
    return `${Number(week)}週`;
  }
  if (period.match(/^\d{4}-\d{2}$/)) {
    const [, month] = period.split("-");
    return `${Number(month)}月`;
  }
  return period;
}
function WeightTab({
  exercises,
  selectedExerciseId,
  onExerciseChange,
  maxWeightHistory,
  oneRMHistory
}) {
  const maxWeightData = maxWeightHistory.map((d) => ({
    period: d.period,
    periodLabel: formatPeriodLabel(d.period),
    weight: d.weight
  }));
  const oneRMData = oneRMHistory.map((d) => ({
    period: d.period,
    periodLabel: formatPeriodLabel(d.period),
    oneRM: d.oneRM
  }));
  return /* @__PURE__ */ jsxs(Stack, { spacing: 2, children: [
    /* @__PURE__ */ jsx(FormControl, { fullWidth: true, size: "small", children: /* @__PURE__ */ jsx(
      Select,
      {
        value: selectedExerciseId || "",
        onChange: (e) => onExerciseChange(Number(e.target.value)),
        displayEmpty: true,
        sx: { fontSize: 14 },
        children: exercises.map((ex) => /* @__PURE__ */ jsx(MenuItem, { value: ex.id, sx: { fontSize: 14 }, children: ex.name }, ex.id))
      }
    ) }),
    /* @__PURE__ */ jsxs(Paper, { variant: "outlined", sx: { p: 2 }, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", gutterBottom: true, sx: { pl: 1 }, children: "最大重量" }),
      maxWeightData.length === 0 ? /* @__PURE__ */ jsx(
        Box,
        {
          sx: {
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          },
          children: /* @__PURE__ */ jsx(Typography, { color: "text.secondary", children: "データがありません" })
        }
      ) : /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 200, children: /* @__PURE__ */ jsxs(BarChart, { data: maxWeightData, margin: { top: 10, right: 10, left: -10, bottom: 0 }, children: [
        /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", vertical: false }),
        /* @__PURE__ */ jsx(
          XAxis,
          {
            dataKey: "periodLabel",
            tick: { fontSize: 11 },
            tickLine: false,
            axisLine: false
          }
        ),
        /* @__PURE__ */ jsx(
          YAxis,
          {
            tick: { fontSize: 11 },
            tickLine: false,
            axisLine: false,
            domain: ["dataMin - 5", "dataMax + 5"]
          }
        ),
        /* @__PURE__ */ jsx(
          Tooltip,
          {
            formatter: (value) => [`${value} kg`, "最大重量"],
            labelFormatter: (label) => `${label}`
          }
        ),
        /* @__PURE__ */ jsx(Bar, { dataKey: "weight", fill: "#2e7d32", radius: [4, 4, 0, 0] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs(Paper, { variant: "outlined", sx: { p: 2 }, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", gutterBottom: true, sx: { pl: 1 }, children: "推定1RM" }),
      oneRMData.length === 0 ? /* @__PURE__ */ jsx(
        Box,
        {
          sx: {
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          },
          children: /* @__PURE__ */ jsx(Typography, { color: "text.secondary", children: "データがありません" })
        }
      ) : /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 200, children: /* @__PURE__ */ jsxs(BarChart, { data: oneRMData, margin: { top: 10, right: 10, left: -10, bottom: 0 }, children: [
        /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", vertical: false }),
        /* @__PURE__ */ jsx(
          XAxis,
          {
            dataKey: "periodLabel",
            tick: { fontSize: 11 },
            tickLine: false,
            axisLine: false
          }
        ),
        /* @__PURE__ */ jsx(
          YAxis,
          {
            tick: { fontSize: 11 },
            tickLine: false,
            axisLine: false,
            domain: ["dataMin - 5", "dataMax + 5"]
          }
        ),
        /* @__PURE__ */ jsx(
          Tooltip,
          {
            formatter: (value) => [`${value} kg`, "1RM"],
            labelFormatter: (label) => `${label}`
          }
        ),
        /* @__PURE__ */ jsx(Bar, { dataKey: "oneRM", fill: "#9c27b0", radius: [4, 4, 0, 0] })
      ] }) })
    ] })
  ] });
}
function StatisticsPage() {
  const [granularity, setGranularity] = useState("day");
  const [timeRange, setTimeRange] = useState({ preset: "1month" });
  const [activeTab, setActiveTab] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [volumeByExercise, setVolumeByExercise] = useState([]);
  const [exerciseVolumeTotals, setExerciseVolumeTotals] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const [maxWeightHistory, setMaxWeightHistory] = useState([]);
  const [oneRMHistory, setOneRMHistory] = useState([]);
  const [continuityStats, setContinuityStats] = useState(null);
  const [trainingDaysByPeriod, setTrainingDaysByPeriod] = useState([]);
  const [exerciseTrainingDays, setExerciseTrainingDays] = useState([]);
  const [bodyPartGranularity, setBodyPartGranularity] = useState("category");
  const [bodyPartVolumeTotals, setBodyPartVolumeTotals] = useState([]);
  const [volumeByBodyPart, setVolumeByBodyPart] = useState([]);
  const [bodyPartTrainingDays, setBodyPartTrainingDays] = useState([]);
  const [isLoading, startLoading] = useTransition();
  const loadExercises = useCallback(async () => {
    const res = await client.api.statistics.exercises.$get();
    const data = await res.json();
    setExercises(data);
    if (data.length > 0 && selectedExerciseId === null) {
      setSelectedExerciseId(data[0].id);
    }
  }, [selectedExerciseId]);
  const loadVolumeData = useCallback(async () => {
    const { preset, customStartDate, customEndDate } = timeRange;
    const [volumeRes, bodyPartVolumeTotalsRes, volumeByBodyPartRes] = await Promise.all([
      client.api.statistics.volume.$get({
        query: {
          granularity,
          preset,
          customStartDate,
          customEndDate
        }
      }),
      client.api.statistics["body-part-volume-totals"].$get({
        query: {
          preset,
          customStartDate,
          customEndDate,
          granularity: bodyPartGranularity
        }
      }),
      client.api.statistics["volume-by-body-part"].$get({
        query: {
          granularity,
          bodyPartGranularity,
          preset,
          customStartDate,
          customEndDate
        }
      })
    ]);
    const data = await volumeRes.json();
    const bodyPartTotalsData = await bodyPartVolumeTotalsRes.json();
    const volumeByBodyPartData = await volumeByBodyPartRes.json();
    setTotalVolume(data.totalVolume);
    setVolumeByExercise(data.volumeByExercise);
    setExerciseVolumeTotals(data.exerciseVolumeTotals);
    setBodyPartVolumeTotals(bodyPartTotalsData);
    setVolumeByBodyPart(volumeByBodyPartData);
  }, [granularity, timeRange, bodyPartGranularity]);
  const loadWeightData = useCallback(async () => {
    if (!selectedExerciseId) return;
    const { preset, customStartDate, customEndDate } = timeRange;
    const res = await client.api.statistics.weight.$get({
      query: {
        exerciseId: String(selectedExerciseId),
        granularity,
        preset,
        customStartDate,
        customEndDate
      }
    });
    const data = await res.json();
    setMaxWeightHistory(data.maxWeightHistory);
    setOneRMHistory(data.oneRMHistory);
  }, [granularity, timeRange, selectedExerciseId]);
  const loadContinuityData = useCallback(async () => {
    const { preset, customStartDate, customEndDate } = timeRange;
    const [continuityRes, bodyPartDaysRes] = await Promise.all([
      client.api.statistics.continuity.$get({
        query: {
          granularity,
          preset,
          customStartDate,
          customEndDate
        }
      }),
      client.api.statistics["body-part-training-days"].$get({
        query: {
          preset,
          startDate: customStartDate,
          endDate: customEndDate,
          granularity: bodyPartGranularity
        }
      })
    ]);
    const data = await continuityRes.json();
    const bodyPartDaysData = await bodyPartDaysRes.json();
    setContinuityStats(data.stats);
    setTrainingDaysByPeriod(data.daysByPeriod);
    setExerciseTrainingDays(data.exerciseDays);
    setBodyPartTrainingDays(bodyPartDaysData);
  }, [granularity, timeRange, bodyPartGranularity]);
  useEffect(() => {
    startLoading(async () => {
      await loadExercises();
    });
  }, [loadExercises]);
  useEffect(() => {
    startLoading(async () => {
      if (activeTab === 0) {
        await loadVolumeData();
      } else if (activeTab === 1) {
        await loadWeightData();
      } else if (activeTab === 2) {
        await loadContinuityData();
      }
    });
  }, [activeTab, loadVolumeData, loadWeightData, loadContinuityData]);
  useEffect(() => {
    if (activeTab === 1 && selectedExerciseId) {
      startLoading(async () => {
        await loadWeightData();
      });
    }
  }, [selectedExerciseId, activeTab, loadWeightData]);
  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
  };
  const renderStatsCardSkeleton = () => /* @__PURE__ */ jsxs(
    Paper,
    {
      variant: "outlined",
      sx: {
        p: 2,
        display: "flex",
        alignItems: "center",
        gap: 2
      },
      children: [
        /* @__PURE__ */ jsx(Skeleton, { variant: "rounded", width: 48, height: 48 }),
        /* @__PURE__ */ jsxs(Box, { children: [
          /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: 80, height: 16 }),
          /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: 100, height: 32 })
        ] })
      ]
    }
  );
  const renderListSkeleton = (title) => /* @__PURE__ */ jsxs(Paper, { variant: "outlined", sx: { p: 2 }, children: [
    /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: title }),
    /* @__PURE__ */ jsx(Stack, { spacing: 1.5, children: [1, 2, 3].map((i) => /* @__PURE__ */ jsxs(Box, { sx: { px: 1, py: 0.75 }, children: [
      /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", mb: 0.5 }, children: [
        /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: 120 }),
        /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: 60 })
      ] }),
      /* @__PURE__ */ jsx(Skeleton, { variant: "rounded", height: 4 }),
      /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: 40, height: 16, sx: { mt: 0.5 } })
    ] }, i)) })
  ] });
  const renderChartSkeleton = (title) => /* @__PURE__ */ jsxs(Paper, { variant: "outlined", sx: { p: 2 }, children: [
    /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", gutterBottom: true, sx: { pl: 1 }, children: title }),
    /* @__PURE__ */ jsx(Skeleton, { variant: "rounded", height: 200 })
  ] });
  const renderVolumeTabSkeleton = () => /* @__PURE__ */ jsxs(Stack, { spacing: 2, sx: { mt: 2 }, children: [
    /* @__PURE__ */ jsx(Grid, { container: true, spacing: 2, children: /* @__PURE__ */ jsx(Grid, { size: { xs: 12 }, children: renderStatsCardSkeleton() }) }),
    renderListSkeleton("部位別ボリューム"),
    renderChartSkeleton("部位別ボリューム推移"),
    renderListSkeleton("種目別ボリューム"),
    renderChartSkeleton("ボリューム推移")
  ] });
  const renderWeightTabSkeleton = () => /* @__PURE__ */ jsxs(Stack, { spacing: 2, children: [
    /* @__PURE__ */ jsx(Skeleton, { variant: "rounded", height: 40 }),
    renderChartSkeleton("最大重量"),
    renderChartSkeleton("推定1RM")
  ] });
  const renderContinuityTabSkeleton = () => /* @__PURE__ */ jsxs(Stack, { spacing: 2, children: [
    /* @__PURE__ */ jsxs(Grid, { container: true, spacing: 2, children: [
      /* @__PURE__ */ jsx(Grid, { size: { xs: 12 }, children: renderStatsCardSkeleton() }),
      /* @__PURE__ */ jsx(Grid, { size: { xs: 6 }, children: renderStatsCardSkeleton() }),
      /* @__PURE__ */ jsx(Grid, { size: { xs: 6 }, children: renderStatsCardSkeleton() })
    ] }),
    renderChartSkeleton("トレーニング日数推移"),
    renderListSkeleton("種目別トレーニング日数")
  ] });
  const renderSkeleton = () => {
    if (activeTab === 0) return renderVolumeTabSkeleton();
    if (activeTab === 1) return renderWeightTabSkeleton();
    return renderContinuityTabSkeleton();
  };
  return /* @__PURE__ */ jsxs(Stack, { spacing: 1, children: [
    /* @__PURE__ */ jsx(
      GlobalFilter,
      {
        granularity,
        onGranularityChange: setGranularity,
        timeRange,
        onTimeRangeChange: setTimeRange
      }
    ),
    /* @__PURE__ */ jsx(Box, { sx: { borderBottom: 1, borderColor: "divider", mt: 1.5, mb: 1 }, children: /* @__PURE__ */ jsxs(Tabs, { value: activeTab, onChange: handleTabChange, variant: "fullWidth", children: [
      /* @__PURE__ */ jsx(Tab, { label: "ボリューム" }),
      /* @__PURE__ */ jsx(Tab, { label: "重量" }),
      /* @__PURE__ */ jsx(Tab, { label: "継続" })
    ] }) }),
    isLoading ? renderSkeleton() : /* @__PURE__ */ jsxs(Fragment, { children: [
      activeTab === 0 && /* @__PURE__ */ jsxs(Stack, { spacing: 2, sx: { mt: 2 }, children: [
        /* @__PURE__ */ jsx(Grid, { container: true, spacing: 2, children: /* @__PURE__ */ jsx(Grid, { size: { xs: 12 }, children: /* @__PURE__ */ jsx(
          StatsCard,
          {
            title: "合計ボリューム",
            value: totalVolume >= 1e6 ? `${(totalVolume / 1e6).toFixed(2)}t` : totalVolume >= 1e3 ? `${(totalVolume / 1e3).toFixed(1)}t` : `${totalVolume.toLocaleString()}kg`,
            icon: /* @__PURE__ */ jsx(ScaleIcon, {}),
            color: "#1976d2"
          }
        ) }) }),
        /* @__PURE__ */ jsx(
          BodyPartVolumeList,
          {
            data: bodyPartVolumeTotals,
            granularity: bodyPartGranularity,
            onGranularityChange: setBodyPartGranularity
          }
        ),
        /* @__PURE__ */ jsx(
          StackedBodyPartVolumeChart,
          {
            data: volumeByBodyPart,
            granularity: bodyPartGranularity,
            onGranularityChange: setBodyPartGranularity
          }
        ),
        /* @__PURE__ */ jsx(ExerciseVolumeList, { data: exerciseVolumeTotals }),
        /* @__PURE__ */ jsx(StackedVolumeChart, { data: volumeByExercise })
      ] }),
      activeTab === 1 && /* @__PURE__ */ jsx(
        WeightTab,
        {
          exercises,
          selectedExerciseId,
          onExerciseChange: setSelectedExerciseId,
          maxWeightHistory,
          oneRMHistory
        }
      ),
      activeTab === 2 && /* @__PURE__ */ jsxs(Stack, { spacing: 2, children: [
        /* @__PURE__ */ jsx(
          ContinuityTab,
          {
            stats: continuityStats,
            daysByPeriod: trainingDaysByPeriod,
            exerciseDays: exerciseTrainingDays
          }
        ),
        /* @__PURE__ */ jsx(
          BodyPartTrainingDaysList,
          {
            data: bodyPartTrainingDays,
            granularity: bodyPartGranularity,
            onGranularityChange: setBodyPartGranularity
          }
        )
      ] })
    ] })
  ] });
}
const SplitComponent = StatisticsPage;
export {
  SplitComponent as component
};
