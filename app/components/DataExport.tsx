'use client';

import React, { useState } from 'react';
import { Download, FileText, FileJson, Loader2, Check } from 'lucide-react';
import { 
  downloadTasksCSV, 
  downloadReflectionsMarkdown, 
  downloadAllJSON 
} from '@/lib/services/exportService';

type ExportStatus = 'idle' | 'loading' | 'success' | 'error';

interface ExportButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => Promise<void>;
}

const ExportButton = ({ label, icon, onClick }: ExportButtonProps) => {
  const [status, setStatus] = useState<ExportStatus>('idle');

  const handleClick = async () => {
    setStatus('loading');
    try {
      await onClick();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error('Export failed:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={status === 'loading'}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
        ${status === 'success' 
          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
          : status === 'error'
          ? 'bg-rose-50 text-rose-600 border border-rose-200'
          : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:border-stone-300'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {status === 'loading' ? (
        <Loader2 size={16} className="animate-spin" />
      ) : status === 'success' ? (
        <Check size={16} />
      ) : (
        icon
      )}
      <span>{status === 'success' ? 'Downloaded!' : label}</span>
    </button>
  );
};

const DataExport = () => {
  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-2 mb-4">
        <Download size={16} className="text-stone-400" />
        <span className="text-sm font-medium text-stone-700 font-heading">Export Your Data</span>
      </div>
      
      <p className="text-[13px] text-stone-500 mb-4 font-light">
        Download your tasks and reflections. Your data stays on your device.
      </p>
      
      <div className="flex flex-wrap gap-3">
        <ExportButton
          label="Tasks (CSV)"
          icon={<FileText size={16} />}
          onClick={downloadTasksCSV}
        />
        <ExportButton
          label="Reflections (MD)"
          icon={<FileText size={16} />}
          onClick={downloadReflectionsMarkdown}
        />
        <ExportButton
          label="Full Backup (JSON)"
          icon={<FileJson size={16} />}
          onClick={downloadAllJSON}
        />
      </div>
    </div>
  );
};

export default DataExport;

