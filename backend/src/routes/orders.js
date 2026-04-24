const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, c.name AS customer_name, sb.name AS box_name
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN subscription_boxes sb ON o.box_id = sb.id
       ORDER BY o.order_date DESC`
    );
    res.json(result.rows);
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
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders
router.post('/', async (req, res) => {
  try {
    const { customer_id, box_id, status, total, shipping_address } = req.body;
    const result = await pool.query(
      `INSERT INTO orders (customer_id, box_id, status, total, order_date, shipping_address)
       VALUES ($1, $2, $3, $4, NOW(), $5) RETURNING *`,
      [customer_id, box_id, status || 'pending', total, shipping_address]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/orders/:id
router.put('/:id', async (req, res) => {
  try {
    const { customer_id, box_id, status, total, shipping_address } = req.body;
    const result = await pool.query(
      `UPDATE orders SET customer_id = $1, box_id = $2, status = $3,
       total = $4, shipping_address = $5
       WHERE id = $6 RETURNING *`,
      [customer_id, box_id, status, total, shipping_address, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ message: 'Order deleted', order: result.rows[0] });
  } catch (err) {
    console.error('Error deleting order:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
