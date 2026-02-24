import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getAccountYear } from '@/app/actions/year'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function MonthlyReportPage() {
    const user = await getUser()
    if (!user) redirect('/login')

    const currentYear = await getAccountYear()

    // 1. 売上高(REVENUE)と仕入高(EXPENSE)の勘定科目を取得
    const accounts = await prisma.account.findMany({
        where: {
            userId: user.id,
            type: { in: ['REVENUE', 'EXPENSE'] }
        }
    })

    const accountMap = new Map()
    accounts.forEach(acc => accountMap.set(acc.id, acc))

    // 2. 指定年度の全仕訳を取得
    const journals = await prisma.journal.findMany({
        where: {
            userId: user.id,
            date: {
                gte: new Date(`${currentYear}-01-01T00:00:00Z`),
                lt: new Date(`${currentYear + 1}-01-01T00:00:00Z`)
            }
        },
        include: { entries: true },
        orderBy: { date: 'asc' }
    })

    // 3. データ集計用の構造を準備 (1月〜12月)
    const monthlyData: Record<number, { revenue: number, expense: number }> = {}
    for (let i = 1; i <= 12; i++) {
        monthlyData[i] = { revenue: 0, expense: 0 }
    }

    // 4. 仕訳データを月別に集計
    journals.forEach(journal => {
        const month = journal.date.getMonth() + 1 // 1〜12

        journal.entries.forEach(entry => {
            const account = accountMap.get(entry.accountId)
            if (!account) return

            // 売上(REVENUE)は貸方(Credit/isDebit=false)が増加
            // 仕入(EXPENSE)は借方(Debit/isDebit=true)が増加
            if (account.type === 'REVENUE') {
                const amount = entry.isDebit ? -entry.amount : entry.amount
                monthlyData[month].revenue += amount
            } else if (account.type === 'EXPENSE') {
                const amount = entry.isDebit ? entry.amount : -entry.amount
                monthlyData[month].expense += amount
            }
        })
    })

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
    }

    // 5. 年間合計の計算
    let totalRevenue = 0
    let totalExpense = 0
    for (let i = 1; i <= 12; i++) {
        totalRevenue += monthlyData[i].revenue
        totalExpense += monthlyData[i].expense
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">月別売上・仕入レポート</h2>

            <Card>
                <CardHeader>
                    <CardTitle>{currentYear}年度 月別金額一覧</CardTitle>
                    <CardDescription>青色申告決算書の1ページ目「月別売上（収入）金額及び仕入金額」の記入に使用できます。</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[100px] text-center">月</TableHead>
                                    <TableHead className="text-right text-blue-700 font-bold">売上高 (収入)</TableHead>
                                    <TableHead className="text-right text-red-700 font-bold">仕入高 (経費合計)</TableHead>
                                    <TableHead className="text-right font-bold">差引利益額</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                                    const revenue = monthlyData[month].revenue
                                    const expense = monthlyData[month].expense
                                    const profit = revenue - expense

                                    return (
                                        <TableRow key={month}>
                                            <TableCell className="text-center font-medium">{month}月</TableCell>
                                            <TableCell className="text-right text-blue-600">
                                                {revenue !== 0 ? formatCurrency(revenue) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right text-red-600">
                                                {expense !== 0 ? formatCurrency(expense) : '-'}
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${profit > 0 ? 'text-green-600' : profit < 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                                                {profit !== 0 ? formatCurrency(profit) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                                <TableRow className="bg-slate-50 border-t-2 border-slate-200">
                                    <TableCell className="text-center font-bold">計</TableCell>
                                    <TableCell className="text-right font-bold text-blue-800">{formatCurrency(totalRevenue)}</TableCell>
                                    <TableCell className="text-right font-bold text-red-800">{formatCurrency(totalExpense)}</TableCell>
                                    <TableCell className={`text-right font-bold ${totalRevenue - totalExpense > 0 ? 'text-green-700' : 'text-orange-700'}`}>
                                        {formatCurrency(totalRevenue - totalExpense)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-900 leading-relaxed border border-blue-100">
                <h3 className="font-bold mb-2">📌 ご利用のポイント</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li>この表の「売上高」と「仕入高(経費)」を、青色申告決算書の1ページ目右側にある月別の表にそのまま書き写すことができます。</li>
                    <li>数値が0の月は「-」と表示されています。</li>
                    <li>※この一覧表では、減価償却費や期首残高の振替などは含まれず、「その月に発生した仕訳の合計（発生ベース）」のみを集計しています。</li>
                </ul>
            </div>
        </div>
    )
}
