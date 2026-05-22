const express = require('express');
const router = express.Router();
const pool = require('../db');
const rateLimit = require('express-rate-limit');

// Rate limiter: 20 AI calls per hour per user
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user ? 'user:' + (req.user.id || req.user.userId) : req.ip,
  message: { error: 'Too many AI requests, please try again later.' },
  validate: { keyGeneratorIpFallback: false }
});

async function callOpenRouter(systemPrompt, userPrompt) {
  const response = await fetch((process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1') + '/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(30000)
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'OpenRouter API error');
  return data.choices[0].message.content;
}

function parseAIJson(content) {
  try { return JSON.parse(content); } catch {}
  try {
    const stripped = content.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();
    return JSON.parse(stripped);
  } catch {}
  try {
    const first = content.indexOf('{');
    const last = content.lastIndexOf('}');
    if (first !== -1 && last !== -1) return JSON.parse(content.slice(first, last + 1));
  } catch {}
  return null;
}

function requireKey(res) {
  if (!process.env.OPENROUTER_API_KEY) {
    res.status(503).json({ success: false, error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    return false;
  }
  return true;
}

async function persistAIResult(userId, endpoint, inputData, result) {
  try {
    await pool.query(
      'INSERT INTO ai_results (user_id, endpoint, input_data, result) VALUES ($1, $2, $3, $4)',
      [userId, endpoint, JSON.stringify(inputData), JSON.stringify(result)]
    );
  } catch (err) {
    console.error('Failed to persist AI result:', err.message);
  }
}

// 1. POST /api/ai/curate-box
router.post('/curate-box', aiRateLimiter, async (req, res) => {
  try {
    const { theme, budget, category } = req.body;
    const productsResult = await pool.query('SELECT id, name, description, price, category, rating FROM products');
    const products = productsResult.rows;

    const systemPrompt = 'You are an expert subscription box curator. Always respond with valid JSON.';
    const userPrompt = `Curate a subscription box:
- Theme: ${theme}, Budget: $${budget}, Category: ${category}

Available products: ${JSON.stringify(products, null, 2)}

Return JSON: { "selected_products": [{ "product_id": 0, "name": "", "reason": "", "price": 0 }], "total_value": 0, "theme_score": 0, "box_name": "", "curation_rationale": "" }`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(content);
    const result = parsed || { content };

    await persistAIResult(req.user?.id, 'curate-box', { theme, budget, category }, result);
    res.json({ success: true, feature: 'curate_box', result: { content, details: result } });
  } catch (err) {
    console.error('AI curate-box error:', err);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// 2. POST /api/ai/discover-products
router.post('/discover-products', aiRateLimiter, async (req, res) => {
  try {
    const { category, count } = req.body;

    const systemPrompt = 'You are a product discovery specialist. Always respond with valid JSON.';
    const userPrompt = `Suggest ${count || 5} new trending products for "${category}" subscription boxes.
Return JSON: { "products": [{ "name": "", "estimatedPrice": 0, "description": "", "whyTrending": "", "targetAudience": "", "supplierSuggestions": [] }] }`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(content);
    const result = parsed || { content };

    await persistAIResult(req.user?.id, 'discover-products', { category, count }, result);
    res.json({ success: true, feature: 'discover_products', result: { content, details: result } });
  } catch (err) {
    console.error('AI discover-products error:', err);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// 3. POST /api/ai/optimize-price
router.post('/optimize-price', aiRateLimiter, async (req, res) => {
  try {
    const { box_id, current_price, category } = req.body;

    let boxData = null;
    if (box_id) {
      const boxResult = await pool.query('SELECT * FROM subscription_boxes WHERE id = $1', [box_id]);
      boxData = boxResult.rows[0];
    }

    const ordersResult = await pool.query(
      `SELECT sb.category, sb.price, COUNT(o.id) AS order_count
       FROM subscription_boxes sb
       LEFT JOIN orders o ON sb.id = o.box_id
       GROUP BY sb.id, sb.category, sb.price`
    );

    const systemPrompt = 'You are a pricing optimization expert. Always respond with valid JSON.';
    const userPrompt = `Optimize pricing for: ${boxData ? JSON.stringify(boxData) : `Category: ${category}, Price: $${current_price}`}
Historical data: ${JSON.stringify(ordersResult.rows, null, 2)}

Return JSON: { "suggestedPrice": 0, "priceRange": { "min": 0, "max": 0 }, "competitiveAnalysis": "", "pricingStrategy": "", "expectedImpactOnSubscribers": "", "reasoning": "" }`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(content);
    const result = parsed || { content };

    await persistAIResult(req.user?.id, 'optimize-price', { box_id, current_price, category }, result);
    res.json({ success: true, feature: 'optimize_price', result: { content, details: result } });
  } catch (err) {
    console.error('AI optimize-price error:', err);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// 4. POST /api/ai/generate-theme
router.post('/generate-theme', aiRateLimiter, async (req, res) => {
  try {
    const { season, target_audience, count } = req.body;

    const systemPrompt = 'You are a creative director for subscription boxes. Always respond with valid JSON.';
    const userPrompt = `Generate ${count || 5} subscription box theme ideas.
${season ? `Season: ${season}` : ''} ${target_audience ? `Audience: ${target_audience}` : ''}

Return JSON: { "themes": [{ "themeName": "", "tagline": "", "description": "", "suggestedCategories": [], "targetDemographic": "", "estimatedPriceRange": "", "uniqueSellingPoint": "" }] }`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(content);
    const result = parsed || { content };

    await persistAIResult(req.user?.id, 'generate-theme', { season, target_audience, count }, result);
    res.json({ success: true, feature: 'generate_theme', result: { content, details: result } });
  } catch (err) {
    console.error('AI generate-theme error:', err);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// 5. POST /api/ai/write-description
router.post('/write-description', aiRateLimiter, async (req, res) => {
  try {
    const { name, category, features, tone, type } = req.body;

    const systemPrompt = 'You are a professional copywriter. Always respond with valid JSON.';
    const userPrompt = `Write a ${type || 'product'} description for: Name: ${name}, Category: ${category}, Features: ${features}, Tone: ${tone || 'engaging'}

Return JSON: { "shortDescription": "", "longDescription": "", "bulletPoints": [], "seoTitle": "", "seoMetaDescription": "" }`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(content);
    const result = parsed || { content };

    await persistAIResult(req.user?.id, 'write-description', { name, category, type }, result);
    res.json({ success: true, feature: 'write_description', result: { content, details: result } });
  } catch (err) {
    console.error('AI write-description error:', err);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// 6. POST /api/ai/analyze-feedback
router.post('/analyze-feedback', aiRateLimiter, async (req, res) => {
  try {
    const { box_id } = req.body;

    let query = `SELECT f.id, f.rating, f.comment, f.sentiment, c.name AS customer_name, sb.name AS box_name
                 FROM feedback f
                 LEFT JOIN customers c ON f.customer_id = c.id
                 LEFT JOIN subscription_boxes sb ON f.box_id = sb.id`;
    const params = [];
    if (box_id) { query += ' WHERE f.box_id = $1'; params.push(box_id); }
    query += ' ORDER BY f.created_at DESC LIMIT 50';

    const feedbackResult = await pool.query(query, params);

    const systemPrompt = 'You are a customer feedback analyst. Always respond with valid JSON.';
    const userPrompt = `Analyze feedback: ${JSON.stringify(feedbackResult.rows, null, 2)}

Return JSON: { "overallSentiment": "positive|neutral|negative", "sentimentBreakdown": { "positive": 0, "neutral": 0, "negative": 0 }, "averageRating": 0, "keyThemes": [], "topComplaints": [], "topPraises": [], "actionableInsights": [], "customerSatisfactionScore": 0, "perFeedbackSentiments": [{ "id": 0, "sentiment": "positive|neutral|negative" }] }`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(content);
    const result = parsed || { content };

    // Update sentiment column for each feedback row
    if (parsed?.perFeedbackSentiments) {
      for (const item of parsed.perFeedbackSentiments) {
        if (item.id && item.sentiment) {
          await pool.query('UPDATE feedback SET sentiment = $1 WHERE id = $2', [item.sentiment, item.id]).catch(() => {});
        }
      }
    }

    await persistAIResult(req.user?.id, 'analyze-feedback', { box_id }, result);
    res.json({ success: true, feature: 'analyze_feedback', result: { content, details: result } });
  } catch (err) {
    console.error('AI analyze-feedback error:', err);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// 7. POST /api/ai/forecast-demand
router.post('/forecast-demand', aiRateLimiter, async (req, res) => {
  try {
    const { category, months_ahead } = req.body;

    const ordersResult = await pool.query(
      `SELECT o.order_date, o.total, o.status, sb.category, sb.name AS box_name
       FROM orders o LEFT JOIN subscription_boxes sb ON o.box_id = sb.id
       ORDER BY o.order_date`
    );

    const systemPrompt = 'You are a demand forecasting analyst. Always respond with valid JSON.';
    const userPrompt = `Forecast demand for next ${months_ahead || 3} months.
Order history: ${JSON.stringify(ordersResult.rows, null, 2)}
${category ? `Focus: ${category}` : ''}

Return JSON: { "forecast": [{ "month": "", "expectedOrders": 0, "expectedRevenue": 0, "confidence": 0 }], "growthTrend": "", "seasonalFactors": [], "riskFactors": [], "recommendations": [] }`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(content);
    const result = parsed || { content };

    await persistAIResult(req.user?.id, 'forecast-demand', { category, months_ahead }, result);
    res.json({ success: true, feature: 'forecast_demand', result: { content, details: result } });
  } catch (err) {
    console.error('AI forecast-demand error:', err);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// 8. POST /api/ai/personalize-recommendations
router.post('/personalize-recommendations', aiRateLimiter, async (req, res) => {
  try {
    const { customer_id } = req.body;

    const customerResult = await pool.query('SELECT * FROM customers WHERE id = $1', [customer_id]);
    if (customerResult.rows.length === 0) return res.status(404).json({ success: false, error: 'Customer not found' });

    const [ordersResult, feedbackResult, boxesResult] = await Promise.all([
      pool.query(`SELECT o.*, sb.name AS box_name, sb.theme, sb.category FROM orders o LEFT JOIN subscription_boxes sb ON o.box_id = sb.id WHERE o.customer_id = $1`, [customer_id]),
      pool.query(`SELECT f.rating, f.comment, sb.name AS box_name, sb.category FROM feedback f LEFT JOIN subscription_boxes sb ON f.box_id = sb.id WHERE f.customer_id = $1`, [customer_id]),
      pool.query(`SELECT id, name, theme, category, price FROM subscription_boxes WHERE status = $1`, ['active'])
    ]);

    const customer = customerResult.rows[0];
    const systemPrompt = 'You are a personalization engine. Always respond with valid JSON.';
    const userPrompt = `Recommend boxes for customer: ${JSON.stringify(customer)}
Orders: ${JSON.stringify(ordersResult.rows)}
Feedback: ${JSON.stringify(feedbackResult.rows)}
Available boxes: ${JSON.stringify(boxesResult.rows)}

Return JSON: { "ranked_boxes": [{ "box_id": 0, "match_score": 0, "reasons": [] }], "customerProfile": { "interests": [], "preferences": "" }, "personalizedMessage": "" }`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(content);
    const result = parsed || { content };

    await persistAIResult(req.user?.id, 'personalize-recommendations', { customer_id }, result);
    res.json({ success: true, feature: 'personalize_recommendations', result: { content, details: result } });
  } catch (err) {
    console.error('AI personalize-recommendations error:', err);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// 9. POST /api/ai/generate-marketing
router.post('/generate-marketing', aiRateLimiter, async (req, res) => {
  try {
    const { name, description, category, target_audience, channel } = req.body;

    const systemPrompt = 'You are a marketing copywriter. Always respond with valid JSON.';
    const userPrompt = `Generate marketing for: Name: ${name}, Category: ${category}, Channel: ${channel || 'multi-channel'}

Return JSON: { "emailSubject": "", "emailBody": "", "socialMediaPost": { "instagram": "", "twitter": "", "facebook": "" }, "adHeadline": "", "adCopy": "", "callToAction": "", "hashtags": [], "landingPageHero": "" }`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(content);
    const result = parsed || { content };

    await persistAIResult(req.user?.id, 'generate-marketing', { name, category, channel }, result);
    res.json({ success: true, feature: 'generate_marketing', result: { content, details: result } });
  } catch (err) {
    console.error('AI generate-marketing error:', err);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// 10. POST /api/ai/score-quality
router.post('/score-quality', aiRateLimiter, async (req, res) => {
  try {
    let { product_name, product_description, price, category, supplier, rating, product_id } = req.body;

    if (product_id && !product_name) {
      const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
      if (productResult.rows.length > 0) {
        const p = productResult.rows[0];
        product_name = p.name; product_description = p.description;
        price = p.price; category = p.category; supplier = p.supplier; rating = p.rating;
      }
    }

    const systemPrompt = 'You are a product quality expert. Always respond with valid JSON.';
    const userPrompt = `Evaluate: ${product_name}, $${price}, Category: ${category}
Return JSON: { "overallScore": 0, "qualityBreakdown": { "valueForMoney": 0, "uniqueness": 0, "brandReputation": 0, "packagingPotential": 0, "subscriberAppeal": 0 }, "strengths": [], "weaknesses": [], "recommendation": "include|exclude|conditional", "improvementSuggestions": [] }`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(content);
    const result = parsed || { content };

    await persistAIResult(req.user?.id, 'score-quality', { product_name, category }, result);
    res.json({ success: true, feature: 'score_quality', result: { content, details: result } });
  } catch (err) {
    console.error('AI score-quality error:', err);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// 11. POST /api/ai/analyze-trends
router.post('/analyze-trends', aiRateLimiter, async (req, res) => {
  try {
    const { category, focus_area } = req.body;

    const boxesResult = await pool.query('SELECT category, COUNT(*) AS count, AVG(price) AS avg_price FROM subscription_boxes GROUP BY category');

    const systemPrompt = 'You are a market research analyst. Always respond with valid JSON.';
    const userPrompt = `Analyze subscription box trends. ${category ? `Focus: ${category}` : ''}
Data: ${JSON.stringify(boxesResult.rows)}

Return JSON: { "topTrends": [{ "name": "", "description": "", "impactLevel": "high|medium|low" }], "emergingCategories": [], "consumerBehaviorShifts": [], "competitiveLandscape": "", "opportunities": [], "threats": [], "strategicRecommendations": [] }`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(content);
    const result = parsed || { content };

    await persistAIResult(req.user?.id, 'analyze-trends', { category, focus_area }, result);
    res.json({ success: true, feature: 'analyze_trends', result: { content, details: result } });
  } catch (err) {
    console.error('AI analyze-trends error:', err);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// 12. POST /api/ai/segment-customers
router.post('/segment-customers', aiRateLimiter, async (req, res) => {
  try {
    const [customersResult, feedbackResult] = await Promise.all([
      pool.query(`SELECT c.id, c.name, c.preferences, c.subscription_tier, c.status, c.lifetime_value,
              COUNT(o.id) AS order_count, AVG(o.total) AS avg_order_value
       FROM customers c LEFT JOIN orders o ON c.id = o.customer_id
       GROUP BY c.id, c.name, c.preferences, c.subscription_tier, c.status, c.lifetime_value`),
      pool.query(`SELECT customer_id, AVG(rating) AS avg_rating, COUNT(*) AS feedback_count FROM feedback GROUP BY customer_id`)
    ]);

    const systemPrompt = 'You are a customer segmentation analyst. Always respond with valid JSON.';
    const userPrompt = `Segment customers: ${JSON.stringify(customersResult.rows)}
Feedback: ${JSON.stringify(feedbackResult.rows)}

Return JSON: { "segments": [{ "name": "", "customer_ids": [], "characteristics": [], "recommendations": [], "avgLifetimeValue": 0 }], "keyInsights": [], "retentionRisks": [] }`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(content);
    const result = parsed || { content };

    await persistAIResult(req.user?.id, 'segment-customers', { customerCount: customersResult.rows.length }, result);
    res.json({ success: true, feature: 'segment_customers', result: { content, details: result } });
  } catch (err) {
    console.error('AI segment-customers error:', err);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// 13. POST /api/ai/churn-risk (NEW)
router.post('/churn-risk', aiRateLimiter, async (req, res) => {
  try {
    const customersResult = await pool.query(`
      SELECT c.id, c.name, c.subscription_tier, c.status, c.lifetime_value,
             COUNT(o.id) AS order_count,
             MAX(o.order_date) AS last_order_date,
             AVG(f.rating) AS avg_rating,
             AVG(CASE WHEN f.sentiment = 'negative' THEN 1 ELSE 0 END) AS negative_ratio
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      LEFT JOIN feedback f ON c.id = f.customer_id
      GROUP BY c.id, c.name, c.subscription_tier, c.status, c.lifetime_value
    `);

    const systemPrompt = 'You are a churn prediction analyst. Always respond with valid JSON.';
    const userPrompt = `Predict churn risk for customers: ${JSON.stringify(customersResult.rows, null, 2)}

Return JSON: { "customers": [{ "id": 0, "name": "", "churn_risk": "high|medium|low", "churn_probability": 0, "retention_action": "", "reasons": [] }], "high_risk_count": 0, "estimated_revenue_at_risk": 0 }`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(content);
    const result = parsed || { content };

    await persistAIResult(req.user?.id, 'churn-risk', { customerCount: customersResult.rows.length }, result);
    res.json({ success: true, feature: 'churn_risk', result: { content, details: result } });
  } catch (err) {
    console.error('AI churn-risk error:', err);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// 14. POST /api/ai/customer-ltv — predict customer lifetime value
router.post('/customer-ltv', aiRateLimiter, async (req, res) => {
  try {
    const customersResult = await pool.query(`
      SELECT c.id, c.name, c.subscription_tier, c.status, c.lifetime_value, c.created_at,
             COUNT(o.id) AS order_count,
             COALESCE(SUM(o.total_amount), 0) AS total_spent,
             AVG(f.rating) AS avg_rating
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      LEFT JOIN feedback f ON c.id = f.customer_id
      GROUP BY c.id
      LIMIT 100
    `);

    const systemPrompt = 'You are a customer lifetime value modeler. Always respond with valid JSON.';
    const userPrompt = `Predict LTV for these customers: ${JSON.stringify(customersResult.rows.slice(0, 60), null, 2)}

Return JSON:
{
  "customers": [{"id": <id>, "predicted_ltv_usd": <number>, "tier": "low|mid|high|VIP", "drivers": ["..."], "acquisition_spend_cap_usd": <number>}],
  "average_ltv": <number>,
  "vip_customer_ids": [<id>],
  "summary": "..."
}`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(content);
    const result = parsed || { content };
    await persistAIResult(req.user?.id, 'customer-ltv', { customerCount: customersResult.rows.length }, result);
    res.json({ success: true, feature: 'customer_ltv', result: { content, details: result } });
  } catch (err) {
    console.error('AI customer-ltv error:', err);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// 15. POST /api/ai/unboxing-arrangement — optimize physical box arrangement for unboxing delight
router.post('/unboxing-arrangement', aiRateLimiter, async (req, res) => {
  try {
    const { box_theme, products, brand_personality } = req.body;
    const systemPrompt = 'You are an unboxing-experience designer. Always respond with valid JSON.';
    const userPrompt = `Recommend physical arrangement and reveal sequence for unboxing.
Theme: ${box_theme || 'general'}
Brand personality: ${brand_personality || 'warm and curated'}
Products: ${JSON.stringify(products || [])}

Return JSON:
{
  "layers": [{"layer": <number>, "items": ["..."], "rationale": "..."}],
  "hero_item": "...",
  "tactile_notes": ["..."],
  "narrative_card_text": "...",
  "social_share_prompts": ["..."]
}`;
    const content = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(content);
    const result = parsed || { content };
    await persistAIResult(req.user?.id, 'unboxing-arrangement', { box_theme, productCount: (products || []).length }, result);
    res.json({ success: true, feature: 'unboxing_arrangement', result: { content, details: result } });
  } catch (err) {
    console.error('AI unboxing-arrangement error:', err);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// 16. POST /api/ai/competitor-price-monitor — synthesize competitor pricing posture
router.post('/competitor-price-monitor', aiRateLimiter, async (req, res) => {
  if (!requireKey(res)) return;
  try {
    const { our_box, our_price, competitors = [], market_segment } = req.body || {};
    if (!our_box) return res.status(400).json({ success: false, error: 'our_box is required' });
    const systemPrompt = 'You are a competitive-pricing analyst for subscription-box brands. Always respond with valid JSON.';
    const userPrompt = `Compare our box against competitor offerings and recommend a pricing posture.

Our box: ${our_box}
Our price (USD): ${our_price ?? 'unknown'}
Market segment: ${market_segment || 'unspecified'}
Competitors (${competitors.length}): ${JSON.stringify(competitors).slice(0, 4000)}

Return JSON:
{
  "competitor_summary": [{"name": "...", "price": <number>, "positioning": "...", "perceived_value": "low|fair|high"}],
  "our_position": "premium|parity|value|undercut",
  "recommended_action": "raise|hold|lower|reposition",
  "recommended_price_band": {"low": <number>, "high": <number>},
  "rationale": "...",
  "watchlist": ["..."]
}`;
    const content = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(content);
    const result = parsed || { content };
    await persistAIResult(req.user?.id, 'competitor-price-monitor', { our_box, our_price, competitorCount: competitors.length }, result);
    res.json({ success: true, feature: 'competitor_price_monitor', result: { content, details: result } });
  } catch (err) {
    console.error('AI competitor-price-monitor error:', err);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// 17. POST /api/ai/preference-bandit — bandit-style scoring step over candidate boxes
// Stateless scoring endpoint: caller passes priors (arm stats) + candidates,
// receives recommended next pull and updated priors guidance.
router.post('/preference-bandit', aiRateLimiter, async (req, res) => {
  if (!requireKey(res)) return;
  try {
    const { customer_id, arms = [], candidates = [], context } = req.body || {};
    if (!Array.isArray(arms) || arms.length === 0) {
      return res.status(400).json({ success: false, error: 'arms array is required (each: { id, pulls, rewards, mean? })' });
    }
    const systemPrompt = 'You are a recommender that emulates a multi-armed bandit (Thompson-sampling style) for subscription-box preference learning. Always respond with valid JSON. Be conservative when arm pulls are low — favor exploration.';
    const userPrompt = `Score arms and pick the next pull.

Customer: ${customer_id || 'anonymous'}
Context: ${context || 'general'}
Arms (existing): ${JSON.stringify(arms).slice(0, 3000)}
Candidates (new arms to consider): ${JSON.stringify(candidates).slice(0, 2000)}

Return JSON:
{
  "scores": [{"arm_id": "...", "score": <number>, "explore_vs_exploit": "explore|exploit", "rationale": "..."}],
  "recommended_arm": "...",
  "exploration_rate_advice": <number>,
  "updated_priors_hint": [{"arm_id": "...", "suggested_alpha": <number>, "suggested_beta": <number>}],
  "notes": "..."
}`;
    const content = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(content);
    const result = parsed || { content };
    await persistAIResult(req.user?.id, 'preference-bandit', { customer_id, armCount: arms.length, candidateCount: candidates.length }, result);
    res.json({ success: true, feature: 'preference_bandit', result: { content, details: result } });
  } catch (err) {
    console.error('AI preference-bandit error:', err);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

module.exports = router;
