require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Routes
const jobsRouter = require('./routes/jobs');
const historyRouter = require('./routes/history');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const allowedOrigins = [
  'http://localhost:8081',
  'exp://192.168.1.100:8081',
  // Add your production domains here when deployed
];

// In production, allow Expo Go and custom schemes
if (process.env.NODE_ENV === 'production') {
  allowedOrigins.push(
    /^exp:\/\/.*$/,  // Expo Go
    /^picdo:\/\/.*$/ // Custom scheme
  );
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'rate_limit_exceeded',
    message: 'Too many requests, please try again later.'
  }
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/jobs', jobsRouter);
app.use('/history', historyRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'file_too_large',
      message: 'File size exceeds limit'
    });
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'invalid_file',
      message: 'Invalid file upload'
    });
  }
  
  res.status(500).json({
    error: 'server_error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

// Database connection
async function connectDatabase() {
  try {
    const fallbackLocal = 'mongodb://localhost:27017/picdo';
    const mongoUri = process.env.MONGODB_URI || fallbackLocal;

    // Guard: never use localhost in production
    if (process.env.NODE_ENV === 'production' && (!process.env.MONGODB_URI || mongoUri === fallbackLocal)) {
      throw new Error('MONGODB_URI is not set in production. Please configure it in your environment variables.');
    }

    console.log('🗄️  Using Mongo URI:', process.env.NODE_ENV === 'production' ? '[redacted]' : mongoUri);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Create indexes for better performance
    const Job = require('./models/Job');
    const User = require('./models/User');
    
    await Promise.all([
      Job.collection.createIndex({ userId: 1, createdAt: -1 }),
      Job.collection.createIndex({ jobId: 1 }, { unique: true }),
      Job.collection.createIndex({ userId: 1, status: 1 }),
      User.collection.createIndex({ userId: 1 }, { unique: true })
    ]);
    
    console.log('✅ Database indexes created');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

// Start server
async function startServer() {
  try {
    await connectDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 PicDo server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
