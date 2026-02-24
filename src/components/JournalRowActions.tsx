'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Edit, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function JournalRowActions({ journalId }: { journalId: string }) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        if (!confirm('この仕訳を削除してもよろしいですか？この操作は取り消せません。')) {
            return
        }

        setIsDeleting(true)
        try {
            const res = await fetch(`/api/journals/${journalId}`, {
                method: 'DELETE'
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to delete journal')
            }

            // Successfully deleted
            router.refresh()
        } catch (err: any) {
            alert(`エラー: ${err.message}`)
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="flex justify-end space-x-2">
            <Link href={`/journals/${journalId}/edit`}>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                    <Edit className="w-4 h-4 mr-1" />
                    編集
                </Button>
            </Link>
            <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                onClick={handleDelete}
                disabled={isDeleting}
            >
                <Trash2 className="w-4 h-4 mr-1" />
                {isDeleting ? '削除...' : '削除'}
            </Button>
        </div>
    )
}
