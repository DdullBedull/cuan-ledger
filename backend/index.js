import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import categoryRoutes from './routes/categories.js'
import transactionRoutes from './routes/transactions.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

// Route tes, buat mastiin frontend & backend udah nyambung
app.get('/api/ping', (req, res) => {
  res.json({ message: 'Backend nyala!' })
})

app.use('/api/auth', authRoutes)

app.use('/api/categories', categoryRoutes)

app.use('/api/transactions', transactionRoutes)

app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`)
})
