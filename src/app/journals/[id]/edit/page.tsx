import { prisma } from '@/lib/prisma'
import JournalForm from '@/components/JournalForm'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { getUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function EditJournalPage({ params }: { params: Promise<{ id: string }> }) {
    const user = await getUser()
    if (!user) redirect('/login')

    const p = await params
    const journalId = p.id

    const customAccounts = await prisma.account.findMany({
        where: { userId: user.id },
        orderBy: { type: 'asc' }
    })

    const journal = await prisma.journal.findUnique({
        where: { id: journalId, userId: user.id },
        include: {
            entries: true
        }
    })

    if (!journal) {
        notFound()
    }

    // Format the date to YYYY-MM-DD for the date input
    const initialData = {
        id: journal.id,
        date: format(journal.date, 'yyyy-MM-dd'),
        description: journal.description,
        entries: journal.entries.map(e => ({
            accountId: e.accountId,
            amount: e.amount,
            isDebit: e.isDebit
        }))
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold">仕訳の編集</h2>
            <JournalForm accounts={customAccounts} initialData={initialData} />
        </div>
    )
}
