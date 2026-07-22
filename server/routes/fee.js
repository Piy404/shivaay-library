import express from 'express';
import Fee from '../models/Fee.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get all fees (Admin)
// @route   GET /api/fees
router.get('/', protect, admin, async (req, res) => {
  try {
    const fees = await Fee.find().populate('studentId', 'name email phone seatNumber');
    res.json(fees);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get fees for a specific student
// @route   GET /api/fees/myfees
router.get('/myfees', protect, async (req, res) => {
  try {
    const fees = await Fee.find({ studentId: req.user._id });
    res.json(fees);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Add new fee record (Admin)
// @route   POST /api/fees
router.post('/', protect, admin, async (req, res) => {
  const { studentId, month, amount, status, paymentMethod } = req.body;

  try {
    const fee = await Fee.create({
      studentId,
      month,
      amount,
      status,
      paymentMethod,
      paymentDate: status === 'paid' ? Date.now() : null
    });

    const populatedFee = await Fee.findById(fee._id).populate('studentId', 'name email');
    res.status(201).json(populatedFee);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Update fee status (Admin)
// @route   PUT /api/fees/:id
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id);

    if (fee) {
      fee.status = req.body.status || fee.status;
      if (req.body.status === 'paid' && !fee.paymentDate) {
        fee.paymentDate = Date.now();
      }
      fee.paymentMethod = req.body.paymentMethod || fee.paymentMethod;

      const updatedFee = await fee.save();
      const populatedFee = await Fee.findById(updatedFee._id).populate('studentId', 'name email');
      res.json(populatedFee);
    } else {
      res.status(404).json({ message: 'Fee record not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
