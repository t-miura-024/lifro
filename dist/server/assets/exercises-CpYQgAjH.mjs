import { jsxs, jsx } from "react/jsx-runtime";
import { c as client } from "./hono-client-D2iVJXCF.mjs";
import { useSensors, useSensor, PointerSensor, KeyboardSensor, DndContext, closestCenter } from "@dnd-kit/core";
import { useSortable, sortableKeyboardCoordinates, SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import AddIcon from "@mui/icons-material/Add";
import { Dialog, DialogTitle, DialogContent, Stack, Typography, FormControl, InputLabel, Select, MenuItem, TextField, IconButton, Box, Button, Chip, DialogActions, TableRow, TableCell, Tooltip, Backdrop, CircularProgress, Paper, Snackbar, Alert, TableContainer, Table, TableHead, TableBody, Skeleton } from "@mui/material";
import { useTransition, useState, useEffect, useCallback, memo, useRef, useMemo } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import { CSS } from "@dnd-kit/utilities";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditIcon from "@mui/icons-material/Edit";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import "hono/client";
client.api.exercises["body-parts"].$get;
const categoryLabels$2 = {
  CHEST: "胸",
  BACK: "背中",
  SHOULDER: "肩",
  ARM: "腕",
  ABS: "腹筋",
  LEG: "脚"
};
function BodyPartEditDialog({
  open,
  onClose,
  exerciseId,
  exerciseName,
  initialBodyParts,
  onSave
}) {
  const [isPending, startTransition] = useTransition();
  const [allBodyParts, setAllBodyParts] = useState([]);
  const [selectedBodyParts, setSelectedBodyParts] = useState([]);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (open) {
      startTransition(async () => {
        const res = await client.api.exercises["body-parts"].$get();
        const data = await res.json();
        setAllBodyParts(data);
      });
      setSelectedBodyParts(initialBodyParts);
      setError(null);
    }
  }, [open, initialBodyParts]);
  const totalRatio = selectedBodyParts.reduce((sum, bp) => sum + bp.loadRatio, 0);
  const isValid = selectedBodyParts.length === 0 || totalRatio === 100;
  const handleAddBodyPart = () => {
    const usedIds = new Set(selectedBodyParts.map((bp) => bp.bodyPartId));
    const availableBodyPart = allBodyParts.find((bp) => !usedIds.has(bp.id));
    if (availableBodyPart) {
      setSelectedBodyParts([...selectedBodyParts, { bodyPartId: availableBodyPart.id, loadRatio: 0 }]);
    }
  };
  const handleRemoveBodyPart = (index) => {
    setSelectedBodyParts(selectedBodyParts.filter((_, i) => i !== index));
  };
  const handleBodyPartChange = (index, bodyPartId) => {
    const newBodyParts = [...selectedBodyParts];
    newBodyParts[index] = { ...newBodyParts[index], bodyPartId };
    setSelectedBodyParts(newBodyParts);
  };
  const handleRatioChange = (index, ratio) => {
    const newBodyParts = [...selectedBodyParts];
    newBodyParts[index] = { ...newBodyParts[index], loadRatio: ratio };
    setSelectedBodyParts(newBodyParts);
  };
  const handleSave = useCallback(() => {
    if (!exerciseId) return;
    if (!isValid) {
      setError("負荷割合の合計は100%にしてください");
      return;
    }
    startTransition(async () => {
      await client.api.exercises[":exerciseId"]["body-parts"].$put({
        param: { exerciseId: String(exerciseId) },
        json: { bodyParts: selectedBodyParts }
      });
      onSave();
      onClose();
    });
  }, [exerciseId, isValid, selectedBodyParts, onSave, onClose]);
  const bodyPartsByCategory = allBodyParts.reduce(
    (acc, bp) => {
      if (!acc[bp.category]) {
        acc[bp.category] = [];
      }
      acc[bp.category].push(bp);
      return acc;
    },
    {}
  );
  const selectedIds = new Set(selectedBodyParts.map((bp) => bp.bodyPartId));
  return /* @__PURE__ */ jsxs(
    Dialog,
    {
      open,
      onClose: (_event, reason) => {
        if (reason === "backdropClick") return;
        onClose();
      },
      fullWidth: true,
      maxWidth: "sm",
      children: [
        /* @__PURE__ */ jsxs(DialogTitle, { children: [
          "部位を設定 - ",
          exerciseName
        ] }),
        /* @__PURE__ */ jsx(DialogContent, { children: /* @__PURE__ */ jsxs(Stack, { spacing: 2, sx: { mt: 1 }, children: [
          selectedBodyParts.length === 0 ? /* @__PURE__ */ jsx(Typography, { color: "text.secondary", sx: { textAlign: "center", py: 2 }, children: "部位が設定されていません" }) : selectedBodyParts.map((bp, index) => {
            allBodyParts.find((p) => p.id === bp.bodyPartId);
            return /* @__PURE__ */ jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
              /* @__PURE__ */ jsxs(FormControl, { size: "small", sx: { flex: 1 }, children: [
                /* @__PURE__ */ jsx(InputLabel, { children: "部位" }),
                /* @__PURE__ */ jsx(
                  Select,
                  {
                    value: bp.bodyPartId,
                    label: "部位",
                    onChange: (e) => handleBodyPartChange(index, e.target.value),
                    children: Object.entries(bodyPartsByCategory).map(([category, parts]) => [
                      /* @__PURE__ */ jsx(MenuItem, { disabled: true, sx: { fontWeight: "bold" }, children: categoryLabels$2[category] || category }, `header-${category}`),
                      ...parts.map((part) => /* @__PURE__ */ jsx(
                        MenuItem,
                        {
                          value: part.id,
                          disabled: selectedIds.has(part.id) && part.id !== bp.bodyPartId,
                          sx: { pl: 3 },
                          children: part.name
                        },
                        part.id
                      ))
                    ])
                  }
                )
              ] }),
              /* @__PURE__ */ jsx(
                TextField,
                {
                  size: "small",
                  type: "number",
                  label: "負荷%",
                  value: bp.loadRatio,
                  onChange: (e) => handleRatioChange(index, Number(e.target.value)),
                  inputProps: { min: 0, max: 100, step: 5 },
                  sx: { width: 100 }
                }
              ),
              /* @__PURE__ */ jsx(
                IconButton,
                {
                  size: "small",
                  onClick: () => handleRemoveBodyPart(index),
                  "aria-label": "削除",
                  children: /* @__PURE__ */ jsx(DeleteIcon, { fontSize: "small" })
                }
              )
            ] }, bp.bodyPartId);
          }),
          /* @__PURE__ */ jsx(Box, { sx: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ jsx(
            Button,
            {
              startIcon: /* @__PURE__ */ jsx(AddIcon, {}),
              onClick: handleAddBodyPart,
              disabled: selectedBodyParts.length >= allBodyParts.length,
              children: "部位を追加"
            }
          ) }),
          selectedBodyParts.length > 0 && /* @__PURE__ */ jsxs(
            Box,
            {
              sx: {
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 1
              },
              children: [
                /* @__PURE__ */ jsx(Typography, { variant: "body2", children: "合計:" }),
                /* @__PURE__ */ jsx(
                  Chip,
                  {
                    label: `${totalRatio}%`,
                    color: isValid ? "success" : "error",
                    size: "small"
                  }
                )
              ]
            }
          ),
          error && /* @__PURE__ */ jsx(Typography, { color: "error", variant: "body2", children: error })
        ] }) }),
        /* @__PURE__ */ jsxs(DialogActions, { sx: { px: 3, py: 2 }, children: [
          /* @__PURE__ */ jsx(Button, { onClick: onClose, disabled: isPending, children: "キャンセル" }),
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "contained",
              onClick: handleSave,
              disabled: isPending || !isValid,
              children: "保存"
            }
          )
        ] })
      ]
    }
  );
}
const categoryLabels$1 = {
  CHEST: "胸",
  BACK: "背中",
  SHOULDER: "肩",
  ARM: "腕",
  ABS: "腹筋",
  LEG: "脚"
};
const categoryColors = {
  CHEST: { bg: "#c17b7b", text: "#fff" },
  // くすみ赤
  BACK: { bg: "#7b9fc1", text: "#fff" },
  // くすみ青
  SHOULDER: { bg: "#c9a66b", text: "#fff" },
  // くすみオレンジ
  ARM: { bg: "#9b7bb5", text: "#fff" },
  // くすみ紫
  ABS: { bg: "#7bab7e", text: "#fff" },
  // くすみ緑
  LEG: { bg: "#b57b8e", text: "#fff" }
  // くすみピンク
};
function SortableExerciseItemInner({
  exercise,
  onEdit,
  onDelete,
  onBodyPartEdit
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  const bodyPartChips = exercise.bodyParts?.map((bp) => {
    const category = bp.bodyPart?.category ?? "";
    const categoryLabel = categoryLabels$1[category] ?? "";
    const colors = categoryColors[category] ?? { bg: "#f5f5f5", text: "#616161" };
    const partName = bp.bodyPart?.name ?? String(bp.bodyPartId);
    return /* @__PURE__ */ jsx(
      Chip,
      {
        size: "small",
        sx: {
          fontSize: "0.7rem",
          height: 22,
          backgroundColor: colors.bg,
          color: colors.text,
          "& .MuiChip-label": {
            display: "flex",
            alignItems: "center",
            gap: 0.5
          }
        },
        label: /* @__PURE__ */ jsxs(Box, { component: "span", sx: { display: "flex", alignItems: "center", gap: 0.5 }, children: [
          /* @__PURE__ */ jsx(
            Box,
            {
              component: "span",
              sx: {
                fontWeight: 600,
                borderRight: "1px solid rgba(255,255,255,0.4)",
                pr: 0.5,
                mr: 0.25
              },
              children: categoryLabel
            }
          ),
          /* @__PURE__ */ jsxs(Box, { component: "span", children: [
            partName,
            " ",
            bp.loadRatio,
            "%"
          ] })
        ] })
      },
      bp.bodyPartId
    );
  });
  return /* @__PURE__ */ jsxs(TableRow, { ref: setNodeRef, style, children: [
    /* @__PURE__ */ jsx(TableCell, { sx: { width: 48, p: 1 }, children: /* @__PURE__ */ jsx(
      IconButton,
      {
        size: "small",
        ...attributes,
        ...listeners,
        sx: { cursor: "grab", touchAction: "none" },
        "aria-label": "ドラッグして並び替え",
        children: /* @__PURE__ */ jsx(DragIndicatorIcon, {})
      }
    ) }),
    /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs(Stack, { spacing: 0.5, children: [
      /* @__PURE__ */ jsx(Typography, { children: exercise.name }),
      exercise.bodyParts && exercise.bodyParts.length > 0 && /* @__PURE__ */ jsx(Stack, { direction: "row", spacing: 0.5, flexWrap: "wrap", useFlexGap: true, children: bodyPartChips })
    ] }) }),
    onBodyPartEdit && /* @__PURE__ */ jsx(TableCell, { sx: { width: 48, p: 1 }, children: /* @__PURE__ */ jsx(Tooltip, { title: "部位を設定", children: /* @__PURE__ */ jsx(
      IconButton,
      {
        size: "small",
        onClick: () => onBodyPartEdit(exercise),
        "aria-label": "部位を設定",
        children: /* @__PURE__ */ jsx(
          FitnessCenterIcon,
          {
            fontSize: "small",
            color: exercise.bodyParts?.length ? "primary" : "disabled"
          }
        )
      }
    ) }) }),
    /* @__PURE__ */ jsx(TableCell, { sx: { width: 48, p: 1 }, children: /* @__PURE__ */ jsx(IconButton, { size: "small", onClick: () => onEdit(exercise), "aria-label": "編集", children: /* @__PURE__ */ jsx(EditIcon, { fontSize: "small" }) }) }),
    /* @__PURE__ */ jsx(TableCell, { sx: { width: 48, p: 1 }, children: /* @__PURE__ */ jsx(IconButton, { size: "small", onClick: () => onDelete(exercise), "aria-label": "削除", children: /* @__PURE__ */ jsx(DeleteIcon, { fontSize: "small" }) }) })
  ] });
}
const SortableExerciseItem = memo(SortableExerciseItemInner);
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
function ExerciseList() {
  const [exercises, setExercises] = useState([]);
  const [isPending, startTransition] = useTransition();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSorting, setIsSorting] = useState(false);
  const isInitialLoadRef = useRef(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bodyPartDialogOpen, setBodyPartDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseName, setExerciseName] = useState("");
  const [errorSnackbar, setErrorSnackbar] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  const groupedExercises = useMemo(() => {
    const groups = {};
    groups.UNCATEGORIZED = [];
    for (const category of categoryOrder) {
      groups[category] = [];
    }
    for (const exercise of exercises) {
      const category = exercise.primaryCategory || "UNCATEGORIZED";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(exercise);
    }
    return groups;
  }, [exercises]);
  const loadExercises = useCallback(() => {
    startTransition(async () => {
      const res = await client.api.exercises["with-body-parts"].$get();
      const data = await res.json();
      setExercises(data);
      if (isInitialLoadRef.current) {
        setIsInitialLoading(false);
        isInitialLoadRef.current = false;
      }
    });
  }, []);
  useEffect(() => {
    loadExercises();
  }, [loadExercises]);
  const handleDragEnd = (event, categoryExercises) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categoryExercises.findIndex((item) => item.id === active.id);
    const newIndex = categoryExercises.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newItems = arrayMove(categoryExercises, oldIndex, newIndex);
    setExercises((prev) => {
      const updated = [...prev];
      for (let i = 0; i < newItems.length; i++) {
        const exerciseIndex = updated.findIndex((e) => e.id === newItems[i].id);
        if (exerciseIndex !== -1) {
          updated[exerciseIndex] = { ...updated[exerciseIndex], sortIndex: i };
        }
      }
      return updated;
    });
    const minIndex = Math.min(oldIndex, newIndex);
    const maxIndex = Math.max(oldIndex, newIndex);
    const changedItems = newItems.slice(minIndex, maxIndex + 1).map((item, i) => ({ id: item.id, sortIndex: minIndex + i }));
    setIsSorting(true);
    startTransition(async () => {
      await client.api.exercises["sort-order"].$put({
        json: { exercises: changedItems }
      });
      setIsSorting(false);
    });
  };
  const handleCreate = () => {
    setExerciseName("");
    setCreateDialogOpen(true);
  };
  const handleCreateConfirm = () => {
    if (!exerciseName.trim()) return;
    startTransition(async () => {
      await client.api.exercises.$post({
        json: { name: exerciseName.trim() }
      });
      setCreateDialogOpen(false);
      setExerciseName("");
      loadExercises();
    });
  };
  const handleEdit = useCallback((exercise) => {
    setSelectedExercise(exercise);
    setExerciseName(exercise.name);
    setEditDialogOpen(true);
  }, []);
  const handleEditConfirm = () => {
    if (!selectedExercise || !exerciseName.trim()) return;
    startTransition(async () => {
      await client.api.exercises[":id"].$put({
        param: { id: String(selectedExercise.id) },
        json: { name: exerciseName.trim() }
      });
      setEditDialogOpen(false);
      setSelectedExercise(null);
      setExerciseName("");
      loadExercises();
    });
  };
  const handleDelete = useCallback((exercise) => {
    setSelectedExercise(exercise);
    setDeleteDialogOpen(true);
  }, []);
  const handleDeleteConfirm = () => {
    if (!selectedExercise) return;
    startTransition(async () => {
      const canDeleteRes = await client.api.exercises[":id"]["can-delete"].$get({
        param: { id: String(selectedExercise.id) }
      });
      const { canDelete } = await canDeleteRes.json();
      if (!canDelete) {
        setErrorSnackbar("この種目にはトレーニング記録が存在するため削除できません");
        setDeleteDialogOpen(false);
        setSelectedExercise(null);
        return;
      }
      await client.api.exercises[":id"].$delete({
        param: { id: String(selectedExercise.id) }
      });
      setDeleteDialogOpen(false);
      setSelectedExercise(null);
      loadExercises();
    });
  };
  const handleBodyPartEdit = useCallback((exercise) => {
    setSelectedExercise(exercise);
    setBodyPartDialogOpen(true);
  }, []);
  const renderSkeleton = () => /* @__PURE__ */ jsx(TableContainer, { component: Paper, variant: "outlined", children: /* @__PURE__ */ jsxs(Table, { size: "small", children: [
    /* @__PURE__ */ jsx(TableHead, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
      /* @__PURE__ */ jsx(TableCell, { sx: { width: 48 } }),
      /* @__PURE__ */ jsx(TableCell, { children: "種目名" }),
      /* @__PURE__ */ jsx(TableCell, { children: "部位" }),
      /* @__PURE__ */ jsx(TableCell, { sx: { width: 48 } }),
      /* @__PURE__ */ jsx(TableCell, { sx: { width: 48 } })
    ] }) }),
    /* @__PURE__ */ jsx(TableBody, { children: [1, 2, 3].map((i) => /* @__PURE__ */ jsxs(TableRow, { children: [
      /* @__PURE__ */ jsx(TableCell, { sx: { width: 48, p: 1 }, children: /* @__PURE__ */ jsx(Skeleton, { variant: "circular", width: 32, height: 32 }) }),
      /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: "60%" }) }),
      /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Skeleton, { variant: "text", width: "40%" }) }),
      /* @__PURE__ */ jsx(TableCell, { sx: { width: 48, p: 1 }, children: /* @__PURE__ */ jsx(Skeleton, { variant: "circular", width: 28, height: 28 }) }),
      /* @__PURE__ */ jsx(TableCell, { sx: { width: 48, p: 1 }, children: /* @__PURE__ */ jsx(Skeleton, { variant: "circular", width: 28, height: 28 }) })
    ] }, i)) })
  ] }) });
  const renderCategoryGroup = (category, categoryExercises) => {
    if (categoryExercises.length === 0) return null;
    const categoryLabel = category === "UNCATEGORIZED" ? "未分類" : categoryLabels[category] || category;
    return /* @__PURE__ */ jsxs(Box, { sx: { mb: 3 }, children: [
      /* @__PURE__ */ jsx(
        Typography,
        {
          variant: "subtitle1",
          sx: {
            mb: 1,
            px: 1.5,
            py: 0.75,
            bgcolor: categoryColors[category]?.bg ?? "action.hover",
            color: categoryColors[category]?.text ?? "text.primary",
            borderRadius: 1,
            fontWeight: "bold"
          },
          children: categoryLabel
        }
      ),
      /* @__PURE__ */ jsx(
        DndContext,
        {
          sensors,
          collisionDetection: closestCenter,
          onDragEnd: (event) => handleDragEnd(event, categoryExercises),
          children: /* @__PURE__ */ jsx(
            SortableContext,
            {
              items: categoryExercises.map((e) => e.id),
              strategy: verticalListSortingStrategy,
              children: /* @__PURE__ */ jsx(TableContainer, { component: Paper, variant: "outlined", children: /* @__PURE__ */ jsx(Table, { size: "small", children: /* @__PURE__ */ jsx(TableBody, { children: categoryExercises.map((exercise) => /* @__PURE__ */ jsx(
                SortableExerciseItem,
                {
                  exercise,
                  onEdit: handleEdit,
                  onDelete: handleDelete,
                  onBodyPartEdit: handleBodyPartEdit
                },
                exercise.id
              )) }) }) })
            }
          )
        }
      )
    ] }, category);
  };
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
        "aria-label": "種目を追加",
        sx: { minWidth: 44, minHeight: 44 },
        children: /* @__PURE__ */ jsx(AddIcon, { fontSize: "medium" })
      }
    ) }),
    isInitialLoading ? renderSkeleton() : exercises.length === 0 ? /* @__PURE__ */ jsx(Paper, { variant: "outlined", sx: { p: 4, textAlign: "center" }, children: /* @__PURE__ */ jsxs(Typography, { color: "text.secondary", children: [
      "種目が登録されていません。",
      /* @__PURE__ */ jsx("br", {}),
      "「追加」ボタンから種目を登録してください。"
    ] }) }) : /* @__PURE__ */ jsxs(Box, { children: [
      categoryOrder.map(
        (category) => renderCategoryGroup(category, groupedExercises[category] || [])
      ),
      renderCategoryGroup("UNCATEGORIZED", groupedExercises.UNCATEGORIZED || [])
    ] }),
    /* @__PURE__ */ jsxs(
      Dialog,
      {
        open: createDialogOpen,
        onClose: (_event, reason) => {
          if (reason === "backdropClick") return;
          setCreateDialogOpen(false);
        },
        fullWidth: true,
        maxWidth: "xs",
        children: [
          /* @__PURE__ */ jsx(DialogTitle, { children: "種目を追加" }),
          /* @__PURE__ */ jsx(DialogContent, { children: /* @__PURE__ */ jsx(
            TextField,
            {
              autoFocus: true,
              margin: "dense",
              label: "種目名",
              fullWidth: true,
              value: exerciseName,
              onChange: (e) => setExerciseName(e.target.value),
              onKeyDown: (e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  handleCreateConfirm();
                }
              }
            }
          ) }),
          /* @__PURE__ */ jsxs(DialogActions, { sx: { px: 3, py: 2 }, children: [
            /* @__PURE__ */ jsx(Button, { onClick: () => setCreateDialogOpen(false), disabled: isPending, children: "キャンセル" }),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "contained",
                onClick: handleCreateConfirm,
                disabled: isPending || !exerciseName.trim(),
                children: "追加"
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxs(
      Dialog,
      {
        open: editDialogOpen,
        onClose: (_event, reason) => {
          if (reason === "backdropClick") return;
          setEditDialogOpen(false);
        },
        fullWidth: true,
        maxWidth: "xs",
        children: [
          /* @__PURE__ */ jsx(DialogTitle, { children: "種目を編集" }),
          /* @__PURE__ */ jsx(DialogContent, { children: /* @__PURE__ */ jsx(
            TextField,
            {
              autoFocus: true,
              margin: "dense",
              label: "種目名",
              fullWidth: true,
              value: exerciseName,
              onChange: (e) => setExerciseName(e.target.value),
              onKeyDown: (e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  handleEditConfirm();
                }
              }
            }
          ) }),
          /* @__PURE__ */ jsxs(DialogActions, { sx: { px: 3, py: 2 }, children: [
            /* @__PURE__ */ jsx(Button, { onClick: () => setEditDialogOpen(false), disabled: isPending, children: "キャンセル" }),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "contained",
                onClick: handleEditConfirm,
                disabled: isPending || !exerciseName.trim(),
                children: "保存"
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxs(
      Dialog,
      {
        open: deleteDialogOpen,
        onClose: (_event, reason) => {
          if (reason === "backdropClick") return;
          setDeleteDialogOpen(false);
        },
        fullWidth: true,
        maxWidth: "xs",
        children: [
          /* @__PURE__ */ jsx(DialogTitle, { children: "削除の確認" }),
          /* @__PURE__ */ jsx(DialogContent, { children: /* @__PURE__ */ jsxs(Typography, { children: [
            "「",
            selectedExercise?.name,
            "」を削除しますか？",
            /* @__PURE__ */ jsx("br", {}),
            "この操作は取り消せません。"
          ] }) }),
          /* @__PURE__ */ jsxs(DialogActions, { sx: { px: 3, py: 2 }, children: [
            /* @__PURE__ */ jsx(Button, { onClick: () => setDeleteDialogOpen(false), disabled: isPending, children: "キャンセル" }),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "contained",
                color: "error",
                onClick: handleDeleteConfirm,
                disabled: isPending,
                children: "削除"
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx(
      BodyPartEditDialog,
      {
        open: bodyPartDialogOpen,
        onClose: () => {
          setBodyPartDialogOpen(false);
          setSelectedExercise(null);
        },
        exerciseId: selectedExercise?.id ?? null,
        exerciseName: selectedExercise?.name ?? "",
        initialBodyParts: selectedExercise?.bodyParts?.map((bp) => ({
          bodyPartId: bp.bodyPartId,
          loadRatio: bp.loadRatio
        })) ?? [],
        onSave: loadExercises
      }
    ),
    /* @__PURE__ */ jsx(
      Snackbar,
      {
        open: !!errorSnackbar,
        autoHideDuration: 5e3,
        onClose: () => setErrorSnackbar(null),
        anchorOrigin: { vertical: "bottom", horizontal: "center" },
        children: /* @__PURE__ */ jsx(Alert, { severity: "error", onClose: () => setErrorSnackbar(null), children: errorSnackbar })
      }
    )
  ] });
}
function ExercisesPage() {
  return /* @__PURE__ */ jsx(ExerciseList, {});
}
const SplitComponent = ExercisesPage;
export {
  SplitComponent as component
};
