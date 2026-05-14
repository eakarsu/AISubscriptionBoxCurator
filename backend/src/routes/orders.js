const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/orders with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [result, count] = await Promise.all([
      pool.query(
        `SELECT o.*, c.name AS customer_name, sb.name AS box_name
         FROM orders o
         LEFT JOIN customers c ON o.customer_id = c.id
         LEFT JOIN subscription_boxes sb ON o.box_id = sb.id
         ORDER BY o.order_date DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*) FROM orders')
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
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, c.name AS customer_name, sb.name AS box_name
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN subscription_boxes sb ON o.box_id = sb.id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders - with stock deduction in transaction
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { customer_id, box_id, status, total, shipping_address, items } = req.body;

    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, box_id, status, total, order_date, shipping_address)
       VALUES ($1, $2, $3, $4, NOW(), $5) RETURNING *`,
      [customer_id, box_id, status || 'pending', total, shipping_address]
    );

    // Deduct stock for each item
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await client.query(
          'UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2',
          [item.quantity || 1, item.product_id]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(orderResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PUT /api/orders/:id/status - state machine
router.put('/:id/status', async (req, res) => {
  try {
    const { status, reason } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // State machine transitions
    const orderResult = await pool.query('SELECT status FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    const currentStatus = orderResult.rows[0].status;
    const allowedTransitions = {
      pending: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: []
    };

    if (!allowedTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from '${currentStatus}' to '${status}'. Allowed: ${(allowedTransitions[currentStatus] || []).join(', ') || 'none'}`
      });
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    res.json({ order: result.rows[0], transition: `${currentStatus} -> ${status}` });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/orders/:id
router.put('/:id', async (req, res) => {
  try {
    const { customer_id, box_id, status, total, shipping_address } = req.body;
    const result = await pool.query(
      `UPDATE orders SET customer_id = $1, box_id = $2, status = $3, total = $4, shipping_address = $5
       WHERE id = $6 RETURNING *`,
      [customer_id, box_id, status, total, shipping_address, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders/checkout - Stripe checkout session
router.post('/checkout', async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY env variable.' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const { customer_id, box_id, total, shipping_address } = req.body;

    // Get box details for line item
    const boxResult = await pool.query('SELECT * FROM subscription_boxes WHERE id = $1', [box_id]);
    const box = boxResult.rows[0];
    if (!box) return res.status(404).json({ error: 'Box not found' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: box.name, description: box.description || '' },
          unit_amount: Math.round((total || box.price) * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/orders?payment=success`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/orders?payment=cancelled`,
      metadata: { customer_id: String(customer_id), box_id: String(box_id), shipping_address: shipping_address || '' }
    });

    res.json({ checkout_url: session.url, session_id: session.id });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted', order: result.rows[0] });
  } catch (err) {
    console.error('Error deleting order:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
