require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = require('./db');

async function init() {
  const client = await pool.connect();
  try {
    console.log('Running non-destructive schema init...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS subscription_boxes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        theme VARCHAR(255),
        description TEXT,
        price DECIMAL(10,2),
        category VARCHAR(255),
        image_url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'active',
        items_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        description TEXT,
        price DECIMAL(10,2),
        category VARCHAR(255),
        image_url VARCHAR(500),
        rating DECIMAL(3,2),
        supplier VARCHAR(255),
        stock INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        preferences TEXT,
        subscription_tier VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active',
        lifetime_value DECIMAL(10,2) DEFAULT 0,
        joined_date TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
        box_id INT REFERENCES subscription_boxes(id) ON DELETE SET NULL,
        status VARCHAR(50),
        total DECIMAL(10,2),
        order_date TIMESTAMP DEFAULT NOW(),
        shipping_address TEXT
      );

      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
        box_id INT REFERENCES subscription_boxes(id) ON DELETE SET NULL,
        rating INT,
        comment TEXT,
        sentiment VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS box_items (
        id SERIAL PRIMARY KEY,
        box_id INT REFERENCES subscription_boxes(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        quantity INT DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS ai_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        endpoint VARCHAR(100),
        input_data JSONB,
        result JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Schema init complete (non-destructive).');
  } catch (err) {
    console.error('Init error:', err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

init().catch(console.error);
