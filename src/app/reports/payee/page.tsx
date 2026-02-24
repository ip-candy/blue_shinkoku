import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getAccountYear } from '@/app/actions/year'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PayeeReportPage() {
    const user = await getUser()
    if (!user) redirect('/login')

    const currentYear = await getAccountYear()

    // 1. 集計対象とする主な経費科目を定義（決算書の2〜3ページ目で内訳が求められる代表的なもの）
    const targetAccountNames = ['給料賃金', '地代家賃', '外注工賃', '修繕費', '専従者給与']

    // 2. 対象となる勘定科目IDを取得
    const accounts = await prisma.account.findMany({
        where: {
            userId: user.id,
            name: { in: targetAccountNames }
        }
    })

    const accountMap = new Map()
    accounts.forEach(acc => accountMap.set(acc.id, acc))
    const accountIds = Array.from(accountMap.keys())

    // 3. 指定年度の全仕訳のうち、対象勘定科目を含むものを取得
    const journals = await prisma.journal.findMany({
        where: {
            userId: user.id,
            date: {
                gte: new Date(`${currentYear}-01-01T00:00:00Z`),
                lt: new Date(`${currentYear + 1}-01-01T00:00:00Z`)
            },
            entries: {
                some: {
                    accountId: { in: accountIds }
                }
            }
        },
        include: { entries: true },
        orderBy: { date: 'asc' }
    })

    // 4. 科目ごと・摘要（支払先）ごとに金額を集計
    // 構造: { '勘定科目名': { '支払先名': 金額 } }
    const payeeData: Record<string, Record<string, number>> = {}

    targetAccountNames.forEach(name => {
        payeeData[name] = {}
    })

    journals.forEach(journal => {
        // "摘要" を支払先として扱う。未入力の場合は "不明(摘要なし)" とする。
        const payee = journal.description ? journal.description.trim() : '不明 (摘要なし)'

        journal.entries.forEach(entry => {
            const account = accountMap.get(entry.accountId)
            if (!account) return

            // 経費なので借方(Debit)が増加
            const amount = entry.isDebit ? entry.amount : -entry.amount

            if (payeeData[account.name]) {
                if (!payeeData[account.name][payee]) {
                    payeeData[account.name][payee] = 0
                }
                payeeData[account.name][payee] += amount
            }
        })
    })

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">支払先別内訳レポート</h2>

            <p className="text-muted-foreground">
                確定申告時（青色申告決算書の2〜3ページ目）に記入が必要な「給料賃金」「地代家賃」などの内訳（相手先別の年間支払額）を、仕訳の**「摘要」**欄に入力されたテキストごとに集計して表示します。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {targetAccountNames.map(accountName => {
                    const payees = payeeData[accountName]
                    const payeeEntries = Object.entries(payees).filter(([_, amount]) => amount !== 0)

                    // 合計金額を計算
                    const totalAmount = payeeEntries.reduce((sum, [_, amount]) => sum + amount, 0)

                    return (
                        <Card key={accountName} className="flex flex-col h-full">
                            <CardHeader className="bg-slate-50 border-b pb-4">
                                <CardTitle className="text-lg flex justify-between items-center">
                                    <span>{accountName}</span>
                                    <span className="text-sm text-slate-500 font-normal border bg-white px-2 py-1 rounded">年間合計: {formatCurrency(totalAmount)}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 flex-grow">
                                {payeeEntries.length === 0 ? (
                                    <div className="text-center text-slate-400 py-8 text-sm">
                                        対象となる取引データがありません
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>支払先 (摘要)</TableHead>
                                                <TableHead className="text-right">年間支払金額</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {payeeEntries
                                                .sort((a, b) => b[1] - a[1]) // 金額の多い順にソート
                                                .map(([payee, amount]) => (
                                                    <TableRow key={payee}>
                                                        <TableCell className="font-medium text-slate-700">{payee}</TableCell>
                                                        <TableCell className="text-right">{formatCurrency(amount)}</TableCell>
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            <div className="bg-yellow-50 p-4 rounded-md text-sm text-yellow-900 border border-yellow-200 mt-8">
                <h3 className="font-bold mb-2">⚠️ 集計の仕組みと注意点</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li>このレポートは、仕訳を入力した際の**「摘要」**欄に入力された文字を完全に一致させて集計しています。</li>
                    <li>例えば、「〇〇不動産」と「〇〇不動産(10月分)」は別の支払先として分かれて集計されます。</li>
                    <li>年間の合計を正しく算出するためには、仕訳入力時に「〇〇不動産」など、**同じ支払先には全く同じテキストを摘要に入力**することをお勧めします。</li>
                </ul>
            </div>
        </div>
    )
}
