import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/supabase/server'

export async function GET() {
    try {
        const user = await getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const accounts = await prisma.account.findMany({
            where: { userId: user.id },
            orderBy: [
                { type: 'asc' },
                { name: 'asc' }
            ]
        })
        return NextResponse.json(accounts)
    } catch (error) {
        console.error('Failed to fetch accounts', error)
        return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }
}
