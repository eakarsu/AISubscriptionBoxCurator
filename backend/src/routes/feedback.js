const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/feedback
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, c.name AS customer_name, sb.name AS box_name
       FROM feedback f
       LEFT JOIN customers c ON f.customer_id = c.id
       LEFT JOIN subscription_boxes sb ON f.box_id = sb.id
       ORDER BY f.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching feedback:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/feedback/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, c.name AS customer_name, sb.name AS box_name
       FROM feedback f
       LEFT JOIN customers c ON f.customer_id = c.id
       LEFT JOIN subscription_boxes sb ON f.box_id = sb.id
       WHERE f.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching feedback:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/feedback
router.post('/', async (req, res) => {
  try {
    const { customer_id, box_id, rating, comment, sentiment } = req.body;
    const result = await pool.query(
      `INSERT INTO feedback (customer_id, box_id, rating, comment, sentiment, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [customer_id, box_id, rating, comment, sentiment]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating feedback:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/feedback/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM feedback WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json({ message: 'Feedback deleted', feedback: result.rows[0] });
  } catch (err) {
    console.error('Error deleting feedback:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
