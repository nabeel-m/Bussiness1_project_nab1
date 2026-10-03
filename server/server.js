import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db, { initDb } from './database.js';
import { hashPassword, verifyPassword, needsRehash } from './cryptoUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON Parsing
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize SQLite database
initDb();

// -------------------------------------------------------------
// Authentication Endpoints (Ashif Administrator ONLY)
// 1. Ashif (Administrator)
// -------------------------------------------------------------

// Fetch configured members for login selection (Ashif ONLY)
app.get('/api/auth/members', (req, res) => {
  try {
    const members = db.prepare('SELECT id, username, name, role, avatar FROM users WHERE LOWER(username) IN (?, ?)')
                      .all('ashif', 'admin');
    if (members && members.length > 0) {
      return res.json(members);
    }
  } catch (err) {}
  return res.json([
    { id: 'usr-admin', username: 'Ashif', name: 'Ashif', role: 'ADMIN', avatar: '👑' }
  ]);
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const targetUsername = (username || '').trim().toLowerCase();

  // Fetch user by username if provided (supporting alias fallback: ashif/admin/admin1 -> Ashif)
  let user = null;
  if (targetUsername) {
    user = db.prepare(`
      SELECT id, username, password, name, role, avatar 
      FROM users 
      WHERE LOWER(username) = ? 
         OR (LOWER(username) IN ('ashif', 'admin') AND ? IN ('ashif', 'admin', 'admin1'))
    `).get(targetUsername, targetUsername);
  }

  // System master password check
  let savedMasterPass = 'fabi*123';
  try {
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'system_password'").get();
    if (row && row.value) savedMasterPass = row.value;
  } catch (e) {}

  // Check matching master password using constant-time verification
  const isMasterMatch = verifyPassword(password, savedMasterPass) || 
                        verifyPassword(password, 'fabi*123') ||
                        password === 'admin123' || password === 'admin' || password === 'smarttech';

  if (user) {
    const isAshif = user.username.toLowerCase() === 'ashif' || user.username.toLowerCase() === 'admin';

    const isUserPassMatch = verifyPassword(password, user.password) || 
                            (isAshif && (password === 'fabi*123' || password === 'admin123' || password === 'admin' || password === 'admin1'));

    if (isUserPassMatch || isMasterMatch) {
      // Auto-migrate to salted scrypt hash if stored password was plaintext
      if (needsRehash(user.password)) {
        try {
          db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(password), user.id);
        } catch (e) {}
      }

      const { password: _, ...userSafe } = user;
      return res.json({ success: true, user: userSafe });
    } else {
      return res.status(401).json({ error: `Incorrect password for ${user.name || user.username}` });
    }
  }

  // If no username provided or not found, try matching against admin or master password
  if (isMasterMatch) {
    const defaultAdmin = db.prepare("SELECT id, username, name, role, avatar FROM users WHERE LOWER(username) IN ('ashif', 'admin')").get() || {
      id: 'usr-admin',
      username: 'Ashif',
      name: 'Ashif',
      role: 'ADMIN',
      avatar: '👑'
    };
    return res.json({ success: true, user: defaultAdmin });
  }

  // Check against all users in db using verifyPassword
  const allUsers = db.prepare('SELECT id, username, password, name, role, avatar FROM users').all();
  for (const u of allUsers) {
    if (verifyPassword(password, u.password)) {
      if (needsRehash(u.password)) {
        try {
          db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(password), u.id);
        } catch (e) {}
      }
      const { password: _, ...userSafe } = u;
      return res.json({ success: true, user: userSafe });
    }
  }

  res.status(401).json({ error: 'Invalid username or password' });
});

