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
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h1>Daftar Cuan Ledger</h1>
        {error && <p style={styles.error}>{error}</p>}
        <input name="name" placeholder="Nama lengkap" value={form.name} onChange={handleChange} required style={styles.input} />
        <input name="businessName" placeholder="Nama usaha (opsional)" value={form.businessName} onChange={handleChange} style={styles.input} />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required style={styles.input} />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required style={styles.input} />
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Memproses...' : 'Daftar'}
        </button>
        <p>Sudah punya akun? <Link to="/login">Masuk di sini</Link></p>
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

export default Register