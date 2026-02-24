'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PlusCircle, Trash2 } from 'lucide-react'

const ACCOUNT_TYPES: Record<string, string> = {
    ASSET: '資産',
    LIABILITY: '負債',
    EQUITY: '純資産',
    REVENUE: '収益',
    EXPENSE: '費用',
}

type Account = {
    id: string
    name: string
    type: string
}

type EntryRow = {
    id: string
    categoryId: string
    accountId: string
    amount: string
    isDebit: boolean
}

export type JournalEditData = {
    id?: string
    date: string
    description: string
    entries: {
        accountId: string
        amount: number
        isDebit: boolean
        categoryId?: string // Account type like 'ASSET'
    }[]
}

export default function JournalForm({ accounts, initialData }: { accounts: Account[], initialData?: JournalEditData }) {
    const router = useRouter()

    const groupedAccounts = accounts.reduce((acc, account) => {
        if (!acc[account.type]) {
            acc[account.type] = []
        }
        acc[account.type].push(account)
        return acc
    }, {} as Record<string, Account[]>)

    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0])
    const [description, setDescription] = useState(initialData?.description || '')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    // Initialize entries based on initialData or default to 1 empty row each
    const initDebit = initialData?.entries.filter(e => e.isDebit).map(e => ({
        id: crypto.randomUUID(),
        categoryId: e.categoryId || accounts.find(a => a.id === e.accountId)?.type || '',
        accountId: e.accountId,
        amount: String(e.amount),
        isDebit: true
    })) || [{ id: crypto.randomUUID(), categoryId: '', accountId: '', amount: '', isDebit: true }]

    const initCredit = initialData?.entries.filter(e => !e.isDebit).map(e => ({
        id: crypto.randomUUID(),
        categoryId: e.categoryId || accounts.find(a => a.id === e.accountId)?.type || '',
        accountId: e.accountId,
        amount: String(e.amount),
        isDebit: false
    })) || [{ id: crypto.randomUUID(), categoryId: '', accountId: '', amount: '', isDebit: false }]

    const [debitEntries, setDebitEntries] = useState<EntryRow[]>(initDebit)
    const [creditEntries, setCreditEntries] = useState<EntryRow[]>(initCredit)

    const addDebitRow = () => {
        setDebitEntries([...debitEntries, { id: crypto.randomUUID(), categoryId: '', accountId: '', amount: '', isDebit: true }])
    }

    const removeDebitRow = (id: string) => {
        if (debitEntries.length > 1) {
            setDebitEntries(debitEntries.filter(e => e.id !== id))
        }
    }

    const addCreditRow = () => {
        setCreditEntries([...creditEntries, { id: crypto.randomUUID(), categoryId: '', accountId: '', amount: '', isDebit: false }])
    }

    const removeCreditRow = (id: string) => {
        if (creditEntries.length > 1) {
            setCreditEntries(creditEntries.filter(e => e.id !== id))
        }
    }

    const updateEntry = (
        entries: EntryRow[],
        setEntries: (e: EntryRow[]) => void,
        id: string,
        field: keyof EntryRow,
        value: string
    ) => {
        setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e))
    }

    const updateEntryCategory = (
        entries: EntryRow[],
        setEntries: (e: EntryRow[]) => void,
        id: string,
        categoryId: string
    ) => {
        setEntries(entries.map(e => e.id === id ? { ...e, categoryId, accountId: '' } : e))
    }

    const debitTotal = debitEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    const creditTotal = creditEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    const isBalanced = debitTotal === creditTotal && debitTotal > 0

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!isBalanced) {
            setError('借方と貸方の合計金額が一致しません。')
            return
        }

        if (!description) {
            setError('摘要を入力してください。')
            return
        }

        const allEntries = [...debitEntries, ...creditEntries]
        if (allEntries.some(e => !e.accountId || !e.amount)) {
            setError('勘定科目と金額をすべて入力してください。')
            return
        }

        setIsSubmitting(true)

        try {
            const isEdit = !!initialData?.id
            const url = isEdit ? `/api/journals/${initialData.id}` : '/api/journals'
            const method = isEdit ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    description,
                    entries: allEntries.map(e => ({
                        accountId: e.accountId,
                        amount: Number(e.amount),
                        isDebit: e.isDebit
                    }))
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to submit')
            }

            router.push('/journals')
            router.refresh()
        } catch (err: any) {
            setError(err.message)
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
                    {error}
                </div>
            )}

            <Card>
                <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">取引日</Label>
                            <Input
                                type="date"
                                id="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">摘要（取引内容）</Label>
                            <Input
                                id="description"
                                placeholder="例: パソコン購入、売上等"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                {/* 借方 (Debit) */}
                <Card>
                    <div className="bg-blue-50/50 border-b px-6 py-3 font-semibold text-blue-900 rounded-t-xl">
                        借方 (Debit) - 資産の増加/費用の発生
                    </div>
                    <CardContent className="pt-6 space-y-4">
                        {debitEntries.map((entry, index) => (
                            <div key={entry.id} className="flex gap-2 items-start">
                                <div className="w-32 space-y-2">
                                    {index === 0 && <Label>分類</Label>}
                                    <Select value={entry.categoryId} onValueChange={v => updateEntryCategory(debitEntries, setDebitEntries, entry.id, v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="分類" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map(type => (
                                                <SelectItem key={type} value={type}>{ACCOUNT_TYPES[type]}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1 space-y-2">
                                    {index === 0 && <Label>勘定科目</Label>}
                                    <Select value={entry.accountId} onValueChange={v => updateEntry(debitEntries, setDebitEntries, entry.id, 'accountId', v)} disabled={!entry.categoryId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="科目を選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {entry.categoryId && groupedAccounts[entry.categoryId]?.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-32 space-y-2">
                                    {index === 0 && <Label>金額</Label>}
                                    <Input type="number" min="0" value={entry.amount} onChange={e => updateEntry(debitEntries, setDebitEntries, entry.id, 'amount', e.target.value)} />
                                </div>
                                {debitEntries.length > 1 && (
                                    <div className={index === 0 ? "pt-8" : "pt-2"}>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeDebitRow(entry.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addDebitRow} className="mt-2">
                            <PlusCircle className="h-4 w-4 mr-2" />
                            借方行を追加
                        </Button>
                    </CardContent>
                </Card>

                {/* 貸方 (Credit) */}
                <Card>
                    <div className="bg-red-50/50 border-b px-6 py-3 font-semibold text-red-900 rounded-t-xl">
                        貸方 (Credit) - 負債の増加/収益の発生/資産の減少
                    </div>
                    <CardContent className="pt-6 space-y-4">
                        {creditEntries.map((entry, index) => (
                            <div key={entry.id} className="flex gap-2 items-start">
                                <div className="w-32 space-y-2">
                                    {index === 0 && <Label>分類</Label>}
                                    <Select value={entry.categoryId} onValueChange={v => updateEntryCategory(creditEntries, setCreditEntries, entry.id, v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="分類" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map(type => (
                                                <SelectItem key={type} value={type}>{ACCOUNT_TYPES[type]}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1 space-y-2">
                                    {index === 0 && <Label>勘定科目</Label>}
                                    <Select value={entry.accountId} onValueChange={v => updateEntry(creditEntries, setCreditEntries, entry.id, 'accountId', v)} disabled={!entry.categoryId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="科目を選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {entry.categoryId && groupedAccounts[entry.categoryId]?.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-32 space-y-2">
                                    {index === 0 && <Label>金額</Label>}
                                    <Input type="number" min="0" value={entry.amount} onChange={e => updateEntry(creditEntries, setCreditEntries, entry.id, 'amount', e.target.value)} />
                                </div>
                                {creditEntries.length > 1 && (
                                    <div className={index === 0 ? "pt-8" : "pt-2"}>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeCreditRow(entry.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addCreditRow} className="mt-2">
                            <PlusCircle className="h-4 w-4 mr-2" />
                            貸方行を追加
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center justify-between bg-slate-50 p-4 border rounded-lg">
                <div className="flex space-x-8 text-lg">
                    <div>
                        借方合計: <span className="font-bold text-blue-700">{debitTotal.toLocaleString()}</span>
                    </div>
                    <div>
                        貸方合計: <span className="font-bold text-red-700">{creditTotal.toLocaleString()}</span>
                    </div>
                </div>
                {!isBalanced && (debitTotal > 0 || creditTotal > 0) && (
                    <div className="text-red-500 font-bold">
                        貸借が一致していません（差額: {Math.abs(debitTotal - creditTotal).toLocaleString()}円）
                    </div>
                )}
            </div>

            <div className="flex justify-end space-x-4">
                <Button variant="outline" type="button" onClick={() => router.back()}>
                    キャンセル
                </Button>
                <Button type="submit" disabled={!isBalanced || isSubmitting}>
                    {isSubmitting ? '保存中...' : '仕訳を登録する'}
                </Button>
            </div>
        </form>
    )
}
