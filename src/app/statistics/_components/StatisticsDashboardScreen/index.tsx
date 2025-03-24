'use client'

import * as React from 'react'
import { BarChart, Calendar, Dumbbell, TrendingUp, Clock } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/_generated/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/_generated/ui/tabs'
import { Button } from '@/components/_generated/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/_generated/ui/dialog'
import { StatisticsDetailModal } from '../StatisticsDetailModal'

// 仮のデータ
const weeklyData = [
  { name: '月', value: 120 },
  { name: '火', value: 150 },
  { name: '水', value: 180 },
  { name: '木', value: 140 },
  { name: '金', value: 160 },
  { name: '土', value: 200 },
  { name: '日', value: 100 },
]

export function StatisticsDashboardScreen() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="weekly">
        <TabsList>
          <TabsTrigger value="weekly">週間</TabsTrigger>
          <TabsTrigger value="monthly">月間</TabsTrigger>
          <TabsTrigger value="yearly">年間</TabsTrigger>
        </TabsList>
        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <CardTitle>週間トレーニングボリューム</CardTitle>
              <CardDescription>各曜日のトレーニングボリューム</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="h-[200px] flex items-center justify-center bg-muted">
                <BarChart className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                グラフは実際のデータに基づいて表示されます。
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        {/* 月間と年間のタブコンテンツも同様に実装 */}
      </Tabs>

      <Dialog>
        <DialogTrigger asChild>
          <Button className="mt-4">詳細統計を表示</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>詳細統計</DialogTitle>
            <DialogDescription>
              トレーニングの詳細な統計情報を表示します。
            </DialogDescription>
          </DialogHeader>
          <StatisticsDetailModal />
        </DialogContent>
      </Dialog>
    </div>
  )
} 