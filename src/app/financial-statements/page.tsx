import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAccountYear } from '@/app/actions/year'
import { getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// 勘定科目名からその年度の残高を取得するヘルパー
function getBalance(accountBalances: Record<string, number>, accounts: any[], name: string): number {
    const acc = accounts.find(a => a.name === name)
    if (!acc) return 0
    return accountBalances[acc.id] || 0
}

export default async function FinancialStatementsPage() {
    const user = await getUser()
    if (!user) redirect('/login')

    const currentYear = await getAccountYear()
    const accounts = await prisma.account.findMany({
        where: { userId: user.id },
        orderBy: { type: 'asc' }
    })

    const journals = await prisma.journal.findMany({
        where: {
            userId: user.id,
            date: {
                gte: new Date(`${currentYear}-01-01T00:00:00Z`),
                lt: new Date(`${currentYear + 1}-01-01T00:00:00Z`)
            }
        },
        include: { entries: true }
    })

    const openingBalances = await prisma.openingBalance.findMany({
        where: { userId: user.id, year: currentYear }
    })

    // Calculate balances per account
    const accountBalances: Record<string, number> = {}
    accounts.forEach(acc => accountBalances[acc.id] = 0)

    function isBalanceSheetType(type: string | undefined) {
        return type === 'ASSET' || type === 'LIABILITY' || type === 'EQUITY'
    }

    // 期首残高の反映（B/S科目のみ）
    openingBalances.forEach(obs => {
        const acc = accounts.find(a => a.id === obs.accountId)
        if (acc && isBalanceSheetType(acc.type)) {
            const isPositiveDebit = acc.type === 'ASSET'
            const isIncrease = (isPositiveDebit && obs.isDebit) || (!isPositiveDebit && !obs.isDebit)
            if (isIncrease) {
                accountBalances[obs.accountId] += obs.amount
            } else {
                accountBalances[obs.accountId] -= obs.amount
            }
        }
    })

    journals.forEach(journal => {
        journal.entries.forEach(entry => {
            const account = accounts.find(a => a.id === entry.accountId)
            if (!account) return
            const isPositiveDebit = account.type === 'ASSET' || account.type === 'EXPENSE'
            const isIncrease = (isPositiveDebit && entry.isDebit) || (!isPositiveDebit && !entry.isDebit)
            if (isIncrease) {
                accountBalances[account.id] += entry.amount
            } else {
                accountBalances[account.id] -= entry.amount
            }
        })
    })

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP').format(amount)
    }

    const gb = (name: string) => getBalance(accountBalances, accounts, name)

    // ============ 損益計算書の計算 ============

    // ① 売上(収入)金額 = 売上高 + 雑収入
    const v01 = gb('売上高') + gb('雑収入')

    // ②③ 売上原価
    const v02 = 0                     // ② 期首商品棚卸高（手入力想定、現在0）
    const v03 = gb('仕入高')           // ③ 仕入金額
    const v04 = v02 + v03             // ④ 小計
    const v05 = 0                     // ⑤ 期末商品棚卸高（手入力想定、現在0）
    const v06 = v04 - v05             // ⑥ 差引原価
    const v07 = v01 - v06             // ⑦ 差引金額

    // ⑧〜㉛ 経費
    const v08 = gb('租税公課')
    const v09 = gb('荷造運賃')
    const v10 = gb('水道光熱費')
    const v11 = gb('旅費交通費')
    const v12 = gb('通信費')
    const v13 = gb('広告宣伝費')
    const v14 = gb('接待交際費')
    const v15 = gb('損害保険料')
    const v16 = gb('修繕費')
    const v17 = gb('消耗品費')
    const v18 = gb('減価償却費')
    const v19 = gb('福利厚生費')
    const v20 = gb('給料賃金')
    const v21 = gb('外注工賃')
    const v22 = gb('利子割引料')
    const v23 = gb('地代家賃')
    const v24 = gb('貸倒金')
    // ㉕〜㉚: 空欄（ユーザー追加用、将来対応）
    const v25 = gb('支払手数料')
    const v31 = gb('雑費')

    // ㉜ 経費計
    const v32 = v08 + v09 + v10 + v11 + v12 + v13 + v14 + v15 + v16 + v17 + v18 + v19 + v20 + v21 + v22 + v23 + v24 + v25 + v31

    // ㉝ 差引金額 (⑦ - ㉜)
    const v33 = v07 - v32

    // 右列: 繰戻額等（現在は0）
    const v38 = 0  // ㊲ 繰戻額 計
    const v43 = gb('専従者給与') // ㊳ 専従者給与
    const v47 = v43  // ㊷ 繰入額等 計 (簡易: 専従者給与のみ)

    // ㊸ 青色申告特別控除前の所得金額
    const v48 = v33 + v38 - v47

    // ㊹ 青色申告特別控除額
    const v49 = 650000

    // ㊺ 所得金額
    const v50 = v48 - v49

    // ============ B/S (貸借対照表) ============
    const assetAccounts = accounts.filter(a => a.type === 'ASSET')
    const liabilityAccounts = accounts.filter(a => a.type === 'LIABILITY')
    const equityAccounts = accounts.filter(a => a.type === 'EQUITY')

    const totalAssets = assetAccounts.reduce((sum, acc) => sum + accountBalances[acc.id], 0)
    const totalLiabilities = liabilityAccounts.reduce((sum, acc) => sum + accountBalances[acc.id], 0)
    const totalEquityBase = equityAccounts.reduce((sum, acc) => sum + accountBalances[acc.id], 0)

    const netIncome = v01 - v06 - v32
    const totalEquityAndIncome = totalEquityBase + netIncome

    // 行コンポーネント用のスタイル
    const rowClass = "flex justify-between items-center py-1.5 px-3 text-sm"
    const labelClass = "flex items-center gap-1"
    const numBadge = "inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full bg-slate-200 text-slate-700 flex-shrink-0"
    const amountClass = "font-mono text-right tabular-nums"
    const subtotalRowClass = "flex justify-between items-center py-2 px-3 text-sm font-bold bg-slate-50 border-t border-b"

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">青色申告決算書（損益計算書）</h2>
                <span className="text-muted-foreground text-sm">令和{currentYear - 2018}年分 （自１月１日　至１２月３１日）</span>
            </div>

            {/* ======== 損益計算書 ======== */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* === 左列：売上・売上原価 === */}
                <Card>
                    <CardHeader className="bg-blue-50 border-b py-3">
                        <CardTitle className="text-base">売上（収入）・売上原価</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 divide-y">
                        <div className={`${rowClass} bg-blue-50/30`}>
                            <div className={labelClass}><span className={numBadge}>①</span>売上(収入)金額</div>
                            <div className={amountClass}>{formatCurrency(v01)}</div>
                        </div>

                        <div className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-slate-50">売上原価</div>

                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>②</span>期首商品棚卸高</div>
                            <div className={amountClass}>{formatCurrency(v02)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>③</span>仕入金額</div>
                            <div className={amountClass}>{formatCurrency(v03)}</div>
                        </div>
                        <div className={subtotalRowClass}>
                            <div className={labelClass}><span className={numBadge}>④</span>小計(②+③)</div>
                            <div className={amountClass}>{formatCurrency(v04)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>⑤</span>期末商品棚卸高</div>
                            <div className={amountClass}>{formatCurrency(v05)}</div>
                        </div>
                        <div className={subtotalRowClass}>
                            <div className={labelClass}><span className={numBadge}>⑥</span>差引原価(④-⑤)</div>
                            <div className={amountClass}>{formatCurrency(v06)}</div>
                        </div>
                        <div className="flex justify-between items-center py-3 px-3 text-sm font-bold bg-blue-50 border-t-2 border-blue-200">
                            <div className={labelClass}><span className={`${numBadge} bg-blue-600 text-white`}>⑦</span>差引金額(①-⑥)</div>
                            <div className={`${amountClass} text-blue-700 text-base`}>{formatCurrency(v07)}</div>
                        </div>
                    </CardContent>
                </Card>

                {/* === 中央列：経費 === */}
                <Card>
                    <CardHeader className="bg-red-50 border-b py-3">
                        <CardTitle className="text-base">経費</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 divide-y">
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>⑧</span>租税公課</div>
                            <div className={amountClass}>{formatCurrency(v08)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>⑨</span>荷造運賃</div>
                            <div className={amountClass}>{formatCurrency(v09)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>⑩</span>水道光熱費</div>
                            <div className={amountClass}>{formatCurrency(v10)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>⑪</span>旅費交通費</div>
                            <div className={amountClass}>{formatCurrency(v11)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>⑫</span>通信費</div>
                            <div className={amountClass}>{formatCurrency(v12)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>⑬</span>広告宣伝費</div>
                            <div className={amountClass}>{formatCurrency(v13)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>⑭</span>接待交際費</div>
                            <div className={amountClass}>{formatCurrency(v14)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>⑮</span>損害保険料</div>
                            <div className={amountClass}>{formatCurrency(v15)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>⑯</span>修繕費</div>
                            <div className={amountClass}>{formatCurrency(v16)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>⑰</span>消耗品費</div>
                            <div className={amountClass}>{formatCurrency(v17)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>⑱</span>減価償却費</div>
                            <div className={amountClass}>{formatCurrency(v18)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>⑲</span>福利厚生費</div>
                            <div className={amountClass}>{formatCurrency(v19)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>⑳</span>給料賃金</div>
                            <div className={amountClass}>{formatCurrency(v20)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>㉑</span>外注工賃</div>
                            <div className={amountClass}>{formatCurrency(v21)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>㉒</span>利子割引料</div>
                            <div className={amountClass}>{formatCurrency(v22)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>㉓</span>地代家賃</div>
                            <div className={amountClass}>{formatCurrency(v23)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>㉔</span>貸倒金</div>
                            <div className={amountClass}>{formatCurrency(v24)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>㉕</span>支払手数料</div>
                            <div className={amountClass}>{formatCurrency(v25)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>㉛</span>雑費</div>
                            <div className={amountClass}>{formatCurrency(v31)}</div>
                        </div>

                        <div className={subtotalRowClass}>
                            <div className={labelClass}><span className={numBadge}>㉜</span>経費計</div>
                            <div className={`${amountClass} text-red-700`}>{formatCurrency(v32)}</div>
                        </div>

                        <div className="flex justify-between items-center py-3 px-3 text-sm font-bold bg-red-50 border-t-2 border-red-200">
                            <div className={labelClass}><span className={`${numBadge} bg-red-600 text-white`}>㉝</span>差引金額(⑦-㉜)</div>
                            <div className={`${amountClass} text-base`}>{formatCurrency(v33)}</div>
                        </div>
                    </CardContent>
                </Card>

                {/* === 右列：繰戻額等 → 所得金額 === */}
                <Card>
                    <CardHeader className="bg-emerald-50 border-b py-3">
                        <CardTitle className="text-base">各種引当金・所得金額</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 divide-y">
                        <div className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-slate-50">繰戻額等</div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>㉞</span>貸倒引当金</div>
                            <div className={amountClass}>0</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>㉟</span></div>
                            <div className={amountClass}>-</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>㊱</span></div>
                            <div className={amountClass}>-</div>
                        </div>
                        <div className={subtotalRowClass}>
                            <div className={labelClass}><span className={numBadge}>㊲</span>繰戻額等 計</div>
                            <div className={amountClass}>{formatCurrency(v38)}</div>
                        </div>

                        <div className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-slate-50">繰入額等</div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>㊳</span>専従者給与</div>
                            <div className={amountClass}>{formatCurrency(v43)}</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>㊴</span>貸倒引当金</div>
                            <div className={amountClass}>0</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>㊵</span></div>
                            <div className={amountClass}>-</div>
                        </div>
                        <div className={rowClass}>
                            <div className={labelClass}><span className={numBadge}>㊶</span></div>
                            <div className={amountClass}>-</div>
                        </div>
                        <div className={subtotalRowClass}>
                            <div className={labelClass}><span className={numBadge}>㊷</span>繰入額等 計</div>
                            <div className={amountClass}>{formatCurrency(v47)}</div>
                        </div>

                        <div className="py-1" />

                        <div className="flex justify-between items-center py-2.5 px-3 text-sm font-bold bg-amber-50 border-t">
                            <div className={labelClass}><span className={`${numBadge} bg-amber-600 text-white`}>㊸</span>
                                <span className="text-xs leading-tight">青色申告特別控除前<br />の所得金額(㉝+㊲-㊷)</span>
                            </div>
                            <div className={amountClass}>{formatCurrency(v48)}</div>
                        </div>

                        <div className="flex justify-between items-center py-2.5 px-3 text-sm bg-amber-50/50">
                            <div className={labelClass}><span className={`${numBadge} bg-amber-500 text-white`}>㊹</span>青色申告特別控除額</div>
                            <div className={amountClass}>{formatCurrency(v49)}</div>
                        </div>

                        <div className={`flex justify-between items-center py-3 px-3 font-bold border-t-2 border-emerald-300 ${v50 >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                            <div className={labelClass}><span className={`${numBadge} ${v50 >= 0 ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>㊺</span>
                                <span className="text-base">所得金額(㊸-㊹)</span>
                            </div>
                            <div className={`${amountClass} text-lg`}>{formatCurrency(v50)}</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ======== 貸借対照表 (B/S) ======== */}
            <Card>
                <CardHeader className="bg-slate-50 border-b">
                    <CardTitle>貸借対照表 (B/S)</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid gap-8 md:grid-cols-2">
                        {/* 資産の部 */}
                        <div>
                            <h3 className="font-semibold text-lg text-indigo-700 border-b pb-2 mb-3">資産の部</h3>
                            <div className="space-y-2">
                                {assetAccounts.map(acc => (
                                    <div key={acc.id} className="flex justify-between ml-4">
                                        <span>{acc.name}</span>
                                        <span>{formatCurrency(accountBalances[acc.id])}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between font-bold pt-2 border-t mt-2">
                                    <span>資産合計</span>
                                    <span>{formatCurrency(totalAssets)}</span>
                                </div>
                            </div>
                        </div>

                        {/* 負債・純資産の部 */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-lg text-amber-700 border-b pb-2 mb-3">負債の部</h3>
                                <div className="space-y-2">
                                    {liabilityAccounts.map(acc => (
                                        <div key={acc.id} className="flex justify-between ml-4">
                                            <span>{acc.name}</span>
                                            <span>{formatCurrency(accountBalances[acc.id])}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between font-bold pt-2 border-t mt-2">
                                        <span>負債合計</span>
                                        <span>{formatCurrency(totalLiabilities)}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-emerald-700 border-b pb-2 mb-3">純資産の部</h3>
                                <div className="space-y-2">
                                    {equityAccounts.map(acc => (
                                        <div key={acc.id} className="flex justify-between ml-4">
                                            <span>{acc.name}</span>
                                            <span>{formatCurrency(accountBalances[acc.id])}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between ml-4 mt-2 text-muted-foreground">
                                        <span>(当期純利益)</span>
                                        <span>{formatCurrency(netIncome)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold pt-2 border-t mt-2">
                                        <span>純資産合計</span>
                                        <span>{formatCurrency(totalEquityAndIncome)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-md bg-slate-100 font-bold text-lg">
                                <span>負債・純資産合計</span>
                                <span>{formatCurrency(totalLiabilities + totalEquityAndIncome)}</span>
                            </div>
                            {totalAssets !== (totalLiabilities + totalEquityAndIncome) && (
                                <p className="text-red-500 text-sm font-bold mt-2">※貸借不一致エラー：資産合計と負債・純資産合計が一致していません</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
