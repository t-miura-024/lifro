'use client'

import * as React from 'react'

import { Button } from '@/components/_generated/ui/button'
import { Input } from '@/components/_generated/ui/input'
import { Label } from '@/components/_generated/ui/label'
import { Textarea } from '@/components/_generated/ui/textarea'

export function RoutineInputModal() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="routine-name">ルーティン名</Label>
        <Input id="routine-name" placeholder="例: 上半身ルーティン" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="routine-description">説明</Label>
        <Textarea id="routine-description" placeholder="ルーティンの説明を入力してください" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="routine-exercises">エクササイズ</Label>
        <Textarea
          id="routine-exercises"
          placeholder="各行に1つのエクササイズを入力してください
例:
ベンチプレス
ラットプルダウン
ショルダープレス"
          className="min-h-[100px]"
        />
      </div>
      <Button className="w-full">ルーティンを作成</Button>
    </div>
  )
}