'use client'

import * as React from 'react'
import { Button } from '@/components/_generated/ui/button'
import { Input } from '@/components/_generated/ui/input'
import { Label } from '@/components/_generated/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/_generated/ui/card'

export function UserSettingsScreen() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">ユーザー設定</h1>
      <Card>
        <CardHeader>
          <CardTitle>プロフィール設定</CardTitle>
          <CardDescription>あなたの個人情報を更新します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">名前</Label>
            <Input id="name" placeholder="山田 太郎" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input id="email" type="email" placeholder="example@example.com" />
          </div>
        </CardContent>
        <CardFooter>
          <Button>保存</Button>
        </CardFooter>
      </Card>
    </div>
  )
} 