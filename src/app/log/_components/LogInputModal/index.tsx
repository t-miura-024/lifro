'use client'

import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/_generated/ui/button'
import { Input } from '@/components/_generated/ui/input'
import { Label } from '@/components/_generated/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/_generated/ui/select'

export function LogInputModal() {
  const [exercises, setExercises] = React.useState([{ name: '', sets: [{ weight: '', reps: '' }] }])

  const addExercise = () => {
    setExercises([...exercises, { name: '', sets: [{ weight: '', reps: '' }] }])
  }

  const addSet = (exerciseIndex: number) => {
    const newExercises = [...exercises]
    newExercises[exerciseIndex].sets.push({ weight: '', reps: '' })
    setExercises(newExercises)
  }

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index))
  }

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const newExercises = [...exercises]
    newExercises[exerciseIndex].sets = newExercises[exerciseIndex].sets.filter((_, i) => i !== setIndex)
    setExercises(newExercises)
  }

  const handleExerciseChange = (index: number, value: string) => {
    const newExercises = [...exercises]
    newExercises[index].name = value
    setExercises(newExercises)
  }

  const handleSetChange = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => {
    const newExercises = [...exercises]
    newExercises[exerciseIndex].sets[setIndex][field] = value
    setExercises(newExercises)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="log-date">日付</Label>
        <Input id="log-date" type="date" />
      </div>
      {exercises.map((exercise, exerciseIndex) => (
        <div key={exercise.name} className="space-y-2 border p-4 rounded-md">
          <div className="flex items-center justify-between">
            <Label htmlFor={`exercise-${exerciseIndex}`}>エクササイズ {exerciseIndex + 1}</Label>
            <Button variant="ghost" size="sm" onClick={() => removeExercise(exerciseIndex)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Select onValueChange={(value) => handleExerciseChange(exerciseIndex, value)}>
            <SelectTrigger id={`exercise-${exerciseIndex}`}>
              <SelectValue placeholder="エクササイズを選択" />
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
                onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'weight', e.target.value)}
              />
              <Input
                placeholder="回数"
                value={set.reps}
                onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'reps', e.target.value)}
              />
              <Button variant="ghost" size="sm" onClick={() => removeSet(exerciseIndex, setIndex)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addSet(exerciseIndex)}>
            セットを追加
          </Button>
        </div>
      ))}
      <Button variant="outline" onClick={addExercise}>
        <Plus className="mr-2 h-4 w-4" />
        エクササイズを追加
      </Button>
      <Button className="w-full">ログを保存</Button>
    </div>
  )
}