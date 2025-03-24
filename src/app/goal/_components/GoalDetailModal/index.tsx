'use client'

import * as React from 'react'
import { LineChart, Target } from 'lucide-react'

import { Progress } from '@/components/_generated/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/_generated/ui/card'

export type GoalDetailModalProps = {
  goal: {
    title: string
    target: string
    progress: number
    current: number
  }
}

export function GoalDetailModal({ goal }: GoalDetailModalProps) {
  return (
    <div className="space-y-4">
      <Card>
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
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>進捗グラフ</CardTitle>
          <CardDescription>目標達成までの推移</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center bg-muted">
            <LineChart className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            グラフは実際のデータに基づいて表示されます。
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 