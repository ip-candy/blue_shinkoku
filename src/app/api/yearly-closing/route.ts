import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/supabase/server'

export async function POST(req: Request) {
    try {
        const user = await getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const targetYear = parseInt(body.year, 10)

        if (!targetYear) {
            return NextResponse.json({ error: 'Year is required' }, { status: 400 })
        }

        const nextYear = targetYear + 1

        // 1. Get all accounts for user
        const accounts = await prisma.account.findMany({ where: { userId: user.id } })

        // 2. Get all journals for the target year for user
        const journals = await prisma.journal.findMany({
            where: {
                userId: user.id,
                date: {
                    gte: new Date(`${targetYear}-01-01T00:00:00Z`),
                    lt: new Date(`${targetYear + 1}-01-01T00:00:00Z`)
                }
            },
            include: { entries: true }
        })

        // 3. Get Opening Balances for the target year for user
        const openingBalances = await prisma.openingBalance.findMany({
            where: { userId: user.id, year: targetYear }
        })

        // 4. Calculate Net Balances per account for the target year
        const accountBalances: Record<string, { amount: number, isDebit: boolean }> = {}

        // Initialize with 0
        accounts.forEach(acc => {
            const isAssetOrExpense = acc.type === 'ASSET' || acc.type === 'EXPENSE'
            accountBalances[acc.id] = { amount: 0, isDebit: isAssetOrExpense }
        })

        // Apply opening balances
        openingBalances.forEach(ob => {
            const acc = accountBalances[ob.accountId]
            if (acc.isDebit === ob.isDebit) {
                acc.amount += ob.amount
            } else {
                acc.amount -= ob.amount
            }
        })

        // Apply journals
        journals.forEach(journal => {
            journal.entries.forEach(entry => {
                const accInfo = accountBalances[entry.accountId]
                if (!accInfo) return

                if (accInfo.isDebit === entry.isDebit) {
                    accInfo.amount += entry.amount
                } else {
                    accInfo.amount -= entry.amount
                }
            })
        })

        // 5. Calculate Net Income
        let totalRevenue = 0
        let totalExpense = 0

        accounts.forEach(acc => {
            const accInfo = accountBalances[acc.id]
            // If amount went negative, it flipped its normal balance side
            let finalAmount = accInfo.amount
            let finalIsDebit = accInfo.isDebit
            if (finalAmount < 0) {
                finalAmount = Math.abs(finalAmount)
                finalIsDebit = !finalIsDebit
            }

            if (acc.type === 'REVENUE') {
                totalRevenue += (finalIsDebit ? -finalAmount : finalAmount)
            } else if (acc.type === 'EXPENSE') {
                totalExpense += (finalIsDebit ? finalAmount : -finalAmount)
            }
        })

        const netIncome = totalRevenue - totalExpense

        // 6. Find Equity Account (元入金) to add Net Income
        const equityAccount = accounts.find(a => a.type === 'EQUITY' && a.name.includes('元入金'))
        if (equityAccount) {
            const eqInfo = accountBalances[equityAccount.id]
            // Net income is usually a Credit increase to Equity.
            if (netIncome > 0) {
                if (!eqInfo.isDebit) eqInfo.amount += netIncome
                else eqInfo.amount -= netIncome
            } else if (netIncome < 0) {
                if (eqInfo.isDebit) eqInfo.amount += Math.abs(netIncome)
                else eqInfo.amount -= Math.abs(netIncome)
            }
        }

        // 7. Write Opening Balances for Next Year (Only for ASSET, LIABILITY, EQUITY)
        await prisma.$transaction(async (tx: any) => {
            // Check if already exists, if so delete to override
            await tx.openingBalance.deleteMany({
                where: { userId: user.id, year: nextYear }
            })

            for (const acc of accounts) {
                if (acc.type !== 'ASSET' && acc.type !== 'LIABILITY' && acc.type !== 'EQUITY') {
                    continue // Skip Revenue and Expense (zeroed out)
                }

                let finalAmount = accountBalances[acc.id].amount
                let finalIsDebit = accountBalances[acc.id].isDebit

                if (finalAmount < 0) {
                    finalAmount = Math.abs(finalAmount)
                    finalIsDebit = !finalIsDebit
                }

                // If balance is 0, we could skip it, but let's record 0 just in case.

                await tx.openingBalance.create({
                    data: {
                        userId: user.id,
                        year: nextYear,
                        accountId: acc.id,
                        amount: finalAmount,
                        isDebit: finalIsDebit
                    }
                })
            }
        })

        return NextResponse.json({ success: true, nextYear })

    } catch (error: any) {
        console.error('Annual closing failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
