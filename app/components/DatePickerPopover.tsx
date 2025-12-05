import React, { useRef, useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';
import { addDays } from 'date-fns';
import { getNextWeekday, toDateString, parseLocalDate } from '@/lib/utils/date';

interface DatePickerPopoverProps {
  selectedDate: string | null;
  onSelect: (dateStr: string | null) => void;
  onClose: () => void;
  className?: string;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const DatePickerPopover = ({
  selectedDate,
  onSelect,
  onClose,
  className = '',
  triggerRef,
}: DatePickerPopoverProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // Quick date helpers
  const setDateQuick = (type: 'today' | 'tomorrow' | 'this-weekend' | 'next-week') => {
    let date: Date;
    const today = new Date();

    switch (type) {
      case 'today':
        date = today;
        break;
      case 'tomorrow':
        date = addDays(today, 1);
        break;
      case 'this-weekend':
        date = getNextWeekday(6); // Saturday
        break;
      case 'next-week':
        date = getNextWeekday(1); // Monday
        break;
      default:
        date = today;
    }
    onSelect(toDateString(date));
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (containerRef.current?.contains(target)) {
        return;
      }

      if (triggerRef?.current?.contains(target)) {
        return;
      }

      onClose();
    };

    // Small delay to prevent immediate close on mount
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, triggerRef]);

  return (
    <div
      ref={containerRef}
      className={`bg-white rounded-xl shadow-xl border border-stone-100 p-2 min-w-[200px] max-w-[min(90vw,320px)] max-h-[min(80vh,500px)] overflow-y-auto z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200 ${className}`}
      style={{ paddingBottom: showCalendar ? '1rem' : undefined }}
      onClick={e => e.stopPropagation()}
    >
      {!showCalendar ? (
        // Quick menu - compact
        <>
          <QuickButton onClick={() => setDateQuick('today')} label="Today" />
          <QuickButton onClick={() => setDateQuick('tomorrow')} label="Tomorrow" />
          <QuickButton onClick={() => setDateQuick('this-weekend')} label="This Weekend" />
          <QuickButton onClick={() => setDateQuick('next-week')} label="Next Week" />
          
          <div className="h-px bg-stone-100 my-1"></div>
          
          {/* Button to show full calendar */}
          <button
            type="button"
            onClick={() => setShowCalendar(true)}
            className="text-left px-3 py-2 text-[13px] text-stone-600 hover:bg-stone-50 rounded-lg transition-colors flex items-center justify-between"
          >
            <span>Pick a date...</span>
            <Calendar size={14} className="opacity-50" />
          </button>

          {selectedDate && (
            <>
              <div className="h-px bg-stone-100 my-1"></div>
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="text-left px-3 py-2 text-[13px] text-rose-400 hover:bg-rose-50 rounded-lg transition-colors"
              >
                Clear Date
              </button>
            </>
          )}
        </>
      ) : (
        // Full calendar view
        <>
          <button
            type="button"
            onClick={() => setShowCalendar(false)}
            className="text-left px-3 py-2 text-[12px] text-stone-400 hover:text-stone-600 transition-colors"
          >
            ← Back to quick dates
          </button>
          
          <div className="h-px bg-stone-100 my-1"></div>

          <DatePicker
            selected={selectedDate ? parseLocalDate(selectedDate) : null}
            onChange={(date: Date | null) => {
              onSelect(date ? toDateString(date) : null);
            }}
            inline
            calendarClassName="date-picker-calendar"
          />

          {selectedDate && (
            <>
              <div className="h-px bg-stone-100 my-1"></div>
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="text-left px-3 py-2 text-[13px] text-rose-400 hover:bg-rose-50 rounded-lg transition-colors"
              >
                Clear Date
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
};

// Helper sub-component for consistent styling
const QuickButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-left px-3 py-2 text-[13px] text-stone-600 hover:bg-stone-50 rounded-lg transition-colors"
  >
    {label}
  </button>
);
