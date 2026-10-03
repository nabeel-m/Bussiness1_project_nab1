import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { hashPassword, needsRehash } from './cryptoUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.SMARTTECH_DB_PATH || path.join(__dirname, 'smarttech_database.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for high performance
db.pragma('journal_mode = WAL');

// Initialize database tables
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT,
      name TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL,
      avatar TEXT,
      googleId TEXT,
      authProvider TEXT DEFAULT 'LOCAL'
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      siteLocation TEXT,
      openingBalance REAL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      clientId TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      clientId TEXT NOT NULL,
      refNo TEXT NOT NULL,
      date TEXT NOT NULL,
      clientName TEXT NOT NULL,
      clientAddress TEXT,
      itemsJson TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS company_info (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      tagline TEXT,
      address TEXT,
      phones TEXT,
      sloganQuote TEXT,
      sloganSub TEXT,
      tradeMarkText TEXT
    );

    CREATE TABLE IF NOT EXISTS sso_access_slots (
      id TEXT PRIMARY KEY,
      slotName TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL,
      defaultName TEXT NOT NULL,
      avatar TEXT
    );

    CREATE TABLE IF NOT EXISTS passkeys (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      userId TEXT,
      credentialId TEXT UNIQUE NOT NULL,
      publicKey TEXT,
      counter INTEGER DEFAULT 0,
      deviceLabel TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_expenses (
      id TEXT PRIMARY KEY,
      clientId TEXT NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      paymentMode TEXT DEFAULT 'CASH',
      paidTo TEXT,
      createdBy TEXT DEFAULT 'Admin',
      createdAt TEXT NOT NULL,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_site_expenses_clientId ON site_expenses(clientId);
  `);

  // Migrate users table columns if missing
  try {
    const userColumns = db.pragma('table_info(users)').map(c => c.name);
    if (!userColumns.includes('email')) {
      db.exec('ALTER TABLE users ADD COLUMN email TEXT');
    }
    if (!userColumns.includes('googleId')) {
      db.exec('ALTER TABLE users ADD COLUMN googleId TEXT');
    }
    if (!userColumns.includes('authProvider')) {
      db.exec("ALTER TABLE users ADD COLUMN authProvider TEXT DEFAULT 'LOCAL'");
    }
  } catch (err) {
    console.warn('Migration note on users table:', err.message);
  }

  // Seed or update Google SSO Access Slot (Ashif Admin ONLY)
  const defaultSlots = [
    { id: 'slot-admin', slotName: 'Admin: Managing Director', email: 'smartechpalakkad@gmail.com', role: 'ADMIN', defaultName: 'Ashif (Admin)', avatar: '👑' }
  ];

  // Clean up legacy SSO slots if any
  try {
    db.prepare("DELETE FROM sso_access_slots WHERE id != 'slot-admin'").run();
  } catch (e) {}

  for (const s of defaultSlots) {
    const existing = db.prepare('SELECT * FROM sso_access_slots WHERE id = ?').get(s.id);
    if (!existing) {
      db.prepare(`
        INSERT INTO sso_access_slots (id, slotName, email, role, defaultName, avatar)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(s.id, s.slotName, s.email, s.role, s.defaultName, s.avatar);
    } else {
      db.prepare(`
        UPDATE sso_access_slots 
        SET slotName = ?, role = ?, defaultName = ?, avatar = ?,
            email = CASE WHEN (email IS NULL OR email = '' OR id = 'slot-admin') AND ? != '' THEN ? ELSE email END
        WHERE id = ?
      `).run(s.slotName, s.role, s.defaultName, s.avatar, s.email, s.email, s.id);
    }
  }

  // Ensure Admin email is explicitly set
  try {
    db.prepare("UPDATE sso_access_slots SET email = 'smartechpalakkad@gmail.com' WHERE id = 'slot-admin'").run();
  } catch (e) {}

  // Seed default company info
  const checkCompany = db.prepare('SELECT COUNT(*) as count FROM company_info').get();
  if (checkCompany.count === 0) {
    db.prepare(`
      INSERT INTO company_info (id, name, tagline, address, phones, sloganQuote, sloganSub, tradeMarkText)
      VALUES (1, 'SMART TECH', 'INTERIOR & EXTERIOR SOLUTIONS', 'Nurani Junction, Palakkad, Kerala', '+91 9995984554, +91 8921889770', '"Every constructions are dreams, To make your dreams more colourful "', 'SMART TECH ... Always With You!!!', 'SMART TECH ™ INTERIOR & EXTERIOR SOLUTION...')
    `).run();
  }

  // Seed or update system password in system_settings using salted hash if not already hashed
  const currentSysPass = db.prepare("SELECT value FROM system_settings WHERE key = 'system_password'").get();
  if (!currentSysPass || needsRehash(currentSysPass.value)) {
    db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('system_password', ?)").run(hashPassword('fabi*123'));
  }

  // Migrate legacy 'admin' username to 'Ashif'
  try {
    db.prepare("UPDATE users SET username = 'Ashif', name = 'Ashif' WHERE LOWER(username) = 'admin'").run();
  } catch (e) {}

  // Seed or sync strictly one login user: Ashif (Admin) ONLY
  const memberSpecs = [
    { id: 'usr-admin', username: 'Ashif', name: 'Ashif', role: 'ADMIN', avatar: '👑', defaultPass: 'fabi*123', email: 'smartechpalakkad@gmail.com' }
  ];

  // Purge developer and any non-Ashif accounts
  try {
    db.prepare("DELETE FROM users WHERE LOWER(username) NOT IN ('ashif', 'admin') OR id = 'usr-developer' OR LOWER(username) = 'developer'").run();
  } catch (e) {}

  for (const spec of memberSpecs) {
    const existing = db.prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR (LOWER(?) = 'ashif' AND LOWER(username) = 'admin')").get(spec.username, spec.username);
    if (!existing) {
      db.prepare('INSERT INTO users (id, username, password, name, role, avatar, email) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(spec.id, spec.username, hashPassword(spec.defaultPass), spec.name, spec.role, spec.avatar, spec.email);
    } else {
      // If current password is not hashed, convert it to salted hash
      const passwordToSave = needsRehash(existing.password) ? hashPassword(spec.defaultPass) : existing.password;
      db.prepare(`
        UPDATE users 
        SET username = ?, name = ?, role = ?, avatar = ?, email = ?, password = ?
        WHERE id = ? OR LOWER(username) = LOWER(?)
      `).run(spec.username, spec.name, spec.role, spec.avatar, spec.email, passwordToSave, existing.id, spec.username);
    }
  }

  // Seed default client & transactions if empty
  const checkClients = db.prepare('SELECT COUNT(*) as count FROM clients').get();
  if (checkClients.count === 0) {
    const insertClient = db.prepare(`
      INSERT INTO clients (id, name, phone, address, siteLocation, openingBalance, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertClient.run('client-1', 'Kallekad Block Site Project', '+91 9847012345', 'Kallekad, Palakkad', 'Kallekad Block Site', 1258382, '2026-06-01');
    insertClient.run('client-2', 'Nurani Residency Villa', '+91 9447198765', 'Nurani Junction, Palakkad', 'Nurani Site 02', 450000, '2026-06-15');
    insertClient.run('client-3', 'Chandranagar Commercial Complex', '+91 9745123456', 'Chandranagar, Palakkad', 'Chandranagar Mall', 850000, '2026-07-01');

    const insertTx = db.prepare(`
      INSERT INTO transactions (id, clientId, date, description, type, amount)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertTx.run('tx-1', 'client-1', '2026-07-10', 'Second Bill Amount', 'BILL', 129950);
    insertTx.run('tx-2', 'client-1', '2026-07-12', 'Borrowed money advance credit', 'PAYMENT', 100000);
    insertTx.run('tx-3', 'client-1', '2026-07-14', '3rd & 4th bill balance amount', 'BILL', 966823);
    insertTx.run('tx-4', 'client-1', '2026-07-14', 'Advance Paid Deduction', 'PAYMENT', 61609);
  }

  // Seed default site expenses if empty
  const checkExpenses = db.prepare('SELECT COUNT(*) as count FROM site_expenses').get();
  if (checkExpenses.count === 0) {
    const insertExp = db.prepare(`
      INSERT INTO site_expenses (id, clientId, date, category, description, amount, paymentMode, paidTo, createdBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertExp.run(
      'exp-1',
      'client-1',
      '2026-07-06',
      'Material Charge',
      'Cement, primer & wall putty - Royal Hardware Palakkad',
      38500,
      'UPI',
      'Royal Hardware Palakkad',
      'Ashif',
      new Date().toISOString()
    );

    insertExp.run(
      'exp-2',
      'client-1',
      '2026-07-09',
      'Labour Charge',
      '4 Master Painters & 2 Helpers (5 Days Stage 1 site work)',
      24000,
      'CASH',
      'Suresh Painter & Team',
      'Ashif',
      new Date().toISOString()
    );

    insertExp.run(
      'exp-3',
      'client-1',
      '2026-07-12',
      'Transport / Vehicle',
      'Tempo vehicle rental for scaffolding & aluminum frame delivery',
      3200,
      'CASH',
      'Manaf Tempo Services',
      'Ashif',
      new Date().toISOString()
    );
  }

  console.log('Database initialized successfully at:', dbPath);
}

// Auto-run initialization & migrations
initDb();

export default db;
