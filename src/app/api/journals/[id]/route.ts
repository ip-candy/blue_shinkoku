import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/supabase/server'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const p = await params
        const journalId = p.id
        const data = await req.json()

        const existing = await prisma.journal.findUnique({ where: { id: journalId } })
        if (!existing || existing.userId !== user.id) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })

        // Prisma doesn't have a simple "replace all relations" without disconnect/connect if we don't know IDs.
        // Easiest is to delete all entries for this journal and recreate them within a transaction.

        await prisma.$transaction(async (tx: any) => {
            // 1. Update the Journal itself
            await tx.journal.update({
                where: { id: journalId },
                data: {
                    date: new Date(data.date),
                    description: data.description,
                }
            })

            // 2. Delete existing entries
            await tx.journalEntry.deleteMany({
                where: { journalId }
            })

            // 3. Create new entries
            for (const entry of data.entries) {
                await tx.journalEntry.create({
                    data: {
                        journalId,
                        accountId: entry.accountId,
                        amount: entry.amount,
                        isDebit: entry.isDebit
                    }
                })
            }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Failed to update journal:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const p = await params
        const journalId = p.id

        const existing = await prisma.journal.findUnique({ where: { id: journalId } })
        if (!existing || existing.userId !== user.id) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })

        // Due to onDelete: Cascade on the relation, deleting the Journal should delete its JournalEntries.
        await prisma.journal.delete({
            where: { id: journalId }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Failed to delete journal:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
