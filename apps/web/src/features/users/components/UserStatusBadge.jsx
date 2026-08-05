import React from 'react';
import { USER_STATUS } from '../constants/userConstants';

export default function UserStatusBadge({ status }) {
  const getStatusConfig = () => {
    switch (status) {
      case USER_STATUS.ACTIVE:
        return {
          text: 'Aktif',
          textColor: 'text-emerald-600',
          dotColor: 'bg-emerald-500',
          animation: 'animate-pulse'
        };
      case USER_STATUS.PENDING:
        return {
          text: 'Menunggu',
          textColor: 'text-yellow-600',
          dotColor: 'bg-yellow-500',
          animation: ''
        };
      case USER_STATUS.INACTIVE:
        return {
          text: 'Nonaktif',
          textColor: 'text-slate-500',
          dotColor: 'bg-slate-400',
          animation: ''
        };
      default:
        return {
          text: status,
          textColor: 'text-slate-600',
          dotColor: 'bg-slate-500',
          animation: ''
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`flex items-center gap-2 text-sm font-medium ${config.textColor}`}>
      <span className={`w-2 h-2 rounded-full ${config.dotColor} ${config.animation}`}></span>
      {config.text}
    </span>
  );
}
