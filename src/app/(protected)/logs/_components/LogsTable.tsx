"use client";

import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Stack } from "@mui/material";

export type TrainingRow = {
  id: string; // date を含むユニークID
  date: string; // YYYY-MM-DD
  exercises: string[];
  volume: number; // 総ボリューム
};

export default function LogsTable({ rows }: { rows: TrainingRow[] }) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small" aria-label="training logs table">
        <TableHead>
          <TableRow>
            <TableCell width={140}>日付</TableCell>
            <TableCell>種目</TableCell>
            <TableCell align="right" width={140}>ボリューム</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>{row.date}</TableCell>
              <TableCell>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {row.exercises.map((name) => (
                    <Chip key={name} label={name} size="small" variant="outlined" />
                  ))}
                </Stack>
              </TableCell>
              <TableCell align="right">{row.volume.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
