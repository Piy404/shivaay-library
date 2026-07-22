import express from 'express';
import User from '../models/User.js';
import Fee from '../models/Fee.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const activeStudents = await User.countDocuments({ role: 'student', status: 'active' });
    
    // Get fees collected this month
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const feesThisMonth = await Fee.find({ month: currentMonth, status: 'paid' });
    const totalCollection = feesThisMonth.reduce((acc, fee) => acc + fee.amount, 0);

    const pendingFeesCount = await Fee.countDocuments({ month: currentMonth, status: 'pending' });

    res.json({
      totalStudents,
      activeMemberships: activeStudents,
      totalCollection,
      pendingFeesCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get all students
// @route   GET /api/admin/students
router.get('/students', protect, admin, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
