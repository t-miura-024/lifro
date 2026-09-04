import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { c as client } from "./hono-client-D2iVJXCF.mjs";
import { S as SOUND_NONE, a as audioScheduler, u as useTimer } from "./router-Bm5ENF0-.mjs";
import { useSensors, useSensor, PointerSensor, TouchSensor, DndContext, closestCenter, KeyboardSensor } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import AddIcon from "@mui/icons-material/Add";
import { Paper, Stack, IconButton, Box, Typography, Dialog, DialogTitle, DialogContent, TextField, Button, DialogActions, Collapse, FormControl, InputLabel, Select, MenuItem, Backdrop, CircularProgress, Skeleton } from "@mui/material";
import { memo, useState, useTransition, useEffect, useRef, useCallback } from "react";
import { CSS } from "@dnd-kit/utilities";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DeleteIcon from "@mui/icons-material/Delete";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
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
const SortableTimerItem = memo(function SortableTimerItem2({
  timer,
  totalDuration,
  unitCount,
  onEdit,
  onPlay
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: timer.id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  return /* @__PURE__ */ jsx(
    Paper,
    {
      ref: setNodeRef,
      style,
      variant: "outlined",
      sx: {
        p: 1.5,
        cursor: "pointer",
        "&:hover": {
          bgcolor: "action.hover"
        }
      },
      onClick: () => onEdit(timer),
      children: /* @__PURE__ */ jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1.5, children: [
        /* @__PURE__ */ jsx(
          IconButton,
          {
            size: "small",
            ...attributes,
            ...listeners,
            sx: { cursor: "grab", touchAction: "none" },
            "aria-label": "ドラッグして並び替え",
            onClick: (e) => e.stopPropagation(),
            children: /* @__PURE__ */ jsx(DragIndicatorIcon, {})
          }
        ),
        /* @__PURE__ */ jsxs(Box, { sx: { flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ jsx(
            Typography,
            {
              variant: "subtitle1",
              fontWeight: 600,
              sx: {
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              },
              children: timer.name
            }
          ),
          /* @__PURE__ */ jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
            totalDuration,
            " / ",
            unitCount,
            "個のユニット"
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          IconButton,
          {
            size: "large",
            color: "primary",
            onClick: (e) => {
              e.stopPropagation();
              onPlay(timer);
            },
            "aria-label": "タイマーを開始",
            sx: {
              bgcolor: "primary.main",
              color: "white",
              "&:hover": {
                bgcolor: "primary.dark"
              }
            },
            children: /* @__PURE__ */ jsx(PlayArrowIcon, {})
          }
        )
      ] })
    }
  );
});
let unitKeyCounter = 0;
const MINUTES_OPTIONS = Array.from({ length: 100 }, (_, i) => ({
  value: String(i),
  label: String(i)
}));
const SECONDS_OPTIONS = Array.from({ length: 60 }, (_, i) => ({
  value: String(i),
  label: String(i)
}));
function createEmptyUnit() {
  return {
    key: `unit-${Date.now()}-${unitKeyCounter++}`,
    name: "",
    minutes: "1",
    seconds: "0",
    countSound: SOUND_NONE,
    countSoundLast3Sec: SOUND_NONE,
    endSound: SOUND_NONE
  };
}
function timerToFormData(timer) {
  return timer.unitTimers.map((unit) => {
    const minutes = Math.floor(unit.duration / 60);
    const seconds = unit.duration % 60;
    return {
      key: `unit-${Date.now()}-${unitKeyCounter++}`,
      id: unit.id,
      name: unit.name || "",
      minutes: minutes.toString(),
      seconds: seconds.toString(),
      countSound: unit.countSound || SOUND_NONE,
      countSoundLast3Sec: unit.countSoundLast3Sec || SOUND_NONE,
      endSound: unit.endSound || SOUND_NONE
    };
  });
}
function formDataToUnitTimerInput(data) {
  const minutes = Number.parseInt(data.minutes, 10) || 0;
  const seconds = Number.parseInt(data.seconds, 10) || 0;
  const trimmedName = data.name.trim();
  return {
    id: data.id,
    name: trimmedName || void 0,
    sortIndex: 0,
    // Will be set later
    duration: minutes * 60 + seconds,
    countSound: data.countSound === SOUND_NONE ? null : data.countSound,
    countSoundLast3Sec: data.countSoundLast3Sec === SOUND_NONE ? null : data.countSoundLast3Sec,
    endSound: data.endSound === SOUND_NONE ? null : data.endSound
  };
}
function SortableUnitTimerItem({
  unit,
  index,
  isExpanded,
  canDelete,
  soundFiles,
  onToggleExpanded,
  onUnitChange,
  onRemoveUnit,
  onPlaySound,
  isValidTime,
  formatDuration,
  getSoundDisplayName
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: unit.key
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  return /* @__PURE__ */ jsxs(
    Paper,
    {
      ref: setNodeRef,
      style,
      variant: "outlined",
      sx: {
        p: 1.5,
        cursor: "pointer",
        "&:hover": { bgcolor: "action.hover" }
      },
      onClick: onToggleExpanded,
      children: [
        /* @__PURE__ */ jsxs(Stack, { spacing: 0.5, children: [
          /* @__PURE__ */ jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, children: [
            /* @__PURE__ */ jsx(
              IconButton,
              {
                size: "small",
                ...attributes,
                ...listeners,
                sx: { cursor: isDragging ? "grabbing" : "grab", touchAction: "none" },
                "aria-label": "ドラッグして並び替え",
                onClick: (e) => e.stopPropagation(),
                children: /* @__PURE__ */ jsx(DragIndicatorIcon, { fontSize: "small" })
              }
            ),
            /* @__PURE__ */ jsx(
              Typography,
              {
                sx: {
                  flex: 1,
                  fontWeight: 500,
                  color: unit.name ? "text.primary" : "text.secondary"
                },
                children: unit.name || "名前なし"
              }
            ),
            /* @__PURE__ */ jsx(
              Typography,
              {
                variant: "body2",
                color: isValidTime(unit) ? "text.secondary" : "error",
                sx: { fontFamily: "monospace" },
                children: formatDuration(unit.minutes, unit.seconds)
              }
            ),
            canDelete && /* @__PURE__ */ jsx(
              IconButton,
              {
                size: "small",
                onClick: (e) => {
                  e.stopPropagation();
                  onRemoveUnit(index);
                },
                "aria-label": "ユニットタイマーを削除",
                children: /* @__PURE__ */ jsx(DeleteIcon, { fontSize: "small" })
              }
            )
          ] }),
          /* @__PURE__ */ jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { pl: 5 }, children: [
            "カウント: ",
            getSoundDisplayName(unit.countSound),
            " | 3秒前:",
            " ",
            getSoundDisplayName(unit.countSoundLast3Sec),
            " | 終了:",
            " ",
            getSoundDisplayName(unit.endSound)
          ] })
        ] }),
        /* @__PURE__ */ jsx(Collapse, { in: isExpanded, children: /* @__PURE__ */ jsx(Box, { sx: { pt: 2 }, onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsxs(Stack, { spacing: 2, children: [
          /* @__PURE__ */ jsx(
            TextField,
            {
              size: "small",
              label: "名前",
              placeholder: "名前なし",
              value: unit.name,
              onChange: (e) => onUnitChange(index, "name", e.target.value),
              fullWidth: true
            }
          ),
          /* @__PURE__ */ jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
            /* @__PURE__ */ jsxs(FormControl, { size: "small", sx: { width: 80 }, error: !isValidTime(unit), children: [
              /* @__PURE__ */ jsx(InputLabel, { children: "分" }),
              /* @__PURE__ */ jsx(
                Select,
                {
                  value: unit.minutes,
                  label: "分",
                  onChange: (e) => onUnitChange(index, "minutes", e.target.value),
                  children: MINUTES_OPTIONS.map((opt) => /* @__PURE__ */ jsx(MenuItem, { value: opt.value, children: opt.label }, opt.value))
                }
              )
            ] }),
            /* @__PURE__ */ jsx(Typography, { children: ":" }),
            /* @__PURE__ */ jsxs(FormControl, { size: "small", sx: { width: 80 }, error: !isValidTime(unit), children: [
              /* @__PURE__ */ jsx(InputLabel, { children: "秒" }),
              /* @__PURE__ */ jsx(
                Select,
                {
                  value: unit.seconds,
                  label: "秒",
                  onChange: (e) => onUnitChange(index, "seconds", e.target.value),
                  children: SECONDS_OPTIONS.map((opt) => /* @__PURE__ */ jsx(MenuItem, { value: opt.value, children: opt.label }, opt.value))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs(Stack, { spacing: 1.5, children: [
            /* @__PURE__ */ jsxs(FormControl, { size: "small", fullWidth: true, children: [
              /* @__PURE__ */ jsx(InputLabel, { children: "カウント音" }),
              /* @__PURE__ */ jsxs(
                Select,
                {
                  value: unit.countSound,
                  label: "カウント音",
                  onChange: (e) => onUnitChange(index, "countSound", e.target.value),
                  renderValue: (value) => {
                    if (value === SOUND_NONE) return "なし";
                    const file = soundFiles.find((f) => f.filename === value);
                    return file?.name ?? value.replace(/\.[^.]+$/, "");
                  },
                  children: [
                    /* @__PURE__ */ jsx(MenuItem, { value: SOUND_NONE, children: "なし" }),
                    soundFiles.map((file) => /* @__PURE__ */ jsx(MenuItem, { value: file.filename, children: /* @__PURE__ */ jsxs(
                      Box,
                      {
                        sx: {
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%"
                        },
                        children: [
                          /* @__PURE__ */ jsx("span", { children: file.name }),
                          /* @__PURE__ */ jsx(
                            IconButton,
                            {
                              size: "small",
                              onClick: (e) => onPlaySound(e, file.filename),
                              sx: { ml: 1 },
                              children: /* @__PURE__ */ jsx(VolumeUpIcon, { fontSize: "small" })
                            }
                          )
                        ]
                      }
                    ) }, file.filename))
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(FormControl, { size: "small", fullWidth: true, children: [
              /* @__PURE__ */ jsx(InputLabel, { children: "終了3秒前の音" }),
              /* @__PURE__ */ jsxs(
                Select,
                {
                  value: unit.countSoundLast3Sec,
                  label: "終了3秒前の音",
                  onChange: (e) => onUnitChange(index, "countSoundLast3Sec", e.target.value),
                  renderValue: (value) => {
                    if (value === SOUND_NONE) return "なし";
                    const file = soundFiles.find((f) => f.filename === value);
                    return file?.name ?? value.replace(/\.[^.]+$/, "");
                  },
                  children: [
                    /* @__PURE__ */ jsx(MenuItem, { value: SOUND_NONE, children: "なし" }),
                    soundFiles.map((file) => /* @__PURE__ */ jsx(MenuItem, { value: file.filename, children: /* @__PURE__ */ jsxs(
                      Box,
                      {
                        sx: {
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%"
                        },
                        children: [
                          /* @__PURE__ */ jsx("span", { children: file.name }),
                          /* @__PURE__ */ jsx(
                            IconButton,
                            {
                              size: "small",
                              onClick: (e) => onPlaySound(e, file.filename),
                              sx: { ml: 1 },
                              children: /* @__PURE__ */ jsx(VolumeUpIcon, { fontSize: "small" })
                            }
                          )
                        ]
                      }
                    ) }, file.filename))
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(FormControl, { size: "small", fullWidth: true, children: [
              /* @__PURE__ */ jsx(InputLabel, { children: "終了音" }),
              /* @__PURE__ */ jsxs(
                Select,
                {
                  value: unit.endSound,
                  label: "終了音",
                  onChange: (e) => onUnitChange(index, "endSound", e.target.value),
                  renderValue: (value) => {
                    if (value === SOUND_NONE) return "なし";
                    const file = soundFiles.find((f) => f.filename === value);
                    return file?.name ?? value.replace(/\.[^.]+$/, "");
                  },
                  children: [
                    /* @__PURE__ */ jsx(MenuItem, { value: SOUND_NONE, children: "なし" }),
                    soundFiles.map((file) => /* @__PURE__ */ jsx(MenuItem, { value: file.filename, children: /* @__PURE__ */ jsxs(
                      Box,
                      {
                        sx: {
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%"
                        },
                        children: [
                          /* @__PURE__ */ jsx("span", { children: file.name }),
                          /* @__PURE__ */ jsx(
                            IconButton,
                            {
                              size: "small",
                              onClick: (e) => onPlaySound(e, file.filename),
                              sx: { ml: 1 },
                              children: /* @__PURE__ */ jsx(VolumeUpIcon, { fontSize: "small" })
                            }
                          )
                        ]
                      }
                    ) }, file.filename))
                  ]
                }
              )
            ] })
          ] })
        ] }) }) })
      ]
    }
  );
}
function TimerDetailModal({ open, onClose, onSaved, timer }) {
  const [name, setName] = useState("");
  const [unitTimers, setUnitTimers] = useState([createEmptyUnit()]);
  const [isPending, startTransition] = useTransition();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [soundFiles, setSoundFiles] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState(/* @__PURE__ */ new Set());
  const isEditMode = timer !== null;
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 }
    })
  );
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = unitTimers.findIndex((u) => u.key === active.id);
    const newIndex = unitTimers.findIndex((u) => u.key === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      setUnitTimers(arrayMove(unitTimers, oldIndex, newIndex));
    }
  };
  const toggleExpanded = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const getSoundDisplayName = (filename) => {
    if (filename === SOUND_NONE) return "なし";
    const file = soundFiles.find((f) => f.filename === filename);
    return file?.name ?? filename.replace(/\.[^.]+$/, "");
  };
  const formatDuration = (minutes, seconds) => {
    const m = Number.parseInt(minutes, 10) || 0;
    const s = Number.parseInt(seconds, 10) || 0;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  useEffect(() => {
    if (open) {
      client.api.timers.sounds.$get().then(async (res) => {
        const data = await res.json();
        setSoundFiles(data);
      });
    }
  }, [open]);
  useEffect(() => {
    if (open) {
      if (timer) {
        setName(timer.name);
        setUnitTimers(timerToFormData(timer));
      } else {
        setName("");
        setUnitTimers([createEmptyUnit()]);
      }
    }
  }, [open, timer]);
  const handleUnitChange = (index, field, value) => {
    const newUnits = [...unitTimers];
    newUnits[index] = { ...newUnits[index], [field]: value };
    setUnitTimers(newUnits);
  };
  const handleAddUnit = () => {
    setUnitTimers([...unitTimers, createEmptyUnit()]);
  };
  const handleRemoveUnit = (index) => {
    if (unitTimers.length > 1) {
      setUnitTimers(unitTimers.filter((_, i) => i !== index));
    }
  };
  const handleSave = () => {
    if (!name.trim()) return;
    if (unitTimers.length === 0) return;
    const invalidUnits = unitTimers.filter((unit) => {
      const minutes = Number.parseInt(unit.minutes, 10) || 0;
      const seconds = Number.parseInt(unit.seconds, 10) || 0;
      return minutes * 60 + seconds < 1;
    });
    if (invalidUnits.length > 0) return;
    const unitTimerInputs = unitTimers.map((unit, index) => ({
      ...formDataToUnitTimerInput(unit),
      sortIndex: index
    }));
    startTransition(async () => {
      if (isEditMode && timer) {
        await client.api.timers[":id"].$put({
          param: { id: String(timer.id) },
          json: {
            name: name.trim(),
            sortIndex: timer.sortIndex,
            unitTimers: unitTimerInputs
          }
        });
      } else {
        await client.api.timers.$post({
          json: {
            name: name.trim(),
            sortIndex: 0,
            unitTimers: unitTimerInputs
          }
        });
      }
      onSaved();
    });
  };
  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };
  const handleDeleteConfirm = () => {
    if (!timer) return;
    startTransition(async () => {
      await client.api.timers[":id"].$delete({
        param: { id: String(timer.id) }
      });
      setDeleteConfirmOpen(false);
      onSaved();
    });
  };
  const handlePlaySound = (e, filename) => {
    e.stopPropagation();
    audioScheduler.init();
    audioScheduler.playNow(filename);
  };
  const isValidTime = (unit) => {
    const minutes = Number.parseInt(unit.minutes, 10) || 0;
    const seconds = Number.parseInt(unit.seconds, 10) || 0;
    return minutes * 60 + seconds >= 1;
  };
  const isFormValid = name.trim() !== "" && unitTimers.every(isValidTime);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
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
            /* @__PURE__ */ jsx(Typography, { variant: "h6", children: isEditMode ? "タイマーを編集" : "タイマーを作成" }),
            isEditMode && /* @__PURE__ */ jsx(IconButton, { onClick: handleDelete, disabled: isPending, "aria-label": "タイマーを削除", children: /* @__PURE__ */ jsx(DeleteIcon, {}) })
          ] }) }),
          /* @__PURE__ */ jsx(DialogContent, { dividers: true, children: /* @__PURE__ */ jsxs(Stack, { spacing: 3, children: [
            /* @__PURE__ */ jsx(
              TextField,
              {
                label: "タイマー名",
                value: name,
                onChange: (e) => setName(e.target.value),
                fullWidth: true,
                required: true
              }
            ),
            /* @__PURE__ */ jsxs(Box, { children: [
              /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "ユニットタイマー" }),
              /* @__PURE__ */ jsx(
                DndContext,
                {
                  sensors,
                  collisionDetection: closestCenter,
                  onDragEnd: handleDragEnd,
                  children: /* @__PURE__ */ jsx(
                    SortableContext,
                    {
                      items: unitTimers.map((u) => u.key),
                      strategy: verticalListSortingStrategy,
                      children: /* @__PURE__ */ jsx(Stack, { spacing: 1.5, children: unitTimers.map((unit, index) => /* @__PURE__ */ jsx(
                        SortableUnitTimerItem,
                        {
                          unit,
                          index,
                          isExpanded: expandedKeys.has(unit.key),
                          canDelete: unitTimers.length > 1,
                          soundFiles,
                          onToggleExpanded: () => toggleExpanded(unit.key),
                          onUnitChange: handleUnitChange,
                          onRemoveUnit: handleRemoveUnit,
                          onPlaySound: handlePlaySound,
                          isValidTime,
                          formatDuration,
                          getSoundDisplayName
                        },
                        unit.key
                      )) })
                    }
                  )
                }
              ),
              /* @__PURE__ */ jsx(
                Button,
                {
                  startIcon: /* @__PURE__ */ jsx(AddIcon, {}),
                  onClick: handleAddUnit,
                  variant: "text",
                  fullWidth: true,
                  sx: { mt: 2 },
                  children: "ユニットタイマーを追加"
                }
              )
            ] })
          ] }) }),
          /* @__PURE__ */ jsxs(DialogActions, { sx: { px: 3, py: 2 }, children: [
            /* @__PURE__ */ jsx(Button, { onClick: onClose, disabled: isPending, children: "キャンセル" }),
            /* @__PURE__ */ jsx(Button, { variant: "contained", onClick: handleSave, disabled: isPending || !isFormValid, children: isPending ? "保存中..." : "保存" })
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
            "「",
            timer?.name,
            "」を削除しますか？",
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
function TimerList() {
  const [timers, setTimers] = useState([]);
  const [isPending, startTransition] = useTransition();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSorting, setIsSorting] = useState(false);
  const isInitialLoadRef = useRef(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState(null);
  const { startTimer } = useTimer();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  const loadTimers = useCallback(() => {
    startTransition(async () => {
      const res = await client.api.timers.$get();
      const data = await res.json();
      setTimers(data);
      if (isInitialLoadRef.current) {
        setIsInitialLoading(false);
        isInitialLoadRef.current = false;
      }
    });
  }, []);
  useEffect(() => {
    loadTimers();
  }, [loadTimers]);
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = timers.findIndex((item) => item.id === active.id);
    const newIndex = timers.findIndex((item) => item.id === over.id);
    const newItems = arrayMove(timers, oldIndex, newIndex);
    setTimers(newItems);
    const minIndex = Math.min(oldIndex, newIndex);
    const maxIndex = Math.max(oldIndex, newIndex);
    const changedItems = newItems.slice(minIndex, maxIndex + 1).map((item, i) => ({ id: item.id, sortIndex: minIndex + i }));
    setIsSorting(true);
    startTransition(async () => {
      await client.api.timers["sort-order"].$put({
        json: { timers: changedItems }
      });
      setIsSorting(false);
    });
  };
  const handleCreate = () => {
    setSelectedTimer(null);
    setModalOpen(true);
  };
  const handleEdit = useCallback((timer) => {
    setSelectedTimer(timer);
    setModalOpen(true);
  }, []);
  const handlePlay = useCallback(
    (timer) => {
      startTimer(timer);
    },
    [startTimer]
  );
  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedTimer(null);
  };
  const handleSaved = () => {
    handleModalClose();
    loadTimers();
  };
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  const getTotalDuration = (timer) => {
    return timer.unitTimers.reduce((sum, unit) => sum + unit.duration, 0);
  };
  const renderSkeleton = () => /* @__PURE__ */ jsx(Stack, { spacing: 1.5, children: [1, 2, 3].map((i) => /* @__PURE__ */ jsx(Paper, { variant: "outlined", sx: { p: 2 }, children: /* @__PURE__ */ jsxs(Stack, { direction: "row", alignItems: "center", spacing: 2, children: [
    /* @__PURE__ */ jsx(Skeleton, { variant: "circular", width: 40, height: 40 }),
    /* @__PURE__ */ jsxs(Box, { sx: { flex: 1 }, children: [
      /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: "60%", height: 24 }),
      /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: "40%", height: 20 })
    ] }),
    /* @__PURE__ */ jsx(Skeleton, { variant: "circular", width: 40, height: 40 })
  ] }) }, i)) });
  return /* @__PURE__ */ jsxs(Box, { sx: { position: "relative" }, children: [
    /* @__PURE__ */ jsx(
      Backdrop,
      {
        open: isSorting,
        sx: {
          position: "absolute",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: "rgba(0, 0, 0, 0.5)",
          borderRadius: 1
        },
        children: /* @__PURE__ */ jsxs(Stack, { alignItems: "center", gap: 1, children: [
          /* @__PURE__ */ jsx(CircularProgress, { size: 32, sx: { color: "white" } }),
          /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { color: "white" }, children: "保存中..." })
        ] })
      }
    ),
    /* @__PURE__ */ jsx(Stack, { direction: "row", justifyContent: "flex-end", alignItems: "center", mb: 2, children: /* @__PURE__ */ jsx(
      Button,
      {
        variant: "contained",
        color: "primary",
        onClick: handleCreate,
        disabled: isPending || isInitialLoading,
        "aria-label": "タイマーを追加",
        sx: { minWidth: 44, minHeight: 44 },
        children: /* @__PURE__ */ jsx(AddIcon, { fontSize: "medium" })
      }
    ) }),
    isInitialLoading ? renderSkeleton() : timers.length === 0 ? /* @__PURE__ */ jsx(Paper, { variant: "outlined", sx: { p: 4, textAlign: "center" }, children: /* @__PURE__ */ jsxs(Typography, { color: "text.secondary", children: [
      "タイマーが登録されていません。",
      /* @__PURE__ */ jsx("br", {}),
      "「追加」ボタンからタイマーを登録してください。"
    ] }) }) : /* @__PURE__ */ jsx(DndContext, { sensors, collisionDetection: closestCenter, onDragEnd: handleDragEnd, children: /* @__PURE__ */ jsx(SortableContext, { items: timers.map((t) => t.id), strategy: verticalListSortingStrategy, children: /* @__PURE__ */ jsx(Stack, { spacing: 1.5, children: timers.map((timer) => /* @__PURE__ */ jsx(
      SortableTimerItem,
      {
        timer,
        totalDuration: formatDuration(getTotalDuration(timer)),
        unitCount: timer.unitTimers.length,
        onEdit: handleEdit,
        onPlay: handlePlay
      },
      timer.id
    )) }) }) }),
    /* @__PURE__ */ jsx(
      TimerDetailModal,
      {
        open: modalOpen,
        onClose: handleModalClose,
        onSaved: handleSaved,
        timer: selectedTimer
      }
    )
  ] });
}
function TimersPage() {
  return /* @__PURE__ */ jsx(TimerList, {});
}
const SplitComponent = TimersPage;
export {
  SplitComponent as component
};
