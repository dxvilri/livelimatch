import { 
  BriefcaseIcon, MapPinIcon, ChevronDownIcon, TagIcon, SparklesIcon, 
  MegaphoneIcon, BookmarkIcon, PaperAirplaneIcon, ChatBubbleLeftRightIcon, 
  MagnifyingGlassIcon, BoltIcon, ClockIcon, CalendarDaysIcon,
  AcademicCapIcon, SunIcon, Cog8ToothIcon, WrenchScrewdriverIcon, HomeIcon, UserGroupIcon
} from "@heroicons/react/24/outline";
import { cloneElement } from "react";

export default function FindJobsTab({
    availableJobs, savedJobs, myApplications, conversations, currentUser,
    jobSearch, setJobSearch, 
    jobLocationFilter, setJobLocationFilter, 
    jobCategoryFilter, setJobCategoryFilter,
    isSitioDropdownOpen, setIsSitioDropdownOpen,
    isCategoryDropdownOpen, setIsCategoryDropdownOpen,
    onSelectJob, onToggleSave, onApply, handleViewAnnouncement, displayAnnouncement,
    darkMode, setActiveTab, PUROK_LIST, JOB_CATEGORIES, getJobStyle
}) {
    const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;
    const glassInput = `w-full bg-transparent border-none outline-none text-sm font-bold placeholder-slate-400 ${darkMode ? 'text-white' : 'text-slate-800'}`;

    // --- FULL COLOR & ICON MAPPING (Synced with Profile Tab) ---
    const getCatStyles = (id) => {
        const map = {
            'EDUCATION': { 
                icon: AcademicCapIcon,
                text: 'text-blue-500', bgLight: 'bg-blue-500/10', border: 'border-blue-500/30', borderActive: 'border-blue-500',
                hover: 'hover:bg-blue-500/10 hover:border-blue-500/50 hover:shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]',
                hoverText: 'group-hover:text-blue-500', 
                active: 'bg-blue-500/10 border-blue-500 text-blue-500 shadow-[0_0_20px_-3px_rgba(59,130,246,0.4)]' 
            },
            'AGRICULTURE': { 
                icon: SunIcon,
                text: 'text-green-500', bgLight: 'bg-green-500/10', border: 'border-green-500/30', borderActive: 'border-green-500',
                hover: 'hover:bg-green-500/10 hover:border-green-500/50 hover:shadow-[0_0_15px_-3px_rgba(34,197,94,0.3)]',
                hoverText: 'group-hover:text-green-500', 
                active: 'bg-green-500/10 border-green-500 text-green-500 shadow-[0_0_20px_-3px_rgba(34,197,94,0.4)]' 
            },
            'AUTOMOTIVE': { 
                icon: Cog8ToothIcon,
                text: 'text-slate-400', bgLight: 'bg-slate-400/10', border: 'border-slate-400/30', borderActive: 'border-slate-400',
                hover: 'hover:bg-slate-400/10 hover:border-slate-400/50 hover:shadow-[0_0_15px_-3px_rgba(148,163,184,0.3)]',
                hoverText: 'group-hover:text-slate-400', 
                active: 'bg-slate-400/10 border-slate-400 text-slate-400 shadow-[0_0_20px_-3px_rgba(148,163,184,0.4)]' 
            },
            'CARPENTRY': { 
                icon: WrenchScrewdriverIcon,
                text: 'text-yellow-500', bgLight: 'bg-yellow-500/10', border: 'border-yellow-500/30', borderActive: 'border-yellow-500',
                hover: 'hover:bg-yellow-500/10 hover:border-yellow-500/50 hover:shadow-[0_0_15px_-3px_rgba(234,179,8,0.3)]',
                hoverText: 'group-hover:text-yellow-500', 
                active: 'bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-[0_0_20px_-3px_rgba(234,179,8,0.4)]' 
            },
            'HOUSEHOLD': { 
                icon: HomeIcon,
                text: 'text-pink-500', bgLight: 'bg-pink-500/10', border: 'border-pink-500/30', borderActive: 'border-pink-500',
                hover: 'hover:bg-pink-500/10 hover:border-pink-500/50 hover:shadow-[0_0_15px_-3px_rgba(236,72,153,0.3)]',
                hoverText: 'group-hover:text-pink-500', 
                active: 'bg-pink-500/10 border-pink-500 text-pink-500 shadow-[0_0_20px_-3px_rgba(236,72,153,0.4)]' 
            },
            'CUSTOMER_SERVICE': { 
                icon: UserGroupIcon,
                text: 'text-purple-500', bgLight: 'bg-purple-500/10', border: 'border-purple-500/30', borderActive: 'border-purple-500',
                hover: 'hover:bg-purple-500/10 hover:border-purple-500/50 hover:shadow-[0_0_15px_-3px_rgba(168,85,247,0.3)]',
                hoverText: 'group-hover:text-purple-500', 
                active: 'bg-purple-500/10 border-purple-500 text-purple-500 shadow-[0_0_20px_-3px_rgba(168,85,247,0.4)]' 
            },
        };
        return map[id] || { icon: TagIcon, text: 'text-slate-500', bgLight: 'bg-slate-500/10', border: 'border-slate-500/30', borderActive: 'border-slate-500', hover: '', hoverText: '', active: '' }; 
    };

    const filteredJobs = availableJobs.filter(job => {
        const hasApplied = myApplications.some(app => app.jobId === job.id);
        if (hasApplied) return false;
        const matchesSearch = job.title.toLowerCase().includes(jobSearch.toLowerCase()) || (job.employerName && job.employerName.toLowerCase().includes(jobSearch.toLowerCase()));
        const matchesLoc = jobLocationFilter ? job.sitio === jobLocationFilter : true;
        const matchesCategory = jobCategoryFilter ? job.category === jobCategoryFilter : true;
        return matchesSearch && matchesLoc && matchesCategory;
    });

    const unreadCount = conversations.reduce((acc, c) => acc + (c[`unread_${currentUser?.uid}`] || 0), 0);

    return (
        <div className="animate-content">
            <div className="space-y-6 mb-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mt-4 md:mt-8">
                    <div onClick={() => setActiveTab("FindJobs")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{availableJobs.length}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>Jobs</p>
                        </div>
                        <BriefcaseIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                    </div>

                    <div onClick={() => setActiveTab("Saved")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{savedJobs.length}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-purple-200' : 'text-blue-800'}`}>Saved</p>
                        </div>
                        <BookmarkIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                    </div>

                    <div onClick={() => setActiveTab("Applications")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{myApplications.length}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-amber-200' : 'text-blue-800'}`}>Applied</p>
                        </div>
                        <PaperAirplaneIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                    </div>

                    <div onClick={() => setActiveTab("Messages")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 border-pink-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{unreadCount}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-pink-200' : 'text-blue-800'}`}>Messages</p>
                        </div>
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
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0"><MapPinIcon className="w-4 h-4" /></div>
                                <span className="truncate">{jobLocationFilter || "All Locations"}</span>
                            </div>
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                                <ChevronDownIcon className={`w-3 h-3 transition-transform ${isSitioDropdownOpen ? 'rotate-180' : ''}`}/>
                            </div>
                        </button>
                        {isSitioDropdownOpen && (
                            <div className={`absolute top-full left-0 mt-2 w-full lg:w-56 z-[60] rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                <div className="max-h-60 overflow-y-auto p-1 space-y-1 hide-scrollbar">
                                    <button onClick={() => { setJobLocationFilter(""); setIsSitioDropdownOpen(false); }} className={`w-full text-left p-3 rounded-lg transition-colors ${!jobLocationFilter ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}><span className="text-xs font-bold block">All Locations</span></button>
                                    {PUROK_LIST.map(p => (
                                        <button key={p} onClick={() => { setJobLocationFilter(p); setIsSitioDropdownOpen(false); }} className={`w-full text-left p-3 rounded-lg transition-colors ${jobLocationFilter === p ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}><span className="text-xs font-bold block">{p}</span></button>
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
                                const activeStyle = jobCategoryFilter ? getCatStyles(jobCategoryFilter) : { icon: TagIcon, text: 'text-blue-500', bgLight: 'bg-blue-500/10' };
                                const ActiveIcon = activeStyle.icon;
                                return (
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-lg shrink-0 ${activeStyle.bgLight} ${activeStyle.text}`}>
                                            <ActiveIcon className="w-4 h-4" />
                                        </div>
                                        {/* FIX: Removed fading text-color classes so it inherits the dark/bold default text styling */}
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
                                    
                                    {/* Glass styled "All Categories" option */}
                                    <button onClick={() => { setJobCategoryFilter(""); setIsCategoryDropdownOpen(false); }} className={`relative overflow-hidden w-full text-left p-3 rounded-xl transition-all duration-300 group border backdrop-blur-sm ${!jobCategoryFilter ? 'bg-blue-500/10 border-blue-500 text-blue-500 shadow-[0_0_20px_-3px_rgba(59,130,246,0.4)]' : `border-transparent ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}`}>
                                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent transition-transform duration-700 ease-in-out z-0 pointer-events-none" />
                                        <div className="flex items-center gap-3 relative z-10">
                                            <TagIcon className={`w-5 h-5 transition-colors ${!jobCategoryFilter ? 'text-blue-500' : 'text-slate-400'}`} />
                                            <span className={`text-xs font-black block transition-colors ${!jobCategoryFilter ? 'text-blue-500' : darkMode ? 'text-white group-hover:text-blue-400' : 'text-slate-700 group-hover:text-blue-600'}`}>All Categories</span>
                                        </div>
                                    </button>
                                    
                                    {/* Glass styled Category list (Matches ProfileTab) */}
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
                                <div className={`p-1.5 rounded-lg shrink-0 bg-pink-500/10 text-pink-500`}><MegaphoneIcon className="w-4 h-4"/></div>
                                <div className="flex flex-col overflow-hidden min-w-0 flex-1 animate-in fade-in slide-in-from-bottom-1 duration-500 key={displayAnnouncement.id}">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-pink-500 leading-none mb-0.5 whitespace-nowrap">Heads Up</span>
                                    <span className={`text-[11px] font-bold truncate leading-tight ${darkMode ? 'text-white' : 'text-slate-700'}`}>{displayAnnouncement.title}</span>
                                </div>
                            </button>
                        </>
                    )}
                </div>
            </div>

           {/* Job Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                {filteredJobs.length > 0 ? filteredJobs.map(job => {
                    const typeStyle = getJobStyle(job.type);
                    const isSaved = savedJobs.some(s => s.jobId === job.id);
                    
                    // Generate glowing shadow classes based on Category
                    const getCatGlow = (id) => {
                        const map = {
                            'EDUCATION': 'hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.4)] hover:border-blue-400/50',
                            'AGRICULTURE': 'hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.4)] hover:border-green-400/50',
                            'AUTOMOTIVE': 'hover:shadow-[0_0_30px_-5px_rgba(148,163,184,0.4)] hover:border-slate-400/50',
                            'CARPENTRY': 'hover:shadow-[0_0_30px_-5px_rgba(234,179,8,0.4)] hover:border-yellow-400/50',
                            'HOUSEHOLD': 'hover:shadow-[0_0_30px_-5px_rgba(236,72,153,0.4)] hover:border-pink-400/50',
                            'CUSTOMER_SERVICE': 'hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.4)] hover:border-purple-400/50',
                        };
                        return map[id] || 'hover:shadow-[0_0_30px_-5px_rgba(148,163,184,0.3)] hover:border-slate-300/50';
                    };
                    const catGlowClass = getCatGlow(job.category);

                    return (
                        <div key={job.id} onClick={() => onSelectJob(job)} className={`group relative p-6 rounded-[2rem] border transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden backdrop-blur-xl ${darkMode ? `bg-slate-900/60 border-white/10 ${catGlowClass}` : `bg-white/80 border-slate-200 ${catGlowClass}`}`}>
                            
                            {/* Large Background Icon (Colored by Job Type) */}
                            <div className={`absolute top-10 right-4 md:top-10 md:right-8 opacity-10 transform -rotate-12 group-hover:scale-110 transition-transform duration-500 pointer-events-none ${typeStyle.color}`}>
                                {cloneElement(typeStyle.icon, { className: "w-32 h-32 md:w-56 md:h-56" })}
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                
                                {/* 1. Employer Name & Bookmark */}
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate mt-2 pr-4">{job.employerName}</p>
                                    <button onClick={(e) => { e.stopPropagation(); onToggleSave(job); }} className={`p-2 rounded-full transition-colors shrink-0 -mt-1 -mr-1 ${isSaved ? 'text-blue-500 bg-blue-500/10' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
                                        {isSaved ? <BookmarkIcon className="w-5 h-5 fill-current"/> : <BookmarkIcon className="w-5 h-5"/>}
                                    </button>
                                </div>
                                
                                {/* 2. Job Title */}
                                <h3 className={`font-black text-xl leading-tight truncate mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>
                                
                                {/* 3. Location */}
                                <div className="flex items-center gap-1.5 text-slate-500 mb-4">
                                    <MapPinIcon className="w-4 h-4 shrink-0" />
                                    <p className={`text-[11px] font-bold uppercase tracking-wide opacity-80 truncate`}>{job.sitio || "No Location"}</p>
                                </div>

                                {/* 4. Badges (Category & Type Leveled Together) */}
                                <div className="flex flex-wrap items-center gap-2 mb-6">
                                    {/* Category Badge */}
                                    {job.category && (() => {
                                        const catStyle = getCatStyles(job.category);
                                        const CatIcon = catStyle.icon;
                                        return (
                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide border flex items-center gap-1 shadow-sm ${catStyle.bgLight} ${catStyle.border} ${catStyle.text}`}>
                                                <CatIcon className="w-3 h-3" />
                                                {JOB_CATEGORIES.find(c => c.id === job.category)?.label || job.category}
                                            </span>
                                        )
                                    })()}

                                    {/* Job Type Badge */}
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide border flex items-center gap-1 shadow-sm ${typeStyle.bgLight || typeStyle.bg} ${typeStyle.border} ${typeStyle.color}`}>
                                        <span className="scale-75 w-3 h-3 flex items-center justify-center">{typeStyle.icon}</span>
                                        {job.type}
                                    </span>
                                </div>

                                {/* 5. Salary & Apply Button */}
                                <div className="mt-auto pt-4 border-t border-dashed border-slate-500/20 flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Salary</p>
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm font-black text-slate-500 dark:text-slate-400">₱</span>
                                            <span className={`text-lg md:text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{job.salary}</span>
                                        </div>
                                    </div>
                                    <button className="px-4 py-2 rounded-xl bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-500 active:scale-95 transition-all">Apply</button>
                                </div>
                            </div>
                        </div>
                    )
                }) : (
                    <div className="col-span-full text-center py-20"><SparklesIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" /><p className="opacity-50 font-black uppercase text-xs tracking-[0.3em] select-none cursor-default">No jobs found matching filters</p></div>
                )}
            </div>
        </div>
    );
}