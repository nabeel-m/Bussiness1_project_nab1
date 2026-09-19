/**
 * Formats a number to Indian Currency system (e.g., 1,29,950.00 or 11,96,773.00)
 * @param {number|string} amount 
 * @param {boolean} includeSymbol 
 * @returns {string}
 */
export function formatIndianCurrency(amount, includeSymbol = false) {
  if (amount === undefined || amount === null || amount === '') return '0.00';
  const numericValue = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
  if (isNaN(numericValue)) return '0.00';

  const parts = numericValue.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  const isNegative = integerPart.startsWith('-');
  if (isNegative) integerPart = integerPart.substring(1);

  let lastThree = integerPart.slice(-3);
  const otherNumbers = integerPart.slice(0, -3);

  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }

  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const result = (isNegative ? '-' : '') + formattedInteger + '.' + decimalPart;

  return includeSymbol ? `₹ ${result}` : result;
}

/**
 * Convert a number to Indian currency words (e.g., Ninety Five Thousand Nine Hundred Fifty Rupees Only)
 * @param {number} num 
 * @returns {string}
 */
export function numberToWordsIndian(num) {
  if (num === null || num === undefined || isNaN(num) || num === 0) return 'Zero Rupees Only';

  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n) => {
    let str = '';
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : ' ');
    } else {
      str += a[n];
    }
    return str;
  };

  const val = Math.floor(Math.abs(num));
  let result = '';

  const crore = Math.floor(val / 10000000);
  const lakh = Math.floor((val % 10000000) / 100000);
  const thousand = Math.floor((val % 100000) / 1000);
  const hundred = Math.floor((val % 1000) / 100);
  const rest = val % 100;

  if (crore) result += inWords(crore) + 'Crore ';
  if (lakh) result += inWords(lakh) + 'Lakh ';
  if (thousand) result += inWords(thousand) + 'Thousand ';
  if (hundred) result += inWords(hundred) + 'Hundred ';
  if (rest) result += inWords(rest);

  return `${result.trim()} Rupees Only`;
}

/**
 * Formats a date string to DD-MM-YYYY or MMM DD, YYYY
 * @param {string|Date} dateInput 
 * @param {boolean} formattedText 
 * @returns {string}
 */
export function formatDateIndian(dateInput, formattedText = false) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  if (formattedText) {
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${monthNames[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
  }
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Generate Next Reference Number (e.g., 004 or SMRT/2024-25/001)
 * @param {number} sequenceNumber 
 * @returns {string}
 */
export function generateRefNo(sequenceNumber = 1) {
  return String(sequenceNumber).padStart(3, '0');
}

/**
 * Sorts transactions chronologically by date (ascending)
 * @param {Array} transactions 
 * @returns {Array}
 */
export function getSortedTransactions(transactions = []) {
  return [...transactions].sort((a, b) => {
    const dateA = new Date(a.date || '1970-01-01').getTime();
    const dateB = new Date(b.date || '1970-01-01').getTime();
    if (dateA !== dateB) return dateA - dateB;
    return (a.id || '').localeCompare(b.id || '');
  });
}

/**
 * Calculate client ledger running balances in strict chronological order
 * @param {Object} client 
 * @param {Array} transactions 
 * @returns {Object} { processedTxs, netBalance }
 */
export function calculateClientLedger(client, transactions = []) {
  if (!client) return { processedTxs: [], netBalance: 0 };
  
  const clientTxs = transactions.filter(t => t.clientId === client.id);
  const sortedTxs = getSortedTransactions(clientTxs);

  let runningBalance = Number(client.openingBalance) || 0;
  const processedTxs = sortedTxs.map(tx => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'BILL' || tx.type === 'DEBIT') {
      runningBalance += amt;
    } else {
      runningBalance -= amt;
    }
    return { ...tx, currentRunningBalance: runningBalance };
  });

  return {
    processedTxs,
    netBalance: runningBalance
  };
}

/**
 * Auto-generate quotation item rows matching the sample bill layout from client's latest Tally ledger
 * @param {Object} client 
 * @param {Array} transactions 
 * @returns {Array}
 */
export function generateQuotationItemsFromLedger(client, transactions = []) {
  if (!client) return [];
  const { processedTxs } = calculateClientLedger(client, transactions);

  const items = [];

  // Opening balance row if > 0
  if (client.openingBalance > 0) {
    items.push({
      id: `item-opening`,
      description: 'Opening Balance Brought Forward',
      qty: 1,
      rate: Number(client.openingBalance) || 0,
      amount: Number(client.openingBalance) || 0
    });
  }

  processedTxs.forEach((tx, idx) => {
    const amt = Number(tx.amount) || 0;
    items.push({
      id: `item-${tx.id || idx}`,
      description: tx.description || 'Site Work Bill',
      qty: 1,
      rate: amt,
      amount: amt
    });
  });

  if (items.length === 0) {
    items.push(
      { id: 'item-1', description: 'Basic Web Development', qty: 1, rate: 10000, amount: 10000 },
      { id: 'item-2', description: 'Logo Design', qty: 1, rate: 1000, amount: 1000 },
      { id: 'item-3', description: 'Web Design', qty: 1, rate: 50000, amount: 50000 },
      { id: 'item-4', description: 'Full Stack Web development', qty: 1, rate: 40000, amount: 40000 }
    );
  }

  return items;
}

/**
 * Calculate consolidated master summary across all client sites
 * @param {Array} clients 
 * @param {Array} transactions 
 * @returns {Object} { siteSummaries, grandTotalOpening, grandTotalDebits, grandTotalCredits, grandTotalBalance, totalInWords }
 */
export function calculateAllSitesSummary(clients = [], transactions = []) {
  let grandTotalOpening = 0;
  let grandTotalDebits = 0;
  let grandTotalCredits = 0;
  let grandTotalBalance = 0;

  const siteSummaries = (clients || []).map((client, idx) => {
    const { processedTxs, netBalance } = calculateClientLedger(client, transactions);
    
    const opening = Number(client.openingBalance) || 0;
    let debits = 0;
    let credits = 0;

    processedTxs.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'BILL' || tx.type === 'DEBIT') {
        debits += amt;
      } else {
        credits += amt;
      }
    });

    grandTotalOpening += opening;
    grandTotalDebits += debits;
    grandTotalCredits += credits;
    grandTotalBalance += netBalance;

    return {
      slNo: idx + 1,
      id: client.id,
      clientName: client.name,
      siteLocation: client.siteLocation || client.address || 'Palakkad',
      address: client.address || '',
      phone: client.phone || '',
      openingBalance: opening,
      totalDebits: debits,
      totalCredits: credits,
      netBalance,
      processedTxs,
      txCount: processedTxs.length
    };
  });

  const totalPayable = grandTotalOpening + grandTotalDebits;
  const collectionRate = totalPayable > 0 ? ((grandTotalCredits / totalPayable) * 100).toFixed(1) : '100.0';

  return {
    siteSummaries,
    totalSites: siteSummaries.length,
    grandTotalOpening,
    grandTotalDebits,
    grandTotalCredits,
    grandTotalBalance,
    totalPayable,
    collectionRate,
    totalInWords: numberToWordsIndian(grandTotalBalance)
  };
}
