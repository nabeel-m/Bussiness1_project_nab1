import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'smarttech_database.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for high performance
db.pragma('journal_mode = WAL');

// Initialize database tables
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar TEXT
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
  `);

  // Seed default company info
  const checkCompany = db.prepare('SELECT COUNT(*) as count FROM company_info').get();
  if (checkCompany.count === 0) {
    db.prepare(`
      INSERT INTO company_info (id, name, tagline, address, phones, sloganQuote, sloganSub, tradeMarkText)
      VALUES (1, 'SMART TECH', 'INTERIOR & EXTERIOR SOLUTIONS', 'Nurani Junction, Palakkad, Kerala', '+91 9995984554, +91 8921889770', '"Every constructions are dreams, To make your dreams more colourful "', 'SMART TECH ... Always With You!!!', 'SMART TECH ™ INTERIOR & EXTERIOR SOLUTION...')
    `).run();
  }

  // Seed default users if empty
  const checkUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (checkUsers.count === 0) {
    const insertUser = db.prepare('INSERT INTO users (id, username, password, name, role, avatar) VALUES (?, ?, ?, ?, ?, ?)');
    insertUser.run('usr-admin', 'admin', 'admin123', 'System Admin / Owner', 'ADMIN', '👑');
    insertUser.run('usr-staff', 'staff', 'staff123', 'Billing Staff Operator', 'STAFF', '💼');
    insertUser.run('usr-client', 'client', 'client123', 'Client Read-Only Viewer', 'VIEWER', '👁️');
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

  console.log('Database initialized successfully at:', dbPath);
}

export default db;
