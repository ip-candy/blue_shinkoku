import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET() {
    try {
        const user = await getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // 年度をCookieから取得
        const cookieStore = await cookies()
        const yearStr = cookieStore.get('selectedYear')?.value
        const currentYear = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear()

        const journals = await prisma.journal.findMany({
            where: {
                userId: user.id,
                date: {
                    gte: new Date(`${currentYear}-01-01T00:00:00Z`),
                    lt: new Date(`${currentYear + 1}-01-01T00:00:00Z`)
                }
            },
            include: {
                entries: {
                    include: { account: true }
                }
            }
        })

        const summary = {
            ASSET: 0,
            LIABILITY: 0,
            EQUITY: 0,
            REVENUE: 0,
            EXPENSE: 0,
        }

        // 全ての仕訳明細から残高を集計
        journals.forEach(journal => {
            journal.entries.forEach(entry => {
                const type = entry.account.type
                // 資産(ASSET)と費用(EXPENSE)は借方で増加
                // 負債(LIABILITY)、純資産(EQUITY)、収益(REVENUE)は貸方で増加
                const isPositiveDebit = type === 'ASSET' || type === 'EXPENSE'
                const amount = entry.isDebit
                    ? (isPositiveDebit ? entry.amount : -entry.amount)
                    : (isPositiveDebit ? -entry.amount : entry.amount)

                if (type in summary) {
                    summary[type as keyof typeof summary] += amount
                }
            })
        })

        const netIncome = summary.REVENUE - summary.EXPENSE

        return NextResponse.json({
            summary,
            netIncome,
            year: currentYear
        })
    } catch (error) {
        console.error('Failed to calculate summary', error)
        return NextResponse.json({ error: 'Failed to calculate summary' }, { status: 500 })
    }
}

