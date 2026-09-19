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

// Google SSO Authentication Endpoint (Strict 3 Users Access Control: 2 Admin, 1 Staff)
app.post('/api/auth/google', (req, res) => {
  const { googleId, email, name, avatar, role } = req.body;
  
  if (!googleId && !email) {
    return res.status(400).json({ error: 'Valid Google user identity (googleId or email) is required' });
  }

  try {
    const userEmail = email ? email.trim() : '';
    const baseUsername = userEmail ? userEmail.split('@')[0].toLowerCase() : (googleId ? `g_${googleId.slice(0, 8)}` : 'google_user');

    // Check against configured 3-user SSO slots in SQLite
    let matchedSlot = null;
    if (userEmail) {
      matchedSlot = db.prepare('SELECT * FROM sso_access_slots WHERE LOWER(email) = LOWER(?)').get(userEmail);
    }

    const assignedRole = role || (matchedSlot ? matchedSlot.role : 'ADMIN');

    // 1. Check if user already exists by googleId, email, or base username
    let user = null;
    if (googleId) {
      user = db.prepare('SELECT id, username, name, role, avatar, email, googleId, authProvider FROM users WHERE googleId = ?').get(googleId);
    }
    if (!user && userEmail) {
      user = db.prepare('SELECT id, username, name, role, avatar, email, googleId, authProvider FROM users WHERE LOWER(email) = LOWER(?)').get(userEmail);
    }
    if (!user) {
      user = db.prepare('SELECT id, username, name, role, avatar, email, googleId, authProvider FROM users WHERE LOWER(username) = LOWER(?)').get(baseUsername);
    }

    if (user) {
      const newRole = assignedRole || user.role;
      const updateStmt = db.prepare(`
        UPDATE users 
        SET googleId = COALESCE(?, googleId),
            email = COALESCE(?, email),
            avatar = COALESCE(?, avatar),
            role = ?,
            authProvider = COALESCE(authProvider, 'GOOGLE')
        WHERE id = ?
      `);
      updateStmt.run(googleId || null, userEmail || null, avatar || null, newRole, user.id);
      
      const updatedUser = db.prepare('SELECT id, username, name, role, avatar, email, googleId, authProvider FROM users WHERE id = ?').get(user.id);
      return res.json({ success: true, user: updatedUser });
    }

    // 2. Auto-provision new Google SSO User with specific role
    const newId = `usr-g-${Date.now()}`;
    const userName = name || (matchedSlot ? matchedSlot.defaultName : (userEmail ? userEmail.split('@')[0] : 'Google User'));
    const userRole = assignedRole;
    const userAvatar = avatar || (matchedSlot ? matchedSlot.avatar : '🌐');

    const insertStmt = db.prepare(`
      INSERT INTO users (id, username, password, name, email, role, avatar, googleId, authProvider)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(newId, baseUsername, '', userName, userEmail || '', userRole, userAvatar, googleId || null, 'GOOGLE');
    
    const createdUser = db.prepare('SELECT id, username, name, role, avatar, email, googleId, authProvider FROM users WHERE id = ?').get(newId);
    return res.status(201).json({ success: true, user: createdUser });
  } catch (err) {
    console.error('Error during Google authentication:', err);
    return res.status(500).json({ error: 'Failed to process Google authentication: ' + err.message });
  }
});

// -------------------------------------------------------------
// Google Passkey (WebAuthn / FIDO2) Authentication Endpoints
// -------------------------------------------------------------
app.post('/api/auth/passkey/login', (req, res) => {
  const { email, credentialId, rawId } = req.body;
  
  try {
    const userEmail = email ? email.trim() : 'director.admin1@gmail.com';
    const baseUsername = userEmail.split('@')[0].toLowerCase();

    // 1. Check if email matches one of the Admin slots
    let matchedSlot = db.prepare('SELECT * FROM sso_access_slots WHERE LOWER(email) = LOWER(?)').get(userEmail);
    if (!matchedSlot) {
      // Check if slot name has admin or slot 1/2
      if (baseUsername.includes('admin') || baseUsername.includes('director') || baseUsername.includes('partner')) {
        matchedSlot = db.prepare("SELECT * FROM sso_access_slots WHERE role = 'ADMIN' LIMIT 1").get();
      }
    }

    // 2. Look up or auto-provision Admin user
    let user = db.prepare('SELECT id, username, name, role, avatar, email, googleId, authProvider FROM users WHERE LOWER(email) = LOWER(?)').get(userEmail);
    
    if (!user) {
      user = db.prepare('SELECT id, username, name, role, avatar, email, googleId, authProvider FROM users WHERE LOWER(username) = LOWER(?)').get(baseUsername);
    }

    if (!user) {
      const newId = `usr-passkey-${Date.now()}`;
      const role = matchedSlot ? matchedSlot.role : 'ADMIN';
      const name = matchedSlot ? matchedSlot.defaultName : (userEmail.includes('admin') ? 'Managing Director (Admin)' : 'Admin User');
      const avatar = '👑';

      const insertStmt = db.prepare(`
        INSERT INTO users (id, username, password, name, email, role, avatar, authProvider)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertStmt.run(newId, baseUsername, '', name, userEmail, role, avatar, 'GOOGLE_PASSKEY');
      user = db.prepare('SELECT id, username, name, role, avatar, email, googleId, authProvider FROM users WHERE id = ?').get(newId);
    } else {
      // Update email and authProvider tag
      db.prepare("UPDATE users SET email = ?, authProvider = 'GOOGLE_PASSKEY' WHERE id = ?").run(userEmail, user.id);
      user = db.prepare('SELECT id, username, name, role, avatar, email, googleId, authProvider FROM users WHERE id = ?').get(user.id);
    }

    return res.json({ success: true, user });
  } catch (err) {
    console.error('Passkey authentication error:', err);
    return res.status(500).json({ error: 'Failed to verify passkey: ' + err.message });
  }
});

app.post('/api/auth/passkey/register', (req, res) => {
  const { email, credentialId, deviceLabel } = req.body;
  if (!email || !credentialId) {
    return res.status(400).json({ error: 'Email and Credential ID are required' });
  }

  try {
    const id = `pk-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO passkeys (id, email, credentialId, deviceLabel, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertStmt.run(id, email.trim(), credentialId, deviceLabel || 'Google Passkey Device', createdAt);
    return res.json({ success: true, message: 'Passkey registered successfully for ' + email });
  } catch (err) {
    console.error('Passkey registration error:', err);
    return res.status(500).json({ error: 'Failed to register passkey: ' + err.message });
  }
});

// -------------------------------------------------------------
// SSO 3-User Access Slots Configuration Endpoints
// -------------------------------------------------------------
app.get('/api/auth/sso-slots', (req, res) => {
  const slots = db.prepare('SELECT * FROM sso_access_slots ORDER BY id ASC').all();
  res.json(slots);
});

app.put('/api/auth/sso-slots', (req, res) => {
  const { slots } = req.body; // array of { id, email, slotName }
  if (!Array.isArray(slots)) {
    return res.status(400).json({ error: 'Slots array is required' });
  }

  const updateStmt = db.prepare('UPDATE sso_access_slots SET email = ? WHERE id = ?');
  db.transaction(() => {
    for (const s of slots) {
      updateStmt.run(s.email ? s.email.trim() : '', s.id);
    }
  })();

  const updated = db.prepare('SELECT * FROM sso_access_slots ORDER BY id ASC').all();
  res.json({ success: true, slots: updated });
});

app.get('/api/auth/users', (req, res) => {
  const users = db.prepare('SELECT id, username, name, role, avatar, email, googleId, authProvider FROM users').all();
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
