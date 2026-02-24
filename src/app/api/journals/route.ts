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
                    include: {
                        account: true,
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        })
        return NextResponse.json(journals)
    } catch (error) {
        console.error('Failed to fetch journals', error)
        return NextResponse.json({ error: 'Failed to fetch journals' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const user = await getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { date, description, entries } = body

        if (!date || !description || !entries || !Array.isArray(entries) || entries.length === 0) {
            return NextResponse.json({ error: 'Invalid input data' }, { status: 400 })
        }

        // 借方と貸方の合計金額が一致するか（貸借一致の原則）チェック
        const debitTotal = entries.filter((e: any) => e.isDebit).reduce((sum: number, e: any) => sum + Number(e.amount), 0)
        const creditTotal = entries.filter((e: any) => !e.isDebit).reduce((sum: number, e: any) => sum + Number(e.amount), 0)

        if (debitTotal !== creditTotal) {
            return NextResponse.json({ error: '借方と貸方の合計金額が一致しません' }, { status: 400 })
        }

        // トランザクションで保存
        const journal = await prisma.journal.create({
            data: {
                userId: user.id,
                date: new Date(date),
                description,
                entries: {
                    create: entries.map((e: any) => ({
                        accountId: e.accountId,
                        amount: Number(e.amount),
                        isDebit: e.isDebit
                    }))
                }
            },
            include: {
                entries: {
                    include: {
                        account: true
                    }
                }
            }
        })

        return NextResponse.json(journal, { status: 201 })
    } catch (error) {
        console.error('Failed to create journal', error)
        return NextResponse.json({ error: 'Failed to create journal' }, { status: 500 })
    }
}
