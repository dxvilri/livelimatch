import { 
  BookmarkIcon, MapPinIcon, SparklesIcon, AcademicCapIcon, SunIcon, Cog8ToothIcon, WrenchScrewdriverIcon, HomeIcon, UserGroupIcon, TagIcon
} from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolidIcon } from "@heroicons/react/24/solid";
import { cloneElement } from "react";

export default function SavedJobsTab({
    savedJobs, myApplications, onToggleSave, onSelectJob, onApply, 
    getJobStyle, darkMode, JOB_CATEGORIES
}) {
    
    // --- NEW CARD THEME LOGIC ---
    const getCardTheme = (categoryId, isDark) => {
        const darkColors = {
            'EDUCATION': { text: 'text-blue-400', bgLight: 'bg-blue-400/10', border: 'border-blue-400/30', btn: 'bg-blue-400 text-slate-900 hover:bg-blue-500', btnLight: 'bg-blue-400/10 hover:bg-blue-400/20 text-blue-400' },
            'AGRICULTURE': { text: 'text-green-400', bgLight: 'bg-green-400/10', border: 'border-green-400/30', btn: 'bg-green-400 text-slate-900 hover:bg-green-500', btnLight: 'bg-green-400/10 hover:bg-green-400/20 text-green-400' },
            'AUTOMOTIVE': { text: 'text-slate-400', bgLight: 'bg-slate-400/10', border: 'border-slate-400/30', btn: 'bg-slate-400 text-slate-900 hover:bg-slate-500', btnLight: 'bg-slate-400/10 hover:bg-slate-400/20 text-slate-400' },
            'CARPENTRY': { text: 'text-yellow-400', bgLight: 'bg-yellow-400/10', border: 'border-yellow-400/30', btn: 'bg-yellow-400 text-slate-900 hover:bg-yellow-500', btnLight: 'bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400' },
            'HOUSEHOLD': { text: 'text-pink-400', bgLight: 'bg-pink-400/10', border: 'border-pink-400/30', btn: 'bg-pink-400 text-slate-900 hover:bg-pink-500', btnLight: 'bg-pink-400/10 hover:bg-pink-400/20 text-pink-400' },
            'CUSTOMER_SERVICE': { text: 'text-purple-400', bgLight: 'bg-purple-400/10', border: 'border-purple-400/30', btn: 'bg-purple-400 text-slate-900 hover:bg-purple-500', btnLight: 'bg-purple-400/10 hover:bg-purple-400/20 text-purple-400' },
        };
        const fallbackDark = { text: 'text-slate-400', bgLight: 'bg-slate-400/10', border: 'border-slate-400/30', btn: 'bg-slate-400 text-slate-900 hover:bg-slate-500', btnLight: 'bg-slate-400/10 hover:bg-slate-400/20 text-slate-400' };

        if (isDark) {
            const cat = darkColors[categoryId] || fallbackDark;
            return {
                title: cat.text, location: cat.text, salaryLabel: cat.text, salaryValue: cat.text, currency: `${cat.text} opacity-70`,
                badge: `${cat.bgLight} ${cat.text} ${cat.border}`, btnPrimary: cat.btn, btnSecondary: cat.btnLight,
                saveActive: `${cat.text} ${cat.bgLight}`, saveIdle: `${cat.text} opacity-50 hover:opacity-100 hover:bg-white/10`,
                borderColor: cat.border, bgIcon: cat.text, appliedBtn: `${cat.bgLight} ${cat.text} ${cat.border} opacity-60`,
                cardBg: 'bg-slate-900 border border-white/10 shadow-sm'
            };
        } else {
            // --- LIGHT MODE: GLOSSY SOLID BLUE THEME ---
            return {
                title: 'text-white drop-shadow-md', 
                location: 'text-blue-100', 
                salaryLabel: 'text-blue-200', 
                salaryValue: 'text-white', 
                currency: 'text-blue-200',
                badge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]', 
                btnPrimary: 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg active:scale-95', 
                btnSecondary: 'text-white bg-white/10 hover:bg-white/20 border border-white/30',
                saveActive: 'text-blue-600 bg-white shadow-md', 
                saveIdle: 'text-white/70 hover:bg-white/20 hover:text-white transition-colors',
                borderColor: 'border-white/20', 
                bgIcon: 'text-white', 
                appliedBtn: 'bg-white/20 text-white border border-white/30 opacity-80',
                cardBg: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] ring-1 ring-inset ring-white/40'
            };
        }
    };

    // Helper just to retrieve the correct Category Icon
    const getCatIcon = (id) => {
        const map = {
            'EDUCATION': AcademicCapIcon,
            'AGRICULTURE': SunIcon,
            'AUTOMOTIVE': Cog8ToothIcon,
            'CARPENTRY': WrenchScrewdriverIcon,
            'HOUSEHOLD': HomeIcon,
            'CUSTOMER_SERVICE': UserGroupIcon,
        };
        return map[id] || TagIcon;
    };

    return (
        <div className="animate-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                {savedJobs.length > 0 ? savedJobs.map(savedDoc => {
                    const job = savedDoc.jobData;
                    const typeStyle = getJobStyle(job.type);
                    const hasApplied = myApplications.some(app => app.jobId === job.id);
                    const theme = getCardTheme(job.category, darkMode);

                    return (
                        <div key={savedDoc.id} onClick={() => onSelectJob(job)} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_30px_-5px_rgba(37,99,235,0.5)] cursor-pointer flex flex-col justify-between min-h-[220px] ${theme.cardBg} w-full`}>
                            
                            {/* Large Background Icon (Synced with mobile positioning) */}
                            <div className={`absolute -right-4 bottom-0 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform duration-500 pointer-events-none ${theme.bgIcon}`}>
                                {cloneElement(typeStyle.icon, { className: "w-40 h-40 md:w-48 md:h-48" })}
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                
                                {/* 1. Job Title & Bookmark */}
                                <div className="flex justify-between items-start gap-4 mb-2">
                                    <h3 className={`font-black text-xl leading-tight line-clamp-2 pt-1 ${theme.title}`}>{job.title}</h3>
                                    <button onClick={(e) => { e.stopPropagation(); onToggleSave(job); }} className={`p-2 rounded-full transition-colors shrink-0 -mt-1 -mr-1 ${theme.saveActive}`}>
                                        <BookmarkSolidIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                                
                                {/* 2. Location */}
                                <div className={`flex items-center gap-1.5 mb-4 ${theme.location}`}>
                                    <MapPinIcon className="w-4 h-4 shrink-0" />
                                    <p className="text-[11px] font-bold uppercase tracking-wide opacity-80 truncate">{job.sitio || "No Location"}</p>
                                </div>

                                {/* 3. Badges */}
                                <div className="flex flex-wrap items-center gap-2 mb-6">
                                    {/* Category Badge */}
                                    {job.category && (() => {
                                        const CatIcon = getCatIcon(job.category);
                                        return (
                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide flex items-center gap-1 shadow-sm ${theme.badge}`}>
                                                <CatIcon className="w-3 h-3" />
                                                {JOB_CATEGORIES.find(c => c.id === job.category)?.label || job.category}
                                            </span>
                                        )
                                    })()}

                                    {/* Job Type Badge */}
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide flex items-center gap-1 shadow-sm ${theme.badge}`}>
                                        <span className="scale-75 w-3 h-3 flex items-center justify-center">{typeStyle.icon}</span>
                                        {job.type}
                                    </span>
                                </div>

                                {/* 4. Salary & Actions */}
                                <div className={`mt-auto pt-4 border-t flex flex-wrap items-end justify-between gap-3 ${theme.borderColor}`}>
                                    <div className="mb-1">
                                        <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${theme.salaryLabel}`}>Salary</p>
                                        <div className="flex items-center gap-1">
                                            <span className={`text-sm font-black ${theme.currency}`}>₱</span>
                                            <span className={`text-lg font-black leading-none ${theme.salaryValue}`}>{job.salary}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); onSelectJob(job); }} className={`px-3 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${theme.btnSecondary}`}>
                                            Details
                                        </button>
                                        
                                        {/* Apply / Applied Button */}
                                        {hasApplied ? (
                                            <button disabled className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all cursor-not-allowed ${theme.appliedBtn}`}>
                                                Applied
                                            </button>
                                        ) : (
                                            <button onClick={(e) => { e.stopPropagation(); onApply(job); }} className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all ${theme.btnPrimary}`}>
                                                Apply
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }) : (
                    <div className="col-span-full text-center py-20">
                        <SparklesIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <p className="opacity-50 font-black uppercase text-xs tracking-[0.3em] select-none cursor-default">No saved jobs yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}