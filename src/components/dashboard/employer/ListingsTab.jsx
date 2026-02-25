import { cloneElement } from "react";
import { 
    MagnifyingGlassIcon, PlusIcon, MapPinIcon, TagIcon, 
    UsersIcon, PencilSquareIcon, TrashIcon, BriefcaseIcon,
    SparklesIcon, AcademicCapIcon, SunIcon, Cog8ToothIcon, 
    WrenchScrewdriverIcon, HomeIcon, UserGroupIcon 
} from "@heroicons/react/24/outline";

export default function ListingsTab({
    myPostedJobs, searchTerm, setSearchTerm, handleOpenJobModal, 
    handleDeleteJob, receivedApplications, darkMode, getJobStyle, JOB_CATEGORIES
}) {
    
    // --- STYLES ---
    const glassPanel = `backdrop-blur-xl transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white/60 border-slate-200 text-slate-800'}`;
    const glassInput = `w-full bg-transparent border-none outline-none text-sm font-bold placeholder-slate-400 pl-10 pr-4 py-2.5 ${darkMode ? 'text-white' : 'text-slate-800'}`;

    // --- CARD THEME LOGIC ---
    const getCardTheme = (categoryId, isDark) => {
        const darkColors = {
            'EDUCATION': { text: 'text-blue-400', bgLight: 'bg-blue-400/10', border: 'border-blue-400/30', btn: 'bg-blue-400 text-slate-900 hover:bg-blue-500', btnLight: 'bg-blue-400/10 hover:bg-blue-400/20 text-blue-400', cardBg: 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(96,165,250,0.25)]' },
            'AGRICULTURE': { text: 'text-green-400', bgLight: 'bg-green-400/10', border: 'border-green-400/30', btn: 'bg-green-400 text-slate-900 hover:bg-green-500', btnLight: 'bg-green-400/10 hover:bg-green-400/20 text-green-400', cardBg: 'bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(74,222,128,0.25)]' },
            'AUTOMOTIVE': { text: 'text-slate-400', bgLight: 'bg-slate-400/10', border: 'border-slate-400/30', btn: 'bg-slate-400 text-slate-900 hover:bg-slate-500', btnLight: 'bg-slate-400/10 hover:bg-slate-400/20 text-slate-400', cardBg: 'bg-gradient-to-br from-slate-500/20 to-slate-500/5 border border-slate-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(148,163,184,0.25)]' },
            'CARPENTRY': { text: 'text-yellow-400', bgLight: 'bg-yellow-400/10', border: 'border-yellow-400/30', btn: 'bg-yellow-400 text-slate-900 hover:bg-yellow-500', btnLight: 'bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400', cardBg: 'bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(250,204,21,0.25)]' },
            'HOUSEHOLD': { text: 'text-pink-400', bgLight: 'bg-pink-400/10', border: 'border-pink-400/30', btn: 'bg-pink-400 text-slate-900 hover:bg-pink-500', btnLight: 'bg-pink-400/10 hover:bg-pink-400/20 text-pink-400', cardBg: 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 border border-pink-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(244,114,182,0.25)]' },
            'CUSTOMER_SERVICE': { text: 'text-purple-400', bgLight: 'bg-purple-400/10', border: 'border-purple-400/30', btn: 'bg-purple-400 text-slate-900 hover:bg-purple-500', btnLight: 'bg-purple-400/10 hover:bg-purple-400/20 text-purple-400', cardBg: 'bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(192,132,252,0.25)]' },
        };
        const fallbackDark = { text: 'text-slate-400', bgLight: 'bg-slate-400/10', border: 'border-slate-400/30', btn: 'bg-slate-400 text-slate-900 hover:bg-slate-500', btnLight: 'bg-slate-400/10 hover:bg-slate-400/20 text-slate-400', cardBg: 'bg-gradient-to-br from-slate-500/20 to-slate-500/5 border border-slate-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(148,163,184,0.25)]' };

        if (isDark) {
            const cat = darkColors[categoryId] || fallbackDark;
            return {
                title: cat.text, location: cat.text, salaryLabel: cat.text, salaryValue: cat.text, currency: `${cat.text} opacity-70`,
                badge: `${cat.bgLight} ${cat.text} ${cat.border}`, btnPrimary: cat.btn, btnSecondary: cat.btnLight,
                borderColor: cat.border, bgIcon: cat.text, cardBg: cat.cardBg, hoverShadow: cat.hoverShadow
            };
        } else {
            return {
                title: 'text-white drop-shadow-md', location: 'text-blue-100', salaryLabel: 'text-blue-200', salaryValue: 'text-white', currency: 'text-blue-200',
                badge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]', 
                btnPrimary: 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg active:scale-95', btnSecondary: 'text-white bg-white/10 hover:bg-white/20 border border-white/30',
                borderColor: 'border-white/20', bgIcon: 'text-white', cardBg: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] ring-1 ring-inset ring-white/40',
                hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(37,99,235,0.5)]'
            };
        }
    };

    const getCatIcon = (id) => {
        const map = {
            'EDUCATION': AcademicCapIcon, 'AGRICULTURE': SunIcon, 'AUTOMOTIVE': Cog8ToothIcon,
            'CARPENTRY': WrenchScrewdriverIcon, 'HOUSEHOLD': HomeIcon, 'CUSTOMER_SERVICE': UserGroupIcon,
        };
        return map[id] || TagIcon;
    };

    const filteredJobs = myPostedJobs.filter(job => job.title.toLowerCase().includes(searchTerm.toLowerCase()) || (job.sitio && job.sitio.toLowerCase().includes(searchTerm.toLowerCase())));

    return (
        <div className="animate-content">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 mt-4 md:mt-8">
                <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm w-full md:max-w-md transition-all focus-within:ring-2 focus-within:ring-blue-500/20 ${glassPanel}`}>
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        <input type="text" placeholder="Search your listings..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={glassInput} />
                    </div>
                </div>
                
                <button 
                    onClick={() => handleOpenJobModal()} 
                    className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-95 w-full md:w-auto justify-center group transform hover:-translate-y-1"
                >
                    <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" /> Post New Job
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 pt-6 pb-10 -mt-6">
                {filteredJobs.length > 0 ? filteredJobs.map(job => {
                    const applicantCount = job.applicationCount || 0;
                    const isFull = job.capacity > 0 && applicantCount >= job.capacity;
                    const typeStyle = getJobStyle(job.type);
                    const theme = getCardTheme(job.category, darkMode);

                    return (
                        <div key={job.id} onClick={() => handleOpenJobModal(job)} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 ${theme.hoverShadow} cursor-pointer flex flex-col justify-between min-h-[220px] ${theme.cardBg} w-full`}>
                            
                            <div className={`absolute -right-4 bottom-0 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform duration-500 pointer-events-none ${theme.bgIcon}`}>
                                {cloneElement(typeStyle.icon, { className: "w-40 h-40 md:w-48 md:h-48" })}
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start gap-4 mb-2">
                                    <h3 className={`font-black text-xl leading-tight line-clamp-2 pt-1 ${theme.title}`}>{job.title}</h3>
                                    
                                    {isFull ? (
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-sm shrink-0 border ${darkMode ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                            <span className="text-[9px] font-bold uppercase tracking-wide">Capacity Reached</span>
                                        </div>
                                    ) : (
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-sm shrink-0 border ${theme.badge}`}>
                                            <span className="relative flex h-2 w-2">
                                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${darkMode ? 'bg-green-400' : 'bg-green-300'}`}></span>
                                                <span className={`relative inline-flex rounded-full h-2 w-2 ${darkMode ? 'bg-green-500' : 'bg-green-400'}`}></span>
                                            </span>
                                            <span className="text-[9px] font-bold uppercase tracking-wide">Active</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className={`flex items-center gap-1.5 mb-4 ${theme.location}`}>
                                    <MapPinIcon className="w-4 h-4 shrink-0" />
                                    <p className="text-[11px] font-bold uppercase tracking-wide opacity-80 truncate">{job.sitio || "Remote/Any"}</p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mb-6">
                                    {job.category && (() => {
                                        const CatIcon = getCatIcon(job.category);
                                        return (
                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide flex items-center gap-1 shadow-sm ${theme.badge}`}>
                                                <CatIcon className="w-3 h-3" />
                                                {JOB_CATEGORIES.find(c => c.id === job.category)?.label || job.category}
                                            </span>
                                        )
                                    })()}
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide flex items-center gap-1 shadow-sm ${theme.badge}`}>
                                        <span className="scale-75 w-3 h-3 flex items-center justify-center">{typeStyle.icon}</span>
                                        {job.type}
                                    </span>
                                </div>

                                <div className={`mt-auto pt-4 border-t flex flex-wrap items-end justify-between gap-3 ${theme.borderColor}`}>
                                    <div className="mb-1">
                                        <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${theme.salaryLabel}`}>Salary</p>
                                        <div className="flex items-center gap-1">
                                            <span className={`text-sm font-black ${theme.currency}`}>₱</span>
                                            <span className={`text-lg font-black leading-none ${theme.salaryValue}`}>{job.salary}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <div className={`flex items-center gap-1.5 mr-2 ${theme.salaryLabel}`} title={`${applicantCount} Applicants`}>
                                            <UsersIcon className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{applicantCount} {job.capacity > 0 ? `/ ${job.capacity}` : ''}</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenJobModal(job); }} className={`p-2.5 rounded-xl transition-all ${theme.btnSecondary}`} title="Edit Job"><PencilSquareIcon className="w-4 h-4" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id); }} className={`p-2.5 rounded-xl transition-all ${darkMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600'} border border-transparent`} title="Delete Job"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="col-span-full text-center py-20">
                        <SparklesIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <p className="opacity-50 font-black uppercase text-xs tracking-[0.3em] select-none cursor-default">No jobs posted yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}