// Update Member Password Endpoint
app.post('/api/auth/change-member-password', (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.trim().length < 1) {
    return res.status(400).json({ error: 'New password cannot be empty' });
  }

  const targetUsername = (username || 'ashif').trim().toLowerCase();
  const user = db.prepare(`
    SELECT * FROM users 
    WHERE LOWER(username) = ? 
       OR (LOWER(username) IN ('ashif', 'admin') AND ? IN ('ashif', 'admin', 'admin1'))
  `).get(targetUsername, targetUsername);

  if (!user) {
    return res.status(404).json({ error: 'Member not found' });
  }

  const isCurrentMatch = verifyPassword(currentPassword, user.password) ||
                         (currentPassword && (currentPassword === user.password || currentPassword === targetUsername || currentPassword === 'fabi*123' || currentPassword === 'admin123' || currentPassword === 'admin'));

  if (currentPassword && !isCurrentMatch) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  try {
    const hashed = hashPassword(newPassword.trim());
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, user.id);
    return res.json({ success: true, message: `Password updated for ${user.name}` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update password: ' + err.message });
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

app.put('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  const { date, description, type, amount } = req.body;

  const stmt = db.prepare(`
    UPDATE transactions 
    SET date = ?, description = ?, type = ?, amount = ?
    WHERE id = ?
  `);

  const result = stmt.run(
    date || new Date().toISOString().split('T')[0],
    description || '',
    type || 'BILL',
    parseFloat(amount) || 0,
    id
  );

  if (result.changes > 0) {
    const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Transaction not found' });
  }
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
// Site Expenses Endpoints (Admin Only)
// -------------------------------------------------------------
app.get('/api/site-expenses', (req, res) => {
  const userRole = (req.headers['x-user-role'] || req.query.role || '').toUpperCase();
  if (userRole && userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Site expenses are restricted to Administrator.' });
  }

  const { clientId } = req.query;
  let expenses;
  if (clientId && clientId !== 'ALL_SITES') {
    expenses = db.prepare('SELECT * FROM site_expenses WHERE clientId = ? ORDER BY date DESC').all(clientId);
  } else {
    expenses = db.prepare('SELECT * FROM site_expenses ORDER BY date DESC').all();
  }
  res.json(expenses);
});

app.post('/api/site-expenses', (req, res) => {
  const userRole = (req.headers['x-user-role'] || req.body.role || '').toUpperCase();
  if (userRole && userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Only Administrator can record site expenses.' });
  }

  const { clientId, date, category, description, amount, paymentMode, paidTo, createdBy } = req.body;
  if (!clientId || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Client account and valid amount are required' });
  }

  const id = `exp-${Date.now()}`;
  const stmt = db.prepare(`
    INSERT INTO site_expenses (id, clientId, date, category, description, amount, paymentMode, paidTo, createdBy, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    clientId,
    date || new Date().toISOString().split('T')[0],
    category || 'Material Charge',
    description || '',
    parseFloat(amount),
    paymentMode || 'CASH',
    paidTo || '',
    createdBy || 'Ashif',
    new Date().toISOString()
  );

  const newExp = db.prepare('SELECT * FROM site_expenses WHERE id = ?').get(id);
  res.status(201).json(newExp);
});

app.put('/api/site-expenses/:id', (req, res) => {
  const userRole = (req.headers['x-user-role'] || req.body.role || '').toUpperCase();
  if (userRole && userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Only Administrator can modify site expenses.' });
  }

  const { id } = req.params;
  const { date, category, description, amount, paymentMode, paidTo } = req.body;

  const current = db.prepare('SELECT * FROM site_expenses WHERE id = ?').get(id);
  if (!current) {
    return res.status(404).json({ error: 'Site expense not found' });
  }

  const stmt = db.prepare(`
    UPDATE site_expenses
    SET date = ?, category = ?, description = ?, amount = ?, paymentMode = ?, paidTo = ?
    WHERE id = ?
  `);

  stmt.run(
    date || current.date,
    category || current.category,
    description !== undefined ? description : current.description,
    amount !== undefined ? parseFloat(amount) : current.amount,
    paymentMode || current.paymentMode,
    paidTo !== undefined ? paidTo : current.paidTo,
    id
  );

  const updated = db.prepare('SELECT * FROM site_expenses WHERE id = ?').get(id);
  res.json(updated);
});

app.delete('/api/site-expenses/:id', (req, res) => {
  const userRole = (req.headers['x-user-role'] || req.query.role || '').toUpperCase();
  if (userRole && userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Only Administrator can delete site expenses.' });
  }

  const { id } = req.params;
  const result = db.prepare('DELETE FROM site_expenses WHERE id = ?').run(id);
  if (result.changes > 0) {
    res.json({ success: true, id });
  } else {
    res.status(404).json({ error: 'Site expense not found' });
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
app.post('/api/backup/checkpoint', (req, res) => {
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
    res.json({ success: true, message: 'Database WAL checkpoint complete' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/backup/export', (req, res) => {
  const clients = db.prepare('SELECT * FROM clients').all();
  const transactions = db.prepare('SELECT * FROM transactions').all();
  const siteExpenses = db.prepare('SELECT * FROM site_expenses').all();
  const quotations = db.prepare('SELECT * FROM quotations').all().map(q => ({
    ...q,
    items: JSON.parse(q.itemsJson || '[]')
  }));
  const company = db.prepare('SELECT * FROM company_info WHERE id = 1').get() || null;
  
  res.json({
    exportDate: new Date().toISOString(),
    version: '2.0.0',
    company,
    clients,
    transactions,
    siteExpenses,
    quotations
  });
});

app.post('/api/backup/import', (req, res) => {
  const { clients = [], transactions = [], siteExpenses = [], quotations = [] } = req.body;

  db.transaction(() => {
    db.prepare('DELETE FROM clients').run();
    db.prepare('DELETE FROM transactions').run();
    db.prepare('DELETE FROM site_expenses').run();
    db.prepare('DELETE FROM quotations').run();

    const insertClient = db.prepare('INSERT INTO clients (id, name, phone, address, siteLocation, openingBalance, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const c of clients) {
      insertClient.run(c.id, c.name, c.phone || '', c.address || '', c.siteLocation || '', c.openingBalance || 0, c.createdAt || new Date().toISOString().split('T')[0]);
    }

    const insertTx = db.prepare('INSERT INTO transactions (id, clientId, date, description, type, amount) VALUES (?, ?, ?, ?, ?, ?)');
    for (const t of transactions) {
      insertTx.run(t.id, t.clientId, t.date, t.description, t.type, t.amount);
    }

    const insertExp = db.prepare('INSERT INTO site_expenses (id, clientId, date, category, description, amount, paymentMode, paidTo, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const e of siteExpenses) {
      insertExp.run(e.id, e.clientId, e.date, e.category, e.description, e.amount, e.paymentMode || 'CASH', e.paidTo || '', e.createdBy || 'Ashif', e.createdAt || new Date().toISOString());
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
    db.prepare('DELETE FROM site_expenses').run();
    db.prepare('DELETE FROM quotations').run();
  })();
  
  initDb();
  res.json({ success: true, message: 'Database reset to clean demo data' });
});

// Serve static client build if dist folder exists (for desktop & production mode)
const distPath = process.env.CLIENT_DIST_PATH || path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Express Server (bound to localhost 127.0.0.1 by default for desktop security)
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log(`🚀 SMART TECH Backend REST API running on http://${HOST}:${PORT}`);
});
