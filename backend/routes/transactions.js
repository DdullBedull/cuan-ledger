import express from 'express'
import prisma from '../prisma/client.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// GET semua transaksi milik user (bisa difilter by rentang tanggal)
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query

    const where = { userId: req.userId }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }
    if (type) {
      where.type = type
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
    })

    res.json(transactions)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Gagal ambil data transaksi' })
  }
})

// GET ringkasan (total income, expense, saldo) — buat dashboard nanti
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const where = { userId: req.userId }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const transactions = await prisma.transaction.findMany({ where })

    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    res.json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Gagal hitung ringkasan' })
  }
})

// POST bikin transaksi baru
router.post('/', async (req, res) => {
  try {
    const { type, amount, description, date, categoryId } = req.body

    if (!type || !amount || !date || !categoryId) {
      return res.status(400).json({ error: 'Type, amount, date, dan categoryId wajib diisi' })
    }
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Tipe harus income atau expense' })
    }

    // pastiin kategori itu emang milik user ini
    const category = await prisma.category.findUnique({ where: { id: Number(categoryId) } })
    if (!category || category.userId !== req.userId) {
      return res.status(400).json({ error: 'Kategori tidak valid' })
    }

    const transaction = await prisma.transaction.create({
      data: {
        type,
        amount,
        description,
        date: new Date(date),
        userId: req.userId,
        categoryId: Number(categoryId),
      },
      include: { category: true },
    })

    res.status(201).json(transaction)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Gagal bikin transaksi' })
  }
})

// DELETE transaksi
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const transaction = await prisma.transaction.findUnique({ where: { id: Number(id) } })

    if (!transaction || transaction.userId !== req.userId) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' })
    }

    await prisma.transaction.delete({ where: { id: Number(id) } })
    res.json({ message: 'Transaksi dihapus' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Gagal hapus transaksi' })
  }
})

// GET skor kesehatan keuangan
router.get('/health-score', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const where = { userId: req.userId }

    if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) }
    }

    const transactions = await prisma.transaction.findMany({ where })

    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    // Kalau belum ada pemasukan sama sekali, gak bisa dinilai
    if (totalIncome === 0) {
      return res.json({
        score: 0,
        status: 'Belum Ada Data',
        message: 'Catat pemasukan dulu biar skor bisa dihitung',
        savingsRatio: 0,
      })
    }

    // Rasio tabungan = (pemasukan - pengeluaran) / pemasukan
    const savingsRatio = (totalIncome - totalExpense) / totalIncome

    let score, status, message

    if (savingsRatio >= 0.2) {
      score = 90
      status = 'Sehat'
      message = 'Keuangan bisnis kamu stabil, sisa kas cukup buat jaga-jaga atau ekspansi'
    } else if (savingsRatio >= 0) {
      score = 65
      status = 'Cukup Sehat'
      message = 'Pemasukan masih nutup pengeluaran, tapi sisa kas tipis. Coba tekan pengeluaran non-esensial'
    } else if (savingsRatio >= -0.2) {
      score = 40
      status = 'Perlu Perhatian'
      message = 'Pengeluaran udah lebih besar dari pemasukan. Waktunya evaluasi pos pengeluaran terbesar'
    } else {
      score = 15
      status = 'Kritis'
      message = 'Pengeluaran jauh melebihi pemasukan. Segera cari sumber pemasukan tambahan atau pangkas biaya'
    }

    res.json({
      score,
      status,
      message,
      savingsRatio: Math.round(savingsRatio * 100) / 100,
      totalIncome,
      totalExpense,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Gagal hitung skor kesehatan' })
  }
})

export default router