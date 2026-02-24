'use client'

import { useTransition } from 'react'
import { setAccountYear } from '@/app/actions/year'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'

// 西暦→和暦変換
function toWareki(year: number): string {
    if (year >= 2019) {
        return `令和${year - 2018}年`
    } else if (year >= 1989) {
        return `平成${year - 1988}年`
    }
    return `${year}年`
}

export default function YearSelector({ currentYear }: { currentYear: number }) {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleYearChange = (year: string) => {
        startTransition(async () => {
            await setAccountYear(year)
            router.refresh()
        })
    }

    // Generate years from 2026 to 2036
    const years = Array.from({ length: 11 }, (_, i) => 2026 + i)

    return (
        <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">会計年:</span>
            <Select
                defaultValue={currentYear.toString()}
                onValueChange={handleYearChange}
                disabled={isPending}
            >
                <SelectTrigger className="w-[130px] h-8 text-sm">
                    <SelectValue placeholder="年を選択" />
                </SelectTrigger>
                <SelectContent>
                    {years.map(year => (
                        <SelectItem key={year} value={year.toString()}>
                            {toWareki(year)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
