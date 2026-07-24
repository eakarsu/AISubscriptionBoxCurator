const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const auth = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, tenantId: process.env.GOVERNANCE_TENANT_ID, subjectIds: [`actor:user:${user.id}`] },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !name || typeof password !== 'string' || password.length < 12) {
      return res.status(400).json({ error: 'Email, name, and a password of at least 12 characters are required' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, name, role, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, email, name, role, created_at',
      [email, hashedPassword, name, 'user']
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, tenantId: process.env.GOVERNANCE_TENANT_ID, subjectIds: [`actor:user:${user.id}`] },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me -- resolve the signed-in identity from durable storage.
router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1 LIMIT 1',
      [req.user.id]
    );
    if (!result.rows.length) return res.status(401).json({ error: 'Session user no longer exists' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Session identity error:', err);
    res.status(500).json({ error: 'Unable to verify persisted session' });
  }
});

module.exports = router;
