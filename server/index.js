import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/student.js';
import feeRoutes from './routes/fee.js';
import adminRoutes from './routes/admin.js';
import User from './models/User.js';

dotenv.config();

// Verify security environment variables
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'secret') {
    console.error('FATAL ERROR: JWT_SECRET environment variable is not configured securely.');
    process.exit(1);
  }
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'admin') {
    console.warn('SECURITY WARNING: Using default admin password in production is highly discouraged!');
  }
}

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration - limit origins to prevent unauthorized cross-origin requests
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

// Rate Limiting to prevent Denial of Service (DoS) and Brute-force attacks
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per window
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 15, // Limit each IP to 15 login/register attempts per window
  message: { message: 'Too many authentication attempts from this IP, please try again after 15 minutes' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/admin', adminRoutes);

// Database Connection
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shivaay_library';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to local MongoDB');
  } catch (error) {
    console.log('Local MongoDB not found. Starting in-memory database for testing...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('Connected to In-Memory MongoDB at', uri);
  }

  // Seed Admin if it doesn't exist
  const adminExists = await User.findOne({ role: 'admin' });
  if (!adminExists) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
    await User.create({
      name: 'Library Admin',
      email: 'admin@shivaay.com',
      password: adminPassword,
      role: 'admin'
    });
    console.log(`Admin user seeded: admin@shivaay.com / ${process.env.ADMIN_PASSWORD ? '********' : 'admin (default password - PLEASE CHANGE)'}`);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

connectDB();
