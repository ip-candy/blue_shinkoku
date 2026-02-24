'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'

type MonthlyData = {
    month: string // e.g. "2026-01"
    sales: number
}

export default function MonthlySalesChart({ data }: { data: MonthlyData[] }) {
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value)

    return (
        <Card className="col-span-full mt-6">
            <CardHeader>
                <CardTitle>月別売上推移</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full mt-4">
                    {data.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            売上データがありません
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    tickFormatter={(tick) => tick.replace('-', '/')}
                                />
                                <YAxis
                                    tickFormatter={(val) => `¥${val.toLocaleString()}`}
                                    width={80}
                                />
                                <Tooltip
                                    formatter={(value: any) => [formatCurrency(Number(value)), '売上']}
                                    labelFormatter={(label: any) => typeof label === 'string' ? `${label.replace('-', '年')}月` : label}
                                />
                                <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
