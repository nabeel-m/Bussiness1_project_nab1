const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPaths = [
  path.join(__dirname, '..', 'server', 'smarttech_database.sqlite'),
  path.join(process.env.APPDATA || '', 'SMART TECH Billing & Quotation', 'smarttech_database.sqlite')
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

  // Purge all users except admin and developer
  const delUsers = db.prepare("DELETE FROM users WHERE LOWER(username) NOT IN ('admin', 'developer')").run();
  console.log(`Deleted ${delUsers.changes} non-admin/developer user records.`);

  // Clean SSO slots
  try {
    const delSlots = db.prepare("DELETE FROM sso_access_slots WHERE id NOT IN ('slot-admin', 'slot-developer')").run();
    console.log(`Deleted ${delSlots.changes} non-admin/developer SSO slot records.`);
  } catch(e) {}

  // Upsert admin user
  const adminExists = db.prepare("SELECT * FROM users WHERE LOWER(username) = 'admin'").get();
  if (!adminExists) {
    db.prepare("INSERT INTO users (id, username, password, name, role, avatar, email, authProvider) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run('usr-admin', 'admin', 'admin123', 'Administrator (Admin)', 'ADMIN', '👑', 'smartechpalakkad@gmail.com', 'LOCAL');
    console.log('Inserted admin user.');
  } else {
    db.prepare("UPDATE users SET password = 'admin123', name = 'Administrator (Admin)', role = 'ADMIN', avatar = '👑', email = 'smartechpalakkad@gmail.com', authProvider = 'LOCAL' WHERE LOWER(username) = 'admin'").run();
    console.log('Updated admin user with password admin123.');
  }

  // Upsert developer user
  const devExists = db.prepare("SELECT * FROM users WHERE LOWER(username) = 'developer'").get();
  if (!devExists) {
    db.prepare("INSERT INTO users (id, username, password, name, role, avatar, email, authProvider) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run('usr-developer', 'developer', 'dev123', 'Developer', 'ADMIN', '💻', 'nabeel.softcode@gmail.com', 'LOCAL');
    console.log('Inserted developer user.');
  } else {
    db.prepare("UPDATE users SET password = 'dev123', name = 'Developer', role = 'ADMIN', avatar = '💻', email = 'nabeel.softcode@gmail.com', authProvider = 'LOCAL' WHERE LOWER(username) = 'developer'").run();
    console.log('Updated developer user with password dev123.');
  }

  // Ensure system settings
  db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('system_password', 'admin123')").run();

  // Print results
  console.log('\nFinal Users in DB:');
  console.table(db.prepare('SELECT id, username, password, name, role, avatar, email FROM users').all());

  console.log('\nFinal SSO Slots:');
  console.table(db.prepare('SELECT * FROM sso_access_slots').all());

  db.close();
}

console.log('\n✅ Database migration completed successfully!');
