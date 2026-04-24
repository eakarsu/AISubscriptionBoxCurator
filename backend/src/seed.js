require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Dropping existing tables...');
    await client.query(`
      DROP TABLE IF EXISTS box_items CASCADE;
      DROP TABLE IF EXISTS feedback CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS customers CASCADE;
      DROP TABLE IF EXISTS products CASCADE;
      DROP TABLE IF EXISTS subscription_boxes CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    console.log('Creating tables...');
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE subscription_boxes (
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

      CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        description TEXT,
        price DECIMAL(10,2),
        category VARCHAR(255),
        image_url VARCHAR(500),
        rating DECIMAL(3,2),
        supplier VARCHAR(255),
        stock INT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        preferences TEXT,
        subscription_tier VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active',
        lifetime_value DECIMAL(10,2) DEFAULT 0,
        joined_date TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
        box_id INT REFERENCES subscription_boxes(id) ON DELETE SET NULL,
        status VARCHAR(50),
        total DECIMAL(10,2),
        order_date TIMESTAMP DEFAULT NOW(),
        shipping_address TEXT
      );

      CREATE TABLE feedback (
        id SERIAL PRIMARY KEY,
        customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
        box_id INT REFERENCES subscription_boxes(id) ON DELETE SET NULL,
        rating INT,
        comment TEXT,
        sentiment VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE box_items (
        id SERIAL PRIMARY KEY,
        box_id INT REFERENCES subscription_boxes(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        quantity INT DEFAULT 1
      );
    `);

    // Seed users
    console.log('Seeding users...');
    const adminHash = await bcrypt.hash('password123', 10);
    const userHash = await bcrypt.hash('password123', 10);
    await client.query(`
      INSERT INTO users (email, password, name, role) VALUES
      ('admin@example.com', $1, 'Admin User', 'admin'),
      ('user@example.com', $2, 'Regular User', 'user')
    `, [adminHash, userHash]);

    // Seed subscription boxes
    console.log('Seeding subscription boxes...');
    await client.query(`
      INSERT INTO subscription_boxes (name, theme, description, price, category, image_url, status, items_count, created_at) VALUES
      ('Glow & Grace', 'Beauty Essentials', 'A curated collection of premium skincare and beauty products for your daily routine.', 39.99, 'Beauty', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348', 'active', 6, '2025-01-15'),
      ('Snack Safari', 'Global Snacks', 'Explore exotic snacks from around the world delivered to your door monthly.', 29.99, 'Snacks', 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60', 'active', 8, '2025-02-01'),
      ('TechPulse', 'Gadget Discovery', 'Cutting-edge tech accessories and gadgets handpicked for early adopters.', 59.99, 'Tech', 'https://images.unsplash.com/photo-1518770660439-4636190af475', 'active', 4, '2025-02-15'),
      ('BookNook', 'Literary Adventures', 'Handpicked bestsellers and hidden gems with exclusive bookmarks and reading accessories.', 34.99, 'Books', 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d', 'active', 3, '2025-03-01'),
      ('FitFuel', 'Fitness Essentials', 'Premium fitness supplements, gear, and workout accessories for active lifestyles.', 44.99, 'Fitness', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48', 'active', 5, '2025-03-10'),
      ('Zen Garden', 'Wellness & Self-Care', 'Aromatherapy, meditation tools, and wellness products for mindful living.', 42.99, 'Wellness', 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874', 'active', 5, '2025-03-20'),
      ('Bean Voyage', 'Coffee Exploration', 'Single-origin coffee beans from specialty roasters worldwide with tasting notes.', 32.99, 'Coffee', 'https://images.unsplash.com/photo-1447933601403-0c6688de566e', 'active', 4, '2025-04-01'),
      ('Paw Palace', 'Pet Pampering', 'Premium toys, treats, and accessories for your furry best friend.', 36.99, 'Pet', 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1', 'active', 6, '2025-04-10'),
      ('Level Up', 'Gaming Gear', 'Exclusive gaming accessories, collectibles, and indie game keys for gamers.', 49.99, 'Gaming', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc', 'active', 5, '2025-04-15'),
      ('Palette Studio', 'Art Supplies', 'Professional-grade art supplies and creative tools for artists of all levels.', 38.99, 'Art', 'https://images.unsplash.com/photo-1513364776144-60967b0f800f', 'active', 6, '2025-05-01'),
      ('Chef''s Table', 'Gourmet Cooking', 'Exotic spices, artisan sauces, and specialty ingredients with chef-created recipes.', 45.99, 'Cooking', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136', 'active', 7, '2025-05-10'),
      ('Trail Blazer', 'Outdoor Adventure', 'Essential outdoor gear, survival tools, and adventure accessories for explorers.', 54.99, 'Outdoor', 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4', 'active', 5, '2025-05-20'),
      ('Wonder Kids', 'Kids Discovery', 'Educational toys, STEM kits, and creative activities for curious young minds.', 34.99, 'Kids', 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088', 'active', 6, '2025-06-01'),
      ('Green Living', 'Eco-Friendly', 'Sustainable, zero-waste products for environmentally conscious living.', 37.99, 'Eco-Friendly', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09', 'active', 5, '2025-06-10'),
      ('Mystery Vault', 'Surprise Mix', 'A mysterious combination of premium products across multiple categories. Every box is unique.', 49.99, 'Mystery', 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a', 'active', 6, '2025-06-15')
    `);

    // Seed products
    console.log('Seeding products...');
    await client.query(`
      INSERT INTO products (name, description, price, category, image_url, rating, supplier, stock, created_at) VALUES
      ('Vitamin C Serum', 'Brightening facial serum with 20% Vitamin C and hyaluronic acid.', 24.99, 'Beauty', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be', 4.70, 'GlowLabs', 150, '2025-01-10'),
      ('Japanese Mochi Assortment', 'Traditional Japanese rice cakes in 6 unique flavors.', 12.99, 'Snacks', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35', 4.50, 'Tokyo Treats Co', 300, '2025-01-15'),
      ('Wireless Charging Pad', 'Qi-compatible fast wireless charger with LED indicator.', 19.99, 'Tech', 'https://images.unsplash.com/photo-1586953208448-b95a79798f07', 4.30, 'ChargeTech', 200, '2025-01-20'),
      ('The Midnight Library', 'Bestselling novel by Matt Haig about infinite possibilities.', 14.99, 'Books', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f', 4.80, 'Penguin Random House', 500, '2025-02-01'),
      ('Resistance Bands Set', 'Set of 5 latex resistance bands with varying intensities.', 16.99, 'Fitness', 'https://images.unsplash.com/photo-1598289431512-b97b0917affc', 4.40, 'FlexFit', 250, '2025-02-10'),
      ('Lavender Essential Oil', 'Pure therapeutic-grade lavender oil for aromatherapy and relaxation.', 11.99, 'Wellness', 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108', 4.60, 'AromaPure', 400, '2025-02-15'),
      ('Ethiopian Yirgacheffe Beans', 'Single-origin light roast with floral and citrus notes. 12oz bag.', 18.99, 'Coffee', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e', 4.90, 'Roast Republic', 180, '2025-03-01'),
      ('Natural Dog Chew Toys', 'Set of 3 eco-friendly, durable chew toys for medium dogs.', 15.99, 'Pet', 'https://images.unsplash.com/photo-1535294435445-d7249524ef2e', 4.20, 'PawNatural', 350, '2025-03-10'),
      ('RGB Mechanical Keycaps', 'Custom artisan keycap set with translucent RGB-compatible design.', 22.99, 'Gaming', 'https://images.unsplash.com/photo-1595225476474-87563907a212', 4.50, 'KeyCraft', 120, '2025-03-15'),
      ('Watercolor Paint Set', 'Professional 24-color watercolor palette with mixing tray.', 28.99, 'Art', 'https://images.unsplash.com/photo-1513364776144-60967b0f800f', 4.70, 'ArtisanColors', 160, '2025-03-20'),
      ('Smoked Paprika Collection', 'Set of 4 artisanal smoked paprikas from Spain.', 14.99, 'Cooking', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d', 4.40, 'SpiceRoute', 280, '2025-04-01'),
      ('Compact Survival Knife', 'Stainless steel folding knife with fire starter and whistle.', 21.99, 'Outdoor', 'https://images.unsplash.com/photo-1571687949921-1306bfb24b72', 4.60, 'WildEdge', 190, '2025-04-10'),
      ('STEM Robot Kit', 'Build-your-own programmable robot kit for ages 8-14.', 29.99, 'Kids', 'https://images.unsplash.com/photo-1535378917042-10a22c95931a', 4.80, 'BrightMinds', 140, '2025-04-15'),
      ('Bamboo Utensil Set', 'Portable reusable bamboo cutlery set with carrying case.', 9.99, 'Eco-Friendly', 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a', 4.30, 'GreenLife', 450, '2025-04-20'),
      ('Jade Face Roller', 'Authentic jade stone facial roller for lymphatic drainage and skin care.', 18.99, 'Beauty', 'https://images.unsplash.com/photo-1590439471364-192aa70c0b53', 4.50, 'GlowLabs', 220, '2025-05-01'),
      ('Korean BBQ Snack Mix', 'Savory Korean BBQ flavored snack medley with rice crackers and nuts.', 8.99, 'Snacks', 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087', 4.30, 'Seoul Snacks', 500, '2025-05-05'),
      ('USB-C Hub Adapter', '7-in-1 USB-C hub with HDMI, USB 3.0, SD card reader.', 34.99, 'Tech', 'https://images.unsplash.com/photo-1625842268584-8f3296236761', 4.60, 'ChargeTech', 175, '2025-05-10'),
      ('Yoga Block Set', 'High-density EVA foam yoga blocks, set of 2 with strap.', 19.99, 'Fitness', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b', 4.50, 'FlexFit', 300, '2025-05-15'),
      ('Beeswax Food Wraps', 'Set of 3 reusable beeswax wraps in assorted sizes.', 13.99, 'Eco-Friendly', 'https://images.unsplash.com/photo-1611068661807-6e83ac0d4ec8', 4.40, 'GreenLife', 380, '2025-05-20'),
      ('Colombian Supremo Beans', 'Medium roast single-origin Colombian coffee, chocolate and nutty notes. 12oz.', 17.99, 'Coffee', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefda', 4.70, 'Roast Republic', 200, '2025-06-01')
    `);

    // Seed customers
    console.log('Seeding customers...');
    await client.query(`
      INSERT INTO customers (name, email, preferences, subscription_tier, status, lifetime_value, joined_date) VALUES
      ('Emma Johnson', 'emma.johnson@email.com', 'Beauty, Wellness, Eco-Friendly', 'Premium', 'active', 489.85, '2024-06-15'),
      ('Liam Chen', 'liam.chen@email.com', 'Tech, Gaming', 'VIP', 'active', 899.70, '2024-03-20'),
      ('Sophia Martinez', 'sophia.martinez@email.com', 'Books, Coffee, Art', 'Premium', 'active', 624.50, '2024-05-10'),
      ('Noah Williams', 'noah.williams@email.com', 'Fitness, Outdoor, Snacks', 'Basic', 'active', 179.97, '2024-09-01'),
      ('Olivia Brown', 'olivia.brown@email.com', 'Beauty, Cooking, Wellness', 'VIP', 'active', 1120.40, '2024-01-15'),
      ('James Davis', 'james.davis@email.com', 'Tech, Gaming, Mystery', 'Premium', 'active', 549.85, '2024-04-22'),
      ('Ava Wilson', 'ava.wilson@email.com', 'Kids, Eco-Friendly, Books', 'Basic', 'active', 209.94, '2024-08-10'),
      ('William Taylor', 'william.taylor@email.com', 'Coffee, Cooking, Outdoor', 'Premium', 'active', 456.80, '2024-05-30'),
      ('Isabella Anderson', 'isabella.anderson@email.com', 'Beauty, Art, Wellness', 'VIP', 'active', 945.60, '2024-02-14'),
      ('Benjamin Thomas', 'benjamin.thomas@email.com', 'Fitness, Snacks, Tech', 'Basic', 'active', 164.97, '2024-10-05'),
      ('Mia Jackson', 'mia.jackson@email.com', 'Pet, Kids, Eco-Friendly', 'Premium', 'active', 389.88, '2024-07-18'),
      ('Lucas White', 'lucas.white@email.com', 'Gaming, Tech, Mystery', 'VIP', 'active', 799.80, '2024-03-01'),
      ('Charlotte Harris', 'charlotte.harris@email.com', 'Coffee, Books, Cooking', 'Basic', 'active', 197.94, '2024-09-25'),
      ('Henry Martin', 'henry.martin@email.com', 'Outdoor, Fitness, Snacks', 'Premium', 'active', 524.85, '2024-04-08'),
      ('Amelia Garcia', 'amelia.garcia@email.com', 'Art, Beauty, Wellness', 'Basic', 'inactive', 119.97, '2024-11-01'),
      ('Alexander Lee', 'alexander.lee@email.com', 'Tech, Coffee, Gaming', 'VIP', 'active', 1050.50, '2024-01-28')
    `);

    // Seed orders
    console.log('Seeding orders...');
    await client.query(`
      INSERT INTO orders (customer_id, box_id, status, total, order_date, shipping_address) VALUES
      (1, 1, 'delivered', 39.99, '2025-01-20', '123 Oak Street, Portland, OR 97201'),
      (2, 3, 'delivered', 59.99, '2025-01-25', '456 Tech Blvd, San Francisco, CA 94102'),
      (3, 4, 'delivered', 34.99, '2025-02-05', '789 Maple Ave, Austin, TX 78701'),
      (4, 5, 'delivered', 44.99, '2025-02-10', '321 Pine Road, Denver, CO 80202'),
      (5, 11, 'delivered', 45.99, '2025-02-15', '654 Elm Court, Chicago, IL 60601'),
      (1, 6, 'delivered', 42.99, '2025-02-20', '123 Oak Street, Portland, OR 97201'),
      (6, 9, 'delivered', 49.99, '2025-03-01', '987 Cedar Lane, Seattle, WA 98101'),
      (7, 13, 'shipped', 34.99, '2025-03-05', '246 Birch Drive, Nashville, TN 37201'),
      (8, 7, 'shipped', 32.99, '2025-03-10', '135 Walnut Blvd, Portland, OR 97202'),
      (2, 9, 'shipped', 49.99, '2025-03-12', '456 Tech Blvd, San Francisco, CA 94102'),
      (9, 1, 'processing', 39.99, '2025-03-15', '864 Rose Way, New York, NY 10001'),
      (10, 5, 'processing', 44.99, '2025-03-18', '753 Ivy Street, Boston, MA 02101'),
      (5, 14, 'pending', 37.99, '2025-03-20', '654 Elm Court, Chicago, IL 60601'),
      (11, 8, 'pending', 36.99, '2025-03-22', '159 Spruce Ave, Miami, FL 33101'),
      (12, 15, 'pending', 49.99, '2025-03-25', '357 Aspen Circle, Los Angeles, CA 90001'),
      (3, 7, 'delivered', 32.99, '2025-02-28', '789 Maple Ave, Austin, TX 78701'),
      (14, 12, 'shipped', 54.99, '2025-03-08', '468 Willow Way, Boise, ID 83701'),
      (16, 3, 'processing', 59.99, '2025-03-19', '852 Sequoia Blvd, San Jose, CA 95101')
    `);

    // Seed feedback
    console.log('Seeding feedback...');
    await client.query(`
      INSERT INTO feedback (customer_id, box_id, rating, comment, sentiment, created_at) VALUES
      (1, 1, 5, 'Absolutely loved the beauty products! The Vitamin C serum was a game changer for my skincare routine.', 'positive', '2025-02-01'),
      (2, 3, 4, 'Great tech gadgets. The wireless charger works perfectly. Would love to see more unique items.', 'positive', '2025-02-05'),
      (3, 4, 5, 'Best book subscription ever! The Midnight Library was an incredible read. Love the bookmark too.', 'positive', '2025-02-15'),
      (4, 5, 3, 'Fitness items were okay but I expected higher quality resistance bands. The protein bar was good though.', 'neutral', '2025-02-20'),
      (5, 11, 5, 'The gourmet spices were phenomenal! Already used the smoked paprika in three different recipes.', 'positive', '2025-02-25'),
      (1, 6, 4, 'Lovely wellness items. The lavender oil smells divine. Meditation guide was a nice bonus touch.', 'positive', '2025-03-01'),
      (6, 9, 4, 'Cool gaming accessories. The keycaps look amazing on my keyboard. More indie game keys please!', 'positive', '2025-03-05'),
      (7, 13, 3, 'Kids enjoyed the STEM kit but it was a bit advanced for my 7-year-old. Better age range guidance would help.', 'neutral', '2025-03-10'),
      (8, 7, 5, 'The Ethiopian coffee is hands down the best I have ever had. Perfect roast and incredible aroma.', 'positive', '2025-03-12'),
      (9, 1, 2, 'Received a damaged jade roller which was disappointing. The serum was nice but packaging needs improvement.', 'negative', '2025-03-15'),
      (10, 5, 4, 'Good variety of fitness products. The yoga blocks are high quality. Would subscribe again.', 'positive', '2025-03-17'),
      (5, 14, 5, 'Love the eco-friendly mission! Bamboo utensils and beeswax wraps are now my daily essentials.', 'positive', '2025-03-20'),
      (11, 8, 4, 'My dog absolutely loves the chew toys. They are durable and safe. Great pet subscription box.', 'positive', '2025-03-22'),
      (12, 15, 3, 'The mystery box was fun but I got items from categories I am not really interested in. More personalization needed.', 'neutral', '2025-03-24'),
      (3, 7, 5, 'Colombian Supremo is perfection in a cup. The tasting notes card was educational and fun.', 'positive', '2025-03-26'),
      (14, 12, 4, 'The survival knife is well-made and the fire starter actually works great. Perfect for camping trips.', 'positive', '2025-03-28'),
      (16, 3, 1, 'The USB-C hub stopped working after two days. Very disappointed with the quality control.', 'negative', '2025-03-30')
    `);

    // Seed box_items
    console.log('Seeding box items...');
    await client.query(`
      INSERT INTO box_items (box_id, product_id, quantity) VALUES
      (1, 1, 1),
      (1, 15, 1),
      (2, 2, 2),
      (2, 16, 1),
      (3, 3, 1),
      (3, 17, 1),
      (4, 4, 1),
      (5, 5, 1),
      (5, 18, 1),
      (6, 6, 1),
      (7, 7, 1),
      (7, 20, 1),
      (8, 8, 2),
      (9, 9, 1),
      (10, 10, 1),
      (11, 11, 1),
      (12, 12, 1),
      (13, 13, 1),
      (14, 14, 1),
      (14, 19, 1),
      (15, 1, 1),
      (15, 2, 1),
      (15, 6, 1)
    `);

    console.log('Seed completed successfully!');
  } catch (err) {
    console.error('Seed error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
