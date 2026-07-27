export const complaintCategories = {
  total: 842,
  categories: [
    { name: 'Infrastruktur', percentage: 45, color: '#2563EB' },
    { name: 'Pelayanan Medik', percentage: 25, color: '#943700' },
    { name: 'Administrasi', percentage: 30, color: '#10B981' }
  ]
};

export const complaintSla = [
  { priority: 'High Priority ( < 24 Jam )', colorClass: 'bg-red-600', textClass: 'text-red-600', completionRate: 98.2 },
  { priority: 'Medium Priority ( < 3 Hari )', colorClass: 'bg-orange-500', textClass: 'text-orange-500', completionRate: 85.5 },
  { priority: 'Low Priority ( < 7 Hari )', colorClass: 'bg-blue-500', textClass: 'text-blue-500', completionRate: 92.0 },
];

export const complaintVolumeMonthly = [
  { month: 'Jan', received: 100, completed: 60 },
  { month: 'Feb', received: 120, completed: 96 },
  { month: 'Mar', received: 80, completed: 32 },
  { month: 'Apr', received: 150, completed: 112 },
  { month: 'Mei', received: 110, completed: 60 },
  { month: 'Jun', received: 130, completed: 85 },
];

export const complaintResolutionStats = {
  averageDays: 2.4,
  successRate: 92,
  openTickets: 12
};
