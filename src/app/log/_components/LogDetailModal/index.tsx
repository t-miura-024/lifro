'use client'

import * as React from 'react'
import { Button } from '@/components/_generated/ui/button'
import { Input } from '@/components/_generated/ui/input'
import { Label } from '@/components/_generated/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/_generated/ui/select'
import { Trash2, Plus } from 'lucide-react'

type LogDetailModalProps = {
  log: {
    id: number
    date: Date
    exercises: { name: string; sets: { weight: number; reps: number }[] }[]
    totalVolume: number
  }
}

export function LogDetailModal({ log }: LogDetailModalProps) {
  const [isEditable, setIsEditable] = React.useState(false)
  const [exercises, setExercises] = React.useState(log.exercises)

  const handleEditToggle = () => {
    setIsEditable(!isEditable)
  }

  const handleExerciseChange = (index: number, value: string) => {
    const newExercises = [...exercises]
    newExercises[index].name = value
    setExercises(newExercises)
  }

  const handleSetChange = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) => {
    const newExercises = [...exercises]
    newExercises[exerciseIndex].sets[setIndex][field] = value
    setExercises(newExercises)
  }

  const addExercise = () => {
    setExercises([...exercises, { name: '', sets: [{ weight: 0, reps: 0 }] }])
  }

  const addSet = (exerciseIndex: number) => {
    const newExercises = [...exercises]
    newExercises[exerciseIndex].sets.push({ weight: 0, reps: 0 })
    setExercises(newExercises)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="log-date">日付</Label>
        <Input id="log-date" type="date" value={log.date.toISOString().split('T')[0]} readOnly={!isEditable} />
      </div>
      {exercises.map((exercise, exerciseIndex) => (
        <div key={exercise.name} className="space-y-2 border p-4 rounded-md">
          <div className="flex items-center justify-between">
            <Label htmlFor={`exercise-${exerciseIndex}`}>エクササイズ {exerciseIndex + 1}</Label>
            <Button variant="ghost" size="sm" disabled={!isEditable}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Select onValueChange={(value) => handleExerciseChange(exerciseIndex, value)} disabled={!isEditable}>
            <SelectTrigger id={`exercise-${exerciseIndex}`}>
              <SelectValue placeholder="エクササイズを選択" defaultValue={exercise.name} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bench-press">ベンチプレス</SelectItem>
              <SelectItem value="squat">スクワット</SelectItem>
              <SelectItem value="deadlift">デッドリフト</SelectItem>
              {/* 他のエクササイズオプション */}
            </SelectContent>
          </Select>
          {exercise.sets.map((set, setIndex) => (
            <div key={setIndex} className="flex items-center space-x-2">
              <Input
                placeholder="重量 (kg)"
                value={set.weight}
                onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'weight', Number(e.target.value))}
                readOnly={!isEditable}
              />
              <Input
                placeholder="回数"
                value={set.reps}
                onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'reps', Number(e.target.value))}
                readOnly={!isEditable}
              />
              <Button variant="ghost" size="sm" disabled={!isEditable}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addSet(exerciseIndex)} disabled={!isEditable}>
            セットを追加
          </Button>
        </div>
      ))}
      <Button variant="outline" onClick={addExercise} disabled={!isEditable}>
        <Plus className="mr-2 h-4 w-4" />
        エクササイズを追加
      </Button>
      <Button variant="outline" onClick={handleEditToggle}>
        {isEditable ? '保存' : '編集'}
      </Button>
    </div>
  )
} 