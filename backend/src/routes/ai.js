const express = require('express');
const router = express.Router();
const pool = require('../db');

async function callOpenRouter(systemPrompt, userPrompt) {
  const response = await fetch(process.env.OPENROUTER_BASE_URL + '/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'OpenRouter API error');
  }
  return data.choices[0].message.content;
}

function parseAIResponse(content) {
  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    return JSON.parse(content);
  } catch {
    return { content };
  }
}

// 1. POST /api/ai/curate-box
router.post('/curate-box', async (req, res) => {
  try {
    const { theme, budget, category } = req.body;
    const productsResult = await pool.query('SELECT id, name, description, price, category, rating FROM products');
    const products = productsResult.rows;

    const systemPrompt = 'You are an expert subscription box curator. You select the best combination of products for themed subscription boxes. Always respond with valid JSON.';
    const userPrompt = `Curate a subscription box with the following criteria:
- Theme: ${theme}
- Budget: $${budget}
- Category: ${category}

Available products:
${JSON.stringify(products, null, 2)}

Return a JSON object with: selectedProducts (array of product ids and names with reasons), totalCost, boxName, boxDescription, and curationRationale.`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const details = parseAIResponse(content);

    res.json({ success: true, feature: 'curate_box', result: { content, details } });
  } catch (err) {
    console.error('AI curate-box error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST /api/ai/discover-products
router.post('/discover-products', async (req, res) => {
  try {
    const { category, count } = req.body;

    const systemPrompt = 'You are a product discovery specialist who identifies trending and innovative products for subscription boxes. Always respond with valid JSON.';
    const userPrompt = `Suggest ${count || 5} new trending products for the "${category}" category that would be great for subscription boxes.

For each product include: name, estimatedPrice, description, whyTrending, targetAudience, and supplierSuggestions.

Return as a JSON object with a "products" array.`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const details = parseAIResponse(content);

    res.json({ success: true, feature: 'discover_products', result: { content, details } });
  } catch (err) {
    console.error('AI discover-products error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST /api/ai/optimize-price
router.post('/optimize-price', async (req, res) => {
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

    const systemPrompt = 'You are a pricing optimization expert for subscription box businesses. You analyze market data and suggest optimal pricing strategies. Always respond with valid JSON.';
    const userPrompt = `Analyze and suggest optimal pricing for this subscription box:
${boxData ? `Box: ${JSON.stringify(boxData)}` : `Category: ${category}, Current Price: $${current_price}`}

Historical pricing and order data:
${JSON.stringify(ordersResult.rows, null, 2)}

Return a JSON object with: suggestedPrice, priceRange (min/max), competitiveAnalysis, pricingStrategy, expectedImpactOnSubscribers, and reasoning.`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const details = parseAIResponse(content);

    res.json({ success: true, feature: 'optimize_price', result: { content, details } });
  } catch (err) {
    console.error('AI optimize-price error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST /api/ai/generate-theme
router.post('/generate-theme', async (req, res) => {
  try {
    const { season, target_audience, count } = req.body;

    const systemPrompt = 'You are a creative director specializing in subscription box themes and concepts. You create unique, marketable themed box ideas. Always respond with valid JSON.';
    const userPrompt = `Generate ${count || 5} creative subscription box theme ideas.
${season ? `Season/Time of year: ${season}` : ''}
${target_audience ? `Target Audience: ${target_audience}` : ''}

For each theme include: themeName, tagline, description, suggestedCategories, targetDemographic, estimatedPriceRange, and uniqueSellingPoint.

Return as a JSON object with a "themes" array.`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const details = parseAIResponse(content);

    res.json({ success: true, feature: 'generate_theme', result: { content, details } });
  } catch (err) {
    console.error('AI generate-theme error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. POST /api/ai/write-description
router.post('/write-description', async (req, res) => {
  try {
    const { name, category, features, tone, type } = req.body;

    const systemPrompt = 'You are a professional copywriter specializing in e-commerce and subscription box product descriptions. You write compelling, conversion-focused copy. Always respond with valid JSON.';
    const userPrompt = `Write a compelling ${type || 'product'} description for:
- Name: ${name}
- Category: ${category}
${features ? `- Key Features: ${features}` : ''}
${tone ? `- Tone: ${tone}` : '- Tone: engaging and professional'}

Return a JSON object with: shortDescription (1-2 sentences), longDescription (paragraph), bulletPoints (array of 4-5 key selling points), seoTitle, and seoMetaDescription.`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const details = parseAIResponse(content);

    res.json({ success: true, feature: 'write_description', result: { content, details } });
  } catch (err) {
    console.error('AI write-description error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. POST /api/ai/analyze-feedback
router.post('/analyze-feedback', async (req, res) => {
  try {
    const { box_id } = req.body;

    let query = `SELECT f.rating, f.comment, f.sentiment, c.name AS customer_name, sb.name AS box_name
                 FROM feedback f
                 LEFT JOIN customers c ON f.customer_id = c.id
                 LEFT JOIN subscription_boxes sb ON f.box_id = sb.id`;
    const params = [];
    if (box_id) {
      query += ' WHERE f.box_id = $1';
      params.push(box_id);
    }
    query += ' ORDER BY f.created_at DESC LIMIT 50';

    const feedbackResult = await pool.query(query, params);

    const systemPrompt = 'You are a customer feedback analyst specializing in subscription box services. You identify patterns, sentiments, and actionable insights. Always respond with valid JSON.';
    const userPrompt = `Analyze the following customer feedback data:

${JSON.stringify(feedbackResult.rows, null, 2)}

Return a JSON object with: overallSentiment, sentimentBreakdown (positive/neutral/negative percentages), averageRating, keyThemes (array), topComplaints (array), topPraises (array), actionableInsights (array of recommendations), and customerSatisfactionScore (0-100).`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const details = parseAIResponse(content);

    res.json({ success: true, feature: 'analyze_feedback', result: { content, details } });
  } catch (err) {
    console.error('AI analyze-feedback error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. POST /api/ai/forecast-demand
router.post('/forecast-demand', async (req, res) => {
  try {
    const { category, months_ahead } = req.body;

    const ordersResult = await pool.query(
      `SELECT o.order_date, o.total, o.status, sb.category, sb.name AS box_name
       FROM orders o
       LEFT JOIN subscription_boxes sb ON o.box_id = sb.id
       ORDER BY o.order_date`
    );

    const systemPrompt = 'You are a demand forecasting analyst for subscription box businesses. You analyze historical data to predict future trends. Always respond with valid JSON.';
    const userPrompt = `Forecast subscription demand for the next ${months_ahead || 3} months based on this order history:

${JSON.stringify(ordersResult.rows, null, 2)}
${category ? `Focus on category: ${category}` : ''}

Return a JSON object with: forecast (array of monthly predictions with month, expectedOrders, expectedRevenue, confidence), growthTrend, seasonalFactors, riskFactors, and recommendations.`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const details = parseAIResponse(content);

    res.json({ success: true, feature: 'forecast_demand', result: { content, details } });
  } catch (err) {
    console.error('AI forecast-demand error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. POST /api/ai/personalize-recommendations
router.post('/personalize-recommendations', async (req, res) => {
  try {
    const { customer_id } = req.body;

    const customerResult = await pool.query('SELECT * FROM customers WHERE id = $1', [customer_id]);
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const ordersResult = await pool.query(
      `SELECT o.*, sb.name AS box_name, sb.theme, sb.category
       FROM orders o
       LEFT JOIN subscription_boxes sb ON o.box_id = sb.id
       WHERE o.customer_id = $1`,
      [customer_id]
    );

    const feedbackResult = await pool.query(
      `SELECT f.rating, f.comment, sb.name AS box_name, sb.category
       FROM feedback f
       LEFT JOIN subscription_boxes sb ON f.box_id = sb.id
       WHERE f.customer_id = $1`,
      [customer_id]
    );

    const boxesResult = await pool.query('SELECT id, name, theme, category, price FROM subscription_boxes WHERE status = $1', ['active']);

    const customer = customerResult.rows[0];
    const systemPrompt = 'You are a personalization engine for subscription boxes. You analyze customer preferences and history to make tailored recommendations. Always respond with valid JSON.';
    const userPrompt = `Create personalized subscription box recommendations for this customer:

Customer Profile:
${JSON.stringify(customer, null, 2)}

Order History:
${JSON.stringify(ordersResult.rows, null, 2)}

Feedback History:
${JSON.stringify(feedbackResult.rows, null, 2)}

Available Boxes:
${JSON.stringify(boxesResult.rows, null, 2)}

Return a JSON object with: recommendations (array of box suggestions with boxId, boxName, matchScore 0-100, reasons), customerProfile (interests, preferences summary), and personalizedMessage.`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const details = parseAIResponse(content);

    res.json({ success: true, feature: 'personalize_recommendations', result: { content, details } });
  } catch (err) {
    console.error('AI personalize-recommendations error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. POST /api/ai/generate-marketing
router.post('/generate-marketing', async (req, res) => {
  try {
    const { name, description, category, target_audience, channel } = req.body;

    const systemPrompt = 'You are a marketing copywriter specializing in subscription box marketing campaigns. You create engaging, conversion-focused marketing content. Always respond with valid JSON.';
    const userPrompt = `Generate marketing copy for this subscription box/product:
- Name: ${name}
- Description: ${description}
- Category: ${category}
${target_audience ? `- Target Audience: ${target_audience}` : ''}
${channel ? `- Channel: ${channel}` : '- Channel: multi-channel'}

Return a JSON object with: emailSubject, emailBody, socialMediaPost (for Instagram, Twitter, Facebook), adHeadline, adCopy, callToAction, hashtags (array), and landingPageHero.`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const details = parseAIResponse(content);

    res.json({ success: true, feature: 'generate_marketing', result: { content, details } });
  } catch (err) {
    console.error('AI generate-marketing error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. POST /api/ai/score-quality
router.post('/score-quality', async (req, res) => {
  try {
    let { product_name, product_description, price, category, supplier, rating, product_id } = req.body;

    if (product_id && !product_name) {
      const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
      if (productResult.rows.length > 0) {
        const p = productResult.rows[0];
        product_name = p.name;
        product_description = p.description;
        price = p.price;
        category = p.category;
        supplier = p.supplier;
        rating = p.rating;
      }
    }

    const systemPrompt = 'You are a product quality assessment expert for subscription boxes. You evaluate products based on multiple criteria to ensure subscriber satisfaction. Always respond with valid JSON.';
    const userPrompt = `Evaluate the quality of this product for inclusion in a subscription box:
- Product Name: ${product_name}
- Description: ${product_description}
- Price: $${price}
- Category: ${category}
${supplier ? `- Supplier: ${supplier}` : ''}
${rating ? `- Current Rating: ${rating}/5` : ''}

Return a JSON object with: overallScore (0-100), qualityBreakdown (valueForMoney, uniqueness, brandReputation, packagingPotential, subscriberAppeal - each 0-100), strengths (array), weaknesses (array), recommendation (include/exclude/conditional), and improvementSuggestions (array).`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const details = parseAIResponse(content);

    res.json({ success: true, feature: 'score_quality', result: { content, details } });
  } catch (err) {
    console.error('AI score-quality error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. POST /api/ai/analyze-trends
router.post('/analyze-trends', async (req, res) => {
  try {
    const { category, focus_area } = req.body;

    const boxesResult = await pool.query(
      'SELECT category, COUNT(*) AS count, AVG(price) AS avg_price FROM subscription_boxes GROUP BY category'
    );

    const systemPrompt = 'You are a market research analyst specializing in the subscription box industry. You identify emerging trends and market opportunities. Always respond with valid JSON.';
    const userPrompt = `Analyze current market trends in the subscription box industry.
${category ? `Focus Category: ${category}` : ''}
${focus_area ? `Focus Area: ${focus_area}` : ''}

Current business data:
${JSON.stringify(boxesResult.rows, null, 2)}

Return a JSON object with: topTrends (array of trend objects with name, description, impactLevel), emergingCategories (array), consumerBehaviorShifts (array), competitiveLandscape, opportunities (array), threats (array), and strategicRecommendations (array).`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const details = parseAIResponse(content);

    res.json({ success: true, feature: 'analyze_trends', result: { content, details } });
  } catch (err) {
    console.error('AI analyze-trends error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. POST /api/ai/segment-customers
router.post('/segment-customers', async (req, res) => {
  try {
    const customersResult = await pool.query(
      `SELECT c.id, c.name, c.preferences, c.subscription_tier, c.status, c.lifetime_value,
              COUNT(o.id) AS order_count, AVG(o.total) AS avg_order_value
       FROM customers c
       LEFT JOIN orders o ON c.id = o.customer_id
       GROUP BY c.id, c.name, c.preferences, c.subscription_tier, c.status, c.lifetime_value`
    );

    const feedbackResult = await pool.query(
      `SELECT customer_id, AVG(rating) AS avg_rating, COUNT(*) AS feedback_count
       FROM feedback GROUP BY customer_id`
    );

    const systemPrompt = 'You are a customer segmentation analyst for subscription box businesses. You identify meaningful customer segments to drive targeted marketing and retention strategies. Always respond with valid JSON.';
    const userPrompt = `Segment these customers into meaningful groups:

Customer Data:
${JSON.stringify(customersResult.rows, null, 2)}

Feedback Summary:
${JSON.stringify(feedbackResult.rows, null, 2)}

Return a JSON object with: segments (array of segment objects with name, description, customerIds, size, characteristics, avgLifetimeValue, recommendedStrategy), segmentationCriteria, keyInsights (array), and retentionRisks (array of at-risk customer insights).`;

    const content = await callOpenRouter(systemPrompt, userPrompt);
    const details = parseAIResponse(content);

    res.json({ success: true, feature: 'segment_customers', result: { content, details } });
  } catch (err) {
    console.error('AI segment-customers error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
