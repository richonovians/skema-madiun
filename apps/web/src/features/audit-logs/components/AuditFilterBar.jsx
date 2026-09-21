import React from 'react';
import { Search, X, Calendar } from 'lucide-react';
import Dropdown from '@/components/ui/Dropdown';
import ResetFilterButton from '@/components/ui/ResetFilterButton';
import { entitasLabel, aksiLabel } from '../adapters/auditLog.adapter';

export const MODULE_OPTIONS = [
  { value: '', label: 'Semua Modul' },
  ...['auth', 'complaint', 'complaint_reply', 'opd', 'question', 'response', 'survey', 'user'].map(
    (value) => ({ value, label: entitasLabel(value) }),
  ),
];

export const ACTION_OPTIONS = [
  { value: '', label: 'Semua Aksi' },
  ...[
    'create',
    'update',
    'delete',
    'update_status',
    'login',
    'logout',
    'consent',
    'update_profile',
    'sync',
    'apply_template',
    'reorder',
    'duplicate',
  ].map((value) => ({ value, label: aksiLabel(value) })),
];

export default function AuditFilterBar({
  searchQuery = '',
  onSearchChange = () => {},
  entitas = '',
  onEntitasChange = () => {},
  aksi = '',
  onAksiChange = () => {},
  startDate = '',
  onStartDateChange = () => {},
  endDate = '',
  onEndDateChange = () => {},
  onReset = () => {},
}) {
  const hasActiveFilters = Boolean(searchQuery || entitas || aksi || startDate || endDate);

  return (
    <div className="bg-surface p-lg rounded-2xl border border-outline-variant shadow-sm mb-lg space-y-md">
      {/* 1. Search Bar */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none"
        />
        <input
          id="audit-search-input"
          type="text"
          placeholder="Cari berdasarkan nama pengguna, modul, atau aksi..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full min-h-[44px] pl-10 pr-10 py-2.5 border border-outline-variant rounded-xl bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
        />
        {searchQuery && (
          <button
            type="button"
            aria-label="Hapus pencarian"
            onClick={() => onSearchChange('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline-variant hover:text-text-primary transition-colors p-1"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 2. Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        {/* Filter Modul */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary">Modul</label>
          <Dropdown
            id="audit-filter-module"
            value={entitas}
            onChange={onEntitasChange}
            options={MODULE_OPTIONS}
            className="w-full"
          />
        </div>

        {/* Filter Aksi */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary">Aksi</label>
          <Dropdown
            id="audit-filter-action"
            value={aksi}
            onChange={onAksiChange}
            options={ACTION_OPTIONS}
            className="w-full"
          />
        </div>

        {/* Filter Tanggal Mulai */}
        <div className="space-y-1.5">
          <label
            htmlFor="audit-start-date"
            className="text-xs font-semibold text-text-secondary flex items-center gap-1"
          >
            <Calendar size={13} className="text-outline" /> Dari Tanggal
          </label>
          <input
            id="audit-start-date"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 border border-outline-variant rounded-xl bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm text-text-primary"
          />
        </div>

        {/* Filter Tanggal Selesai */}
        <div className="space-y-1.5">
          <label
            htmlFor="audit-end-date"
            className="text-xs font-semibold text-text-secondary flex items-center gap-1"
          >
            <Calendar size={13} className="text-outline" /> Sampai Tanggal
          </label>
          <input
            id="audit-end-date"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 border border-outline-variant rounded-xl bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm text-text-primary"
          />
        </div>
      </div>

      {/* 3. Status & Reset Button */}
      <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 gap-2">
        <div className="text-xs text-text-secondary">
          {hasActiveFilters ? (
            <span className="inline-flex items-center gap-1 text-primary font-medium">
              • Filter aktif diterapkan
            </span>
          ) : (
            <span>Menampilkan semua aktivitas</span>
          )}
        </div>
        <ResetFilterButton onReset={onReset} labelClassName="" />
      </div>
    </div>
  );
}