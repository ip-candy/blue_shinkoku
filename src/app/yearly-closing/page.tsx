'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export default function YearlyClosingPage() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    // We assume the year selector sets a cookie;
    // For simplicity of execution, we can ask user for year, but it's better to fetch current year from server via an action or prop.
    // However since it's a client component let's just use the current browser's selectedYear cookie implicitly or ask user.
    // To make it robust, we'll let user type or confirm the year.
    const [targetYear, setTargetYear] = useState(new Date().getFullYear())

    const executeClosing = async () => {
        if (!confirm(`${targetYear}年度の締め処理を実行します。よろしいですか？\n※既に翌年度の期首残高がある場合は上書きされます。`)) {
            return
        }

        setIsSubmitting(true)
        setSuccessMessage('')
        setErrorMessage('')

        try {
            const res = await fetch('/api/yearly-closing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year: targetYear })
            })

            const data = await res.json()
            if (res.ok) {
                setSuccessMessage(`${targetYear}年度の締め処理が完了しました。${data.nextYear}年度の期首残高が作成されました。`)
                router.refresh()
            } else {
                setErrorMessage(data.error || '締め処理に失敗しました')
            }
        } catch (e: any) {
            setErrorMessage(e.message || '通信エラーが発生しました')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold">年次繰越（締め処理）</h2>

            <Card>
                <CardHeader>
                    <CardTitle>年度締めの実行</CardTitle>
                    <CardDescription>
                        指定した年度の各勘定科目の最終残高を計算し、次年度の「期首残高」として引き継ぎます。
                        また、当期純利益を「元入金」に自動で振り替えます。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <label className="font-semibold w-24">対象年度:</label>
                        <input
                            type="number"
                            className="border p-2 rounded-md w-32 focus:outline-blue-500"
                            value={targetYear}
                            onChange={(e) => setTargetYear(parseInt(e.target.value) || new Date().getFullYear())}
                        />
                        <span className="text-muted-foreground">年度</span>
                    </div>

                    {successMessage && (
                        <div className="p-4 bg-green-50 text-green-800 rounded-md flex items-center">
                            <CheckCircle2 className="w-5 h-5 mr-2" />
                            {successMessage}
                        </div>
                    )}

                    {errorMessage && (
                        <div className="p-4 bg-red-50 text-red-800 rounded-md flex items-center">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            {errorMessage}
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={executeClosing} disabled={isSubmitting} className="w-full">
                        {isSubmitting ? '処理中...' : `${targetYear}年度を締めて次年度へ繰越`}
                    </Button>
                </CardFooter>
            </Card>

            <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-900 leading-relaxed border border-blue-100">
                <h3 className="font-bold flex items-center mb-2"><AlertCircle className="w-4 h-4 mr-1" /> この処理で実行されること</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li>対象年度の資産・負債・純資産（元入金以外）の期末残高が、次年度の「期首残高」として記録されます。</li>
                    <li>対象年度の収益と費用の差額（当期純利益・純損失）が計算され、次年度の「元入金」に加算（減算）されます。</li>
                    <li>収益・費用・ダミー科目は翌年度へ残高が引き継がれず、0からのスタートになります。</li>
                </ul>
            </div>
        </div>
    )
}
