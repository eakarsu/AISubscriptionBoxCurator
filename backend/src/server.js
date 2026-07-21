require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// Validate required env vars at startup
if ((process.env.JWT_SECRET || '').length < 32 || !process.env.GOVERNANCE_TENANT_ID || !process.env.DATABASE_URL) throw new Error('JWT_SECRET (32+ characters), GOVERNANCE_TENANT_ID, and DATABASE_URL are required');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const subscriptionBoxRoutes = require('./routes/subscriptionBoxes');
const productRoutes = require('./routes/products');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const feedbackRoutes = require('./routes/feedback');
const auth = require('./middleware/auth');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3001;
const generatedRoutesEnabled = process.env.ENABLE_GENERATED_FEATURES === 'true' && process.env.NODE_ENV !== 'production';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes - public
app.use('/api/auth', authRoutes);

// Routes - protected with auth
app.use('/api/subscription-boxes', auth, subscriptionBoxRoutes);
app.use('/api/products', auth, productRoutes);
app.use('/api/customers', auth, customerRoutes);
app.use('/api/orders', auth, orderRoutes);
app.use('/api/feedback', auth, feedbackRoutes);
if (generatedRoutesEnabled) app.use('/api/ai', auth, require('./routes/ai'));

app.use('/api/governed-subscription-fulfillment', require('./governance'));
app.use('/api/governance', require('./governance'));

app.use('/api/custom-views', auth, require('./routes/customViews'));

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
