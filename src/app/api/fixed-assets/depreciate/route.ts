import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
    try {
        const user = await getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // 会計年度をCookieから取得（YearSelectorと連動）
        const cookieStore = await cookies()
        const yearStr = cookieStore.get('selectedYear')?.value
        const currentYear = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear()

        // 重複実行チェック：同一年度の減価償却仕訳が既に存在するか確認
        const existingDepreciation = await prisma.journal.findFirst({
            where: {
                userId: user.id,
                description: { contains: `${currentYear}年度 減価償却費計上` },
                date: {
                    gte: new Date(`${currentYear}-01-01T00:00:00Z`),
                    lt: new Date(`${currentYear + 1}-01-01T00:00:00Z`)
                }
            }
        })

        if (existingDepreciation) {
            return NextResponse.json(
                { error: `${currentYear}年度の減価償却は既に計上済みです。再実行する場合は、先に既存の減価償却仕訳を削除してください。` },
                { status: 400 }
            )
        }

        const assets = await prisma.fixedAsset.findMany({ where: { userId: user.id } })

        if (assets.length === 0) {
            return NextResponse.json({ message: '登録された固定資産がありません' })
        }

        // Ensure we have "減価償却費" (Depreciation Expense) account for this user
        let depExpenseAcc = await prisma.account.findFirst({
            where: { userId: user.id, name: '減価償却費' }
        })
        if (!depExpenseAcc) {
            depExpenseAcc = await prisma.account.create({
                data: { userId: user.id, name: '減価償却費', type: 'EXPENSE', description: '固定資産の価値減少分' }
            })
        }

        // Ensure we have "減価償却累計額" (Accumulated Depreciation) account
        let accumDepAcc = await prisma.account.findFirst({
            where: { userId: user.id, name: '減価償却累計額' }
        })
        if (!accumDepAcc) {
            accumDepAcc = await prisma.account.create({
                data: { userId: user.id, name: '減価償却累計額', type: 'ASSET', description: '資産から控除される減価償却の累計' }
            })
        }

        // 償却期間チェック付きで減価償却額を計算
        let totalDepreciation = 0
        const entries: { assetName: string, amount: number, skipped?: boolean, reason?: string }[] = []

        for (const asset of assets) {
            const acquisitionYear = asset.acquisitionDate.getFullYear()
            const endYear = acquisitionYear + asset.usefulLife

            // 償却期間外（まだ取得前 or 耐用年数超過）の場合はスキップ
            if (currentYear < acquisitionYear || currentYear >= endYear) {
                entries.push({
                    assetName: asset.name,
                    amount: 0,
                    skipped: true,
                    reason: currentYear < acquisitionYear
                        ? `取得日（${acquisitionYear}年）より前の年度です`
                        : `耐用年数（${asset.usefulLife}年）を超過しています`
                })
                continue
            }

            const depAmt = Math.floor(asset.acquisitionCost / asset.usefulLife)
            totalDepreciation += depAmt
            entries.push({ assetName: asset.name, amount: depAmt })
        }

        if (totalDepreciation <= 0) {
            return NextResponse.json({
                message: `${currentYear}年度に償却対象となる資産がありません`,
                entries
            })
        }

        // Create a Journal transaction for the depreciation
        await prisma.journal.create({
            data: {
                userId: user.id,
                date: new Date(`${currentYear}-12-31T00:00:00Z`),
                description: `${currentYear}年度 減価償却費計上`,
                entries: {
                    create: [
                        {
                            accountId: depExpenseAcc.id,
                            amount: totalDepreciation,
                            isDebit: true
                        },
                        {
                            accountId: accumDepAcc.id,
                            amount: totalDepreciation,
                            isDebit: false
                        }
                    ]
                }
            }
        })

        return NextResponse.json({ success: true, year: currentYear, totalDepreciation, entries })
    } catch (error: any) {
        console.error('Depreciation error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

