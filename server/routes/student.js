import express from 'express';
import User from '../models/User.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Update student profile (Admin only)
// @route   PUT /api/students/:id
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const student = await User.findById(req.params.id);

    if (student && student.role === 'student') {
      student.name = req.body.name || student.name;
      student.phone = req.body.phone || student.phone;
      student.seatNumber = req.body.seatNumber || student.seatNumber;
      student.membershipPlan = req.body.membershipPlan || student.membershipPlan;
      student.status = req.body.status || student.status;

      const updatedStudent = await student.save();
      res.json(updatedStudent);
    } else {
      res.status(404).json({ message: 'Student not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Delete student (Admin only)
// @route   DELETE /api/students/:id
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (student && student.role === 'student') {
      await student.deleteOne();
      res.json({ message: 'Student removed' });
    } else {
      res.status(404).json({ message: 'Student not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
