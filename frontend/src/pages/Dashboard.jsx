import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

const statusStyles = {
  'Sehat': 'border-income text-income',
  'Cukup Sehat': 'border-gold text-gold',
  'Perlu Perhatian': 'border-expense text-expense',
  'Kritis': 'border-expense text-expense',
  'Belum Ada Data': 'border-ink/30 text-ink/50',
}

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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink/60">Memuat data...</div>
  if (error) return <div className="min-h-screen flex items-center justify-center text-expense">{error}</div>

  const chartData = [
    { name: 'Pemasukan', jumlah: summary.totalIncome, color: '#15803D' },
    { name: 'Pengeluaran', jumlah: summary.totalExpense, color: '#B91C1C' },
  ]

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-8 sm:px-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Halo, {user?.name} 👋</h1>
          <p className="text-sm text-ink/50">{user?.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/reports" className="px-4 py-2 rounded-lg border border-ink/15 text-sm font-medium text-ink hover:bg-ink/5 transition-colors">
            Lihat Laporan
          </Link>
          <Link to="/transactions" className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors">
            Kelola Transaksi
          </Link>
          <button onClick={logout} className="px-4 py-2 rounded-lg border border-ink/15 text-sm font-medium text-ink/60 hover:bg-ink/5 transition-colors">
            Keluar
          </button>
        </div>
      </div>

      {/* RINGKASAN */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-2xl p-5 border-l-4 border-income shadow-sm">
          <p className="text-xs text-ink/50 uppercase tracking-wide">Total Pemasukan</p>
          <p className="font-mono text-2xl font-bold text-income mt-1">Rp {summary.totalIncome.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border-l-4 border-expense shadow-sm">
          <p className="text-xs text-ink/50 uppercase tracking-wide">Total Pengeluaran</p>
          <p className="font-mono text-2xl font-bold text-expense mt-1">Rp {summary.totalExpense.toLocaleString('id-ID')}</p>
        </div>
        <div className={`bg-white rounded-2xl p-5 border-l-4 shadow-sm ${summary.balance >= 0 ? 'border-income' : 'border-expense'}`}>
          <p className="text-xs text-ink/50 uppercase tracking-wide">Saldo</p>
          <p className={`font-mono text-2xl font-bold mt-1 ${summary.balance >= 0 ? 'text-income' : 'text-expense'}`}>
            Rp {summary.balance.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* CHART + SKOR */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-ink/10">
          <p className="text-sm font-medium text-ink mb-3">Pemasukan vs Pengeluaran</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" fontSize={12} stroke="#1E2333" strokeOpacity={0.4} />
              <YAxis fontSize={12} stroke="#1E2333" strokeOpacity={0.4} />
              <Tooltip formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`} />
              <Bar dataKey="jumlah" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-ink/10 flex flex-col">
          <p className="text-sm font-medium text-ink mb-3">Skor Kesehatan Keuangan</p>
          <div className="flex items-center gap-3 mb-3">
            <span className="font-display text-4xl font-semibold text-ink">{healthScore.score}</span>
            <span className={`stamp-badge ${statusStyles[healthScore.status] || 'border-ink/30 text-ink/50'}`}>
              {healthScore.status}
            </span>
          </div>
          <p className="text-sm text-ink/60">{healthScore.message}</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard