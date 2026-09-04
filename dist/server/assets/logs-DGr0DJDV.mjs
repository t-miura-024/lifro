import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { c as client } from "./hono-client-D2iVJXCF.mjs";
import AddIcon from "@mui/icons-material/Add";
import { Dialog, DialogTitle, Box, Stack, IconButton, Popover, Skeleton, Typography, List, ListItemButton, ListItemText, DialogContent, Alert, Divider, Paper, FormControl, InputLabel, Select, ListSubheader, MenuItem, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, TextField, Button, DialogActions, Card, CardContent, Snackbar } from "@mui/material";
import { useState, useTransition, useMemo, useEffect, useCallback } from "react";
import { u as useTimer } from "./router-Bm5ENF0-.mjs";
import DeleteIcon from "@mui/icons-material/Delete";
import TimerIcon from "@mui/icons-material/Timer";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import "dayjs/locale/ja.js";
import "hono/client";
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
client.api.exercises["with-body-parts"].$get;
const categoryLabels = {
  CHEST: "胸",
  BACK: "背中",
  SHOULDER: "肩",
  ARM: "腕",
  ABS: "腹筋",
  LEG: "脚"
};
const categoryOrder = ["CHEST", "BACK", "SHOULDER", "ARM", "ABS", "LEG"];
let groupKeyCounter = 0;
let setKeyCounter$1 = 0;
let memoKeyCounter = 0;
const emptySet = (exerciseId, exerciseName) => ({
  key: `set-${Date.now()}-${setKeyCounter$1++}`,
  exerciseId,
  exerciseName,
  weight: "",
  reps: ""
});
const emptyMemo = () => ({
  key: `memo-${Date.now()}-${memoKeyCounter++}`,
  content: ""
});
const emptyExerciseGroup = () => ({
  key: `group-${Date.now()}-${groupKeyCounter++}`,
  exerciseId: null,
  exerciseName: "",
  sets: [emptySet(null, "")],
  latestSets: null
});
const formatDelta = (current, previous) => {
  if (previous === null) return { text: "NEW", color: "text.secondary" };
  const delta = current - previous;
  if (delta > 0) return { text: `+${delta.toLocaleString()}`, color: "success.main" };
  if (delta < 0) return { text: delta.toLocaleString(), color: "error.main" };
  return { text: "±0", color: "text.disabled" };
};
function LogInputModal({ open, onClose, onSaved, initialDate, initialSets }) {
  const [exerciseGroups, setExerciseGroups] = useState([emptyExerciseGroup()]);
  const [exercises, setExercises] = useState([]);
  const [memos, setMemos] = useState([]);
  const [isPending, startTransition] = useTransition();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs(initialDate));
  const [dateError, setDateError] = useState(null);
  const today = dayjs();
  const [timerAnchorEl, setTimerAnchorEl] = useState(null);
  const [timers, setTimers] = useState([]);
  const [isLoadingTimers, setIsLoadingTimers] = useState(false);
  const { startTimer } = useTimer();
  const [baseline, setBaseline] = useState(null);
  const hasChanges = useMemo(() => {
    if (!baseline) return false;
    if (selectedDate.format("YYYY-MM-DD") !== baseline.selectedDate) {
      return true;
    }
    if (exerciseGroups.length !== baseline.exerciseGroups.length) {
      return true;
    }
    for (let i = 0; i < exerciseGroups.length; i++) {
      const current = exerciseGroups[i];
      const base = baseline.exerciseGroups[i];
      if (current.exerciseId !== base.exerciseId) {
        return true;
      }
      if (current.sets.length !== base.sets.length) {
        return true;
      }
      for (let j = 0; j < current.sets.length; j++) {
        const currentSet = current.sets[j];
        const baseSet = base.sets[j];
        if (currentSet.weight !== baseSet.weight || currentSet.reps !== baseSet.reps) {
          return true;
        }
      }
    }
    if (memos.length !== baseline.memos.length) {
      return true;
    }
    for (let i = 0; i < memos.length; i++) {
      if (memos[i].content !== baseline.memos[i].content) {
        return true;
      }
    }
    return false;
  }, [baseline, exerciseGroups, memos, selectedDate]);
  const isRequiredFieldsFilled = useMemo(() => {
    return exerciseGroups.some((group) => group.exerciseId !== null);
  }, [exerciseGroups]);
  const isTimerPopoverOpen = Boolean(timerAnchorEl);
  useEffect(() => {
    if (open) {
      setSelectedDate(dayjs(initialDate));
    }
  }, [open, initialDate]);
  useEffect(() => {
    if (open) {
      setIsInitialLoading(true);
      const excludeDateStr = selectedDate.format("YYYY-MM-DD");
      const loadData = async () => {
        const exercisesRes = await client.api.exercises["with-body-parts"].$get();
        const exercisesData = await exercisesRes.json();
        setExercises(exercisesData);
        const memosRes = await client.api.trainings[":date"].memos.$get({
          param: { date: excludeDateStr }
        });
        const fetchedMemos = await memosRes.json();
        let loadedMemos = [];
        if (fetchedMemos.length > 0) {
          loadedMemos = fetchedMemos.map((m) => ({
            key: `memo-${Date.now()}-${memoKeyCounter++}`,
            id: m.id,
            content: m.content
          }));
          setMemos(loadedMemos);
        } else {
          setMemos([]);
        }
        let loadedGroups = [];
        if (initialSets && initialSets.length > 0) {
          const grouped = /* @__PURE__ */ new Map();
          for (const set of initialSets) {
            const groupKey = set.exerciseId ?? (set.exerciseName || "new");
            if (!grouped.has(groupKey)) {
              grouped.set(groupKey, {
                key: `group-${Date.now()}-${groupKeyCounter++}`,
                exerciseId: set.exerciseId,
                exerciseName: set.exerciseName,
                sets: [],
                latestSets: null
              });
            }
            const group = grouped.get(groupKey);
            if (group) {
              group.sets.push(set);
            }
          }
          const groups = Array.from(grouped.values());
          setExerciseGroups(groups);
          loadedGroups = groups;
          const exerciseIds = groups.map((g) => g.exerciseId).filter((id) => id !== null);
          if (exerciseIds.length > 0) {
            const latestSetsRes = await client.api.trainings.exercises["latest-sets-multiple"].$post({
              json: { exerciseIds, excludeDate: excludeDateStr }
            });
            const latestSetsMap = await latestSetsRes.json();
            for (const group of groups) {
              if (group.exerciseId && latestSetsMap[group.exerciseId]) {
                group.latestSets = latestSetsMap[group.exerciseId];
              }
            }
            setExerciseGroups([...groups]);
            loadedGroups = [...groups];
          }
        } else {
          const initialGroup = emptyExerciseGroup();
          setExerciseGroups([initialGroup]);
          loadedGroups = [initialGroup];
        }
        setBaseline({
          exerciseGroups: loadedGroups.map((g) => ({
            exerciseId: g.exerciseId,
            sets: g.sets.map((s) => ({ weight: s.weight, reps: s.reps }))
          })),
          memos: loadedMemos.map((m) => ({ content: m.content })),
          selectedDate: excludeDateStr
        });
        setIsInitialLoading(false);
      };
      loadData();
    }
  }, [open, initialSets, selectedDate]);
  const handleExerciseChange = async (groupIndex, exerciseId) => {
    const newGroups = [...exerciseGroups];
    const group = newGroups[groupIndex];
    const exercise = exercises.find((e) => e.id === exerciseId);
    const excludeDateStr = selectedDate.format("YYYY-MM-DD");
    if (exercise) {
      group.exerciseId = exercise.id;
      group.exerciseName = exercise.name;
      group.sets = group.sets.map((set) => ({
        ...set,
        exerciseId: exercise.id,
        exerciseName: exercise.name
      }));
      const res = await client.api.trainings.exercises[":exerciseId"]["latest-sets"].$get({
        param: { exerciseId: String(exercise.id) },
        query: { excludeDate: excludeDateStr }
      });
      const latestSets = await res.json();
      group.latestSets = latestSets;
    } else {
      group.exerciseId = null;
      group.exerciseName = "";
      group.sets = group.sets.map((set) => ({
        ...set,
        exerciseId: null,
        exerciseName: ""
      }));
      group.latestSets = null;
    }
    setExerciseGroups(newGroups);
  };
  const handleSetChange = (groupIndex, setIndex, field, value) => {
    const newGroups = [...exerciseGroups];
    const group = newGroups[groupIndex];
    group.sets[setIndex] = { ...group.sets[setIndex], [field]: value };
    setExerciseGroups(newGroups);
  };
  const handleAddSet = (groupIndex) => {
    const newGroups = [...exerciseGroups];
    const group = newGroups[groupIndex];
    group.sets.push(emptySet(group.exerciseId, group.exerciseName));
    setExerciseGroups(newGroups);
  };
  const handleRemoveSet = (groupIndex, setIndex) => {
    const newGroups = [...exerciseGroups];
    const group = newGroups[groupIndex];
    if (group.sets.length > 1) {
      group.sets = group.sets.filter((_, i) => i !== setIndex);
      setExerciseGroups(newGroups);
    }
  };
  const handleAddExerciseGroup = () => {
    setExerciseGroups([...exerciseGroups, emptyExerciseGroup()]);
  };
  const handleRemoveExerciseGroup = (groupIndex) => {
    if (exerciseGroups.length > 1) {
      setExerciseGroups(exerciseGroups.filter((_, i) => i !== groupIndex));
    }
  };
  const handleAddMemo = () => {
    setMemos([...memos, emptyMemo()]);
  };
  const handleMemoChange = (index, content) => {
    const newMemos = [...memos];
    newMemos[index] = { ...newMemos[index], content };
    setMemos(newMemos);
  };
  const handleRemoveMemo = (index) => {
    setMemos(memos.filter((_, i) => i !== index));
  };
  const handleOpenTimerPopover = async (event) => {
    setTimerAnchorEl(event.currentTarget);
    setIsLoadingTimers(true);
    try {
      const res = await client.api.timers.$get();
      const loadedTimers = await res.json();
      setTimers(loadedTimers);
    } catch (error) {
      console.error("Failed to load timers:", error);
    } finally {
      setIsLoadingTimers(false);
    }
  };
  const handleCloseTimerPopover = () => {
    setTimerAnchorEl(null);
  };
  const handleSelectTimer = (timer) => {
    startTimer(timer);
    handleCloseTimerPopover();
  };
  const formatTimerDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  const getTotalTimerDuration = (timer) => {
    return timer.unitTimers.reduce((sum, unit) => sum + unit.duration, 0);
  };
  const handleSave = () => {
    startTransition(async () => {
      setDateError(null);
      const allSets = [];
      for (const group of exerciseGroups) {
        const validSets = group.sets.filter((s) => group.exerciseId);
        allSets.push(...validSets);
      }
      if (allSets.length === 0) {
        return;
      }
      const dateStr = selectedDate.format("YYYY-MM-DD");
      const initialDateStr = dayjs(initialDate).format("YYYY-MM-DD");
      if (dateStr !== initialDateStr) {
        const existsRes = await client.api.trainings[":date"].exists.$get({
          param: { date: dateStr }
        });
        const { exists } = await existsRes.json();
        if (exists) {
          setDateError(
            `${selectedDate.format("YYYY年M月D日")} には既にトレーニング記録があります。別の日付を選択してください。`
          );
          return;
        }
      }
      const setsToSave = allSets.map((s, index) => {
        const group = exerciseGroups.find((g) => g.sets.includes(s));
        if (!group || !group.exerciseId) {
          throw new Error("Exercise ID is required");
        }
        return {
          id: s.id,
          exerciseId: group.exerciseId,
          weight: s.weight === "" ? 0 : Number.parseFloat(s.weight),
          reps: s.reps === "" ? 0 : Number.parseInt(s.reps, 10),
          sortIndex: index
        };
      });
      await client.api.trainings[":date"].$put({
        param: { date: dateStr },
        json: { sets: setsToSave }
      });
      const validMemos = memos.filter((m) => m.content.trim() !== "");
      await client.api.trainings[":date"].memos.$put({
        param: { date: dateStr },
        json: { memos: validMemos.map((m) => ({ id: m.id, content: m.content })) }
      });
      setBaseline({
        exerciseGroups: exerciseGroups.map((g) => ({
          exerciseId: g.exerciseId,
          sets: g.sets.map((s) => ({ weight: s.weight, reps: s.reps }))
        })),
        memos: memos.map((m) => ({ content: m.content })),
        selectedDate: dateStr
      });
      onSaved(selectedDate.toDate());
    });
  };
  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };
  const handleDeleteConfirm = () => {
    startTransition(async () => {
      const dateStr = selectedDate.format("YYYY-MM-DD");
      await client.api.trainings[":date"].$delete({
        param: { date: dateStr }
      });
      setDeleteConfirmOpen(false);
      onSaved(selectedDate.toDate());
      onClose();
    });
  };
  const renderExerciseGroupSkeleton = () => /* @__PURE__ */ jsx(Paper, { variant: "outlined", sx: { p: 2 }, style: { marginTop: "12px" }, children: /* @__PURE__ */ jsxs(Stack, { spacing: 2, children: [
    /* @__PURE__ */ jsx(Skeleton, { variant: "rounded", height: 40 }),
    /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: 120, height: 20, sx: { mt: 1 } }),
    /* @__PURE__ */ jsx(TableContainer, { style: { marginTop: "2px" }, children: /* @__PURE__ */ jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsx(TableHead, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableCell, { align: "right", width: 120, children: "重量 (kg)" }),
        /* @__PURE__ */ jsx(TableCell, { align: "right", width: 100, children: "回数" }),
        /* @__PURE__ */ jsx(TableCell, { align: "right", width: 120, children: "ボリューム" }),
        /* @__PURE__ */ jsx(TableCell, { width: 60 })
      ] }) }),
      /* @__PURE__ */ jsxs(TableBody, { children: [
        [1, 2, 3].map((i) => /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableCell, { sx: { p: 1 }, children: /* @__PURE__ */ jsxs(Stack, { spacing: 0.5, children: [
            /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: "100%", height: 24 }),
            /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: 40, height: 16, sx: { ml: "auto" } })
          ] }) }),
          /* @__PURE__ */ jsx(TableCell, { sx: { p: 1 }, children: /* @__PURE__ */ jsxs(Stack, { spacing: 0.5, children: [
            /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: "100%", height: 24 }),
            /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: 30, height: 16, sx: { ml: "auto" } })
          ] }) }),
          /* @__PURE__ */ jsx(TableCell, { align: "right", sx: { p: 1 }, children: /* @__PURE__ */ jsxs(Stack, { spacing: 0.5, alignItems: "flex-end", children: [
            /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: 60, height: 24 }),
            /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: 40, height: 16 })
          ] }) }),
          /* @__PURE__ */ jsx(TableCell, { sx: { p: 1 }, children: /* @__PURE__ */ jsx(Skeleton, { variant: "circular", width: 28, height: 28 }) })
        ] }, i)),
        /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableCell, { colSpan: 2, align: "right", children: /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", children: "合計" }) }),
          /* @__PURE__ */ jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: 60, height: 24, sx: { ml: "auto" } }) }),
          /* @__PURE__ */ jsx(TableCell, {})
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: 100, height: 24, sx: { mx: "auto" } })
  ] }) });
  const hasExistingData = initialSets?.some((set) => set.id !== void 0) ?? false;
  const hasNoExercises = exercises.length === 0;
  return /* @__PURE__ */ jsxs(LocalizationProvider, { dateAdapter: AdapterDayjs, adapterLocale: "ja", children: [
    /* @__PURE__ */ jsxs(
      Dialog,
      {
        open,
        onClose: (_event, reason) => {
          if (reason === "backdropClick") return;
          onClose();
        },
        fullWidth: true,
        maxWidth: "sm",
        PaperProps: {
          sx: { m: 1, width: "calc(100% - 16px)", maxHeight: "calc(100% - 16px)" }
        },
        children: [
          /* @__PURE__ */ jsx(DialogTitle, { children: /* @__PURE__ */ jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", children: [
            /* @__PURE__ */ jsx(
              DatePicker,
              {
                value: selectedDate,
                onChange: (newDate) => {
                  if (newDate) {
                    setSelectedDate(newDate);
                    setDateError(null);
                  }
                },
                maxDate: today,
                format: "YYYY年M月D日",
                slotProps: {
                  textField: {
                    variant: "standard",
                    sx: {
                      "& .MuiInputBase-input": {
                        fontSize: "1.25rem",
                        fontWeight: 500
                      }
                    }
                  }
                }
              }
            ),
            /* @__PURE__ */ jsxs(Stack, { direction: "row", spacing: 0.5, children: [
              /* @__PURE__ */ jsx(
                IconButton,
                {
                  onClick: handleOpenTimerPopover,
                  disabled: isPending,
                  "aria-label": "タイマーを選択",
                  color: "primary",
                  children: /* @__PURE__ */ jsx(TimerIcon, {})
                }
              ),
              hasExistingData && /* @__PURE__ */ jsx(
                IconButton,
                {
                  onClick: handleDelete,
                  disabled: isPending,
                  "aria-label": "トレーニングを削除",
                  children: /* @__PURE__ */ jsx(DeleteIcon, {})
                }
              )
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(
            Popover,
            {
              open: isTimerPopoverOpen,
              anchorEl: timerAnchorEl,
              onClose: handleCloseTimerPopover,
              anchorOrigin: {
                vertical: "bottom",
                horizontal: "right"
              },
              transformOrigin: {
                vertical: "top",
                horizontal: "right"
              },
              children: /* @__PURE__ */ jsx(Box, { sx: { width: 280, maxHeight: 300, overflow: "auto" }, children: isLoadingTimers ? /* @__PURE__ */ jsxs(Box, { sx: { p: 2 }, children: [
                /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: "80%" }),
                /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: "60%" }),
                /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: "70%" })
              ] }) : timers.length === 0 ? /* @__PURE__ */ jsx(Box, { sx: { p: 2 }, children: /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "text.secondary", children: "タイマーが登録されていません" }) }) : /* @__PURE__ */ jsx(List, { dense: true, disablePadding: true, children: timers.map((timer) => /* @__PURE__ */ jsx(ListItemButton, { onClick: () => handleSelectTimer(timer), children: /* @__PURE__ */ jsx(
                ListItemText,
                {
                  primary: timer.name,
                  secondary: `${formatTimerDuration(getTotalTimerDuration(timer))} / ${timer.unitTimers.length}個のユニット`
                }
              ) }, timer.id)) }) })
            }
          ),
          /* @__PURE__ */ jsx(DialogContent, { dividers: true, children: /* @__PURE__ */ jsxs(Stack, { spacing: 3, children: [
            dateError && /* @__PURE__ */ jsx(Alert, { severity: "error", onClose: () => setDateError(null), children: dateError }),
            isInitialLoading ? /* @__PURE__ */ jsxs(Fragment, { children: [
              renderExerciseGroupSkeleton(),
              /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: 100, height: 24, sx: { mx: "auto" } }),
              /* @__PURE__ */ jsx(Divider, { sx: { my: 2 } }),
              /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: 100, height: 24 })
            ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
              exerciseGroups.map((group, groupIndex) => {
                const totalVolume = group.sets.reduce((sum, set) => {
                  const weight = Number.parseFloat(set.weight) || 0;
                  const reps = Number.parseInt(set.reps, 10) || 0;
                  return sum + weight * reps;
                }, 0);
                const previousTotalVolume = group.latestSets ? group.latestSets.sets.reduce((sum, set) => sum + set.weight * set.reps, 0) : null;
                const totalVolumeDelta = formatDelta(totalVolume, previousTotalVolume);
                return /* @__PURE__ */ jsx(
                  Paper,
                  {
                    variant: "outlined",
                    sx: {
                      p: 2
                    },
                    style: { marginTop: "12px" },
                    children: /* @__PURE__ */ jsxs(Stack, { spacing: 2, children: [
                      /* @__PURE__ */ jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, children: [
                        /* @__PURE__ */ jsxs(FormControl, { fullWidth: true, size: "small", disabled: hasNoExercises, children: [
                          /* @__PURE__ */ jsx(InputLabel, { id: `exercise-label-${groupIndex}`, children: hasNoExercises ? "種目を登録してください" : "種目" }),
                          /* @__PURE__ */ jsx(
                            Select,
                            {
                              labelId: `exercise-label-${groupIndex}`,
                              value: group.exerciseId?.toString() || "",
                              label: hasNoExercises ? "種目を登録してください" : "種目",
                              onChange: (e) => {
                                const value = e.target.value;
                                handleExerciseChange(
                                  groupIndex,
                                  value ? Number.parseInt(value, 10) : null
                                );
                              },
                              sx: {
                                "& .MuiOutlinedInput-notchedOutline": {
                                  borderRadius: 0
                                }
                              },
                              children: (() => {
                                const grouped = {};
                                for (const category of categoryOrder) {
                                  grouped[category] = [];
                                }
                                grouped.UNCATEGORIZED = [];
                                for (const exercise of exercises) {
                                  const category = exercise.primaryCategory || "UNCATEGORIZED";
                                  if (!grouped[category]) {
                                    grouped[category] = [];
                                  }
                                  grouped[category].push(exercise);
                                }
                                const items = [];
                                for (const category of [...categoryOrder, "UNCATEGORIZED"]) {
                                  const categoryExercises = grouped[category];
                                  if (categoryExercises.length > 0) {
                                    const label = category === "UNCATEGORIZED" ? "未分類" : categoryLabels[category] || category;
                                    items.push(
                                      /* @__PURE__ */ jsx(ListSubheader, { sx: { lineHeight: "32px" }, children: label }, `header-${category}`)
                                    );
                                    for (const exercise of categoryExercises) {
                                      items.push(
                                        /* @__PURE__ */ jsx(
                                          MenuItem,
                                          {
                                            value: exercise.id.toString(),
                                            sx: { pl: 3 },
                                            children: exercise.name
                                          },
                                          exercise.id
                                        )
                                      );
                                    }
                                  }
                                }
                                return items;
                              })()
                            }
                          )
                        ] }),
                        exerciseGroups.length > 1 && /* @__PURE__ */ jsx(
                          IconButton,
                          {
                            size: "small",
                            onClick: () => handleRemoveExerciseGroup(groupIndex),
                            "aria-label": "種目を削除",
                            sx: { flexShrink: 0 },
                            children: /* @__PURE__ */ jsx(DeleteIcon, { fontSize: "small" })
                          }
                        )
                      ] }),
                      group.latestSets && /* @__PURE__ */ jsx(Box, { style: { marginTop: "6px" }, children: /* @__PURE__ */ jsxs(
                        Typography,
                        {
                          variant: "caption",
                          sx: { color: "text.secondary" },
                          style: { fontSize: "0.875rem" },
                          children: [
                            "前回：",
                            dayjs(group.latestSets.date).format("YYYY年M月D日")
                          ]
                        }
                      ) }),
                      /* @__PURE__ */ jsx(TableContainer, { style: { marginTop: "2px" }, children: /* @__PURE__ */ jsxs(Table, { size: "small", children: [
                        /* @__PURE__ */ jsx(TableHead, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
                          /* @__PURE__ */ jsx(TableCell, { align: "right", width: 120, children: "重量 (kg)" }),
                          /* @__PURE__ */ jsx(TableCell, { align: "right", width: 100, children: "回数" }),
                          /* @__PURE__ */ jsx(TableCell, { align: "right", width: 120, children: "ボリューム" }),
                          /* @__PURE__ */ jsx(TableCell, { width: 60 })
                        ] }) }),
                        /* @__PURE__ */ jsxs(TableBody, { children: [
                          group.sets.map((set, setIndex) => {
                            const weight = Number.parseFloat(set.weight) || 0;
                            const reps = Number.parseInt(set.reps, 10) || 0;
                            const volume = weight * reps;
                            const previousSet = group.latestSets?.sets[setIndex] || null;
                            const previousWeight = previousSet?.weight ?? null;
                            const previousReps = previousSet?.reps ?? null;
                            const previousVolume = previousSet ? previousSet.weight * previousSet.reps : null;
                            const weightDelta = formatDelta(weight, previousWeight);
                            const repsDelta = formatDelta(reps, previousReps);
                            const volumeDelta = formatDelta(volume, previousVolume);
                            return /* @__PURE__ */ jsxs(TableRow, { children: [
                              /* @__PURE__ */ jsx(TableCell, { sx: { p: 0 }, children: /* @__PURE__ */ jsxs(Stack, { spacing: 0.5, children: [
                                /* @__PURE__ */ jsx(
                                  TextField,
                                  {
                                    type: "number",
                                    size: "small",
                                    value: set.weight,
                                    onChange: (e) => handleSetChange(
                                      groupIndex,
                                      setIndex,
                                      "weight",
                                      e.target.value
                                    ),
                                    inputProps: { min: 0, step: 0.5, placeholder: "0" },
                                    sx: {
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: 0
                                      },
                                      "& .MuiOutlinedInput-notchedOutline": {
                                        border: "none"
                                      },
                                      "& .MuiInputBase-input": {
                                        textAlign: "right",
                                        padding: 0,
                                        "&::-webkit-outer-spin-button": {
                                          WebkitAppearance: "none",
                                          margin: 0
                                        },
                                        "&::-webkit-inner-spin-button": {
                                          WebkitAppearance: "none",
                                          margin: 0
                                        },
                                        "&[type=number]": {
                                          MozAppearance: "textfield"
                                        }
                                      }
                                    },
                                    fullWidth: true
                                  }
                                ),
                                group.latestSets && /* @__PURE__ */ jsx(
                                  Typography,
                                  {
                                    variant: "caption",
                                    sx: {
                                      textAlign: "right",
                                      color: weightDelta.color,
                                      fontSize: "0.7rem"
                                    },
                                    style: { marginTop: 0 },
                                    children: weightDelta.text
                                  }
                                )
                              ] }) }),
                              /* @__PURE__ */ jsx(TableCell, { sx: { p: 0 }, children: /* @__PURE__ */ jsxs(Stack, { spacing: 0.5, children: [
                                /* @__PURE__ */ jsx(
                                  TextField,
                                  {
                                    type: "number",
                                    size: "small",
                                    value: set.reps,
                                    onChange: (e) => handleSetChange(
                                      groupIndex,
                                      setIndex,
                                      "reps",
                                      e.target.value
                                    ),
                                    inputProps: { min: 0, step: 1, placeholder: "0" },
                                    sx: {
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: 0
                                      },
                                      "& .MuiOutlinedInput-notchedOutline": {
                                        border: "none"
                                      },
                                      "& .MuiInputBase-input": {
                                        textAlign: "right",
                                        padding: 0,
                                        "&::-webkit-outer-spin-button": {
                                          WebkitAppearance: "none",
                                          margin: 0
                                        },
                                        "&::-webkit-inner-spin-button": {
                                          WebkitAppearance: "none",
                                          margin: 0
                                        },
                                        "&[type=number]": {
                                          MozAppearance: "textfield"
                                        }
                                      }
                                    },
                                    fullWidth: true
                                  }
                                ),
                                group.latestSets && /* @__PURE__ */ jsx(
                                  Typography,
                                  {
                                    variant: "caption",
                                    sx: {
                                      textAlign: "right",
                                      color: repsDelta.color,
                                      fontSize: "0.7rem"
                                    },
                                    style: { marginTop: 0 },
                                    children: repsDelta.text
                                  }
                                )
                              ] }) }),
                              /* @__PURE__ */ jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxs(Stack, { spacing: 0.5, alignItems: "flex-end", children: [
                                /* @__PURE__ */ jsx(Typography, { children: volume > 0 ? volume.toLocaleString() : "-" }),
                                group.latestSets && /* @__PURE__ */ jsx(
                                  Typography,
                                  {
                                    variant: "caption",
                                    sx: {
                                      color: volumeDelta.color,
                                      fontSize: "0.7rem"
                                    },
                                    style: { marginTop: 0 },
                                    children: volumeDelta.text
                                  }
                                )
                              ] }) }),
                              /* @__PURE__ */ jsx(TableCell, { children: group.sets.length > 1 && /* @__PURE__ */ jsx(
                                IconButton,
                                {
                                  size: "small",
                                  onClick: () => handleRemoveSet(groupIndex, setIndex),
                                  "aria-label": "セットを削除",
                                  children: /* @__PURE__ */ jsx(DeleteIcon, { fontSize: "small" })
                                }
                              ) })
                            ] }, set.key);
                          }),
                          /* @__PURE__ */ jsxs(TableRow, { children: [
                            /* @__PURE__ */ jsx(TableCell, { colSpan: 2, align: "right", children: /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", children: "合計" }) }),
                            /* @__PURE__ */ jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxs(Stack, { spacing: 0.5, alignItems: "flex-end", children: [
                              /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", children: totalVolume > 0 ? totalVolume.toLocaleString() : "-" }),
                              group.latestSets && /* @__PURE__ */ jsx(
                                Typography,
                                {
                                  variant: "caption",
                                  sx: {
                                    color: totalVolumeDelta.color,
                                    fontSize: "0.7rem"
                                  },
                                  style: { marginTop: 0 },
                                  children: totalVolumeDelta.text
                                }
                              )
                            ] }) }),
                            /* @__PURE__ */ jsx(TableCell, {})
                          ] })
                        ] })
                      ] }) }),
                      /* @__PURE__ */ jsx(
                        Button,
                        {
                          startIcon: /* @__PURE__ */ jsx(AddIcon, {}),
                          onClick: () => handleAddSet(groupIndex),
                          variant: "text",
                          size: "small",
                          fullWidth: true,
                          sx: {
                            borderRadius: 0,
                            my: 0,
                            py: 0,
                            minHeight: "auto",
                            "& .MuiButton-startIcon": {
                              marginRight: 1
                            }
                          },
                          style: { marginTop: "4px" },
                          children: "セットを追加"
                        }
                      )
                    ] })
                  },
                  group.key
                );
              }),
              /* @__PURE__ */ jsx(
                Button,
                {
                  startIcon: /* @__PURE__ */ jsx(AddIcon, {}),
                  onClick: handleAddExerciseGroup,
                  variant: "text",
                  fullWidth: true,
                  sx: {
                    borderRadius: 0,
                    my: 0,
                    py: 0,
                    minHeight: "auto",
                    "& .MuiButton-startIcon": {
                      marginRight: 1
                    }
                  },
                  style: { marginTop: "4px" },
                  children: "種目を追加"
                }
              ),
              /* @__PURE__ */ jsx(Divider, { sx: { my: 2 } }),
              /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsxs(Stack, { spacing: 1, children: [
                memos.map((memo, index) => /* @__PURE__ */ jsxs(Stack, { direction: "row", spacing: 1, alignItems: "flex-start", children: [
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      fullWidth: true,
                      multiline: true,
                      minRows: 2,
                      maxRows: 4,
                      size: "small",
                      placeholder: "メモを入力...",
                      value: memo.content,
                      onChange: (e) => handleMemoChange(index, e.target.value)
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    IconButton,
                    {
                      size: "small",
                      onClick: () => handleRemoveMemo(index),
                      "aria-label": "メモを削除",
                      sx: { mt: 0.5 },
                      children: /* @__PURE__ */ jsx(DeleteIcon, { fontSize: "small" })
                    }
                  )
                ] }, memo.key)),
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    startIcon: /* @__PURE__ */ jsx(AddIcon, {}),
                    onClick: handleAddMemo,
                    variant: "text",
                    size: "small",
                    sx: {
                      alignSelf: "flex-start",
                      borderRadius: 0
                    },
                    children: "メモを追加"
                  }
                )
              ] }) })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxs(DialogActions, { sx: { px: 3, py: 2 }, children: [
            /* @__PURE__ */ jsx(Button, { onClick: onClose, disabled: isPending || isInitialLoading, children: "閉じる" }),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "contained",
                onClick: handleSave,
                disabled: isPending || isInitialLoading || !hasChanges || !isRequiredFieldsFilled,
                children: isPending ? "保存中..." : "保存"
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxs(
      Dialog,
      {
        open: deleteConfirmOpen,
        onClose: (_event, reason) => {
          if (reason === "backdropClick") return;
          setDeleteConfirmOpen(false);
        },
        maxWidth: "sm",
        fullWidth: true,
        children: [
          /* @__PURE__ */ jsx(DialogTitle, { children: "削除の確認" }),
          /* @__PURE__ */ jsx(DialogContent, { children: /* @__PURE__ */ jsxs(Typography, { children: [
            selectedDate.format("YYYY年M月D日"),
            " の記録を全て削除しますか？",
            /* @__PURE__ */ jsx("br", {}),
            "この操作は取り消せません。"
          ] }) }),
          /* @__PURE__ */ jsxs(DialogActions, { sx: { px: 3, py: 2 }, children: [
            /* @__PURE__ */ jsx(Button, { onClick: () => setDeleteConfirmOpen(false), disabled: isPending, children: "キャンセル" }),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "contained",
                color: "error",
                onClick: handleDeleteConfirm,
                disabled: isPending,
                children: isPending ? "削除中..." : "削除"
              }
            )
          ] })
        ]
      }
    )
  ] });
}
function LogList({ rows, onRowClick }) {
  return /* @__PURE__ */ jsx(Stack, { spacing: 1.5, children: rows.map((row) => /* @__PURE__ */ jsx(
    Card,
    {
      variant: "outlined",
      onClick: () => onRowClick?.(row.date),
      sx: {
        cursor: onRowClick ? "pointer" : "default",
        "&:hover": onRowClick ? { bgcolor: "action.hover" } : {}
      },
      children: /* @__PURE__ */ jsxs(CardContent, { sx: { py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }, children: [
        /* @__PURE__ */ jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, children: [
          /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", fontWeight: 700, children: row.date }),
          /* @__PURE__ */ jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
            row.volume.toLocaleString(),
            "kg"
          ] })
        ] }),
        /* @__PURE__ */ jsx(Stack, { spacing: 0.5, children: row.exercises.map((exercise) => /* @__PURE__ */ jsxs(
          Box,
          {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            children: [
              /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "text.secondary", children: exercise.exerciseName }),
              /* @__PURE__ */ jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                exercise.volume.toLocaleString(),
                "kg"
              ] })
            ]
          },
          exercise.exerciseId
        )) }),
        row.memos.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Divider, { sx: { my: 1 } }),
          /* @__PURE__ */ jsx(Stack, { spacing: 0.5, divider: /* @__PURE__ */ jsx(Divider, {}), children: row.memos.map((memo) => /* @__PURE__ */ jsx(
            Typography,
            {
              variant: "body2",
              color: "text.secondary",
              sx: { whiteSpace: "pre-wrap" },
              children: memo.content
            },
            memo.id
          )) })
        ] })
      ] })
    },
    row.id
  )) });
}
function yearMonthToKey(ym) {
  return `${ym.year}-${ym.month}`;
}
function formatYearMonthLabel(ym) {
  return `${ym.year}年${ym.month}月`;
}
function summaryToRow(summary) {
  return {
    id: summary.date,
    date: summary.date,
    exercises: summary.exercises,
    volume: summary.totalVolume,
    memos: summary.memos
  };
}
let setKeyCounter = 0;
function trainingToSetFormData(training) {
  if (!training || training.sets.length === 0) {
    return [];
  }
  return training.sets.sort((a, b) => a.sortIndex - b.sortIndex).map((set) => ({
    key: `set-${Date.now()}-${setKeyCounter++}`,
    id: set.id,
    exerciseId: set.exerciseId,
    exerciseName: set.exercise?.name || "",
    weight: set.weight === 0 ? "" : set.weight.toString(),
    reps: set.reps === 0 ? "" : set.reps.toString()
  }));
}
function LogsPage() {
  const [availableYearMonths, setAvailableYearMonths] = useState([]);
  const [selectedYearMonth, setSelectedYearMonth] = useState(null);
  const [rows, setRows] = useState([]);
  const [isLoading, startLoading] = useTransition();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(/* @__PURE__ */ new Date());
  const [initialSets, setInitialSets] = useState(void 0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  useEffect(() => {
    const loadYearMonths = async () => {
      const res = await client.api.trainings["year-months"].$get();
      const yearMonths = await res.json();
      setAvailableYearMonths(yearMonths);
      if (yearMonths.length > 0) {
        setSelectedYearMonth(yearMonths[0]);
      }
      setIsInitialLoading(false);
    };
    loadYearMonths();
  }, []);
  const loadData = useCallback(() => {
    if (!selectedYearMonth) return;
    startLoading(async () => {
      const res = await client.api.trainings.$get({
        query: {
          year: String(selectedYearMonth.year),
          month: String(selectedYearMonth.month)
        }
      });
      const summaries = await res.json();
      setRows(summaries.map(summaryToRow));
    });
  }, [selectedYearMonth]);
  useEffect(() => {
    loadData();
  }, [loadData]);
  const handleYearMonthChange = (event) => {
    const [year, month] = event.target.value.split("-").map(Number);
    setSelectedYearMonth({ year, month });
  };
  const handleAddClick = async () => {
    const today = /* @__PURE__ */ new Date();
    setSelectedDate(today);
    const dateStr = today.toISOString().split("T")[0];
    const res = await client.api.trainings[":date"].$get({
      param: { date: dateStr }
    });
    const training = await res.json();
    if (training && training.sets.length > 0) {
      setInitialSets(trainingToSetFormData(training));
    } else {
      setInitialSets(void 0);
    }
    setModalOpen(true);
  };
  const handleRowClick = async (dateStr) => {
    const date = new Date(dateStr);
    setSelectedDate(date);
    const res = await client.api.trainings[":date"].$get({
      param: { date: dateStr }
    });
    const training = await res.json();
    setInitialSets(trainingToSetFormData(training));
    setModalOpen(true);
  };
  const handleSaved = async (savedDate) => {
    const savedYear = savedDate.getFullYear();
    const savedMonth = savedDate.getMonth() + 1;
    const res = await client.api.trainings["year-months"].$get();
    const yearMonths = await res.json();
    setAvailableYearMonths(yearMonths);
    const savedYearMonth = yearMonths.find((ym) => ym.year === savedYear && ym.month === savedMonth);
    if (savedYearMonth) {
      setSelectedYearMonth(savedYearMonth);
    }
    setSnackbar({
      open: true,
      message: "保存しました",
      severity: "success"
    });
  };
  const renderSkeleton = () => /* @__PURE__ */ jsx(Stack, { spacing: 1.5, children: [1, 2, 3].map((i) => /* @__PURE__ */ jsx(Card, { variant: "outlined", children: /* @__PURE__ */ jsxs(CardContent, { sx: { py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }, children: [
    /* @__PURE__ */ jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, children: [
      /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: 90, height: 24 }),
      /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: 70, height: 20 })
    ] }),
    /* @__PURE__ */ jsx(Stack, { spacing: 0.5, children: [1, 2, 3].map((j) => /* @__PURE__ */ jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", children: [
      /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: 100 + j * 20, height: 20 }),
      /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: 50, height: 20 })
    ] }, j)) })
  ] }) }, i)) });
  if (isInitialLoading) {
    return /* @__PURE__ */ jsxs(Stack, { spacing: 2, children: [
      /* @__PURE__ */ jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, children: [
        /* @__PURE__ */ jsx(Skeleton, { variant: "rounded", width: 140, height: 40 }),
        /* @__PURE__ */ jsx(Skeleton, { variant: "rounded", width: 44, height: 44 })
      ] }),
      renderSkeleton()
    ] });
  }
  return /* @__PURE__ */ jsxs(Stack, { spacing: 2, children: [
    /* @__PURE__ */ jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, children: [
      availableYearMonths.length > 0 && selectedYearMonth ? /* @__PURE__ */ jsx(FormControl, { size: "small", sx: { minWidth: 140 }, children: /* @__PURE__ */ jsx(
        Select,
        {
          value: yearMonthToKey(selectedYearMonth),
          onChange: handleYearMonthChange,
          sx: { fontWeight: 700 },
          children: availableYearMonths.map((ym) => /* @__PURE__ */ jsx(MenuItem, { value: yearMonthToKey(ym), children: formatYearMonthLabel(ym) }, yearMonthToKey(ym)))
        }
      ) }) : /* @__PURE__ */ jsx(Typography, { variant: "subtitle1", color: "text.secondary", children: "データがありません" }),
      /* @__PURE__ */ jsx(
        Button,
        {
          variant: "contained",
          color: "primary",
          onClick: handleAddClick,
          sx: { minWidth: 44, minHeight: 44 },
          children: /* @__PURE__ */ jsx(AddIcon, { fontSize: "medium" })
        }
      )
    ] }),
    isLoading ? renderSkeleton() : rows.length === 0 ? /* @__PURE__ */ jsx(Paper, { variant: "outlined", sx: { p: 4, textAlign: "center" }, children: /* @__PURE__ */ jsx(Typography, { color: "text.secondary", children: "この月のトレーニング記録はありません" }) }) : /* @__PURE__ */ jsx(LogList, { rows, onRowClick: handleRowClick }),
    /* @__PURE__ */ jsx(
      LogInputModal,
      {
        open: modalOpen,
        onClose: () => {
          setModalOpen(false);
          setInitialSets(void 0);
        },
        onSaved: handleSaved,
        initialDate: selectedDate,
        initialSets
      }
    ),
    /* @__PURE__ */ jsx(
      Snackbar,
      {
        open: snackbar.open,
        autoHideDuration: 3e3,
        onClose: () => setSnackbar((s) => ({ ...s, open: false })),
        anchorOrigin: { vertical: "bottom", horizontal: "center" },
        children: /* @__PURE__ */ jsx(
          Alert,
          {
            severity: snackbar.severity,
            onClose: () => setSnackbar((s) => ({ ...s, open: false })),
            children: snackbar.message
          }
        )
      }
    )
  ] });
}
const SplitComponent = LogsPage;
export {
  SplitComponent as component
};
