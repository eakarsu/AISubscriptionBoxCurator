const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY joined_date DESC');
    res.json(result.rows);
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
