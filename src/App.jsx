import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ClientLedger from './components/ClientLedger';
import QuotationPrintView from './components/QuotationPrintView';
import LoginPage from './components/LoginPage';
import { 
  DEFAULT_COMPANY_INFO, 
  INITIAL_CLIENTS, 
  INITIAL_QUOTATION, 
  INITIAL_TRANSACTIONS 
} from './types/initialData';
import { generateRefNo, generateQuotationItemsFromLedger } from './utils/formatters';
import { apiClient } from './utils/apiClient';

export default function App() {
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'print'

  // Auth User Session State backed by LocalStorage & SQLite DB
  const [authUser, setAuthUser] = useState(() => {
    const saved = localStorage.getItem('smarttech_auth_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.username || parsed.email) && parsed.role) return parsed;
      } catch (e) {}
    }
    return null; // Prompt login if no active session
  });

  const [clients, setClients] = useState(() => {
    const saved = localStorage.getItem('smarttech_clients');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_CLIENTS;
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('smarttech_txs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return INITIAL_TRANSACTIONS;
  });

  const [quotations, setQuotations] = useState(() => [INITIAL_QUOTATION]);
  const [currentQuotation, setCurrentQuotation] = useState(INITIAL_QUOTATION);
  const [customLogoUrl, setCustomLogoUrl] = useState(null);

  // Sync state with SQLite Backend Database on Initial App Load
  useEffect(() => {
    async function loadDataFromDb() {
      const dbClients = await apiClient.getClients();
      if (Array.isArray(dbClients) && dbClients.length > 0) {
        setClients(dbClients);
        localStorage.setItem('smarttech_clients', JSON.stringify(dbClients));
      }

      const dbTxs = await apiClient.getTransactions();
      if (Array.isArray(dbTxs)) {
        setTransactions(dbTxs);
        localStorage.setItem('smarttech_txs', JSON.stringify(dbTxs));
      }
    }
    loadDataFromDb();
  }, []);

  const handleLoginSuccess = async (user) => {
    setAuthUser(user);
    localStorage.setItem('smarttech_auth_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setAuthUser(null);
    localStorage.removeItem('smarttech_auth_user');
  };

  const handleUploadLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target.result;
      setCustomLogoUrl(url);
      localStorage.setItem('smarttech_custom_logo', url);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomLogo = () => {
    setCustomLogoUrl(null);
    localStorage.removeItem('smarttech_custom_logo');
  };

  // Handlers synced with SQLite DB + React State + LocalStorage
  const handleAddClient = async (newClient) => {
    const created = await apiClient.addClient(newClient);
    const clientObj = created || {
      id: `client-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      ...newClient
    };

    setClients(prev => {
      const updated = [clientObj, ...(Array.isArray(prev) ? prev : [])];
      localStorage.setItem('smarttech_clients', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateClient = async (clientId, updatedFields) => {
    const updated = await apiClient.updateClient(clientId, updatedFields);
    setClients(prev => {
      const nextList = (Array.isArray(prev) ? prev : []).map(c => 
        c.id === clientId ? (updated || { ...c, ...updatedFields }) : c
      );
      localStorage.setItem('smarttech_clients', JSON.stringify(nextList));
      return nextList;
    });
  };

  const handleDeleteClient = async (clientId) => {
    await apiClient.deleteClient(clientId);
    setClients(prev => {
      const nextList = (Array.isArray(prev) ? prev : []).filter(c => c.id !== clientId);
      localStorage.setItem('smarttech_clients', JSON.stringify(nextList));
      return nextList;
    });
    setTransactions(prev => {
      const nextTxs = (Array.isArray(prev) ? prev : []).filter(t => t.clientId !== clientId);
      localStorage.setItem('smarttech_txs', JSON.stringify(nextTxs));
      return nextTxs;
    });
  };

  const handleAddTransaction = async (newTx) => {
    const created = await apiClient.addTransaction(newTx);
    const txObj = created || {
      id: `tx-${Date.now()}`,
      ...newTx
    };

    setTransactions(prev => {
      const updated = [txObj, ...(Array.isArray(prev) ? prev : [])];
      localStorage.setItem('smarttech_txs', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteTransaction = async (txId) => {
    await apiClient.deleteTransaction(txId);
    setTransactions(prev => {
      const nextTxs = (Array.isArray(prev) ? prev : []).filter(t => t.id !== txId);
      localStorage.setItem('smarttech_txs', JSON.stringify(nextTxs));
      return nextTxs;
    });
  };

  // Automatically generate printable quotation based on client's Tally account or All Sites Master
  const handleGenerateQuotationFromClient = (targetClient = null) => {
    if (targetClient && targetClient.id === 'ALL_SITES') {
      const masterQuot = {
        id: `quot-all-sites-${Date.now()}`,
        clientId: 'ALL_SITES',
        refNo: 'SMRT/MASTER/001',
        date: new Date().toISOString().split('T')[0],
        clientName: 'All Sites & Project Accounts Portfolio',
        clientAddress: 'Palakkad & All Active Project Branches',
        items: []
      };
      setCurrentQuotation(masterQuot);
      setActiveTab('print');
      return;
    }

    const clientList = Array.isArray(clients) && clients.length > 0 ? clients : INITIAL_CLIENTS;
    const client = targetClient || clientList[0];
    if (!client) return;

    const txList = Array.isArray(transactions) ? transactions : [];
    const generatedItems = generateQuotationItemsFromLedger(client, txList);

    const autoQuot = {
      id: `quot-${client.id}-${Date.now()}`,
      clientId: client.id,
      refNo: generateRefNo((Array.isArray(quotations) ? quotations.length : 0) + 1),
      date: new Date().toISOString().split('T')[0],
      clientName: client.name,
      clientAddress: `${client.siteLocation || ''}, ${client.address || ''}`.trim(),
      items: generatedItems
    };

    setCurrentQuotation(autoQuot);
    setActiveTab('print');
  };

  const handleSelectClientForQuotation = (client, existingQuotation = null) => {
    if (!client) return;
    const txList = Array.isArray(transactions) ? transactions : [];
    
    if (existingQuotation) {
      const generatedItems = generateQuotationItemsFromLedger(client, txList);
      setCurrentQuotation({
        ...existingQuotation,
        items: generatedItems.length > 0 ? generatedItems : existingQuotation.items
      });
    } else {
      handleGenerateQuotationFromClient(client);
    }
    setActiveTab('print');
  };

  // Reset to initial clean demo data in both SQLite DB & State
  const handleResetData = async () => {
    if (window.confirm('Reset all clients, transactions and database records to clean default demo data?')) {
      await apiClient.resetDatabase();
      localStorage.clear();
      setClients(INITIAL_CLIENTS);
      setTransactions(INITIAL_TRANSACTIONS);
      setQuotations([INITIAL_QUOTATION]);
      setCurrentQuotation(INITIAL_QUOTATION);
      setCustomLogoUrl(null);
    }
  };

  // Export Data Backup from SQLite DB
  const handleExportData = async () => {
    const dbBackup = await apiClient.exportBackup();
    const data = dbBackup || { clients, transactions, quotations, exportDate: new Date().toISOString() };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smarttech-db-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  // Import Data Backup into SQLite DB
  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        await apiClient.importBackup(imported);
        if (Array.isArray(imported.clients)) setClients(imported.clients);
        if (Array.isArray(imported.transactions)) setTransactions(imported.transactions);
        alert('Database backup imported successfully!');
      } catch (err) {
        alert('Failed to parse backup file.');
      }
    };
    reader.readAsText(file);
  };

  // If user is not authenticated, display login screen!
  if (!authUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const safeClients = Array.isArray(clients) && clients.length > 0 ? clients : INITIAL_CLIENTS;
  const safeTxs = Array.isArray(transactions) ? transactions : INITIAL_TRANSACTIONS;
  const safeQuotations = Array.isArray(quotations) ? quotations : [INITIAL_QUOTATION];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans print:bg-white print:text-black print:min-h-0 print:block">
      
      {/* Top Navbar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        clients={safeClients}
        authUser={authUser}
        onLogout={handleLogout}
        onNewQuotation={() => handleGenerateQuotationFromClient()}
        onAddClient={() => setActiveTab('ledger')}
        onPrint={() => {
          handleGenerateQuotationFromClient();
          window.print();
        }}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onResetData={handleResetData}
      />

      {/* Main Tab Content - Permanent DOM mounting */}
      <main className="flex-1 pb-12">
        <div className={activeTab === 'ledger' ? 'block no-print' : 'hidden no-print'}>
          <ClientLedger
            clients={safeClients}
            transactions={safeTxs}
            quotations={safeQuotations}
            authUser={authUser}
            onSelectClientForQuotation={handleSelectClientForQuotation}
            onAddClient={handleAddClient}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        </div>

        <div className={activeTab === 'print' ? 'block' : 'hidden print:block'}>
          <QuotationPrintView
            quotation={currentQuotation || INITIAL_QUOTATION}
            companyInfo={DEFAULT_COMPANY_INFO}
            clients={safeClients}
            transactions={safeTxs}
            customLogoUrl={customLogoUrl}
            onUploadLogo={handleUploadLogo}
            onRemoveCustomLogo={handleRemoveCustomLogo}
            onBackToLedger={() => setActiveTab('ledger')}
            onSelectClientForPrint={(c) => handleGenerateQuotationFromClient(c)}
          />
        </div>
      </main>

    </div>
  );
}
