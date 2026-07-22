import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import api from '../utils/api'

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

function Report() {
  const [preset, setPreset] = useState('thisMonth')
  const [range, setRange] = useState(getPresetRange('thisMonth'))
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
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
      const [summaryRes, txRes] = await Promise.all([
        api.get('/transactions/summary', { params }),
        api.get('/transactions', { params }),
      ])
      setSummary(summaryRes.data)
      setTransactions(txRes.data)
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
        map[name] = (map[name] || 0) + Number(t.amount)
      })
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
  }

  const expenseBreakdown = breakdown('expense')
  const incomeBreakdown = breakdown('income')

  if (loading && !summary) return <div style={styles.center}>Memuat laporan...</div>

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <Link to="/dashboard" style={styles.backLink}>&larr; Kembali ke Dashboard</Link>
        <h1>Laporan Laba-Rugi</h1>
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
}

export default Report