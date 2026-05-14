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

// POST /api/subscription-boxes/:id/apply-curation - Apply AI curated product list
router.post('/:id/apply-curation', async (req, res) => {
  const client = await pool.connect();
  try {
    const { selected_products } = req.body; // [{ product_id, quantity }]
    if (!Array.isArray(selected_products) || selected_products.length === 0) {
      return res.status(400).json({ error: 'selected_products array required' });
    }

    const boxResult = await client.query('SELECT * FROM subscription_boxes WHERE id = $1', [req.params.id]);
    if (boxResult.rows.length === 0) return res.status(404).json({ error: 'Box not found' });

    await client.query('BEGIN');

    // Remove existing box_items for this box
    await client.query('DELETE FROM box_items WHERE box_id = $1', [req.params.id]);

    // Insert new box_items
    for (const item of selected_products) {
      await client.query(
        'INSERT INTO box_items (box_id, product_id, quantity) VALUES ($1, $2, $3)',
        [req.params.id, item.product_id, item.quantity || 1]
      );
    }

    // Update items_count
    await client.query(
      'UPDATE subscription_boxes SET items_count = $1 WHERE id = $2',
      [selected_products.length, req.params.id]
    );

    await client.query('COMMIT');

    // Return updated box with items
    const updatedBox = await pool.query('SELECT * FROM subscription_boxes WHERE id = $1', [req.params.id]);
    const items = await pool.query(
      `SELECT bi.quantity, p.id AS product_id, p.name, p.price, p.category FROM box_items bi JOIN products p ON bi.product_id = p.id WHERE bi.box_id = $1`,
      [req.params.id]
    );

    res.json({ box: updatedBox.rows[0], items: items.rows, message: `Applied ${selected_products.length} products to box` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error applying curation:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
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
