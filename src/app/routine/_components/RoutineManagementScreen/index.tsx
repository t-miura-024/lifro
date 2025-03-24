'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/_generated/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/_generated/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/_generated/ui/dialog'
import { RoutineInputModal } from '../RoutineInputModal'
import { RoutineDetailModal } from '../RoutineDetailModal'

// 仮のデータ
const routines = [
  { id: 1, name: '上半身ルーティン', description: '上半身を鍛えるためのルーティンです。', exercises: ['ベンチプレス', 'ラットプルダウン', 'ショルダープレス'] },
  { id: 2, name: '下半身ルーティン', description: '下半身を鍛えるためのルーティンです。', exercises: ['スクワット', 'レッグプレス', 'カーフレイズ'] },
]

export function RoutineManagementScreen() {
  return (
    <div className="space-y-4">
      {routines.map(routine => (
        <Card key={routine.id}>
          <CardHeader>
            <CardTitle>{routine.name}</CardTitle>
            <CardDescription>{routine.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5">
              {routine.exercises.map((exercise) => (
                <li key={exercise}>{exercise}</li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">詳細を見る</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>ルーティン詳細</DialogTitle>
                  <DialogDescription>ルーティンの詳細情報を表示します。</DialogDescription>
                </DialogHeader>
                <RoutineDetailModal routine={routine} />
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      ))}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            新しいルーティンを追加
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しいルーティンを追加</DialogTitle>
            <DialogDescription>新しいルーティンを追加します。</DialogDescription>
          </DialogHeader>
          <RoutineInputModal />
        </DialogContent>
      </Dialog>
    </div>
  )
} 