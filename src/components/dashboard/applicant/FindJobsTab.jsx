import { 
    MagnifyingGlassIcon, MapPinIcon, BookmarkIcon, BriefcaseIcon, 
    SparklesIcon, ChevronDownIcon, TagIcon, PaperAirplaneIcon, 
    ChatBubbleLeftRightIcon, MegaphoneIcon, AcademicCapIcon, 
    SunIcon, Cog8ToothIcon, WrenchScrewdriverIcon, HomeIcon, UserGroupIcon 
} from "@heroicons/react/24/outline";
import { cloneElement } from "react";

export default function FindJobsTab({
    availableJobs, savedJobs, myApplications, conversations, currentUser, applicantData,
    jobSearch, setJobSearch, jobLocationFilter, setJobLocationFilter,
    jobCategoryFilter, setJobCategoryFilter, isSitioDropdownOpen, setIsSitioDropdownOpen,
    isCategoryDropdownOpen, setIsCategoryDropdownOpen, onSelectJob, onToggleSave,
    onApply, handleViewAnnouncement, displayAnnouncement, darkMode, setActiveTab,
    PUROK_LIST, JOB_CATEGORIES, getJobStyle
}) {

    const unreadCount = conversations.reduce((acc, c) => acc + (c[`unread_${currentUser?.uid}`] || 0), 0);

    // --- 1. FILTERING LOGIC ---
    const filteredJobs = availableJobs.filter(job => {
        const hasApplied = myApplications.some(app => app.jobId === job.id);
        if (hasApplied) return false;
        
        const matchesSearch = job.title.toLowerCase().includes(jobSearch.toLowerCase()) || 
                              (job.employerName && job.employerName.toLowerCase().includes(jobSearch.toLowerCase()));
        const matchesLoc = jobLocationFilter ? job.sitio === jobLocationFilter : true;
        const matchesCategory = jobCategoryFilter ? job.category === jobCategoryFilter : true;
        
        return matchesSearch && matchesLoc && matchesCategory;
    });

    // --- 2. SUGGESTION LOGIC ---
    const isFiltering = (jobSearch?.length > 0) || (jobLocationFilter?.length > 0) || (jobCategoryFilter?.length > 0);
    
    const suggestedJobs = filteredJobs.filter(job => {
        const matchCategory = applicantData?.category && job.category === applicantData.category;
        const matchLocation = applicantData?.sitio && job.sitio === applicantData.sitio;
        return matchCategory || matchLocation;
    });
    
    const recentJobs = filteredJobs.filter(job => !suggestedJobs.includes(job));

    // --- 3. STYLES & THEMES ---
    const glassPanel = `backdrop-blur-xl transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white/60 border-slate-200 text-slate-800'}`;
    const glassInput = `w-full bg-transparent outline-none font-bold text-xs ${darkMode ? 'text-white placeholder-blue-200/50' : 'text-slate-800 placeholder-blue-600/50'}`;

    const getCatStyles = (id) => {
        const map = {
            'EDUCATION': { icon: AcademicCapIcon, text: darkMode ? 'text-blue-400' : 'text-blue-600', bgLight: darkMode ? 'bg-blue-400/10' : 'bg-blue-600/10', active: darkMode ? 'bg-blue-400/10 border-blue-400' : 'bg-blue-600/10 border-blue-600', hover: darkMode ? 'hover:border-blue-400/50' : 'hover:border-blue-600/50', hoverText: darkMode ? 'group-hover:text-blue-400' : 'group-hover:text-blue-600' },
            'AGRICULTURE': { icon: SunIcon, text: 'text-green-500', bgLight: 'bg-green-500/10', active: 'bg-green-500/10 border-green-500', hover: 'hover:border-green-500/50', hoverText: 'group-hover:text-green-500' },
            'AUTOMOTIVE': { icon: Cog8ToothIcon, text: 'text-slate-400', bgLight: 'bg-slate-400/10', active: 'bg-slate-400/10 border-slate-400', hover: 'hover:border-slate-400/50', hoverText: 'group-hover:text-slate-400' },
            'CARPENTRY': { icon: WrenchScrewdriverIcon, text: 'text-yellow-500', bgLight: 'bg-yellow-500/10', active: 'bg-yellow-500/10 border-yellow-500', hover: 'hover:border-yellow-500/50', hoverText: 'group-hover:text-yellow-500' },
            'HOUSEHOLD': { icon: HomeIcon, text: 'text-pink-500', bgLight: 'bg-pink-500/10', active: 'bg-pink-500/10 border-pink-500', hover: 'hover:border-pink-500/50', hoverText: 'group-hover:text-pink-500' },
            'CUSTOMER_SERVICE': { icon: UserGroupIcon, text: 'text-purple-500', bgLight: 'bg-purple-500/10', active: 'bg-purple-500/10 border-purple-500', hover: 'hover:border-purple-500/50', hoverText: 'group-hover:text-purple-500' },
        };
        return map[id] || { icon: TagIcon, text: 'text-slate-500', bgLight: 'bg-slate-500/10', active: 'bg-slate-500/10 border-slate-500', hover: 'hover:border-slate-500/50', hoverText: 'group-hover:text-slate-500' }; 
    };

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
                // The Glossy Background effect
                cardBg: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] ring-1 ring-inset ring-white/40'
            };
        }
    };

    // --- 4. REUSABLE JOB CARD RENDERER ---
    const renderJobCard = (job, isHorizontal = false) => {
        const typeStyle = getJobStyle(job.type);
        const isSaved = savedJobs.some(s => s.jobId === job.id);
        const theme = getCardTheme(job.category, darkMode);

        return (
            <div key={job.id} onClick={() => onSelectJob(job)} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_30px_-5px_rgba(37,99,235,0.5)] cursor-pointer flex flex-col justify-between min-h-[220px] ${theme.cardBg} ${isHorizontal ? 'w-[85vw] sm:w-[320px] shrink-0 snap-start' : 'w-full'}`}>
               {/* Large Background Icon */}
                <div className={`absolute -right-4 bottom-0 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform duration-500 pointer-events-none ${theme.bgIcon}`}>
                    {cloneElement(typeStyle.icon, { className: "w-40 h-40 md:w-48 md:h-48" })}
                </div>

                <div className="relative z-10 flex flex-col h-full">
                    {/* Job Title & Bookmark */}
                    <div className="flex justify-between items-start gap-4 mb-2">
                        <h3 className={`font-black text-xl leading-tight line-clamp-2 pt-1 ${theme.title}`}>{job.title}</h3>
                        <button onClick={(e) => { e.stopPropagation(); onToggleSave(job); }} className={`p-2 rounded-full transition-colors shrink-0 -mt-1 -mr-1 ${isSaved ? theme.saveActive : theme.saveIdle}`}>
                            {isSaved ? <BookmarkIcon className="w-5 h-5 fill-current"/> : <BookmarkIcon className="w-5 h-5"/>}
                        </button>
                    </div>
                    
                    {/* Location */}
                    <div className={`flex items-center gap-1.5 mb-4 ${theme.location}`}>
                        <MapPinIcon className="w-4 h-4 shrink-0" />
                        <p className="text-[11px] font-bold uppercase tracking-wide opacity-80 truncate">{job.sitio || "No Location"}</p>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        {job.category && (() => {
                            const CatIcon = getCatStyles(job.category).icon;
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

                    {/* Salary & Actions */}
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
                            <button onClick={(e) => { e.stopPropagation(); onApply(job); }} className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${theme.btnPrimary}`}>
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    };

    return (
        <div className="animate-content">
            <div className="space-y-6 mb-8">
                
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mt-4 md:mt-8">
                    <div onClick={() => setActiveTab("FindJobs")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{availableJobs.length}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-blue-200' : 'text-blue-600'}`}>Jobs</p>
                        </div>
                        <BriefcaseIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-500'}`}/>
                    </div>

                    <div onClick={() => setActiveTab("Saved")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{savedJobs.length}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-purple-200' : 'text-blue-600'}`}>Saved</p>
                        </div>
                        <BookmarkIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-500'}`}/>
                    </div>

                    <div onClick={() => setActiveTab("Applications")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{myApplications.length}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-amber-200' : 'text-blue-600'}`}>Applied</p>
                        </div>
                        <PaperAirplaneIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-500'}`}/>
                    </div>

                    <div onClick={() => setActiveTab("Messages")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 border-pink-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{unreadCount}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-pink-200' : 'text-blue-600'}`}>Messages</p>
                        </div>
                        <ChatBubbleLeftRightIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-500'}`}/>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className={`flex flex-col lg:flex-row items-center p-1.5 rounded-2xl border shadow-sm w-full gap-2 lg:gap-0 relative z-40 ${glassPanel}`}>
                    <div className="relative w-full lg:flex-1 min-w-0">
                        <MagnifyingGlassIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-blue-400/50' : 'text-blue-600/50'}`} />
                        <input type="text" placeholder="Search job title or employer..." value={jobSearch} onChange={(e) => setJobSearch(e.target.value)} className={glassInput + " pl-9 pr-4 py-2.5"} />
                    </div>
                    
                    <div className={`hidden lg:block w-px h-6 mx-2 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    
                    {/* Location Dropdown */}
                    <div className="relative w-full lg:w-auto lg:min-w-[180px] shrink-0">
                        <button onClick={() => { setIsSitioDropdownOpen(!isSitioDropdownOpen); setIsCategoryDropdownOpen(false); }} className={`w-full lg:w-48 flex items-center justify-between pl-2 pr-2 py-1.5 outline-none font-bold text-xs cursor-pointer transition-colors rounded-xl border lg:border-none ${darkMode ? 'text-white hover:bg-white/5 border-white/10' : 'text-slate-700 hover:bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg shrink-0 ${darkMode ? 'bg-blue-400/10 text-blue-400' : 'bg-blue-600/10 text-blue-600'}`}><MapPinIcon className="w-4 h-4" /></div>
                                <span className="truncate">{jobLocationFilter || "All Locations"}</span>
                            </div>
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                                <ChevronDownIcon className={`w-3 h-3 transition-transform ${isSitioDropdownOpen ? 'rotate-180' : ''}`}/>
                            </div>
                        </button>
                        {isSitioDropdownOpen && (
                            <div className={`absolute top-full left-0 mt-2 w-full lg:w-56 z-[60] rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                <div className="max-h-60 overflow-y-auto p-1 space-y-1 hide-scrollbar">
                                    <button onClick={() => { setJobLocationFilter(""); setIsSitioDropdownOpen(false); }} className={`w-full text-left p-3 rounded-lg transition-colors ${!jobLocationFilter ? (darkMode ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white') : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}><span className="text-xs font-bold block">All Locations</span></button>
                                    {PUROK_LIST.map(p => (
                                        <button key={p} onClick={() => { setJobLocationFilter(p); setIsSitioDropdownOpen(false); }} className={`w-full text-left p-3 rounded-lg transition-colors ${jobLocationFilter === p ? (darkMode ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white') : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}><span className="text-xs font-bold block">{p}</span></button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {isSitioDropdownOpen && <div className="fixed inset-0 z-[50]" onClick={() => setIsSitioDropdownOpen(false)}></div>}
                    </div>

                    <div className={`hidden lg:block w-px h-6 mx-2 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>

                    {/* Category Dropdown */}
                    <div className="relative w-full lg:w-auto lg:min-w-[180px] shrink-0">
                        <button onClick={() => { setIsCategoryDropdownOpen(!isCategoryDropdownOpen); setIsSitioDropdownOpen(false); }} className={`w-full lg:w-48 flex items-center justify-between pl-2 pr-2 py-1.5 outline-none font-bold text-xs cursor-pointer transition-colors rounded-xl border lg:border-none ${darkMode ? 'text-white hover:bg-white/5 border-white/10' : 'text-slate-700 hover:bg-slate-50 border-slate-200'}`}>
                            {(() => {
                                const activeStyle = jobCategoryFilter ? getCatStyles(jobCategoryFilter) : { icon: TagIcon, text: darkMode ? 'text-blue-400' : 'text-blue-600', bgLight: darkMode ? 'bg-blue-400/10' : 'bg-blue-600/10' };
                                const ActiveIcon = activeStyle.icon;
                                return (
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-lg shrink-0 ${activeStyle.bgLight} ${activeStyle.text}`}>
                                            <ActiveIcon className="w-4 h-4" />
                                        </div>
                                        <span className={`truncate ${jobCategoryFilter ? activeStyle.text : ''}`}>
                                            {jobCategoryFilter ? JOB_CATEGORIES.find(c => c.id === jobCategoryFilter)?.label : "All Categories"}
                                        </span>
                                    </div>
                                )
                            })()}
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                                <ChevronDownIcon className={`w-3 h-3 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}/>
                            </div>
                        </button>
                        
                        {isCategoryDropdownOpen && (
                            <div className={`absolute top-full left-0 mt-2 w-full lg:w-64 z-[60] rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                <div className="max-h-60 overflow-y-auto p-2 space-y-1.5 hide-scrollbar">
                                    <button onClick={() => { setJobCategoryFilter(""); setIsCategoryDropdownOpen(false); }} className={`relative overflow-hidden w-full text-left p-3 rounded-xl transition-all duration-300 group border backdrop-blur-sm ${!jobCategoryFilter ? (darkMode ? 'bg-blue-400/10 border-blue-400 text-blue-400 shadow-[0_0_20px_-3px_rgba(96,165,250,0.4)]' : 'bg-blue-600/10 border-blue-600 text-blue-600 shadow-[0_0_20px_-3px_rgba(37,99,235,0.4)]') : `border-transparent ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}`}>
                                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent transition-transform duration-700 ease-in-out z-0 pointer-events-none" />
                                        <div className="flex items-center gap-3 relative z-10">
                                            <TagIcon className={`w-5 h-5 transition-colors ${!jobCategoryFilter ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'text-slate-400'}`} />
                                            <span className={`text-xs font-black block transition-colors ${!jobCategoryFilter ? (darkMode ? 'text-blue-400' : 'text-blue-600') : darkMode ? 'text-white group-hover:text-blue-400' : 'text-slate-700 group-hover:text-blue-600'}`}>All Categories</span>
                                        </div>
                                    </button>
                                    
                                    {JOB_CATEGORIES.map(c => {
                                        const catStyle = getCatStyles(c.id);
                                        const CatIcon = catStyle.icon;
                                        const isSelected = jobCategoryFilter === c.id;
                                        return (
                                            <button 
                                                key={c.id} 
                                                onClick={() => { setJobCategoryFilter(c.id); setIsCategoryDropdownOpen(false); }} 
                                                className={`relative overflow-hidden w-full text-left p-3 rounded-xl transition-all duration-300 group border backdrop-blur-sm ${isSelected ? catStyle.active : `border-transparent ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'} ${catStyle.hover}`}`}
                                            >
                                                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent transition-transform duration-700 ease-in-out z-0 pointer-events-none" />
                                                
                                                <div className="flex items-center gap-3 relative z-10">
                                                    <CatIcon className={`w-5 h-5 transition-colors ${isSelected ? catStyle.text : `text-slate-400 ${catStyle.hoverText}`}`} />
                                                    <div className="flex flex-col">
                                                        <span className={`text-xs font-black block transition-colors ${isSelected ? catStyle.text : `text-slate-700 dark:text-slate-200 ${catStyle.hoverText}`}`}>
                                                            {c.label}
                                                        </span>
                                                        <span className={`text-[9px] mt-0.5 font-medium truncate transition-colors ${isSelected ? catStyle.text : 'opacity-50 group-hover:opacity-80'}`}>
                                                            {c.examples}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                        {isCategoryDropdownOpen && <div className="fixed inset-0 z-[50]" onClick={() => setIsCategoryDropdownOpen(false)}></div>}
                    </div>

                    {displayAnnouncement && (
                        <>
                            <div className={`hidden lg:block w-px h-6 mx-2 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                            <button onClick={() => handleViewAnnouncement(displayAnnouncement.id)} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all group overflow-hidden text-left relative w-full lg:w-64 shrink-0 ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                                <div className={`p-1.5 rounded-lg shrink-0 ${darkMode ? 'bg-blue-400/10 text-blue-400' : 'bg-blue-600/10 text-blue-600'}`}>
                                    <MegaphoneIcon className="w-4 h-4"/>
                                </div>
                                <div className="flex flex-col overflow-hidden min-w-0 flex-1 animate-in fade-in slide-in-from-bottom-1 duration-500 key={displayAnnouncement.id}">
                                    <span className={`text-[9px] font-black uppercase tracking-wider leading-none mb-0.5 whitespace-nowrap ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                        Heads Up
                                    </span>
                                    <span className={`text-[11px] font-bold truncate leading-tight ${darkMode ? 'text-white' : 'text-slate-700'}`}>
                                        {displayAnnouncement.title}
                                    </span>
                                </div>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* --- SECTIONS: SUGGESTED / RECENTLY POSTED --- */}
            {isFiltering ? (
                <div className="mt-6">
                    <h2 className={`text-sm font-black uppercase tracking-widest opacity-50 mb-4 pl-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Search Results</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                        {/* Passes 'false' to renderJobCard so they stay as a grid */}
                        {filteredJobs.length > 0 ? filteredJobs.map(job => renderJobCard(job, false)) : (
                            <div className="col-span-full text-center py-20"><SparklesIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" /><p className="opacity-50 font-black uppercase text-xs tracking-[0.3em] select-none cursor-default">No jobs found matching filters</p></div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="mt-6 space-y-10 overflow-hidden w-full">
                    
                    {/* Suggested Section */}
                    <div className="w-full">
                        <div className="flex items-center justify-between mb-4 pl-2 pr-2">
                            <h2 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                Suggested For You <SparklesIcon className="w-5 h-5"/>
                            </h2>
                        </div>

                        {suggestedJobs.length > 0 ? (
                            <div className="flex overflow-x-auto gap-4 md:gap-5 pb-6 hide-scrollbar snap-x snap-mandatory w-full px-2">
                                {/* Passes 'true' to renderJobCard so it knows to use the fixed horizontal width */}
                                {suggestedJobs.map(job => renderJobCard(job, true))}
                            </div>
                        ) : (
                            <div className={`mx-2 p-8 rounded-3xl border border-dashed flex flex-col items-center justify-center text-center ${darkMode ? 'border-white/20 bg-white/5' : 'border-slate-300 bg-slate-50'}`}>
                                <SparklesIcon className={`w-10 h-10 mb-3 ${darkMode ? 'text-blue-400/50' : 'text-blue-600/50'}`}/>
                                <p className={`text-sm font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>No Suggestions Yet</p>
                                <p className="text-xs font-bold opacity-60">Update your Profile's Category or Location to get personalized job suggestions.</p>
                            </div>
                        )}
                    </div>

                    {/* Recently Posted Section */}
                    <div className="w-full">
                        <div className="flex items-center justify-between mb-4 pl-2 pr-2">
                            <h2 className={`text-sm font-black uppercase tracking-widest opacity-50 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                Recently Posted
                            </h2>
                        </div>
                        <div className="flex overflow-x-auto gap-4 md:gap-5 pb-6 hide-scrollbar snap-x snap-mandatory w-full px-2">
                             {/* Passes 'true' to renderJobCard so it knows to use the fixed horizontal width */}
                            {recentJobs.length > 0 ? recentJobs.map(job => renderJobCard(job, true)) : (
                                <div className="w-full text-center py-20"><SparklesIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" /><p className="opacity-50 font-black uppercase text-xs tracking-[0.3em] select-none cursor-default">No jobs available right now</p></div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}