import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'

function BudgetRow({ category, onSaved }) {
  const [value, setValue] = useState(category.budget ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch(`/categories/${category.id}`, { budget: value === '' ? null : Number(value) })
      onSaved()
    } catch (err) {
      alert('Gagal simpan budget')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="w-32 text-sm text-ink/70 shrink-0">{category.name}</span>
      <input
        type="number"
        placeholder="Rp per bulan"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 max-w-[160px] font-mono text-sm px-3 py-1.5 rounded-lg border border-ink/15 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-3 py-1.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors disabled:opacity-60"
      >
        {saving ? '...' : 'Simpan'}
      </button>
    </div>
  )
}

function Transactions() {
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [catForm, setCatForm] = useState({ name: '', type: 'expense', budget: '' })
  const [txForm, setTxForm] = useState({
    type: 'expense',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    categoryId: '',
  })

  const fetchAll = async () => {
    try {
      const [catRes, txRes] = await Promise.all([
        api.get('/categories'),
        api.get('/transactions'),
      ])
      setCategories(catRes.data)
      setTransactions(txRes.data)
    } catch (err) {
      setError('Gagal ambil data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!catForm.name) return
    try {
      await api.post('/categories', {
        name: catForm.name,
        type: catForm.type,
        budget: catForm.type === 'expense' && catForm.budget ? Number(catForm.budget) : null,
      })
      setCatForm({ name: '', type: 'expense', budget: '' })
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal tambah kategori')
    }
  }

  const handleDeleteCategory = async (id) => {
    if (!confirm('Hapus kategori ini?')) return
    try {
      await api.delete(`/categories/${id}`)
      fetchAll()
    } catch (err) {
      alert('Gagal hapus kategori (mungkin masih dipakai transaksi)')
    }
  }

  const handleAddTransaction = async (e) => {
    e.preventDefault()
    if (!txForm.amount || !txForm.categoryId) {
      alert('Jumlah dan kategori wajib diisi')
      return
    }
    try {
      await api.post('/transactions', {
        ...txForm,
        amount: Number(txForm.amount),
        categoryId: Number(txForm.categoryId),
      })
      setTxForm({ ...txForm, amount: '', description: '', categoryId: '' })
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal tambah transaksi')
    }
  }

  const handleDeleteTransaction = async (id) => {
    if (!confirm('Hapus transaksi ini?')) return
    try {
      await api.delete(`/transactions/${id}`)
      fetchAll()
    } catch (err) {
      alert('Gagal hapus transaksi')
    }
  }

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('Belum ada transaksi untuk diekspor')
      return
    }

    const headers = ['Tanggal', 'Tipe', 'Kategori', 'Keterangan', 'Jumlah']
    const rows = transactions.map((t) => [
      new Date(t.date).toLocaleDateString('id-ID'),
      t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      t.category?.name || '',
      t.description || '',
      t.amount,
    ])

    const escapeCSV = (value) => {
      const str = String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `riwayat-transaksi_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink/60">Memuat data...</div>

  const filteredCategories = categories.filter((c) => c.type === txForm.type)

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link to="/dashboard" className="text-sm text-brand font-medium hover:underline">&larr; Kembali ke Dashboard</Link>
        <h1 className="font-display text-2xl text-ink mt-2">Kelola Transaksi</h1>
      </div>

      {error && <p className="text-sm text-expense mb-4">{error}</p>}

      {/* KATEGORI */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-ink/10 mb-5">
        <h3 className="font-display text-lg text-ink mb-4">Kategori</h3>

        <div className="flex flex-wrap gap-2 mb-5">
          {categories.length === 0 && <p className="text-sm text-ink/40">Belum ada kategori. Tambah dulu di bawah.</p>}
          {categories.map((c) => (
            <span
              key={c.id}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm border ${
                c.type === 'income'
                  ? 'bg-income/10 text-income border-income/20'
                  : 'bg-expense/10 text-expense border-expense/20'
              }`}
            >
              {c.name}
              <button onClick={() => handleDeleteCategory(c.id)} className="hover:opacity-60 font-bold leading-none">&times;</button>
            </span>
          ))}
        </div>

        {categories.filter((c) => c.type === 'expense').length > 0 && (
          <div className="mb-5 pb-5 border-b border-ink/10">
            <p className="text-sm font-medium text-ink mb-3">Atur Budget Bulanan</p>
            {categories.filter((c) => c.type === 'expense').map((c) => (
              <BudgetRow key={c.id} category={c} onSaved={fetchAll} />
            ))}
          </div>
        )}

        <form onSubmit={handleAddCategory} className="flex flex-wrap gap-2">
          <input
            placeholder="Nama kategori (misal: Bahan Baku)"
            value={catForm.name}
            onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
            className="flex-1 min-w-[180px] px-3 py-2 rounded-lg border border-ink/15 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
          <select
            value={catForm.type}
            onChange={(e) => setCatForm({ ...catForm, type: e.target.value, budget: '' })}
            className="px-3 py-2 rounded-lg border border-ink/15 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          >
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </select>
          {catForm.type === 'expense' && (
            <input
              type="number"
              placeholder="Budget bulanan (opsional)"
              value={catForm.budget}
              onChange={(e) => setCatForm({ ...catForm, budget: e.target.value })}
              className="px-3 py-2 rounded-lg border border-ink/15 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
          )}
          <button type="submit" className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors">
            Tambah Kategori
          </button>
        </form>
      </div>

      {/* TAMBAH TRANSAKSI */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-ink/10 mb-5">
        <h3 className="font-display text-lg text-ink mb-4">Tambah Transaksi</h3>
        <form onSubmit={handleAddTransaction} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={txForm.type}
            onChange={(e) => setTxForm({ ...txForm, type: e.target.value, categoryId: '' })}
            className="px-3 py-2 rounded-lg border border-ink/15 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          >
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </select>
          <select
            value={txForm.categoryId}
            onChange={(e) => setTxForm({ ...txForm, categoryId: e.target.value })}
            className="px-3 py-2 rounded-lg border border-ink/15 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          >
            <option value="">Pilih kategori</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Jumlah (Rp)"
            value={txForm.amount}
            onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
            className="px-3 py-2 rounded-lg border border-ink/15 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
          <input
            type="date"
            value={txForm.date}
            onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
            className="px-3 py-2 rounded-lg border border-ink/15 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
          <input
            placeholder="Keterangan (opsional)"
            value={txForm.description}
            onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
            className="sm:col-span-2 px-3 py-2 rounded-lg border border-ink/15 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
          <button
            type="submit"
            className="sm:col-span-2 px-4 py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors"
          >
            Simpan Transaksi
          </button>
        </form>
      </div>

      {/* DAFTAR TRANSAKSI */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-ink/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-ink">Riwayat Transaksi</h3>
          {transactions.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg border border-income text-income text-sm font-medium hover:bg-income/5 transition-colors"
            >
              📊 Ekspor CSV
            </button>
          )}
        </div>
        {transactions.length === 0 ? (
          <p className="text-sm text-ink/40">Belum ada transaksi.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink/50 uppercase tracking-wide border-b border-ink/10">
                  <th className="py-2 pr-4">Tanggal</th>
                  <th className="py-2 pr-4">Tipe</th>
                  <th className="py-2 pr-4">Kategori</th>
                  <th className="py-2 pr-4">Keterangan</th>
                  <th className="py-2 pr-4">Jumlah</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-ink/5">
                    <td className="py-2.5 pr-4 whitespace-nowrap">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                    <td className="py-2.5 pr-4">
                      <span className={t.type === 'income' ? 'text-income font-medium' : 'text-expense font-medium'}>
                        {t.type === 'income' ? 'Masuk' : 'Keluar'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">{t.category?.name}</td>
                    <td className="py-2.5 pr-4 text-ink/60">{t.description || '-'}</td>
                    <td className="py-2.5 pr-4 font-mono whitespace-nowrap">Rp {Number(t.amount).toLocaleString('id-ID')}</td>
                    <td className="py-2.5">
                      <button
                        onClick={() => handleDeleteTransaction(t.id)}
                        className="px-2.5 py-1 rounded-md border border-expense/30 text-expense text-xs font-medium hover:bg-expense/5 transition-colors"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Transactions