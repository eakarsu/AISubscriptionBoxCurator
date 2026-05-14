require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// Validate required env vars at startup
const requiredEnv = ['OPENROUTER_API_KEY', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter(k => !process.env[k]);
if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

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
const aiRoutes = require('./routes/ai');
const auth = require('./middleware/auth');
const pool = require('./db');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Init ai_results table
pool.query(`
  CREATE TABLE IF NOT EXISTS ai_results (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    endpoint VARCHAR(100),
    input_data JSONB,
    result JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(console.error);

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
app.use('/api/ai', auth, aiRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.use('/api/seasonal-demand-forecast', require('./routes/seasonalDemandForecast')); app.use('/api/unboxing-optimizer', require('./routes/unboxingOptimizer')); app.use('/api/competitor-price-monitor', require('./routes/competitorPriceMonitor')); app.use('/api/customer-ltv-predictor', require('./routes/customerLtvPredictor')); app.use('/api/preference-bandit', require('./routes/preferenceBandit')); app.use('/api/logistics-address-validator', require('./routes/logisticsAddressValidator'));

// === Batch 08 Gaps & Frontend Mounts ===
app.use('/api/gap-ai-endpoints-cover-the-curation-workflow-well', require('./routes/gapAiEndpointsCoverTheCurationWorkflowWell'));
app.use('/api/gap-no-vision-based-product-image-quality-scoring', require('./routes/gapNoVisionBasedProductImageQualityScoring'));
app.use('/api/gap-no-conversational-box-customization-chatbot', require('./routes/gapNoConversationalBoxCustomizationChatbot'));
app.use('/api/gap-no-marketing-email-sequences-for-onboarding-retention', require('./routes/gapNoMarketingEmailSequencesForOnboardingRetention'));
app.use('/api/gap-no-integrations-with-logistics-fulfillment-platforms-shippo-shipstation', require('./routes/gapNoIntegrationsWithLogisticsFulfillmentPlatformsShippoShipstation'));
app.use('/api/gap-no-referral-affiliate-tracking', require('./routes/gapNoReferralAffiliateTracking'));
app.use('/api/gap-no-pause-skip-subscription-functionality', require('./routes/gapNoPauseSkipSubscriptionFunctionality'));
app.use('/api/gap-no-gift-subscription-workflow', require('./routes/gapNoGiftSubscriptionWorkflow'));
app.use('/api/gap-no-webhooks-or-notifications', require('./routes/gapNoWebhooksOrNotifications'));
app.use('/api/gap-no-audit-logging', require('./routes/gapNoAuditLogging'));
app.use('/api/gap-no-payment-processor-integration', require('./routes/gapNoPaymentProcessorIntegration'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
