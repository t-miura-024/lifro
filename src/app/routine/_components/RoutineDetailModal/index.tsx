'use client'

import * as React from 'react'
import { Button } from '@/components/_generated/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/_generated/ui/card'

interface RoutineDetailModalProps {
  routine: {
    name: string
    description: string
    exercises: string[]
  }
}

export function RoutineDetailModal({ routine }: RoutineDetailModalProps) {
  return (
    <div className="space-y-4">
      <Card>
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
      </Card>
    </div>
  )
} 