import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import DepreciateButton from './DepreciateButton'
import { getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function FixedAssetsPage() {
    const user = await getUser()
    if (!user) redirect('/login')

    const assets = await prisma.fixedAsset.findMany({
        where: { userId: user.id },
        orderBy: { acquisitionDate: 'desc' }
    })

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
    }

    // To do a simplified straight-line depreciation display
    // Amount = Cost / UsefulLife
    const renderDepreciationRow = (asset: any) => {
        const depExpense = Math.floor(asset.acquisitionCost / asset.usefulLife)
        return (
            <TableRow key={asset.id}>
                <TableCell>{format(asset.acquisitionDate, 'yyyy/MM/dd')}</TableCell>
                <TableCell className="font-medium">{asset.name}</TableCell>
                <TableCell className="text-right">{formatCurrency(asset.acquisitionCost)}</TableCell>
                <TableCell className="text-right">{asset.usefulLife}年</TableCell>
                <TableCell className="text-right text-gray-500">
                    {formatCurrency(depExpense)} / 年
                </TableCell>
            </TableRow>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">固定資産台帳</h2>
                <div className="flex space-x-4">
                    <DepreciateButton />
                    <Link href="/fixed-assets/new">
                        <Button>＋ 新規資産登録</Button>
                    </Link>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>登録済みの固定資産一覧</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>取得日</TableHead>
                                <TableHead>資産名</TableHead>
                                <TableHead className="text-right">取得価額</TableHead>
                                <TableHead className="text-right">耐用年数</TableHead>
                                <TableHead className="text-right">年間の減価償却費(目安)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        固定資産が登録されていません。
                                    </TableCell>
                                </TableRow>
                            ) : (
                                assets.map(renderDepreciationRow)
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="bg-slate-50 border-slate-200">
                <CardContent className="pt-6 text-sm text-slate-700 space-y-2">
                    <p className="font-bold">自動減価償却機能について</p>
                    <p>
                        上の「本年度の減価償却を実行」ボタンを押すと、登録されているすべての固定資産について、
                        1年分（定額法：取得価額 ÷ 耐用年数）の減価償却費を計算し、自動で仕訳帳に記帳します。<br />
                        （借方：減価償却費 / 貸方：対象の資産勘定（直接法）または減価償却累計額）
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
