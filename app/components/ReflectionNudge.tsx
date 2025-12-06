import React from 'react';
import { Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReflectionNudgeProps {
  show: boolean;
  onTryIt: () => void;
  onDismiss: () => void;
}

const ReflectionNudge = ({ show, onTryIt, onDismiss }: ReflectionNudgeProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4"
        >
          <div className="bg-linear-to-r from-orange-50 to-amber-50/50 border border-orange-100/50 rounded-xl px-4 py-3 flex items-center gap-3">
            <Moon size={16} className="text-orange-400 shrink-0" />
            <p className="text-[13px] text-stone-600 flex-1">
              You&apos;ve been making good progress. Want to take a moment to reflect?
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={onTryIt}
                className="text-[12px] text-orange-500 hover:text-orange-600 font-medium"
              >
                Try it
              </button>
              <button
                onClick={onDismiss}
                className="text-[12px] text-stone-400 hover:text-stone-500"
              >
                Later
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReflectionNudge;

