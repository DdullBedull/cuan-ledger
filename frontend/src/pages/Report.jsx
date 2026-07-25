import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from 'recharts'
import api from '../utils/api'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'

function getTodayISO() {
  return new Date().toISOString().slice(0, 10)
}

function getPresetRange(preset) {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (preset === 'thisMonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { startDate: toISO(start), endDate: getTodayISO() }
  }
  if (preset === 'lastMonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return { startDate: toISO(start), endDate: toISO(end) }
  }
  if (preset === 'last7days') {
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    return { startDate: toISO(start), endDate: getTodayISO() }
  }
  return { startDate: '', endDate: '' }
}

function formatPeriodLabel(period, groupBy) {
  if (groupBy === 'day') {
    const d = new Date(period)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }
  const [year, month] = period.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
}

const presets = [
  { key: 'thisMonth', label: 'Bulan Ini' },
  { key: 'lastMonth', label: 'Bulan Lalu' },
  { key: 'last7days', label: '7 Hari Terakhir' },
  { key: 'all', label: 'Semua Waktu' },
]

function Report() {
  const [preset, setPreset] = useState('thisMonth')
  const [range, setRange] = useState(getPresetRange('thisMonth'))
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [trend, setTrend] = useState({ groupBy: 'day', data: [] })
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchReport = async (r) => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (r.startDate && r.endDate) {
        params.startDate = r.startDate
        params.endDate = r.endDate
      }

      const promises = [
        api.get('/transactions/summary', { params }),
        api.get('/transactions', { params }),
        api.get('/transactions/trend', { params }),
      ]
      if (params.startDate && params.endDate) {
        promises.push(api.get('/transactions/insights', { params }))
      }

      const results = await Promise.all(promises)
      setSummary(results[0].data)
      setTransactions(results[1].data)
      setTrend(results[2].data)
      setInsights(results[3] ? results[3].data.insights : [])
    } catch (err) {
      setError('Gagal ambil data laporan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport(range)
  }, [])

  const handlePresetClick = (p) => {
    setPreset(p)
    const r = getPresetRange(p)
    setRange(r)
    fetchReport(r)
  }

  const handleCustomApply = () => {
    setPreset('custom')
    fetchReport(range)
  }

  const breakdown = (type) => {
    const map = {}
    transactions
      .filter((t) => t.type === type)
      .forEach((t) => {
        const name = t.category?.name || 'Tanpa Kategori'
        if (!map[name]) {
          map[name] = { name, total: 0, budget: t.category?.budget ? Number(t.category.budget) : null }
        }
        map[name].total += Number(t.amount)
      })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }

  const expenseBreakdown = breakdown('expense')
  const incomeBreakdown = breakdown('income')

  if (loading && !summary) return <div className="min-h-screen flex items-center justify-center text-ink/60">Memuat laporan...</div>

  const handleExportPDF = () => {
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text('Laporan Laba-Rugi', 14, 20)

    doc.setFontSize(10)
    doc.setTextColor(100)
    const periodeLabel = range.startDate && range.endDate
      ? `Periode: ${range.startDate} s/d ${range.endDate}`
      : 'Periode: Semua Waktu'
    doc.text(periodeLabel, 14, 27)
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 32)

    autoTable(doc, {
      startY: 40,
      head: [['Ringkasan', 'Jumlah']],
      body: [
        ['Total Pemasukan', `Rp ${summary.totalIncome.toLocaleString('id-ID')}`],
        ['Total Pengeluaran', `Rp ${summary.totalExpense.toLocaleString('id-ID')}`],
        ['Laba / Rugi Bersih', `Rp ${summary.balance.toLocaleString('id-ID')}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [55, 48, 163] },
    })

    let nextY = doc.lastAutoTable.finalY + 12

    if (expenseBreakdown.length > 0) {
      doc.setFontSize(12)
      doc.setTextColor(0)
      doc.text('Rincian Pengeluaran per Kategori', 14, nextY)
      autoTable(doc, {
        startY: nextY + 4,
        head: [['Kategori', 'Jumlah']],
        body: expenseBreakdown.map((b) => [b.name, `Rp ${b.total.toLocaleString('id-ID')}`]),
        theme: 'grid',
        headStyles: { fillColor: [185, 28, 28] },
      })
      nextY = doc.lastAutoTable.finalY + 12
    }

    if (incomeBreakdown.length > 0) {
      doc.setFontSize(12)
      doc.text('Rincian Pemasukan per Kategori', 14, nextY)
      autoTable(doc, {
        startY: nextY + 4,
        head: [['Kategori', 'Jumlah']],
        body: incomeBreakdown.map((b) => [b.name, `Rp ${b.total.toLocaleString('id-ID')}`]),
        theme: 'grid',
        headStyles: { fillColor: [21, 128, 61] },
      })
    }

    const fileName = `laporan-laba-rugi_${range.startDate || 'semua'}_${range.endDate || 'waktu'}.pdf`
    doc.save(fileName)
  }

  const trendChartData = trend.data.map((d) => ({
    label: formatPeriodLabel(d.period, trend.groupBy),
    income: d.income,
    expense: d.expense,
  }))

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/dashboard" className="text-sm text-brand font-medium hover:underline">&larr; Kembali ke Dashboard</Link>
          <h1 className="font-display text-2xl text-ink mt-2">Laporan Laba-Rugi</h1>
        </div>
        {summary && (
          <button
            onClick={handleExportPDF}
            className="self-start px-4 py-2 rounded-lg bg-income text-white text-sm font-medium hover:bg-income/90 transition-colors"
          >
            📄 Ekspor PDF
          </button>
        )}
      </div>

      {/* FILTER */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-ink/10 mb-5">
        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePresetClick(p.key)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                preset === p.key
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-ink/70 border-ink/15 hover:bg-ink/5'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={range.startDate}
            onChange={(e) => setRange({ ...range, startDate: e.target.value })}
            className="px-3 py-1.5 rounded-lg border border-ink/15 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
          <span className="text-sm text-ink/50">sampai</span>
          <input
            type="date"
            value={range.endDate}
            onChange={(e) => setRange({ ...range, endDate: e.target.value })}
            className="px-3 py-1.5 rounded-lg border border-ink/15 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
          <button
            onClick={handleCustomApply}
            className="px-3.5 py-1.5 rounded-lg bg-ink/5 text-ink text-sm font-medium hover:bg-ink/10 transition-colors"
          >
            Terapkan
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-expense mb-4">{error}</p>}

      {summary && (
        <>
          {/* RINGKASAN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div className="bg-white rounded-2xl p-4 border-l-4 border-income shadow-sm">
              <p className="text-xs text-ink/50 uppercase tracking-wide">Total Pemasukan</p>
              <p className="font-mono text-lg font-bold text-income mt-1">Rp {summary.totalIncome.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border-l-4 border-expense shadow-sm">
              <p className="text-xs text-ink/50 uppercase tracking-wide">Total Pengeluaran</p>
              <p className="font-mono text-lg font-bold text-expense mt-1">Rp {summary.totalExpense.toLocaleString('id-ID')}</p>
            </div>
            <div className={`bg-white rounded-2xl p-4 border-l-4 shadow-sm ${summary.balance >= 0 ? 'border-income' : 'border-expense'}`}>
              <p className="text-xs text-ink/50 uppercase tracking-wide">Laba / Rugi Bersih</p>
              <p className={`font-mono text-lg font-bold mt-1 ${summary.balance >= 0 ? 'text-income' : 'text-expense'}`}>
                Rp {summary.balance.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* INSIGHT OTOMATIS */}
          {insights.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-ink/10 mb-5">
              <h3 className="font-display text-lg text-ink mb-3">💡 Insight Otomatis</h3>
              <ul className="space-y-2">
                {insights.map((text, i) => (
                  <li key={i} className="text-sm text-ink/70 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gold">
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {preset === 'all' && (
            <p className="text-sm text-ink/40 mb-5 -mt-2">
              💡 Insight otomatis muncul kalau kamu pilih periode tertentu (bukan "Semua Waktu").
            </p>
          )}

          {/* TREND CASH FLOW */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-ink/10 mb-5">
            <h3 className="font-display text-lg text-ink mb-3">
              Tren Cash Flow ({trend.groupBy === 'day' ? 'Harian' : 'Bulanan'})
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2333" strokeOpacity={0.08} />
                <XAxis dataKey="label" fontSize={12} stroke="#1E2333" strokeOpacity={0.4} />
                <YAxis fontSize={12} stroke="#1E2333" strokeOpacity={0.4} tickFormatter={(v) => `${(v / 1000).toFixed(0)}rb`} />
                <Tooltip formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`} />
                <Legend />
                <Line type="monotone" dataKey="income" name="Pemasukan" stroke="#15803D" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expense" name="Pengeluaran" stroke="#B91C1C" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* BREAKDOWN PENGELUARAN */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-ink/10 mb-5">
            <h3 className="font-display text-lg text-ink mb-3">Rincian Pengeluaran per Kategori</h3>
            {expenseBreakdown.length === 0 ? (
              <p className="text-sm text-ink/40">Tidak ada pengeluaran di periode ini.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={Math.max(100, expenseBreakdown.length * 45)}>
                  <BarChart data={expenseBreakdown} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={140} fontSize={12} stroke="#1E2333" strokeOpacity={0.5} />
                    <Tooltip formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`} />
                    <Bar dataKey="total" fill="#B91C1C" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                {expenseBreakdown.some((b) => b.budget) && (
                  <div className="mt-5 pt-5 border-t border-ink/10">
                    <p className="text-xs text-ink/40 mb-3">
                      Dibandingkan dengan budget bulanan (paling akurat kalau filter di "Bulan Ini")
                    </p>
                    {expenseBreakdown
                      .filter((b) => b.budget)
                      .map((b) => {
                        const percent = Math.min(100, Math.round((b.total / b.budget) * 100))
                        const over = b.total > b.budget
                        return (
                          <div key={b.name} className="mb-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-ink/80">{b.name}</span>
                              <span className={over ? 'text-expense font-medium' : 'text-ink/60'}>
                                <span className="font-mono">Rp {b.total.toLocaleString('id-ID')} / Rp {b.budget.toLocaleString('id-ID')}</span>
                                {over && ' ⚠️ Melebihi budget'}
                              </span>
                            </div>
                            <div className="bg-ink/10 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${over ? 'bg-expense' : 'bg-income'}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* BREAKDOWN PEMASUKAN */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-ink/10">
            <h3 className="font-display text-lg text-ink mb-3">Rincian Pemasukan per Kategori</h3>
            {incomeBreakdown.length === 0 ? (
              <p className="text-sm text-ink/40">Tidak ada pemasukan di periode ini.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(100, incomeBreakdown.length * 45)}>
                <BarChart data={incomeBreakdown} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={140} fontSize={12} stroke="#1E2333" strokeOpacity={0.5} />
                  <Tooltip formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`} />
                  <Bar dataKey="total" fill="#15803D" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Report