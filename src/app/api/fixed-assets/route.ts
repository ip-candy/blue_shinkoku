import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/supabase/server'

export async function POST(req: Request) {
    try {
        const user = await getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const data = await req.json()

        const asset = await prisma.fixedAsset.create({
            data: {
                userId: user.id,
                name: data.name,
                acquisitionDate: new Date(data.acquisitionDate),
                acquisitionCost: data.acquisitionCost,
                usefulLife: data.usefulLife,
                depreciationType: 'STRAIGHT_LINE',
            }
        })

        return NextResponse.json({ success: true, asset })
    } catch (error: any) {
        console.error('Failed to create fixed asset:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
