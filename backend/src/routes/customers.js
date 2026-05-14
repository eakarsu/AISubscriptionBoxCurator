const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/customers with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [result, count] = await Promise.all([
      pool.query('SELECT * FROM customers ORDER BY joined_date DESC LIMIT $1 OFFSET $2', [limit, offset]),
      pool.query('SELECT COUNT(*) FROM customers')
    ]);

    res.json({
      data: result.rows,
      pagination: {
        page, limit,
        total: parseInt(count.rows[0].count),
        totalPages: Math.ceil(parseInt(count.rows[0].count) / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
  try {
    const customerResult = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const ordersResult = await pool.query(
      `SELECT o.*, sb.name AS box_name
       FROM orders o
       LEFT JOIN subscription_boxes sb ON o.box_id = sb.id
       WHERE o.customer_id = $1
       ORDER BY o.order_date DESC`,
      [req.params.id]
    );

    const customer = customerResult.rows[0];
    customer.orders = ordersResult.rows;
    res.json(customer);
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/customers/quiz - Subscriber onboarding quiz
router.post('/quiz', async (req, res) => {
  try {
    const { preferences, allergies, budget, hobbies, lifestyle } = req.body;

    // Get available boxes
    const boxesResult = await pool.query(`SELECT id, name, theme, category, price FROM subscription_boxes WHERE status = 'active'`);

    const prompt = `Based on this subscriber quiz: preferences: ${preferences}, allergies: ${allergies}, budget: $${budget}, hobbies: ${hobbies}, lifestyle: ${lifestyle}

Available boxes: ${JSON.stringify(boxesResult.rows)}

Return JSON: { "top_boxes": [{ "box_id": 0, "box_name": "", "match_score": 0, "match_reasons": [], "personalized_pitch": "" }], "profile_summary": "", "personalized_message": "" }`;

    const response = await fetch((process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1') + '/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'anthropic/claude-3-5-sonnet-20241022',
        messages: [
          { role: 'system', content: 'You are a subscription box recommendation specialist. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });
    const data = await response.json();
    const content = data.choices[0].message.content;

    let parsed = null;
    try { parsed = JSON.parse(content); } catch {
      try {
        const first = content.indexOf('{'), last = content.lastIndexOf('}');
        if (first !== -1 && last !== -1) parsed = JSON.parse(content.slice(first, last + 1));
      } catch {}
    }

    res.json({ success: true, quiz_results: parsed || { raw: content } });
  } catch (err) {
    console.error('Quiz error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/customers
router.post('/', async (req, res) => {
  try {
    const { name, email, preferences, subscription_tier, status, lifetime_value } = req.body;
    const result = await pool.query(
      `INSERT INTO customers (name, email, preferences, subscription_tier, status, lifetime_value, joined_date)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [name, email, preferences, subscription_tier || 'Basic', status || 'active', lifetime_value || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, email, preferences, subscription_tier, status, lifetime_value } = req.body;
    const result = await pool.query(
      `UPDATE customers SET name = $1, email = $2, preferences = $3,
       subscription_tier = $4, status = $5, lifetime_value = $6
       WHERE id = $7 RETURNING *`,
      [name, email, preferences, subscription_tier, status, lifetime_value, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted', customer: result.rows[0] });
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
