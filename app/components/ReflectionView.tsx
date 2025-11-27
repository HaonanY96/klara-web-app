import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Send, 
  BookOpen, 
  Circle,
  Cloud,
  Zap,
  BatteryLow
} from 'lucide-react';

// Use BatteryLow instead of BatteryWarning
const BatteryWarning = BatteryLow;

type MoodType = 'Flow' | 'Neutral' | 'Drained';

const MOODS = {
  Flow: { 
    label: 'Flow', 
    icon: Zap, 
    color: 'text-emerald-500', 
    fill: 'fill-emerald-500', // Solid green fill for lightning
    bg: 'bg-emerald-50',
    activeBorder: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  },
  Neutral: { 
    label: 'Neutral', 
    icon: Cloud, 
    color: 'text-stone-400', 
    fill: 'transparent',
    bg: 'bg-stone-50',
    activeBorder: 'border-stone-200 bg-stone-100 text-stone-600'
  },
  Drained: { 
    label: 'Drained', 
    icon: BatteryWarning, 
    color: 'text-rose-400', 
    fill: 'transparent',
    bg: 'bg-rose-50',
    activeBorder: 'border-rose-200 bg-rose-50 text-rose-600'
  }
};

// DUMMY DATA
const narrativeInsight = {
  title: "Deep Work Rhythm",
  text: "You tend to hit your stride in the mid-mornings. 80% of your 'Flow' states this week were recorded between 9 AM and 11 AM. Consider protecting this time slot for your most important work next week.",
  icon: <React.Fragment><div className="text-orange-400"><Sparkles size={18} /></div></React.Fragment> // Simplified
};

const pastReflections = [
  {
    id: 101,
    date: "Yesterday",
    mood: "Flow",
    text: "Finally broke through the writer's block on the Q3 report. Working in the library really helped clear my mind.",
  },
  {
    id: 102,
    date: "Mon, Nov 24",
    mood: "Drained",
    text: "Too many back-to-back meetings. Felt like I didn't actually produce anything tangible today. Need to block out 'focus time'.",
  },
  {
    id: 103,
    date: "Fri, Nov 21",
    mood: "Neutral",
    text: "Cleared the inbox. Satisfying in a way, but didn't move the needle on the big project. A maintenance day.",
  }
];

const ReflectionView = () => {
  const [reflectionText, setReflectionText] = useState('');
  const [isReflectionSubmitted, setIsReflectionSubmitted] = useState(false);
  const [dailyMood, setDailyMood] = useState<string | null>(null);

  const handleSubmitReflection = () => {
    if(!reflectionText.trim()) return;
    setIsReflectionSubmitted(true);
    // In real app, save to localStorage/DB here
  };

  return (
    <div className="animate-fadeIn mt-6 font-body pb-10 space-y-8">
       
       {/* 1. Daily Prompt Card */}
       {!isReflectionSubmitted ? (
         <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-orange-400" />
              <span className="text-[10px] uppercase tracking-widest text-stone-400 font-heading">Daily Prompt</span>
            </div>
            
            <h2 className="text-xl text-stone-800 font-heading leading-relaxed mb-6">
              What is one small thing you accomplished today that gave you energy?
            </h2>
            
            <textarea
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="It could be a conversation, a task, or just a quiet moment..."
              className="w-full bg-stone-50/50 rounded-xl p-4 text-[15px] text-stone-700 placeholder:text-stone-300 focus:outline-none focus:bg-stone-50 focus:ring-1 focus:ring-orange-100 transition-all min-h-[120px] resize-none mb-4 font-light leading-relaxed"
            />

            {/* Mood Selector */}
            <div className="flex items-center justify-between">
               <div className="flex gap-2">
                 {Object.keys(MOODS).map((moodKey) => {
                   // @ts-expect-error - Iterating over keys
                   const mood = MOODS[moodKey];
                   const isActive = dailyMood === moodKey;
                   const Icon = mood.icon;
                   
                   return (
                     <button
                       key={moodKey}
                       onClick={() => setDailyMood(moodKey)}
                       className={`
                         flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border
                         ${isActive 
                           ? mood.activeBorder
                           : 'bg-stone-50 text-stone-400 border-transparent hover:bg-stone-100'
                         }
                       `}
                     >
                       <Icon size={12} className={isActive ? mood.fill : ''} fill={isActive && mood.fill ? 'currentColor' : 'none'} />
                       {mood.label}
                     </button>
                   );
                 })}
               </div>
               
               <button 
                 onClick={handleSubmitReflection}
                 disabled={!reflectionText.trim()}
                 className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${reflectionText.trim() ? 'bg-stone-800 text-white hover:bg-stone-700 hover:scale-105 shadow-md' : 'bg-stone-200 text-stone-400'}`}
               >
                 <Send size={16} />
               </button>
            </div>
         </div>
       ) : (
         /* Success Message after submission */
         <div className="bg-gradient-to-br from-orange-50/50 to-stone-50/50 border border-orange-100/50 rounded-2xl p-6 text-center">
             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-orange-400">
               <CheckCircle2 size={24} strokeWidth={1.5} />
             </div>
             <h3 className="text-lg font-heading text-stone-800 mb-2">Moment Captured</h3>
             <p className="text-sm text-stone-500 font-light">Your reflection has been saved safely.</p>
         </div>
       )}

       {/* 2. Narrative Insight (Qualitative Data) */}
       <div className="bg-white border border-stone-100/50 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
           <h2 className="text-sm font-medium text-stone-700 mb-4 flex items-center gap-2 font-heading">
             <BookOpen size={16} className="text-stone-400"/>
             Insights from Kino
           </h2>
           <div className="flex gap-4 items-start">
              <div className="bg-orange-50 p-2.5 rounded-full mt-0.5 shrink-0">
                {narrativeInsight.icon}
              </div>
              <div>
                <h3 className="text-base text-stone-800 font-heading mb-1">{narrativeInsight.title}</h3>
                <p className="text-[14px] leading-relaxed text-stone-600 font-light">
                  {narrativeInsight.text}
                </p>
              </div>
           </div>
       </div>

       {/* 3. Past Reflections History */}
       <div>
          <h2 className="text-[11px] font-semibold text-stone-300 uppercase tracking-widest mb-4 pl-1 font-heading">
            Past Days
          </h2>
          <div className="space-y-4">
            {pastReflections.map((item) => {
              // @ts-expect-error - Accessing mood config
              const moodConfig = MOODS[item.mood];
              const Icon = moodConfig ? moodConfig.icon : Circle;
              
              return (
                <div key={item.id} className="bg-white hover:bg-stone-50/50 border border-stone-100/50 rounded-2xl p-5 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                     <span className="font-heading text-stone-800 text-sm font-medium">{item.date}</span>
                     
                     {/* Mood Tag in History */}
                     {moodConfig && (
                       <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium border border-transparent ${moodConfig.bg} ${moodConfig.color}`}>
                         <Icon size={10} className={moodConfig.fill} fill={moodConfig.fill !== 'transparent' ? 'currentColor' : 'none'} />
                         <span>{moodConfig.label}</span>
                       </div>
                     )}
                  </div>
                  <p className="text-[14px] leading-relaxed text-stone-600 font-light">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
       </div>

    </div>
  );
};

export default ReflectionView;

