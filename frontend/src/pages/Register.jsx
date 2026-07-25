import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', businessName: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal registrasi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="inline-block text-3xl font-display font-semibold text-ink">Cuan Ledger</span>
          <p className="text-sm text-ink/60 mt-1">Mulai catat keuangan usahamu hari ini</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-ink/10 rounded-2xl p-6 shadow-sm">
          <h1 className="font-display text-xl text-ink mb-5">Daftar</h1>

          {error && (
            <p className="text-sm text-expense bg-expense/10 border border-expense/20 rounded-lg px-3 py-2 mb-4">
              {error}
            </p>
          )}

          <label className="block text-sm text-ink/70 mb-1">Nama lengkap</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full mb-4 px-3 py-2 rounded-lg border border-ink/15 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />

          <label className="block text-sm text-ink/70 mb-1">Nama usaha <span className="text-ink/40">(opsional)</span></label>
          <input
            name="businessName"
            value={form.businessName}
            onChange={handleChange}
            className="w-full mb-4 px-3 py-2 rounded-lg border border-ink/15 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />

          <label className="block text-sm text-ink/70 mb-1">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full mb-4 px-3 py-2 rounded-lg border border-ink/15 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />

          <label className="block text-sm text-ink/70 mb-1">Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full mb-6 px-3 py-2 rounded-lg border border-ink/15 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white font-medium rounded-lg py-2.5 hover:bg-brand/90 transition-colors disabled:opacity-60"
          >
            {loading ? 'Memproses...' : 'Daftar'}
          </button>

          <p className="text-sm text-ink/60 text-center mt-5">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-brand font-medium hover:underline">Masuk di sini</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default Register