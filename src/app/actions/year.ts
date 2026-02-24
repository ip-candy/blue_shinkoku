'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function setAccountYear(year: string) {
    const cookieStore = await cookies()
    cookieStore.set('selectedYear', year, { path: '/' })

    // ページ全体をリフレッシュして新しい年度のデータを取得し直す
    revalidatePath('/', 'layout')
}

export async function getAccountYear(): Promise<number> {
    const cookieStore = await cookies()
    const yearStr = cookieStore.get('selectedYear')?.value
    if (yearStr) {
        return parseInt(yearStr, 10)
    }
    return new Date().getFullYear()
}
