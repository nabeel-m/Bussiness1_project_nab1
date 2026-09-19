import express from 'express';
import cors from 'cors';
import db, { initDb } from './database.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON Parsing
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize SQLite database
initDb();

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT id, username, name, role, avatar FROM users WHERE LOWER(username) = LOWER(?) AND password = ?')
                .get(username.trim(), password);

  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

app.get('/api/auth/users', (req, res) => {
  const users = db.prepare('SELECT id, username, name, role, avatar FROM users').all();
  res.json(users);
});

// -------------------------------------------------------------
// Client Accounts Endpoints
// -------------------------------------------------------------
app.get('/api/clients', (req, res) => {
  const clients = db.prepare('SELECT * FROM clients ORDER BY createdAt DESC').all();
  res.json(clients);
});

app.post('/api/clients', (req, res) => {
  const { name, phone, address, siteLocation, openingBalance } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Client name is required' });
  }

  const id = `client-${Date.now()}`;
  const createdAt = new Date().toISOString().split('T')[0];

  const stmt = db.prepare(`
    INSERT INTO clients (id, name, phone, address, siteLocation, openingBalance, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, name.trim(), phone || '', address || '', siteLocation || '', parseFloat(openingBalance) || 0, createdAt);
  
  const newClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  res.status(201).json(newClient);
});

app.put('/api/clients/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, address, siteLocation, openingBalance } = req.body;

  const stmt = db.prepare(`
    UPDATE clients 
    SET name = ?, phone = ?, address = ?, siteLocation = ?, openingBalance = ?
    WHERE id = ?
  `);

  const result = stmt.run(name.trim(), phone || '', address || '', siteLocation || '', parseFloat(openingBalance) || 0, id);
  
  if (result.changes > 0) {
    const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Client not found' });
  }
});

app.delete('/api/clients/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  if (result.changes > 0) {
    res.json({ success: true, id });
  } else {
    res.status(404).json({ error: 'Client not found' });
  }
});

// -------------------------------------------------------------
// Transaction Ledger Endpoints
// -------------------------------------------------------------
app.get('/api/transactions', (req, res) => {
  const { clientId } = req.query;
  let txs;
  if (clientId) {
    txs = db.prepare('SELECT * FROM transactions WHERE clientId = ? ORDER BY date ASC').all(clientId);
  } else {
    txs = db.prepare('SELECT * FROM transactions ORDER BY date ASC').all();
  }
  res.json(txs);
});

app.post('/api/transactions', (req, res) => {
  const { clientId, date, description, type, amount } = req.body;
  if (!clientId || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Client ID and valid amount are required' });
  }

  const id = `tx-${Date.now()}`;
  const stmt = db.prepare(`
    INSERT INTO transactions (id, clientId, date, description, type, amount)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, clientId, date || new Date().toISOString().split('T')[0], description || '', type || 'BILL', parseFloat(amount));
  
  const newTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  res.status(201).json(newTx);
});

app.delete('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  if (result.changes > 0) {
    res.json({ success: true, id });
  } else {
    res.status(404).json({ error: 'Transaction not found' });
  }
});

// -------------------------------------------------------------
// Quotation Endpoints
// -------------------------------------------------------------
app.get('/api/quotations', (req, res) => {
  const quotations = db.prepare('SELECT * FROM quotations ORDER BY date DESC').all();
  const parsed = quotations.map(q => ({
    ...q,
    items: JSON.parse(q.itemsJson || '[]')
  }));
  res.json(parsed);
});

app.post('/api/quotations', (req, res) => {
  const { clientId, refNo, date, clientName, clientAddress, items } = req.body;
  const id = `quot-${Date.now()}`;

  const stmt = db.prepare(`
    INSERT INTO quotations (id, clientId, refNo, date, clientName, clientAddress, itemsJson)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, clientId || '', refNo || '', date || new Date().toISOString().split('T')[0], clientName || '', clientAddress || '', JSON.stringify(items || []));
  
  const created = db.prepare('SELECT * FROM quotations WHERE id = ?').get(id);
  res.status(201).json({ ...created, items: JSON.parse(created.itemsJson) });
});

// -------------------------------------------------------------
// Company Info Endpoint
// -------------------------------------------------------------
app.get('/api/company', (req, res) => {
  const company = db.prepare('SELECT * FROM company_info WHERE id = 1').get();
  res.json(company);
});

// -------------------------------------------------------------
// System Backup & Reset Endpoints
// -------------------------------------------------------------
app.get('/api/backup/export', (req, res) => {
  const clients = db.prepare('SELECT * FROM clients').all();
  const transactions = db.prepare('SELECT * FROM transactions').all();
  const quotations = db.prepare('SELECT * FROM quotations').all().map(q => ({
    ...q,
    items: JSON.parse(q.itemsJson || '[]')
  }));
  
  res.json({
    exportDate: new Date().toISOString(),
    clients,
    transactions,
    quotations
  });
});

app.post('/api/backup/import', (req, res) => {
  const { clients = [], transactions = [], quotations = [] } = req.body;

  db.transaction(() => {
    db.prepare('DELETE FROM clients').run();
    db.prepare('DELETE FROM transactions').run();
    db.prepare('DELETE FROM quotations').run();

    const insertClient = db.prepare('INSERT INTO clients (id, name, phone, address, siteLocation, openingBalance, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const c of clients) {
      insertClient.run(c.id, c.name, c.phone || '', c.address || '', c.siteLocation || '', c.openingBalance || 0, c.createdAt || new Date().toISOString().split('T')[0]);
    }

    const insertTx = db.prepare('INSERT INTO transactions (id, clientId, date, description, type, amount) VALUES (?, ?, ?, ?, ?, ?)');
    for (const t of transactions) {
      insertTx.run(t.id, t.clientId, t.date, t.description, t.type, t.amount);
    }

    const insertQuot = db.prepare('INSERT INTO quotations (id, clientId, refNo, date, clientName, clientAddress, itemsJson) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const q of quotations) {
      insertQuot.run(q.id, q.clientId, q.refNo, q.date, q.clientName, q.clientAddress, JSON.stringify(q.items || []));
    }
  })();

  res.json({ success: true, message: 'Database backup imported successfully' });
});

app.post('/api/reset', (req, res) => {
  db.transaction(() => {
    db.prepare('DELETE FROM clients').run();
    db.prepare('DELETE FROM transactions').run();
    db.prepare('DELETE FROM quotations').run();
  })();
  
  initDb();
  res.json({ success: true, message: 'Database reset to clean demo data' });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 SMART TECH Backend REST API running on http://localhost:${PORT}`);
});
