'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewFixedAssetPage() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        name: '',
        acquisitionDate: new Date().toISOString().split('T')[0],
        acquisitionCost: '',
        usefulLife: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsSubmitting(true)

        try {
            const res = await fetch('/api/fixed-assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    acquisitionCost: Number(formData.acquisitionCost),
                    usefulLife: Number(formData.usefulLife),
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to create fixed asset')
            }

            router.push('/fixed-assets')
            router.refresh()
        } catch (err: any) {
            setError(err.message)
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">新規固定資産の登録</h2>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="name">資産名（例：パソコン、営業車）</Label>
                            <Input
                                id="name"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="acquisitionDate">取得日</Label>
                            <Input
                                id="acquisitionDate"
                                type="date"
                                required
                                value={formData.acquisitionDate}
                                onChange={e => setFormData({ ...formData, acquisitionDate: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="acquisitionCost">取得価額（円）</Label>
                            <Input
                                id="acquisitionCost"
                                type="number"
                                min="0"
                                required
                                value={formData.acquisitionCost}
                                onChange={e => setFormData({ ...formData, acquisitionCost: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="usefulLife">法定耐用年数（年）</Label>
                            <Input
                                id="usefulLife"
                                type="number"
                                min="1"
                                max="100"
                                required
                                value={formData.usefulLife}
                                onChange={e => setFormData({ ...formData, usefulLife: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">国税庁の耐用年数表を参照してください（例：パソコンは4年）</p>
                        </div>

                        <div className="flex justify-end space-x-4 pt-4">
                            <Button variant="outline" type="button" onClick={() => router.back()}>
                                キャンセル
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? '登録中...' : '登録する'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
