'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CalendarIcon, Plus } from 'lucide-react'

import { Button } from '@/components/_generated/ui/button'
import { Calendar } from '@/components/_generated/ui/calendar'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/_generated/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/_generated/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/_generated/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/_generated/ui/table'
import { Badge } from '@/components/_generated/ui/badge'
import { cn } from '@/lib/_generated/utils'
import { LogInputModal } from '../LogInputModal'
import { LogDetailModal } from '../LogDetailModal'

// 仮のデータ構造
interface TrainingLog {
  id: number
  date: Date
  exercises: {
    name: string
    sets: { weight: number; reps: number }[]
  }[]
  totalVolume: number
}

const sampleLogs: TrainingLog[] = [
  {
    id: 1,
    date: new Date('2023-05-01'),
    exercises: [
      {
        name: 'ベンチプレス',
        sets: [
          { weight: 80, reps: 8 },
          { weight: 80, reps: 8 },
          { weight: 80, reps: 7 },
        ],
      },
      {
        name: 'スクワット',
        sets: [
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
        ],
      },
    ],
    totalVolume: 5520,
  },
  // 他のログデータ...
]

export function LogManagementScreen() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [selectedLog, setSelectedLog] = React.useState<TrainingLog | null>(null)
  const [isInputModalOpen, setIsInputModalOpen] = React.useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false)

  const handleRowClick = (log: TrainingLog) => {
    setSelectedLog(log)
    setIsDetailModalOpen(true)
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">トレーニングログ</h1>
      
      <div className="flex justify-between items-center mb-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[240px] justify-start text-left font-normal',
                !date && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'yyyy年MM月', { locale: ja }) : <span>年月を選択</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
              locale={ja}
              fromYear={2000}
              toYear={2030}
            />
          </PopoverContent>
        </Popover>

        <Button onClick={() => setIsInputModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新しいログを追加
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>トレーニングログ一覧</CardTitle>
          <CardDescription>過去のトレーニング記録を表示します。</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日付</TableHead>
                <TableHead>トレーニング内容</TableHead>
                <TableHead>総ボリューム</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleLogs.map((log) => (
                <TableRow 
                  key={log.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(log)}
                >
                  <TableCell>{format(log.date, 'yyyy/MM/dd')}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {log.exercises.map((ex) => (
                        <Badge key={ex.name} variant="secondary">
                          {ex.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{log.totalVolume.toLocaleString()} kg</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isInputModalOpen} onOpenChange={setIsInputModalOpen}>
        <DialogContent className="overflow-y-auto max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>新しいトレーニングログ</DialogTitle>
            <DialogDescription>
              新しいトレーニングログを追加します。
            </DialogDescription>
          </DialogHeader>
          <LogInputModal />
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="overflow-y-auto max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>トレーニング詳細</DialogTitle>
            <DialogDescription>
              {selectedLog && format(selectedLog.date, 'yyyy年MM月dd日')}のトレーニング
            </DialogDescription>
          </DialogHeader>
          {selectedLog && <LogDetailModal log={selectedLog} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}