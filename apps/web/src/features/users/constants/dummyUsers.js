export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN_KABUPATEN: 'ADMIN_KABUPATEN',
  ADMIN_OPD: 'ADMIN_OPD',
  RESPONDENT: 'RESPONDENT',
};

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING',
};

export const DUMMY_USERS = [
  {
    id: 1,
    name: 'Sari Rahayu',
    email: 'sari@madiunkab.go.id',
    initials: 'SR',
    role: USER_ROLES.ADMIN_OPD,
    organization: 'Dinas Kesehatan',
    createdAt: '2026-07-12',
    status: USER_STATUS.ACTIVE,
  },
  {
    id: 2,
    name: 'Budi Kusuma',
    email: 'budi_k@madiunkab.go.id',
    initials: 'BK',
    role: USER_ROLES.ADMIN_KABUPATEN,
    organization: 'Sekretariat Daerah',
    createdAt: '2026-06-05',
    status: USER_STATUS.ACTIVE,
  },
  {
    id: 3,
    name: 'Bahri Prmaudya',
    email: 'bahri.p@diskominfo.go.id',
    initials: 'BP',
    role: USER_ROLES.ADMIN_OPD,
    organization: 'Diskominfo',
    createdAt: '2026-05-20',
    status: USER_STATUS.ACTIVE,
  },
  {
    id: 4,
    name: 'Dewi Nurhaliza',
    email: 'dewi@gmail.com',
    initials: 'DN',
    role: USER_ROLES.RESPONDENT,
    organization: 'Publik',
    createdAt: '2026-05-15',
    status: USER_STATUS.INACTIVE,
  },
  {
    id: 5,
    name: 'Ahmad Fauzi',
    email: 'ahmad.fauzi@gmail.com',
    initials: 'AF',
    role: USER_ROLES.RESPONDENT,
    organization: 'Publik',
    createdAt: '2026-07-20',
    status: USER_STATUS.PENDING,
  },
];
