import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="inline-block text-3xl font-display font-semibold text-ink">Cuan Ledger</span>
          <p className="text-sm text-ink/60 mt-1">Catat, pantau, dan pahami keuangan usahamu</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-ink/10 rounded-2xl p-6 shadow-sm">
          <h1 className="font-display text-xl text-ink mb-5">Masuk</h1>

          {error && (
            <p className="text-sm text-expense bg-expense/10 border border-expense/20 rounded-lg px-3 py-2 mb-4">
              {error}
            </p>
          )}

          <label className="block text-sm text-ink/70 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full mb-4 px-3 py-2 rounded-lg border border-ink/15 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />

          <label className="block text-sm text-ink/70 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full mb-6 px-3 py-2 rounded-lg border border-ink/15 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white font-medium rounded-lg py-2.5 hover:bg-brand/90 transition-colors disabled:opacity-60"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>

          <p className="text-sm text-ink/60 text-center mt-5">
            Belum punya akun?{' '}
            <Link to="/register" className="text-brand font-medium hover:underline">Daftar di sini</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default Login