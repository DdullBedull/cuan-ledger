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
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h1>Masuk ke Cuan Ledger</h1>
        {error && <p style={styles.error}>{error}</p>}
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={styles.input} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={styles.input} />
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
        <p>Belum punya akun? <Link to="/register">Daftar di sini</Link></p>
      </form>
    </div>
  )
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '320px' },
  input: { padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc' },
  button: { padding: '0.6rem', borderRadius: '6px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer' },
  error: { color: 'red', fontSize: '0.9rem' },
}

export default Login