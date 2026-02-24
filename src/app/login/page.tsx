'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { AlertCircle, Mail, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
    const supabase = createClient()
    const [loginMethod, setLoginMethod] = useState<'select' | 'email'>('select')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    const handleGoogleLogin = async () => {
        setLoading(true)
        setErrorMsg('')
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })

        if (error) {
            setErrorMsg(error.message)
            setLoading(false)
        }
    }

    const handleEmailLogin = async (type: 'login' | 'signup') => {
        setLoading(true)
        setErrorMsg('')

        let result
        if (type === 'signup') {
            result = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                }
            })
            if (!result.error && result.data?.user?.identities?.length === 0) {
                setErrorMsg('このメールアドレスは既に登録されています。ログインしてください。')
                setLoading(false)
                return
            }
            if (!result.error) {
                alert('確認メールを送信しました。メール内のリンクをクリックして完了してください。')
                setLoading(false)
                return
            }
        } else {
            result = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            if (!result.error) {
                // window.location.href = '/' // Middleware should handle redirect if we refresh, but let's do it manually
                window.location.href = '/'
                return
            }
        }

        if (result.error) {
            setErrorMsg(result.error.message)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">青色申告アプリ</CardTitle>
                    <CardDescription>アカウントにログインするか、新しく作成してください</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loginMethod === 'select' ? (
                        <>
                            <Button
                                className="w-full bg-white text-slate-700 border hover:bg-slate-50 relative"
                                onClick={handleGoogleLogin}
                                disabled={loading}
                            >
                                <svg className="w-5 h-5 mr-2 absolute left-4" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Googleでログイン
                            </Button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-muted-foreground">または</span>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full relative"
                                onClick={() => setLoginMethod('email')}
                                disabled={loading}
                            >
                                <Mail className="w-5 h-5 absolute left-4" />
                                メールアドレスでログイン
                            </Button>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="email"
                                    placeholder="メールアドレス"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                />
                                <Input
                                    type="password"
                                    placeholder="パスワード"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            {errorMsg && (
                                <div className="text-sm text-red-600 bg-red-50 p-2 rounded flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-1 inline" />
                                    {errorMsg}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1"
                                    onClick={() => handleEmailLogin('login')}
                                    disabled={loading}
                                >
                                    ログイン
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => handleEmailLogin('signup')}
                                    disabled={loading}
                                >
                                    新規登録
                                </Button>
                            </div>
                            <Button
                                variant="ghost"
                                className="w-full mt-2 text-muted-foreground hover:bg-slate-100"
                                onClick={() => {
                                    setLoginMethod('select')
                                    setErrorMsg('')
                                }}
                                disabled={loading}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                戻る
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
