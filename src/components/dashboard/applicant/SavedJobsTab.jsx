import { 
  BookmarkIcon, MapPinIcon, SparklesIcon, AcademicCapIcon, SunIcon, Cog8ToothIcon, WrenchScrewdriverIcon, HomeIcon, UserGroupIcon, TagIcon
} from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolidIcon } from "@heroicons/react/24/solid";
import { cloneElement } from "react";

export default function SavedJobsTab({
    savedJobs, myApplications, onToggleSave, onSelectJob, onApply, 
    getJobStyle, darkMode, JOB_CATEGORIES
}) {
    // Helper to get Category Icons and Styles
    const getCatStyles = (id) => {
        const map = {
            'EDUCATION': { icon: AcademicCapIcon, text: 'text-blue-600 dark:text-blue-400', bgLight: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20' },
            'AGRICULTURE': { icon: SunIcon, text: 'text-green-600 dark:text-green-400', bgLight: 'bg-green-50 dark:bg-green-500/10', border: 'border-green-200 dark:border-green-500/20' },
            'AUTOMOTIVE': { icon: Cog8ToothIcon, text: 'text-slate-600 dark:text-slate-400', bgLight: 'bg-slate-50 dark:bg-slate-500/10', border: 'border-slate-200 dark:border-slate-500/20' },
            'CARPENTRY': { icon: WrenchScrewdriverIcon, text: 'text-yellow-600 dark:text-yellow-400', bgLight: 'bg-yellow-50 dark:bg-yellow-500/10', border: 'border-yellow-200 dark:border-yellow-500/20' },
            'HOUSEHOLD': { icon: HomeIcon, text: 'text-pink-600 dark:text-pink-400', bgLight: 'bg-pink-50 dark:bg-pink-500/10', border: 'border-pink-200 dark:border-pink-500/20' },
            'CUSTOMER_SERVICE': { icon: UserGroupIcon, text: 'text-purple-600 dark:text-purple-400', bgLight: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-200 dark:border-purple-500/20' },
        };
        return map[id] || { icon: TagIcon, text: 'text-slate-600 dark:text-slate-400', bgLight: 'bg-slate-50 dark:bg-slate-500/10', border: 'border-slate-200 dark:border-slate-500/20' };
    };

    return (
        <div className="animate-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                {savedJobs.length > 0 ? savedJobs.map(savedDoc => {
                    const job = savedDoc.jobData;
                    const typeStyle = getJobStyle(job.type);
                    const isApplied = myApplications.some(app => app.jobId === job.id);

                    return (
                        <div key={savedDoc.id} onClick={() => onSelectJob(job)} className={`group relative p-5 md:p-6 rounded-[2rem] border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer overflow-hidden flex flex-col h-full ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>

                            {/* Large Background Icon */}
                            <div className={`absolute -right-4 -bottom-4 md:-right-6 md:-bottom-6 opacity-[0.04] dark:opacity-5 transform -rotate-12 group-hover:scale-110 transition-transform duration-500 pointer-events-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {cloneElement(typeStyle.icon, { className: "w-40 h-40 md:w-56 md:h-56" })}
                            </div>

                            <div className="relative z-10 flex flex-col h-full">

                                {/* Top Row: Job Type Badge & Save Button */}
                                <div className="flex justify-between items-start mb-4">
                                    {/* Job Type Badge */}
                                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1.5 ${typeStyle.bgLight || typeStyle.bg} ${typeStyle.border} ${typeStyle.color}`}>
                                        <span className="scale-75 w-3.5 h-3.5 flex items-center justify-center">{typeStyle.icon}</span>
                                        {job.type}
                                    </span>

                                    {/* Bookmark / Unsave Button (Solid blue because it's in the Saved tab) */}
                                    <button onClick={(e) => { e.stopPropagation(); onToggleSave(job); }} className={`p-2 rounded-full transition-colors shrink-0 -mt-2 -mr-2 text-blue-600 bg-blue-50 hover:bg-red-50 hover:text-red-500 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-red-500/10 dark:hover:text-red-400`}>
                                        <BookmarkSolidIcon className="w-5 h-5"/>
                                    </button>
                                </div>

                                {/* Job Title */}
                                <h3 className={`font-black text-xl md:text-2xl leading-tight line-clamp-2 mb-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>

                                {/* Employer Name */}
                                <p className={`text-[10px] font-bold uppercase tracking-widest truncate mb-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{job.employerName}</p>

                                {/* Location */}
                                <div className={`flex items-center gap-1.5 mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    <MapPinIcon className="w-4 h-4 shrink-0" />
                                    <p className="text-[11px] font-bold uppercase tracking-wide opacity-90 truncate">{job.sitio || "No Location"}</p>
                                </div>

                                {/* Category Badge */}
                                <div className="mb-5">
                                    {job.category && (() => {
                                        const catStyle = getCatStyles(job.category);
                                        const CatIcon = catStyle.icon;
                                        return (
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide border items-center gap-1 shadow-sm ${catStyle.bgLight} ${catStyle.border} ${catStyle.text}`}>
                                                <CatIcon className="w-3 h-3" />
                                                {JOB_CATEGORIES.find(c => c.id === job.category)?.label || job.category}
                                            </span>
                                        )
                                    })()}
                                </div>

                                {/* Divider & Bottom Section (Salary + Actions) */}
                                <div className={`mt-auto pt-4 border-t border-dashed flex flex-wrap items-end justify-between gap-3 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                                    <div className="mb-0.5">
                                        <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Salary</p>
                                        <div className="flex items-center gap-1">
                                            <span className={`text-sm font-black ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>₱</span>
                                            <span className={`text-xl font-black leading-none ${darkMode ? 'text-white' : 'text-slate-800'}`}>{job.salary}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); onSelectJob(job); }} className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                            View Details
                                        </button>

                                        {isApplied ? (
                                            <button disabled className={`px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all opacity-80 cursor-not-allowed ${darkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'}`}>
                                                Applied
                                            </button>
                                        ) : (
                                            <button onClick={(e) => { e.stopPropagation(); onApply(job); }} className="px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all bg-blue-600 hover:bg-blue-500 text-white">
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