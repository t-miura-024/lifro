'use client'

import * as React from 'react'
import { Dumbbell } from 'lucide-react'

import { Button } from '@/components/_generated/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/_generated/ui/card'
import { Input } from '@/components/_generated/ui/input'
import { Label } from '@/components/_generated/ui/label'

export function LoginScreen() {
  const handleGoogleLogin = () => {
    // Googleログイン処理をここに実装
    console.log('Googleログインが呼び出されました')
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[350px]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl flex items-center justify-center">
            <Dumbbell className="mr-2 h-6 w-6" />
            筋トレ記録アプリ
          </CardTitle>
          <CardDescription>
            アカウントにログインしてください
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button variant="outline" onClick={handleGoogleLogin}>
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
            </svg>
            Googleでログイン
          </Button>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground text-center w-full">
            ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます。
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}