'use client'

import * as React from 'react'
import { BarChart, LineChart, PieChart } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/_generated/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/_generated/ui/card'

export function StatisticsDetailModal() {
  return (
    <Tabs defaultValue="volume" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="volume">ボリューム</TabsTrigger>
        <TabsTrigger value="progress">進捗</TabsTrigger>
        <TabsTrigger value="distribution">分布</TabsTrigger>
      </TabsList>
      <TabsContent value="volume">
        <Card>
          <CardHeader>
            <CardTitle>トレーニングボリューム</CardTitle>
            <CardDescription>週ごとの総負荷量の推移</CardDescription>
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
      {/* 他のタブコンテンツも同様に実装 */}
    </Tabs>
  )
} 