import { dummyAuditLogs } from '../constants/dummyAuditLogs';

// Mensimulasikan network delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const auditLogsApi = {
  /**
   * Mengambil daftar audit logs
   * Pada tahap integrasi, ganti fungsi ini dengan fetch/axios ke endpoint GET /audit-logs
   */
  getAuditLogs: async (filters = {}) => {
    await delay(500); // simulasi latency
    
    let filteredData = [...dummyAuditLogs];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      filteredData = filteredData.filter(log => 
        log.user.toLowerCase().includes(q) || 
        log.description.toLowerCase().includes(q) ||
        log.objectId.toLowerCase().includes(q)
      );
    }

    if (filters.module && filters.module !== 'Semua Modul') {
      filteredData = filteredData.filter(log => log.module === filters.module);
    }
    
    if (filters.action && filters.action !== 'Semua Aktivitas') {
      filteredData = filteredData.filter(log => log.action === filters.action);
    }
    
    if (filters.role && filters.role !== 'Semua Role') {
      filteredData = filteredData.filter(log => log.role === filters.role);
    }
    
    if (filters.opd && filters.opd !== 'Semua OPD') {
      filteredData = filteredData.filter(log => log.opd === filters.opd);
    }

    // Simulasi pagination manual jika diperlukan, namun untuk saat ini mengembalikan semua
    return {
      data: filteredData,
      total: filteredData.length,
      page: filters.page || 1,
      limit: filters.limit || 10
    };
  },

  /**
   * Mengambil detail audit log
   * Pada tahap integrasi, ganti fungsi ini dengan fetch/axios ke endpoint GET /audit-logs/:id
   */
  getAuditLogDetail: async (id) => {
    await delay(300);
    const log = dummyAuditLogs.find(l => l.id === id);
    if (!log) throw new Error('Audit log tidak ditemukan');
    return log;
  }
};
