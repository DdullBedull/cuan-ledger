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
  return { startDate: '', endDate: '' } // 'all'
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
      // insight cuma bisa dihitung kalau ada periode spesifik (bukan "Semua Waktu")
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

  // Breakdown per kategori
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

  if (loading && !summary) return <div style={styles.center}>Memuat laporan...</div>

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
    headStyles: { fillColor: [37, 99, 235] },
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
      headStyles: { fillColor: [220, 38, 38] },
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
      headStyles: { fillColor: [22, 163, 74] },
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
    <div style={styles.page}>
      <div style={styles.header}>
        <Link to="/dashboard" style={styles.backLink}>&larr; Kembali ke Dashboard</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>Laporan Laba-Rugi</h1>
            {summary && (
            <button onClick={handleExportPDF} style={styles.exportButton}>
                📄 Ekspor PDF
            </button>
            )}
        </div>
    </div>

      {/* FILTER */}
      <div style={styles.card}>
        <div style={styles.presetRow}>
          {[
            { key: 'thisMonth', label: 'Bulan Ini' },
            { key: 'lastMonth', label: 'Bulan Lalu' },
            { key: 'last7days', label: '7 Hari Terakhir' },
            { key: 'all', label: 'Semua Waktu' },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => handlePresetClick(p.key)}
              style={preset === p.key ? styles.presetActive : styles.presetButton}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div style={styles.customRow}>
          <input
            type="date"
            value={range.startDate}
            onChange={(e) => setRange({ ...range, startDate: e.target.value })}
            style={styles.input}
          />
          <span>sampai</span>
          <input
            type="date"
            value={range.endDate}
            onChange={(e) => setRange({ ...range, endDate: e.target.value })}
            style={styles.input}
          />
          <button onClick={handleCustomApply} style={styles.button}>Terapkan</button>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {summary && (
        <>
          {/* RINGKASAN */}
          <div style={styles.cardsRow}>
            <div style={styles.summaryCard}>
              <p style={styles.cardLabel}>Total Pemasukan</p>
              <p style={{ ...styles.cardValue, color: '#16a34a' }}>Rp {summary.totalIncome.toLocaleString('id-ID')}</p>
            </div>
            <div style={styles.summaryCard}>
              <p style={styles.cardLabel}>Total Pengeluaran</p>
              <p style={{ ...styles.cardValue, color: '#dc2626' }}>Rp {summary.totalExpense.toLocaleString('id-ID')}</p>
            </div>
            <div style={styles.summaryCard}>
              <p style={styles.cardLabel}>Laba / Rugi Bersih</p>
              <p style={{ ...styles.cardValue, color: summary.balance >= 0 ? '#16a34a' : '#dc2626' }}>
                Rp {summary.balance.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* INSIGHT */}
          {insights.length > 0 && (
            <div style={styles.card}>
              <h3 style={{ marginTop: 0 }}>💡 Insight Otomatis</h3>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {insights.map((text, i) => (
                  <li key={i} style={{ marginBottom: '0.5rem', color: '#374151' }}>{text}</li>
                ))}
              </ul>
            </div>
          )}
          {preset === 'all' && (
            <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '-0.5rem', marginBottom: '1.25rem' }}>
              💡 Insight otomatis muncul jika memilih periode tertentu (bukan "Semua Waktu").
            </p>
          )}
        
          {/* TREND CASH FLOW */}
          <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>
            Tren Cash Flow ({trend.groupBy === 'day' ? 'Harian' : 'Bulanan'})
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}rb`} />
                <Tooltip formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`} />
                <Legend />
                <Line type="monotone" dataKey="income" name="Pemasukan" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expense" name="Pengeluaran" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        

          {/* BREAKDOWN PENGELUARAN */}
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Rincian Pengeluaran per Kategori</h3>
            {expenseBreakdown.length === 0 ? (
              <p style={{ color: '#888' }}>Tidak ada pengeluaran di periode ini.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={Math.max(100, expenseBreakdown.length * 45)}>
                  <BarChart data={expenseBreakdown} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={140} />
                    <Tooltip formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`} />
                    <Bar dataKey="total" fill="#dc2626" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                {expenseBreakdown.some((b) => b.budget) && (
                  <div style={{ marginTop: '1.25rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.75rem' }}>
                      Dibandingkan dengan budget bulanan (paling akurat kalau filter di "Bulan Ini")
                    </p>
                    {expenseBreakdown
                      .filter((b) => b.budget)
                      .map((b) => {
                        const percent = Math.min(100, Math.round((b.total / b.budget) * 100))
                        const over = b.total > b.budget
                        return (
                          <div key={b.name} style={{ marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                              <span>{b.name}</span>
                              <span style={{ color: over ? '#dc2626' : '#555' }}>
                                Rp {b.total.toLocaleString('id-ID')} / Rp {b.budget.toLocaleString('id-ID')}
                                {over && ' ⚠️ Melebihi budget'}
                              </span>
                            </div>
                            <div style={{ background: '#e5e7eb', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                              <div style={{ width: `${percent}%`, background: over ? '#dc2626' : '#16a34a', height: '100%' }} />
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
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Rincian Pemasukan per Kategori</h3>
            {incomeBreakdown.length === 0 ? (
              <p style={{ color: '#888' }}>Tidak ada pemasukan di periode ini.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(100, incomeBreakdown.length * 45)}>
                <BarChart data={incomeBreakdown} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={140} />
                  <Tooltip formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`} />
                  <Bar dataKey="total" fill="#16a34a" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  page: { padding: '2rem', maxWidth: '900px', margin: '0 auto' },
  header: { marginBottom: '1.5rem' },
  backLink: { color: '#2563eb', textDecoration: 'none' },
  card: { background: '#f9fafb', border: '1px solid #eee', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' },
  presetRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' },
  presetButton: { padding: '0.5rem 1rem', borderRadius: '999px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' },
  presetActive: { padding: '0.5rem 1rem', borderRadius: '999px', border: '1px solid #2563eb', background: '#2563eb', color: 'white', cursor: 'pointer' },
  customRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  input: { padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' },
  button: { padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer' },
  cardsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' },
  summaryCard: { background: '#f9fafb', border: '1px solid #eee', borderRadius: '10px', padding: '1.25rem' },
  cardLabel: { color: '#666', fontSize: '0.85rem', margin: 0 },
  cardValue: { fontSize: '1.4rem', fontWeight: 'bold', margin: '0.3rem 0 0' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' },
  exportButton: { padding: '0.6rem 1.2rem', borderRadius: '6px', border: 'none', background: '#16a34a', color: 'white', cursor: 'pointer', fontWeight: 'bold' },
}

export default Report