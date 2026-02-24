import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MonthlySalesChart from '@/components/MonthlySalesChart'
import { getAccountYear } from '@/app/actions/year'
import { getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { defaultAccounts } from '@/lib/defaultAccounts'

export const dynamic = 'force-dynamic'

async function getSummaryData(currentYear: number) {
  const user = await getUser()
  if (!user) redirect('/login')

  // ======= ユーザーオンボーディング（初期アカウント作成） =======
  const accountsCount = await prisma.account.count({
    where: { userId: user.id }
  })

  if (accountsCount === 0) {
    console.log(`User ${user.id} has no accounts. Provisioning default accounts...`)
    const accountsToCreate = defaultAccounts.map(acc => ({
      ...acc,
      userId: user.id
    }))
    await prisma.account.createMany({
      data: accountsToCreate
    })
  }
  // ==============================================================

  const journals = await prisma.journal.findMany({
    where: {
      userId: user.id,
      date: {
        gte: new Date(`${currentYear}-01-01T00:00:00Z`),
        lt: new Date(`${currentYear + 1}-01-01T00:00:00Z`)
      }
    },
    include: {
      entries: { include: { account: true } }
    },
    orderBy: { date: 'asc' }
  })

  // B/S科目の期首残高を取得
  const openingBalances = await prisma.openingBalance.findMany({
    where: { userId: user.id, year: currentYear },
    include: { account: true }
  })

  const summary = {
    ASSET: 0,
    LIABILITY: 0,
    EQUITY: 0,
    REVENUE: 0,
    EXPENSE: 0,
  }

  // まずは期首残高を加算（資産・負債・純資産のみ）
  openingBalances.forEach((obs: any) => {
    const type = obs.account.type
    if (type === 'ASSET' || type === 'LIABILITY' || type === 'EQUITY') {
      const isPositiveDebit = type === 'ASSET' // 負債と純資産は貸方がプラス
      const amount = obs.isDebit
        ? (isPositiveDebit ? obs.amount : -obs.amount)
        : (isPositiveDebit ? -obs.amount : obs.amount)
      summary[type as keyof typeof summary] += amount
    }
  })

  const monthlySalesMap: Record<string, number> = {}

  journals.forEach(journal => {
    const year = journal.date.getFullYear()
    const month = String(journal.date.getMonth() + 1).padStart(2, '0')
    const monthKey = `${year}-${month}`

    journal.entries.forEach(entry => {
      const type = entry.account.type
      const isPositiveDebit = type === 'ASSET' || type === 'EXPENSE'
      const amount = entry.isDebit
        ? (isPositiveDebit ? entry.amount : -entry.amount)
        : (isPositiveDebit ? -entry.amount : entry.amount)

      if (type in summary) {
        summary[type as keyof typeof summary] += amount
      }

      if (type === 'REVENUE') {
        if (!monthlySalesMap[monthKey]) monthlySalesMap[monthKey] = 0
        monthlySalesMap[monthKey] += amount
      }
    })
  })

  const monthlySales = Object.entries(monthlySalesMap)
    .map(([month, sales]) => ({ month, sales }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return {
    summary,
    monthlySales,
    netIncome: summary.REVENUE - summary.EXPENSE
  }
}

export default async function DashboardPage() {
  const currentYear = await getAccountYear()
  const { summary, monthlySales, netIncome } = await getSummaryData(currentYear)

  // B/S 貸借一致チェック: 資産 = 負債 + 純資産 + 当期純利益
  const totalAssets = summary.ASSET
  const totalLiabilitiesAndEquity = summary.LIABILITY + summary.EQUITY + netIncome

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">ダッシュボード（サマリー）</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">当期純利益</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">収益 - 費用</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">資産合計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.ASSET)}</div>
            <p className="text-xs text-muted-foreground mt-1">現在の保有資産</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">負債合計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.LIABILITY)}</div>
            <p className="text-xs text-muted-foreground mt-1">将来の支払義務</p>
          </CardContent>
        </Card>
      </div>

      <MonthlySalesChart data={monthlySales} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>損益計算書 (P/L) 概況</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between border-b pb-2">
              <span>収益 (売上など)</span>
              <span className="font-semibold">{formatCurrency(summary.REVENUE)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span>費用 (経費など)</span>
              <span className="font-semibold text-red-600">{formatCurrency(summary.EXPENSE)}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="font-bold">当期純利益</span>
              <span className="font-bold">{formatCurrency(netIncome)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>貸借対照表 (B/S) 概況</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between border-b pb-2">
              <span>資産の部 (合計)</span>
              <span className="font-semibold">{formatCurrency(totalAssets)}</span>
            </div>
            <div className="flex justify-between mt-4">
              <span className="text-sm text-muted-foreground">負債の部</span>
              <span className="text-sm">{formatCurrency(summary.LIABILITY)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">純資産の部 (元入金など)</span>
              <span className="text-sm">{formatCurrency(summary.EQUITY)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm text-muted-foreground">当期純利益</span>
              <span className="text-sm">{formatCurrency(netIncome)}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="font-bold">負債・純資産 (合計)</span>
              <span className="font-bold">{formatCurrency(totalLiabilitiesAndEquity)}</span>
            </div>

            {totalAssets !== totalLiabilitiesAndEquity && (
              <p className="text-red-500 text-xs mt-2">※貸借不一致エラーが発生しています</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
