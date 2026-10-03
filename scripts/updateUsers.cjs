const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

const dbPaths = [
  path.join(__dirname, '..', 'server', 'smarttech_database.sqlite'),
  path.join(process.env.APPDATA || '', 'SMART TECH Billing & Quotation', 'smarttech_database.sqlite'),
  path.join(process.env.APPDATA || '', 'smarttech-billing-quotation-sw', 'smarttech_database.sqlite'),
  path.join(os.homedir(), 'SMART-TECH-Billing-App', 'server', 'smarttech_database.sqlite')
];

for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) {
    console.log('Skipping (not found):', dbPath);
    continue;
  }
  console.log('\n======================================================');
  console.log('--- Updating Database at:', dbPath);
  console.log('======================================================');
  
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Purge all users except Ashif and admin, explicitly deleting developer
  const delUsers = db.prepare("DELETE FROM users WHERE LOWER(username) NOT IN ('ashif', 'admin') OR id = 'usr-developer' OR LOWER(username) = 'developer'").run();
  console.log(`Deleted ${delUsers.changes} non-Ashif user records.`);

  // Clean SSO slots (Ashif admin only)
  try {
    const delSlots = db.prepare("DELETE FROM sso_access_slots WHERE id != 'slot-admin'").run();
    console.log(`Deleted ${delSlots.changes} non-admin SSO slot records.`);
  } catch(e) {}

  // Salted scrypt hash for fabi*123
  const hashedPassword = hashPassword('fabi*123');

  // Upsert Ashif user
  const ashifExists = db.prepare("SELECT * FROM users WHERE LOWER(username) IN ('ashif', 'admin')").get();
  if (!ashifExists) {
    db.prepare("INSERT INTO users (id, username, password, name, role, avatar, email, authProvider) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run('usr-admin', 'Ashif', hashedPassword, 'Ashif', 'ADMIN', '👑', 'smartechpalakkad@gmail.com', 'LOCAL');
    console.log('Inserted Ashif user with salted scrypt hash.');
  } else {
    db.prepare("UPDATE users SET username = 'Ashif', password = ?, name = 'Ashif', role = 'ADMIN', avatar = '👑', email = 'smartechpalakkad@gmail.com', authProvider = 'LOCAL' WHERE id = ? OR LOWER(username) IN ('ashif', 'admin')").run(hashedPassword, ashifExists.id);
    console.log('Updated Ashif user with salted scrypt hash.');
  }

  // Ensure system settings with salted hash
  db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('system_password', ?)").run(hashPassword('fabi*123'));

  // Print results
  console.log('\nFinal Users in DB:');
  console.table(db.prepare('SELECT id, username, password, name, role, avatar, email FROM users').all());

  console.log('\nFinal SSO Slots:');
  console.table(db.prepare('SELECT * FROM sso_access_slots').all());

  db.close();
}

console.log('\n✅ Database migration completed successfully!');
