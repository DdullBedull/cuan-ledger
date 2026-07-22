import express from 'express'
import prisma from '../prisma/client.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware) // semua route di bawah wajib login

// GET semua kategori milik user yang login
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: req.userId },
      orderBy: { id: 'asc' },
    })
    res.json(categories)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Gagal ambil data kategori' })
  }
})

// POST bikin kategori baru
router.post('/', async (req, res) => {
  try {
    const { name, type } = req.body

    if (!name || !type) {
      return res.status(400).json({ error: 'Nama dan tipe kategori wajib diisi' })
    }
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Tipe harus income atau expense' })
    }

    const category = await prisma.category.create({
      data: { name, type, userId: req.userId },
    })
    res.status(201).json(category)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Gagal bikin kategori' })
  }
})

// DELETE kategori
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const category = await prisma.category.findUnique({ where: { id: Number(id) } })

    if (!category || category.userId !== req.userId) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan' })
    }

    await prisma.category.delete({ where: { id: Number(id) } })
    res.json({ message: 'Kategori dihapus' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Gagal hapus kategori' })
  }
})

export default router