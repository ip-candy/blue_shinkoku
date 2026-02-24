import type { Metadata } from "next";
import Link from 'next/link';
import './globals.css'
import { Inter } from 'next/font/google'
import { BookOpen, LogOut } from 'lucide-react'
import YearSelector from '@/components/YearSelector'
import { getAccountYear } from '@/app/actions/year'
import { getUser } from '@/lib/supabase/server'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '青色申告アプリ',
  description: '個人事業主向けの複式簿記アプリケーション',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const currentYear = await getAccountYear()
  const user = await getUser()

  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="min-h-screen bg-slate-50">
          <header className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16 items-center">
                <div className="flex space-x-8 items-center">
                  <Link href="/" className="flex items-center text-xl font-bold text-blue-600 hover:text-blue-700">
                    <BookOpen className="mr-2" />
                    青色申告アプリ
                  </Link>
                  {user && (
                    <nav className="flex space-x-4">
                      <Link href="/journals" className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium">仕訳帳</Link>
                      <Link href="/ledger" className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium">元帳</Link>
                      <Link href="/financial-statements" className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium">青色申告決算書</Link>
                      <Link href="/fixed-assets" className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium">固定資産</Link>
                      <Link href="/reports/monthly" className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium">月別推移</Link>
                      <Link href="/reports/payee" className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium">支払先別内訳</Link>
                      <Link href="/yearly-closing" className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium">年次繰越</Link>
                    </nav>
                  )}
                </div>
                {user && (
                  <div className="flex items-center space-x-4">
                    <YearSelector currentYear={currentYear} />
                    <div className="h-6 w-px bg-slate-200" />
                    <form action="/api/auth/signout" method="post">
                      <button type="submit" className="text-slate-500 hover:text-slate-700 flex items-center text-sm font-medium">
                        <LogOut className="w-4 h-4 mr-1" />
                        ログアウト
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
