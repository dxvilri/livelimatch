import { cloneElement } from "react";
import { BookmarkIcon, LockClosedIcon, TagIcon } from "@heroicons/react/24/outline";

export default function SavedJobsTab({ 
    savedJobs, myApplications, onToggleSave, onSelectJob, onApply, getJobStyle, darkMode, JOB_CATEGORIES 
}) {
    return (
        <div className="animate-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {savedJobs.length > 0 ? savedJobs.map(item => {
                    const job = item.jobData;
                    const style = getJobStyle(job.type);
                    const hasApplied = myApplications.some(app => app.jobId === job.id && app.status !== 'withdrawn');

                    return (
                        <div key={item.id} className={`group relative p-6 rounded-[2rem] border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer overflow-hidden ${darkMode ? 'bg-slate-900/60 border-white/10 hover:border-blue-500/30' : 'bg-white border-slate-200 hover:border-blue-400/50 hover:shadow-blue-100'} backdrop-blur-xl`}>
                            <div className="absolute top-10 right-4 md:top-10 md:right-8 opacity-10 transform -rotate-12 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                                {cloneElement(style.icon, { className: "w-32 h-32 md:w-56 md:h-56" })}
                            </div>
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`backdrop-blur-md px-3 py-1.5 rounded-xl border flex items-center gap-2 shadow-sm ${style.bg} ${style.border}`}>
                                        <span className={`${style.color} scale-90`}>{style.icon}</span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${style.color}`}>{job.type}</span>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onToggleSave(job); }} 
                                        className={`p-2 rounded-full transition-colors ${hasApplied ? 'opacity-50 cursor-not-allowed text-blue-500 bg-blue-500/10' : 'text-blue-500 bg-blue-500/10'}`}
                                        disabled={hasApplied}
                                        title={hasApplied ? "Cannot unsave applied jobs" : "Unsave"}
                                    >
                                        {hasApplied ? <LockClosedIcon className="w-5 h-5"/> : <BookmarkIcon className="w-5 h-5 fill-current"/>}
                                    </button>
                                </div>
                                <div className="mb-4">
                                    <h3 className={`text-lg md:text-xl font-black leading-tight mb-2 line-clamp-2 select-none cursor-default ${darkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>
                                    <p className="text-xs font-bold opacity-60 uppercase mb-2">{job.employerName}</p>
                                    
                                    {job.category && (
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide bg-purple-500/10 text-purple-500 border border-purple-500/20 w-fit">
                                            <TagIcon className="w-3 h-3" />
                                            {JOB_CATEGORIES.find(c => c.id === job.category)?.label || job.category}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-auto flex gap-4 pt-4 border-t border-dashed border-slate-500/20">
                                    <button onClick={() => onSelectJob(job)} className={`flex-1 justify-center flex p-3 rounded-xl transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest ${darkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>View Details</button>
                                    {hasApplied ? (
                                        <button disabled className="flex-1 justify-center flex p-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-green-500/10 text-green-500 cursor-not-allowed">Applied</button>
                                    ) : (
                                        <button onClick={() => onApply(job)} className="flex-1 justify-center flex p-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 shadow-lg">Apply</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="col-span-full text-center py-20"><p className="opacity-50 font-black uppercase text-xs tracking-[0.3em] select-none cursor-default">No saved jobs</p></div>
                )}
            </div>
        </div>
    );
}