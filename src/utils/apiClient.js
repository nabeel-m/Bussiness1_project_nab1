// Unified API Client with Backend REST Server integration & LocalStorage auto-fallback

const BASE_URL = '/api';

export const apiClient = {
  // Login Authentication
  login: async (username, password) => {
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Authentication failed');
      }
      return await res.json();
    } catch (err) {
      console.warn('Backend API unreachable, utilizing client session verification:', err.message);
      return null; // Signals fallback to local verification
    }
  },

  // Clients API
  getClients: async () => {
    try {
      const res = await fetch(`${BASE_URL}/clients`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  addClient: async (clientData) => {
    try {
      const res = await fetch(`${BASE_URL}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  updateClient: async (id, updatedFields) => {
    try {
      const res = await fetch(`${BASE_URL}/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  deleteClient: async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/clients/${id}`, { method: 'DELETE' });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  // Transactions API
  getTransactions: async (clientId = null) => {
    try {
      const url = clientId ? `${BASE_URL}/transactions?clientId=${clientId}` : `${BASE_URL}/transactions`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  addTransaction: async (txData) => {
    try {
      const res = await fetch(`${BASE_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  deleteTransaction: async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  // Database Backup & Reset API
  exportBackup: async () => {
    try {
      const res = await fetch(`${BASE_URL}/backup/export`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  importBackup: async (backupData) => {
    try {
      const res = await fetch(`${BASE_URL}/backup/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  resetDatabase: async () => {
    try {
      const res = await fetch(`${BASE_URL}/reset`, { method: 'POST' });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  }
};
