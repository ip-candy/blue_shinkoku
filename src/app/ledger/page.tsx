import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getAccountYear } from '@/app/actions/year'
import { getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function LedgerPage(props: { searchParams: Promise<{ accountId?: string }> }) {
    const user = await getUser()
    if (!user) redirect('/login')

    const currentYear = await getAccountYear()
    const searchParams = await props.searchParams
    const accountId = searchParams.accountId

    const accounts = await prisma.account.findMany({ where: { userId: user.id }, orderBy: { type: 'asc' } })

    let selectedAccount: any = null
    let entries: any[] = []
    let openingBalanceAmount = 0
    let openingBalanceDebit = true
    let hasOpeningBalance = false

    if (accountId) {
        selectedAccount = accounts.find(a => a.id === accountId)
        if (selectedAccount) {
            // Fetch opening balance
            const ob = await prisma.openingBalance.findFirst({
                where: { userId: user.id, year: currentYear, accountId }
            })
            if (ob) {
                hasOpeningBalance = true
                openingBalanceAmount = ob.amount
                openingBalanceDebit = ob.isDebit
            }

            entries = await prisma.journalEntry.findMany({
                where: {
                    accountId,
                    journal: {
                        userId: user.id,
                        date: {
                            gte: new Date(`${currentYear}-01-01T00:00:00Z`),
                            lt: new Date(`${currentYear + 1}-01-01T00:00:00Z`)
                        }
                    }
                },
                include: { journal: true },
                orderBy: { journal: { date: 'asc' } }
            })
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
    }

    // Calculate balance progression
    let currentBalance = 0
    const isPositiveDebit = selectedAccount?.type === 'ASSET' || selectedAccount?.type === 'EXPENSE'

    let startingBalance = 0
    if (hasOpeningBalance) {
        const isIncrease = (isPositiveDebit && openingBalanceDebit) || (!isPositiveDebit && !openingBalanceDebit)
        if (isIncrease) startingBalance += openingBalanceAmount
        else startingBalance -= openingBalanceAmount
    }

    currentBalance = startingBalance

    const entriesWithBalance = entries.map(entry => {
        const amount = entry.amount
        const isIncrease = (isPositiveDebit && entry.isDebit) || (!isPositiveDebit && !entry.isDebit)

        if (isIncrease) {
            currentBalance += amount
        } else {
            currentBalance -= amount
        }

        return {
            ...entry,
            balance: currentBalance
        }
    })

    // Group accounts for dropdown
    const groupedAccounts = accounts.reduce((acc, account) => {
        if (!acc[account.type]) acc[account.type] = []
        acc[account.type].push(account)
        return acc
    }, {} as Record<string, typeof accounts>)

    const ACCOUNT_TYPES: Record<string, string> = {
        ASSET: '資産', LIABILITY: '負債', EQUITY: '純資産', REVENUE: '収益', EXPENSE: '費用'
    }

    const debitHeader = isPositiveDebit ? "借方 (残高増加)" : "借方 (残高減少)"
    const creditHeader = isPositiveDebit ? "貸方 (残高減少)" : "貸方 (残高増加)"

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">総勘定元帳</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>勘定科目の選択</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(groupedAccounts).map(([type, accs]) => (
                            <div key={type} className="w-full mb-4">
                                <h3 className="font-semibold text-sm text-muted-foreground mb-2">{ACCOUNT_TYPES[type] || type}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {accs.map(acc => (
                                        <Link key={acc.id} href={`/ledger?accountId=${acc.id}`}>
                                            <Button variant={accountId === acc.id ? 'default' : 'outline'} size="sm">
                                                {acc.name}
                                            </Button>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {selectedAccount ? (
                <Card>
                    <CardHeader>
                        <CardTitle>{selectedAccount.name} の元帳</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>日付</TableHead>
                                    <TableHead>摘要</TableHead>
                                    <TableHead className="text-right">{debitHeader}</TableHead>
                                    <TableHead className="text-right">{creditHeader}</TableHead>
                                    <TableHead className="text-right">残高</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {hasOpeningBalance && (
                                    <TableRow className="bg-slate-100">
                                        <TableCell>{currentYear}/01/01</TableCell>
                                        <TableCell>期首残高</TableCell>
                                        <TableCell className="text-right text-blue-600">
                                            {openingBalanceDebit ? formatCurrency(openingBalanceAmount) : ''}
                                        </TableCell>
                                        <TableCell className="text-right text-red-600">
                                            {!openingBalanceDebit ? formatCurrency(openingBalanceAmount) : ''}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {formatCurrency(startingBalance)}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {entriesWithBalance.length === 0 && !hasOpeningBalance ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">取引データがありません</TableCell>
                                    </TableRow>
                                ) : (
                                    entriesWithBalance.map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell>{format(entry.journal.date, 'yyyy/MM/dd')}</TableCell>
                                            <TableCell>{entry.journal.description}</TableCell>
                                            <TableCell className="text-right text-blue-600">
                                                {entry.isDebit ? formatCurrency(entry.amount) : ''}
                                            </TableCell>
                                            <TableCell className="text-right text-red-600">
                                                {!entry.isDebit ? formatCurrency(entry.amount) : ''}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {formatCurrency(entry.balance)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    上のボタンから勘定科目を選択してください
                </div>
            )}
        </div>
    )
}
