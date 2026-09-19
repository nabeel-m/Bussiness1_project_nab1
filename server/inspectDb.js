import db from './database.js';

console.log('\n======================================================');
console.log('   📊 SMART TECH SQLite Database Inspection Tool      ');
console.log('======================================================\n');

// 1. Inspect Clients
console.log('--- 👥 CLIENTS TABLE ---');
const clients = db.prepare('SELECT * FROM clients').all();
console.table(clients);

// 2. Inspect Transactions
console.log('\n--- 💳 TRANSACTIONS TABLE ---');
const transactions = db.prepare('SELECT * FROM transactions').all();
console.table(transactions);

// 3. Inspect Users
console.log('\n--- 👑 USERS & PERMISSIONS TABLE ---');
const users = db.prepare('SELECT id, username, email, role, googleId, authProvider, avatar FROM users').all();
console.table(users);

// 4. Inspect Quotations
console.log('\n--- 📑 QUOTATIONS TABLE ---');
const quotations = db.prepare('SELECT id, clientId, refNo, date, clientName FROM quotations').all();
console.table(quotations);

console.log('\n======================================================');
console.log('   Database File: server/smarttech_database.sqlite    ');
console.log('======================================================\n');
