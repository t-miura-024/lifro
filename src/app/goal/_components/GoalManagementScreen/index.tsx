'use client'

import * as React from 'react'
import { Plus, Target } from 'lucide-react'

import { Button } from '@/components/_generated/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/_generated/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/_generated/ui/dialog'
import { Progress } from '@/components/_generated/ui/progress'
import { GoalInputModal } from '../GoalInputModal'
import { GoalDetailModal } from '../GoalDetailModal'

// 仮のデータ
const goals = [
  { id: 1, title: 'ベンチプレス100kg', progress: 80, target: '100kg', current: '80kg' },
  { id: 2, title: '体重80kgまで減量', progress: 60, target: '80kg', current: '85kg' },
  { id: 3, title: 'フルマラソン完走', progress: 40, target: '42.195km', current: '16km' },
]

export function GoalManagementScreen() {
  return (
    <div className="space-y-4">
      {goals.map(goal => (
        <Card key={goal.id}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-4 w-4" />
              {goal.title}
            </CardTitle>
            <CardDescription>目標: {goal.target}</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={goal.progress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              現在: {goal.current} ({goal.progress}% 達成)
            </p>
          </CardContent>
          <CardFooter>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">詳細を見る</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>目標詳細</DialogTitle>
                  <DialogDescription>目標の詳細情報を表示します。</DialogDescription>
                </DialogHeader>
                <GoalDetailModal goal={goal} />
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      ))}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            新しい目標を追加
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しい目標を設定</DialogTitle>
            <DialogDescription>新しい目標を追加します。</DialogDescription>
          </DialogHeader>
          <GoalInputModal />
        </DialogContent>
      </Dialog>
    </div>
  )
} 