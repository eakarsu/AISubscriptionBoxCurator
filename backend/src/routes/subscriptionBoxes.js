const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/subscription-boxes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM subscription_boxes ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching subscription boxes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/subscription-boxes/:id
router.get('/:id', async (req, res) => {
  try {
    const boxResult = await pool.query(
      'SELECT * FROM subscription_boxes WHERE id = $1',
      [req.params.id]
    );
    if (boxResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription box not found' });
    }

    const itemsResult = await pool.query(
      `SELECT bi.id, bi.quantity, p.id AS product_id, p.name, p.description,
              p.price, p.category, p.image_url, p.rating, p.supplier
       FROM box_items bi
       JOIN products p ON bi.product_id = p.id
       WHERE bi.box_id = $1`,
      [req.params.id]
    );

    const box = boxResult.rows[0];
    box.items = itemsResult.rows;
    res.json(box);
  } catch (err) {
    console.error('Error fetching subscription box:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscription-boxes
router.post('/', async (req, res) => {
  try {
    const { name, theme, description, price, category, image_url, status, items_count } = req.body;
    const result = await pool.query(
      `INSERT INTO subscription_boxes (name, theme, description, price, category, image_url, status, items_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
      [name, theme, description, price, category, image_url, status || 'active', items_count || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating subscription box:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/subscription-boxes/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, theme, description, price, category, image_url, status, items_count } = req.body;
    const result = await pool.query(
      `UPDATE subscription_boxes
       SET name = $1, theme = $2, description = $3, price = $4, category = $5,
           image_url = $6, status = $7, items_count = $8
       WHERE id = $9 RETURNING *`,
      [name, theme, description, price, category, image_url, status, items_count, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription box not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating subscription box:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/subscription-boxes/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM subscription_boxes WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription box not found' });
    }
    res.json({ message: 'Subscription box deleted', box: result.rows[0] });
  } catch (err) {
    console.error('Error deleting subscription box:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
