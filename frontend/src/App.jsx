import { useEffect, useState } from 'react'
import axios from 'axios'

// URL backend. Nanti pas deploy, ganti lewat file .env (VITE_API_URL)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function App() {
  const [message, setMessage] = useState('Menghubungkan ke backend...')

  useEffect(() => {
    axios
      .get(`${API_URL}/api/ping`)
      .then((res) => setMessage(res.data.message))
      .catch(() =>
        setMessage('Gagal konek ke backend. Pastikan backend sudah jalan di port 5000.')
      )
  }, [])

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Cuan Ledger</h1>
      <p>Status backend: {message}</p>
    </div>
  )
}

export default App
