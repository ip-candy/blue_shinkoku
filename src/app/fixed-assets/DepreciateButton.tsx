'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function DepreciateButton() {
    const [isDepreciating, setIsDepreciating] = useState(false)
    const router = useRouter()

    const handleDepreciate = async () => {
        if (!confirm('本年度の減価償却費を計算し、自動で仕訳帳に登録します。よろしいですか？')) {
            return
        }

        setIsDepreciating(true)
        try {
            const res = await fetch('/api/fixed-assets/depreciate', {
                method: 'POST',
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to calculate depreciation')
            }
            alert('減価償却の仕訳が正常に完了しました！')
            router.push('/journals')
            router.refresh()
        } catch (err: any) {
            alert(`エラー: ${err.message}`)
            setIsDepreciating(false)
        }
    }

    return (
        <Button
            variant="secondary"
            onClick={handleDepreciate}
            disabled={isDepreciating}
            className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200"
        >
            {isDepreciating ? '計算中...' : '📉 本年度の減価償却を実行'}
        </Button>
    )
}
