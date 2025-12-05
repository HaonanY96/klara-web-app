'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import DataExport from '@/app/components/DataExport';

/**
 * Export Page
 *
 * Page wrapper for DataExport component
 */
export default function ExportPage() {
  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      <div className="max-w-md mx-auto min-h-screen bg-white/50 backdrop-blur-3xl shadow-[0_0_50px_-10px_rgba(0,0,0,0.02)]">
        {/* Header */}
        <header className="sticky top-0 bg-white/90 backdrop-blur-xl z-10 px-5 pt-12 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="w-10 h-10 -ml-2 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors rounded-xl hover:bg-stone-100"
            >
              <ArrowLeft size={22} strokeWidth={1.5} />
            </Link>
            <h1 className="text-xl font-medium text-stone-700 font-heading">Export Data</h1>
          </div>
        </header>

        {/* Content */}
        <main className="px-5 py-6 pb-24">
          <DataExport />
        </main>
      </div>
    </div>
  );
}
