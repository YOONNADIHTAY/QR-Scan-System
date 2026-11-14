require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function init() {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  const connection = await mysql.createConnection({
    host: DB_HOST || 'localhost',
    user: DB_USER || 'root',
    password: DB_PASSWORD || '',
    multipleStatements: true,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await connection.query(`USE \`${DB_NAME}\``);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      facebook_link VARCHAR(500),
      tiktok_link VARCHAR(500),
      youtube_link VARCHAR(500),
      google_map_link VARCHAR(1000),
      location_name VARCHAR(255),
      phone_numbers JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS product_photos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      profile_id VARCHAR(36) NOT NULL,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    )
  `);

  console.log(`Database "${DB_NAME}" initialized successfully.`);
  await connection.end();
}

init().catch((err) => {
  console.error('Database init failed:', err.message);
  process.exit(1);
});
