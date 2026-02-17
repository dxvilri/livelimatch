import { useState, cloneElement } from "react";
import { MagnifyingGlassIcon, MapPinIcon, ChevronDownIcon, TagIcon, BriefcaseIcon, BookmarkIcon, PaperAirplaneIcon, ChatBubbleLeftRightIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { JOB_TYPES, JOB_CATEGORIES, PUROK_LIST } from "../../../utils/applicantConstants";

export default function FindJobsTab({ 
    availableJobs, myApplications, savedJobs, conversations, 
    handleToggleSaveJob, setSelectedJob, handleApplyToJob, 
    darkMode, setActiveTab 
}) {
    // Moved local state inside the tab
    const [jobSearch, setJobSearch] = useState("");
    const [jobLocationFilter, setJobLocationFilter] = useState("");
    const [jobCategoryFilter, setJobCategoryFilter] = useState("");
    const [isSitioDropdownOpen, setIsSitioDropdownOpen] = useState(false);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

    const getJobStyle = (type) => JOB_TYPES.find(j => j.id === type) || JOB_TYPES[3];

    const filteredJobs = availableJobs.filter(job => {
        const hasApplied = myApplications.some(app => app.jobId === job.id);
        if (hasApplied) return false;
        const matchesSearch = job.title.toLowerCase().includes(jobSearch.toLowerCase()) || (job.employerName && job.employerName.toLowerCase().includes(jobSearch.toLowerCase()));
        const matchesLoc = jobLocationFilter ? job.sitio === jobLocationFilter : true;
        const matchesCategory = jobCategoryFilter ? job.category === jobCategoryFilter : true;
        return matchesSearch && matchesLoc && matchesCategory;
    });

    const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;
    const glassInput = `w-full bg-transparent border-none outline-none text-sm font-bold placeholder-slate-400 ${darkMode ? 'text-white' : 'text-slate-800'}`;

    return (
        <div className="animate-content">
            <div className="space-y-6 mb-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mt-4 md:mt-8">
                    <div onClick={() => setActiveTab("FindJobs")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                        <div className="relative z-10"><h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{availableJobs.length}</h3><p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>Jobs</p></div>
                        <BriefcaseIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                    </div>
                    <div onClick={() => setActiveTab("Saved")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                        <div className="relative z-10"><h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{savedJobs.length}</h3><p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-purple-200' : 'text-blue-800'}`}>Saved</p></div>
                        <BookmarkIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                    </div>
                    <div onClick={() => setActiveTab("Applications")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                        <div className="relative z-10"><h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{myApplications.length}</h3><p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-amber-200' : 'text-blue-800'}`}>Applied</p></div>
                        <PaperAirplaneIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                    </div>
                    <div onClick={() => setActiveTab("Messages")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 border-pink-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                        <div className="relative z-10"><h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0)}</h3><p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-pink-200' : 'text-blue-800'}`}>Messages</p></div>
                        <ChatBubbleLeftRightIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className={`flex flex-col lg:flex-row items-center p-1.5 rounded-2xl border shadow-sm w-full gap-2 lg:gap-0 relative z-40 ${glassPanel}`}>
                    <div className="relative w-full lg:flex-1 min-w-0">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Search job title or employer..." value={jobSearch} onChange={(e) => setJobSearch(e.target.value)} className={glassInput + " pl-9 pr-4 py-2.5"} />
                    </div>
                    <div className={`hidden lg:block w-px h-6 mx-2 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    
                    {/* Location Dropdown */}
                    <div className="relative w-full lg:w-auto lg:min-w-[180px] shrink-0">
                        <button onClick={() => { setIsSitioDropdownOpen(!isSitioDropdownOpen); setIsCategoryDropdownOpen(false); }} className={`w-full lg:w-48 flex items-center justify-between pl-2 pr-2 py-1.5 outline-none font-bold text-xs cursor-pointer transition-colors rounded-xl border lg:border-none ${darkMode ? 'text-white hover:bg-white/5 border-white/10' : 'text-slate-700 hover:bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center gap-3"><div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0"><MapPinIcon className="w-4 h-4" /></div><span className="truncate">{jobLocationFilter || "All Locations"}</span></div>
                            <ChevronDownIcon className={`w-3 h-3 transition-transform ${isSitioDropdownOpen ? 'rotate-180' : ''}`}/>
                        </button>
                        {isSitioDropdownOpen && (
                            <div className={`absolute top-full left-0 mt-2 w-full lg:w-56 z-[60] rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                <div className="max-h-60 overflow-y-auto p-1 space-y-1 hide-scrollbar">
                                    <button onClick={() => { setJobLocationFilter(""); setIsSitioDropdownOpen(false); }} className={`w-full text-left p-3 rounded-lg transition-colors ${!jobLocationFilter ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}><span className="text-xs font-bold block">All Locations</span></button>
                                    {PUROK_LIST.map(p => ( <button key={p} onClick={() => { setJobLocationFilter(p); setIsSitioDropdownOpen(false); }} className={`w-full text-left p-3 rounded-lg transition-colors ${jobLocationFilter === p ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}><span className="text-xs font-bold block">{p}</span></button> ))}
                                </div>
                            </div>
                        )}
                        {isSitioDropdownOpen && <div className="fixed inset-0 z-[50]" onClick={() => setIsSitioDropdownOpen(false)}></div>}
                    </div>

                    <div className={`hidden lg:block w-px h-6 mx-2 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>

                    {/* Category Dropdown */}
                    <div className="relative w-full lg:w-auto lg:min-w-[180px] shrink-0">
                        <button onClick={() => { setIsCategoryDropdownOpen(!isCategoryDropdownOpen); setIsSitioDropdownOpen(false); }} className={`w-full lg:w-48 flex items-center justify-between pl-2 pr-2 py-1.5 outline-none font-bold text-xs cursor-pointer transition-colors rounded-xl border lg:border-none ${darkMode ? 'text-white hover:bg-white/5 border-white/10' : 'text-slate-700 hover:bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center gap-3"><div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 shrink-0"><TagIcon className="w-4 h-4" /></div><span className="truncate">{jobCategoryFilter ? JOB_CATEGORIES.find(c => c.id === jobCategoryFilter)?.label : "All Categories"}</span></div>
                            <ChevronDownIcon className={`w-3 h-3 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}/>
                        </button>
                        {isCategoryDropdownOpen && (
                            <div className={`absolute top-full left-0 mt-2 w-full lg:w-56 z-[60] rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                <div className="max-h-60 overflow-y-auto p-1 space-y-1 hide-scrollbar">
                                    <button onClick={() => { setJobCategoryFilter(""); setIsCategoryDropdownOpen(false); }} className={`w-full text-left p-3 rounded-lg transition-colors ${!jobCategoryFilter ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}><span className="text-xs font-bold block">All Categories</span></button>
                                    {JOB_CATEGORIES.map(c => ( <button key={c.id} onClick={() => { setJobCategoryFilter(c.id); setIsCategoryDropdownOpen(false); }} className={`w-full text-left p-3 rounded-lg transition-colors group ${jobCategoryFilter === c.id ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}><div className="flex flex-col"><span className="text-xs font-bold block">{c.label}</span><span className={`text-[9px] mt-0.5 font-medium truncate ${jobCategoryFilter === c.id ? 'text-white/70' : 'opacity-50'}`}>{c.examples}</span></div></button> ))}
                                </div>
                            </div>
                        )}
                        {isCategoryDropdownOpen && <div className="fixed inset-0 z-[50]" onClick={() => setIsCategoryDropdownOpen(false)}></div>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                {filteredJobs.length > 0 ? filteredJobs.map(job => {
                    const style = getJobStyle(job.type);
                    const isSaved = savedJobs.some(s => s.jobId === job.id);
                    return (
                        <div key={job.id} onClick={() => setSelectedJob(job)} className={`group relative p-6 rounded-[2rem] border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer overflow-hidden ${darkMode ? 'bg-slate-900/60 border-white/10 hover:border-blue-500/30' : 'bg-white/80 border-slate-200 hover:border-blue-400/50 hover:shadow-blue-100'} backdrop-blur-xl`}>
                            <div className="absolute top-10 right-4 md:top-10 md:right-8 opacity-10 transform -rotate-12 group-hover:scale-110 transition-transform duration-500 pointer-events-none">{cloneElement(style.icon, { className: "w-32 h-32 md:w-56 md:h-56" })}</div>
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`backdrop-blur-md px-3 py-1.5 rounded-xl border flex items-center gap-2 shadow-sm ${style.bg} ${style.border}`}><span className={`${style.color} scale-90`}>{style.icon}</span><span className={`text-[10px] font-black uppercase tracking-widest ${style.color}`}>{job.type}</span></div>
                                    <button onClick={(e) => { e.stopPropagation(); handleToggleSaveJob(job); }} className={`p-2 rounded-full transition-colors ${isSaved ? 'text-blue-500 bg-blue-500/10' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>{isSaved ? <BookmarkIcon className="w-5 h-5 fill-current"/> : <BookmarkIcon className="w-5 h-5"/>}</button>
                                </div>
                                <div className="mb-3 md:mb-6 space-y-2 pr-4">
                                    <h3 className={`font-black text-lg leading-tight truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1 truncate">{job.employerName}</p>
                                    <div className="flex flex-col gap-1.5 mt-2">
                                        <div className="flex items-center gap-2 text-slate-400"><MapPinIcon className="w-4 h-4 text-blue-500" /><p className={`text-[10px] md:text-[11px] font-bold uppercase tracking-wide opacity-80 ${!darkMode && 'text-slate-500'}`}>{job.sitio || "No Location"}</p></div>
                                        {job.category && <div className="flex items-center gap-2 text-slate-400"><TagIcon className="w-4 h-4 text-purple-500" /><p className={`text-[10px] md:text-[11px] font-bold uppercase tracking-wide opacity-80 ${!darkMode && 'text-slate-500'}`}>{JOB_CATEGORIES.find(c => c.id === job.category)?.label || job.category}</p></div>}
                                    </div>
                                </div>
                                <div className="mt-auto pt-4 border-t border-dashed border-slate-500/20 flex items-center justify-between">
                                    <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Salary</p><p className={`text-lg md:text-xl font-black bg-clip-text text-transparent bg-gradient-to-r ${darkMode ? 'from-white to-slate-400' : 'from-slate-900 to-slate-600'}`}><span className="text-sm">₱</span> {job.salary}</p></div>
                                    <button className="px-4 py-2 rounded-xl bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-500/20 group-hover:bg-blue-500 transition-colors">Apply</button>
                                </div>
                            </div>
                        </div>
                    )
                }) : <div className="col-span-full text-center py-20"><SparklesIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" /><p className="opacity-50 font-black uppercase text-xs tracking-[0.3em] select-none cursor-default">No jobs found matching filters</p></div>}
            </div>
        </div>
    );
}