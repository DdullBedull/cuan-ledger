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
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
      <span style={{ width: '140px' }}>{category.name}</span>
      <input
        type="number"
        placeholder="Rp per bulan"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #ccc', width: '150px' }}
      />
      <button
        onClick={handleSave}
        disabled={saving}
        style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer' }}
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

    // \uFEFF (BOM) biar Excel baca simbol "Rp" dengan benar, gak jadi karakter aneh
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `riwayat-transaksi_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div style={styles.center}>Memuat data...</div>

  const filteredCategories = categories.filter((c) => c.type === txForm.type)

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <Link to="/dashboard" style={styles.backLink}>&larr; Kembali ke Dashboard</Link>
        <h1>Kelola Transaksi</h1>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* KATEGORI */}
      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Kategori</h3>
        <div style={styles.tagRow}>
          {categories.length === 0 && <p style={{ color: '#888' }}>Belum ada kategori. Tambah dulu di bawah.</p>}
          {categories.map((c) => (
            <span key={c.id} style={{ ...styles.tag, background: c.type === 'income' ? '#dcfce7' : '#fee2e2' }}>
              {c.name}
              <button onClick={() => handleDeleteCategory(c.id)} style={styles.tagDelete}>&times;</button>
            </span>
          ))}
        </div>

        {categories.filter((c) => c.type === 'expense').length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Atur Budget Bulanan</p>
            {categories.filter((c) => c.type === 'expense').map((c) => (
              <BudgetRow key={c.id} category={c} onSaved={fetchAll} />
            ))}
          </div>
        )}

        <form onSubmit={handleAddCategory} style={styles.inlineForm}>
          <input
            placeholder="Nama kategori (misal: Bahan Baku)"
            value={catForm.name}
            onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
            style={styles.input}
          />
          <select value={catForm.type} onChange={(e) => setCatForm({ ...catForm, type: e.target.value, budget: '' })} style={styles.input}>
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </select>
          {catForm.type === 'expense' && (
            <input
              type="number"
              placeholder="Budget bulanan (opsional)"
              value={catForm.budget}
              onChange={(e) => setCatForm({ ...catForm, budget: e.target.value })}
              style={styles.input}
            />
          )}
          <button type="submit" style={styles.button}>Tambah Kategori</button>
        </form>
      </div>

      {/* TAMBAH TRANSAKSI */}
      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Tambah Transaksi</h3>
        <form onSubmit={handleAddTransaction} style={styles.txForm}>
          <select
            value={txForm.type}
            onChange={(e) => setTxForm({ ...txForm, type: e.target.value, categoryId: '' })}
            style={styles.input}
          >
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </select>
          <select
            value={txForm.categoryId}
            onChange={(e) => setTxForm({ ...txForm, categoryId: e.target.value })}
            style={styles.input}
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
            style={styles.input}
          />
          <input
            type="date"
            value={txForm.date}
            onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
            style={styles.input}
          />
          <input
            placeholder="Keterangan (opsional)"
            value={txForm.description}
            onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
            style={{ ...styles.input, gridColumn: 'span 2' }}
          />
          <button type="submit" style={styles.button}>Simpan Transaksi</button>
        </form>
      </div>

      {/* DAFTAR TRANSAKSI */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ marginTop: 0 }}>Riwayat Transaksi</h3>
          {transactions.length > 0 && (
            <button onClick={handleExportCSV} style={styles.exportButton}>📊 Ekspor CSV</button>
          )}
        </div>
        {transactions.length === 0 ? (
          <p style={{ color: '#888' }}>Belum ada transaksi.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Tanggal</th>
                <th style={styles.th}>Tipe</th>
                <th style={styles.th}>Kategori</th>
                <th style={styles.th}>Keterangan</th>
                <th style={styles.th}>Jumlah</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td style={styles.td}>{new Date(t.date).toLocaleDateString('id-ID')}</td>
                  <td style={styles.td}>
                    <span style={{ color: t.type === 'income' ? '#16a34a' : '#dc2626' }}>
                      {t.type === 'income' ? 'Masuk' : 'Keluar'}
                    </span>
                  </td>
                  <td style={styles.td}>{t.category?.name}</td>
                  <td style={styles.td}>{t.description || '-'}</td>
                  <td style={styles.td}>Rp {Number(t.amount).toLocaleString('id-ID')}</td>
                  <td style={styles.td}>
                    <button onClick={() => handleDeleteTransaction(t.id)} style={styles.deleteButton}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { padding: '2rem', maxWidth: '900px', margin: '0 auto' },
  header: { marginBottom: '1.5rem' },
  backLink: { color: '#2563eb', textDecoration: 'none' },
  card: { background: '#f9fafb', border: '1px solid #eee', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' },
  tag: { padding: '0.3rem 0.7rem', borderRadius: '999px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' },
  tagDelete: { border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' },
  inlineForm: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  txForm: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' },
  input: { padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc' },
  button: { padding: '0.6rem 1rem', borderRadius: '6px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer' },
  deleteButton: { padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #dc2626', background: 'white', color: '#dc2626', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '2px solid #ddd', padding: '0.5rem' },
  td: { borderBottom: '1px solid #eee', padding: '0.5rem' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' },
  exportButton: { padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#16a34a', color: 'white', cursor: 'pointer', fontWeight: 'bold' },
}

export default Transactions