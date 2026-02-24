import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { getAccountYear } from '@/app/actions/year'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import JournalRowActions from '@/components/JournalRowActions'
import { getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function JournalsPage() {
    const user = await getUser()
    if (!user) redirect('/login')

    const currentYear = await getAccountYear()
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
                    account: true
                }
            }
        },
        orderBy: {
            date: 'desc'
        }
    })

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">仕訳帳 (総勘定元帳)</h2>
                <Link href="/journals/new">
                    <Button>新規仕訳入力</Button>
                </Link>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>日付</TableHead>
                            <TableHead>借方勘定</TableHead>
                            <TableHead className="text-right">借方金額</TableHead>
                            <TableHead>貸方勘定</TableHead>
                            <TableHead className="text-right">貸方金額</TableHead>
                            <TableHead>摘要</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {journals.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                    仕訳データがありません。
                                </TableCell>
                            </TableRow>
                        ) : (
                            journals.map(journal => {
                                const debitEntries = journal.entries.filter(e => e.isDebit)
                                const creditEntries = journal.entries.filter(e => !e.isDebit)

                                // 行数を借方・貸方の多い方に合わせる
                                const rowCount = Math.max(debitEntries.length, creditEntries.length)

                                return Array.from({ length: rowCount }).map((_, idx) => {
                                    const debit = debitEntries[idx]
                                    const credit = creditEntries[idx]
                                    const isFirstRow = idx === 0

                                    return (
                                        <TableRow key={`${journal.id}-${idx}`} className={isFirstRow ? 'border-t-2' : 'border-t-0'}>
                                            <TableCell>{isFirstRow ? format(journal.date, 'yyyy/MM/dd') : ''}</TableCell>
                                            <TableCell>{debit ? debit.account.name : ''}</TableCell>
                                            <TableCell className="text-right">{debit ? formatCurrency(debit.amount) : ''}</TableCell>
                                            <TableCell>{credit ? credit.account.name : ''}</TableCell>
                                            <TableCell className="text-right">{credit ? formatCurrency(credit.amount) : ''}</TableCell>
                                            <TableCell>{isFirstRow ? journal.description : ''}</TableCell>
                                            <TableCell className="text-right pr-4">
                                                {isFirstRow ? <JournalRowActions journalId={journal.id} /> : ''}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
