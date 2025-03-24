'use client'

import * as React from 'react'

import { Button } from '@/components/_generated/ui/button'
import { Input } from '@/components/_generated/ui/input'
import { Label } from '@/components/_generated/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/_generated/ui/select'

export function GoalInputModal() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="goal-title">目標タイトル</Label>
        <Input id="goal-title" placeholder="例: ベンチプレス100kg" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="goal-type">目標タイプ</Label>
        <Select>
          <SelectTrigger id="goal-type">
            <SelectValue placeholder="目標タイプを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weight">重量</SelectItem>
            <SelectItem value="reps">回数</SelectItem>
            <SelectItem value="time">時間</SelectItem>
            <SelectItem value="distance">距離</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="goal-target">目標値</Label>
        <Input id="goal-target" placeholder="例: 100" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="goal-deadline">達成期限</Label>
        <Input id="goal-deadline" type="date" />
      </div>
      <Button className="w-full">目標を設定</Button>
    </div>
  )
} 