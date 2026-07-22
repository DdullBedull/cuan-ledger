import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

function Dashboard() {
  const { user, logout } = useAuth()
  const [summary, setSummary] = useState(null)
  const [healthScore, setHealthScore] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        const [summaryRes, scoreRes] = await Promise.all([
          api.get('/transactions/summary'),
          api.get('/transactions/health-score'),
        ])
        setSummary(summaryRes.data)
        setHealthScore(scoreRes.data)
      } catch (err) {
        setError('Gagal ambil data. Pastikan backend jalan.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div style={styles.center}>Memuat data...</div>
  if (error) return <div style={styles.center}>{error}</div>

  const chartData = [
    { name: 'Pemasukan', jumlah: summary.totalIncome },
    { name: 'Pengeluaran', jumlah: summary.totalExpense },
  ]

  const statusColor = {
    'Sehat': '#16a34a',
    'Cukup Sehat': '#ca8a04',
    'Perlu Perhatian': '#ea580c',
    'Kritis': '#dc2626',
    'Belum Ada Data': '#6b7280',
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={{ margin: 0 }}>Halo, {user?.name} 👋</h1>
          <p style={{ margin: 0, color: '#666' }}>{user?.email}</p>
        </div>
        <div>
          <Link to="/transactions" style={styles.linkButton}>Kelola Transaksi</Link>
          <Link to="/reports" style={styles.linkButton}>Lihat Laporan</Link>
          <button onClick={logout} style={styles.logoutButton}>Keluar</button>
        </div>
      </div>

      <div style={styles.cardsRow}>
        <div style={styles.card}>
          <p style={styles.cardLabel}>Total Pemasukan</p>
          <p style={{ ...styles.cardValue, color: '#16a34a' }}>Rp {summary.totalIncome.toLocaleString('id-ID')}</p>
        </div>
        <div style={styles.card}>
          <p style={styles.cardLabel}>Total Pengeluaran</p>
          <p style={{ ...styles.cardValue, color: '#dc2626' }}>Rp {summary.totalExpense.toLocaleString('id-ID')}</p>
        </div>
        <div style={styles.card}>
          <p style={styles.cardLabel}>Saldo</p>
          <p style={{ ...styles.cardValue, color: summary.balance >= 0 ? '#16a34a' : '#dc2626' }}>
            Rp {summary.balance.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      <div style={styles.bottomRow}>
        <div style={styles.chartCard}>
          <p style={styles.cardLabel}>Pemasukan vs Pengeluaran</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`} />
              <Bar dataKey="jumlah" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.scoreCard}>
          <p style={styles.cardLabel}>Skor Kesehatan Keuangan</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{healthScore.score}</span>
            <span
              style={{
                padding: '0.3rem 0.8rem',
                borderRadius: '999px',
                background: statusColor[healthScore.status],
                color: 'white',
                fontSize: '0.85rem',
              }}
            >
              {healthScore.status}
            </span>
          </div>
          <p style={{ color: '#555', fontSize: '0.9rem' }}>{healthScore.message}</p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { padding: '2rem', maxWidth: '1000px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  linkButton: { marginRight: '0.75rem', padding: '0.5rem 1rem', background: '#2563eb', color: 'white', borderRadius: '6px', textDecoration: 'none' },
  logoutButton: { padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' },
  cardsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' },
  card: { background: '#f9fafb', border: '1px solid #eee', borderRadius: '10px', padding: '1.25rem' },
  cardLabel: { color: '#666', fontSize: '0.85rem', margin: 0 },
  cardValue: { fontSize: '1.5rem', fontWeight: 'bold', margin: '0.3rem 0 0' },
  bottomRow: { display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1rem' },
  chartCard: { background: '#f9fafb', border: '1px solid #eee', borderRadius: '10px', padding: '1.25rem' },
  scoreCard: { background: '#f9fafb', border: '1px solid #eee', borderRadius: '10px', padding: '1.25rem' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' },
}

export default Dashboard