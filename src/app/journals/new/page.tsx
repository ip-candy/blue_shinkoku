import { prisma } from '@/lib/prisma'
import JournalForm from '@/components/JournalForm'
import { getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function NewJournalPage() {
    const user = await getUser()
    if (!user) redirect('/login')

    const accounts = await prisma.account.findMany({
        where: { userId: user.id },
        orderBy: [
            { type: 'asc' },
            { name: 'asc' }
        ]
    })

    // Prismaの型からプレーンなオブジェクトに変換（Client Componentに渡すため）
    const plainAccounts = accounts.map(account => ({
        id: account.id,
        name: account.name,
        type: account.type
    }))

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold">新規仕訳入力</h2>
            <JournalForm accounts={plainAccounts} />
        </div>
    )
}
