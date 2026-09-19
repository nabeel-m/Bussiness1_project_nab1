import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { initDb } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

initDb();

console.log('Generating PDF data snapshot for SMART TECH Quotation...');

const clients = db.prepare('SELECT * FROM clients').all();
const transactions = db.prepare('SELECT * FROM transactions').all();

const client = clients[0] || { name: 'Kallekad Block Site Project', siteLocation: 'Kallekad, Palakkad', openingBalance: 0 };
const clientTxs = transactions.filter(t => t.clientId === client.id);

let runningBalance = Number(client.openingBalance) || 0;
const processedTxs = clientTxs.map(tx => {
  const amt = Number(tx.amount) || 0;
  if (tx.type === 'BILL' || tx.type === 'DEBIT') {
    runningBalance += amt;
  } else {
    runningBalance -= amt;
  }
  return { ...tx, currentRunningBalance: runningBalance };
});

const reportData = {
  company: 'SMART TECH',
  clientName: client.name,
  siteLocation: client.siteLocation || client.address || 'Palakkad, Kerala',
  refNo: '004',
  quotationDate: new Date().toISOString().split('T')[0],
  openingBalance: client.openingBalance || 0,
  statementRows: processedTxs,
  netBalance: runningBalance
};

const pdfSummaryPath = path.join(__dirname, '../Quotation_SMRT_004_Snapshot.json');
fs.writeFileSync(pdfSummaryPath, JSON.stringify(reportData, null, 2));

console.log(`✅ Quotation data snapshot created at: ${pdfSummaryPath}`);
