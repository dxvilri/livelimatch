import { 
    MagnifyingGlassIcon, MapPinIcon, BookmarkIcon, BriefcaseIcon, 
    SparklesIcon, ChevronDownIcon, TagIcon, PaperAirplaneIcon, 
    ChatBubbleLeftRightIcon, MegaphoneIcon, AcademicCapIcon, 
    SunIcon, Cog8ToothIcon, WrenchScrewdriverIcon, HomeIcon, UserGroupIcon 
} from "@heroicons/react/24/outline";
import { cloneElement, useRef, useEffect } from "react"; 

export default function FindJobsTab({
    availableJobs, savedJobs, myApplications, conversations, currentUser, applicantData,
    jobSearch, setJobSearch, jobLocationFilter, setJobLocationFilter,
    jobCategoryFilter, setJobCategoryFilter, isSitioDropdownOpen, setIsSitioDropdownOpen,
    isCategoryDropdownOpen, setIsCategoryDropdownOpen, onSelectJob, onToggleSave,
    onApply, handleViewAnnouncement, displayAnnouncement, darkMode, setActiveTab,
    PUROK_LIST, JOB_CATEGORIES, getJobStyle
}) {

    const unreadCount = conversations.reduce((acc, c) => acc + (c[`unread_${currentUser?.uid}`] || 0), 0);

    // --- DESKTOP SCROLL FIXES ---
    const suggestedRef = useRef(null);
    const recentRef = useRef(null);

    // 1. Convert Vertical Mouse Wheel to Horizontal Scroll
    useEffect(() => {
        const handleWheelScroll = (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault(); 
                e.currentTarget.scrollLeft += e.deltaY;
            }
        };

        const suggestedNode = suggestedRef.current;
        const recentNode = recentRef.current;

        if (suggestedNode) suggestedNode.addEventListener('wheel', handleWheelScroll, { passive: false });
        if (recentNode) recentNode.addEventListener('wheel', handleWheelScroll, { passive: false });

        return () => {
            if (suggestedNode) suggestedNode.removeEventListener('wheel', handleWheelScroll);
            if (recentNode) recentNode.removeEventListener('wheel', handleWheelScroll);
        };
    }, []);

    // 2. Mouse Drag-to-Scroll Logic
    const handleMouseDown = (e, ref) => {
        if (!ref.current) return;
        ref.current.isDown = true;
        ref.current.startX = e.pageX - ref.current.offsetLeft;
        ref.current.scrollLeftPos = ref.current.scrollLeft;
        ref.current.style.cursor = 'grabbing';
        ref.current.style.userSelect = 'none';
    };
    const handleMouseLeave = (e, ref) => {
        if (!ref.current) return;
        ref.current.isDown = false;
        ref.current.style.cursor = 'grab';
        ref.current.style.userSelect = 'auto';
    };
    const handleMouseUp = (e, ref) => {
        if (!ref.current) return;
        ref.current.isDown = false;
        ref.current.style.cursor = 'grab';
        ref.current.style.userSelect = 'auto';
    };
    const handleMouseMove = (e, ref) => {
        if (!ref.current || !ref.current.isDown) return;
        e.preventDefault();
        const x = e.pageX - ref.current.offsetLeft;
        const walk = (x - ref.current.startX) * 1.5; 
        ref.current.scrollLeft = ref.current.scrollLeftPos - walk;
    };


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
    const glassInput = `w-full flex-1 bg-transparent outline-none font-bold text-xs ${darkMode ? 'text-white placeholder-slate-400' : 'text-slate-800 placeholder-slate-500'}`;

    const getCatStyles = (id) => {
        const iconMap = {
            'EDUCATION': AcademicCapIcon,
            'AGRICULTURE': SunIcon,
            'AUTOMOTIVE': Cog8ToothIcon,
            'CARPENTRY': WrenchScrewdriverIcon,
            'HOUSEHOLD': HomeIcon,
            'CUSTOMER_SERVICE': UserGroupIcon,
        };
        const IconComponent = iconMap[id] || TagIcon;

        if (!darkMode) {
            return {
                icon: IconComponent,
                text: 'text-blue-600',
                bgLight: 'bg-blue-600/10',
                active: 'bg-blue-600/10 border-blue-600',
                hover: 'hover:border-blue-600/50',
                hoverText: 'group-hover:text-blue-600'
            };
        }

        const map = {
            'EDUCATION': { icon: IconComponent, text: 'text-blue-400', bgLight: 'bg-blue-400/10', active: 'bg-blue-400/10 border-blue-400', hover: 'hover:border-blue-400/50', hoverText: 'group-hover:text-blue-400' },
            'AGRICULTURE': { icon: IconComponent, text: 'text-green-500', bgLight: 'bg-green-500/10', active: 'bg-green-500/10 border-green-500', hover: 'hover:border-green-500/50', hoverText: 'group-hover:text-green-500' },
            'AUTOMOTIVE': { icon: IconComponent, text: 'text-slate-400', bgLight: 'bg-slate-400/10', active: 'bg-slate-400/10 border-slate-400', hover: 'hover:border-slate-400/50', hoverText: 'group-hover:text-slate-400' },
            'CARPENTRY': { icon: IconComponent, text: 'text-yellow-500', bgLight: 'bg-yellow-500/10', active: 'bg-yellow-500/10 border-yellow-500', hover: 'hover:border-yellow-500/50', hoverText: 'group-hover:text-yellow-500' },
            'HOUSEHOLD': { icon: IconComponent, text: 'text-pink-500', bgLight: 'bg-pink-500/10', active: 'bg-pink-500/10 border-pink-500', hover: 'hover:border-pink-500/50', hoverText: 'group-hover:text-pink-500' },
            'CUSTOMER_SERVICE': { icon: IconComponent, text: 'text-purple-500', bgLight: 'bg-purple-500/10', active: 'bg-purple-500/10 border-purple-500', hover: 'hover:border-purple-500/50', hoverText: 'group-hover:text-purple-500' },
        };
        return map[id] || { icon: IconComponent, text: 'text-slate-500', bgLight: 'bg-slate-500/10', active: 'bg-slate-500/10 border-slate-500', hover: 'hover:border-slate-500/50', hoverText: 'group-hover:text-slate-500' }; 
    };

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
                saveActive: `${cat.text} ${cat.bgLight}`, saveIdle: `${cat.text} opacity-50 hover:opacity-100 hover:bg-white/10`,
                borderColor: cat.border, bgIcon: cat.text, appliedBtn: `${cat.bgLight} ${cat.text} ${cat.border} opacity-60`,
                cardBg: cat.cardBg,
                hoverShadow: cat.hoverShadow
            };
        } else {
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
                cardBg: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] ring-1 ring-inset ring-white/40',
                hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(37,99,235,0.5)]'
            };
        }
    };

    // --- 4. REUSABLE JOB CARD RENDERER ---
    const renderJobCard = (job, isHorizontal = false) => {
        const typeStyle = getJobStyle(job.type);
        const isSaved = savedJobs.some(s => s.jobId === job.id);
        const theme = getCardTheme(job.category, darkMode);

        return (
            <div key={job.id} onClick={() => onSelectJob(job)} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 ${theme.hoverShadow} cursor-pointer flex flex-col justify-between min-h-[220px] ${theme.cardBg} ${isHorizontal ? 'w-[85vw] sm:w-[320px] shrink-0 snap-start' : 'w-full'}`}>
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
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    <div onClick={() => setActiveTab("FindJobs")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/20 border backdrop-blur-xl' : 'bg-gradient-to-br from-blue-200 to-blue-400 border border-blue-300 shadow-md'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-blue-900'}`}>{availableJobs.length}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>Jobs</p>
                        </div>
                        <BriefcaseIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-20 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-700'}`}/>
                    </div>

                    <div onClick={() => setActiveTab("Saved")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20 border backdrop-blur-xl' : 'bg-gradient-to-br from-blue-200 to-blue-400 border border-blue-300 shadow-md'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-blue-900'}`}>{savedJobs.length}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-purple-200' : 'text-blue-800'}`}>Saved</p>
                        </div>
                        <BookmarkIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-20 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-700'}`}/>
                    </div>

                    <div onClick={() => setActiveTab("Applications")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/20 border backdrop-blur-xl' : 'bg-gradient-to-br from-blue-200 to-blue-400 border border-blue-300 shadow-md'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-blue-900'}`}>{myApplications.length}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-amber-200' : 'text-blue-800'}`}>Applied</p>
                        </div>
                        <PaperAirplaneIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-20 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-700'}`}/>
                    </div>

                    <div onClick={() => setActiveTab("Messages")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 border-pink-500/20 border backdrop-blur-xl' : 'bg-gradient-to-br from-blue-200 to-blue-400 border border-blue-300 shadow-md'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-blue-900'}`}>{unreadCount}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-pink-200' : 'text-blue-800'}`}>Messages</p>
                        </div>
                        <ChatBubbleLeftRightIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-20 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-700'}`}/>
                    </div>
                </div>

                {/* --- NEW SEARCH BAR & FILTERS --- */}
                <div className="flex flex-col gap-3 w-full relative z-40">
                    
                    {/* MOBILE Heads Up (Hidden on desktop) - Dark Mode blending & No Blob */}
                    {displayAnnouncement && (
                        <div className={`md:hidden w-full rounded-2xl shadow-sm p-1.5 flex items-center relative overflow-hidden group border ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-blue-600 border-transparent shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]'}`}>
                            {/* Blending overlay gradient for dark mode */}
                            {darkMode ? (
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-blue-500/5 to-transparent pointer-events-none z-0"></div>
                            ) : null}
                            
                            {/* Sliding shimmer animation */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1500 ease-in-out pointer-events-none z-0"></div>

                            <button onClick={() => handleViewAnnouncement(displayAnnouncement.id)} className={`flex-1 flex items-center justify-between gap-3 px-2 py-1 rounded-xl transition-all overflow-hidden text-left relative z-10`}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`p-2 rounded-lg shrink-0 relative z-20 ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-white/20 text-white backdrop-blur-sm'}`}>
                                        <MegaphoneIcon className="w-5 h-5 -rotate-12 group-hover:rotate-0 transition-transform duration-300"/>
                                    </div>
                                    <div className="flex flex-col overflow-hidden min-w-0 animate-in fade-in slide-in-from-right-16 duration-500 ease-out relative z-20" key={displayAnnouncement.id}>
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className={`text-[10px] font-black uppercase tracking-widest leading-none whitespace-nowrap drop-shadow-sm ${darkMode ? 'text-slate-400' : 'text-blue-100'}`}>
                                                Heads Up
                                            </span>
                                        </div>
                                        <span className={`text-sm font-black truncate leading-tight drop-shadow-md ${darkMode ? 'text-slate-200' : 'text-white'}`}>
                                            {displayAnnouncement.title}
                                        </span>
                                    </div>
                                </div>
                                <div className={`shrink-0 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border transition-colors relative z-20 ${darkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-white/30 text-white hover:bg-white/20 backdrop-blur-sm'}`}>
                                    View
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Search Bar + Inside Filters */}
                    <div className={`w-full flex items-center p-1.5 rounded-2xl border shadow-sm ${glassPanel}`}>
                        <MagnifyingGlassIcon className={`ml-3 w-5 h-5 shrink-0 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        
                        <input 
                            type="text" 
                            placeholder="Search job title or employer..." 
                            value={jobSearch} 
                            onChange={(e) => setJobSearch(e.target.value)} 
                            className={glassInput + " pl-3 pr-2 py-2.5"} 
                        />
                        
                        {/* Divider */}
                        <div className={`w-px h-6 mx-1 shrink-0 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                        
                        {/* Location Dropdown Icon */}
                        <div className="relative shrink-0">
                            <button 
                                onClick={() => { setIsSitioDropdownOpen(!isSitioDropdownOpen); setIsCategoryDropdownOpen(false); }} 
                                className={`p-2 md:px-4 md:py-2 flex items-center gap-2 rounded-xl transition-colors relative ${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'} ${jobLocationFilter ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'text-slate-400'}`}
                            >
                                <MapPinIcon className="w-5 h-5 shrink-0" />
                                <span className="hidden md:block text-xs font-bold whitespace-nowrap">{jobLocationFilter || "All Locations"}</span>
                                {jobLocationFilter && <span className={`absolute top-1.5 right-1.5 md:right-2 w-2 h-2 rounded-full border ${darkMode ? 'bg-red-500 border-slate-900' : 'bg-red-500 border-white'}`}></span>}
                            </button>
                            
                            {isSitioDropdownOpen && (
                                <div className={`absolute top-full right-0 mt-3 w-56 z-[60] rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                    <div className="max-h-60 overflow-y-auto p-2 space-y-1 hide-scrollbar">
                                        <button onClick={() => { setJobLocationFilter(""); setIsSitioDropdownOpen(false); }} className={`w-full text-left p-3 rounded-xl transition-colors ${!jobLocationFilter ? (darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600') : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`}><span className="text-xs font-bold block">All Locations</span></button>
                                        {PUROK_LIST.map(p => (
                                            <button key={p} onClick={() => { setJobLocationFilter(p); setIsSitioDropdownOpen(false); }} className={`w-full text-left p-3 rounded-xl transition-colors ${jobLocationFilter === p ? (darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600') : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`}><span className="text-xs font-bold block">{p}</span></button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {isSitioDropdownOpen && <div className="fixed inset-0 z-[50]" onClick={() => setIsSitioDropdownOpen(false)}></div>}
                        </div>

                        {/* Category Dropdown Icon */}
                        <div className="relative shrink-0 pr-1">
                            <button 
                                onClick={() => { setIsCategoryDropdownOpen(!isCategoryDropdownOpen); setIsSitioDropdownOpen(false); }} 
                                className={`p-2 md:px-4 md:py-2 flex items-center gap-2 rounded-xl transition-colors relative ${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'} ${jobCategoryFilter ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'text-slate-400'}`}
                            >
                                {(() => {
                                    const ActiveIcon = jobCategoryFilter ? getCatStyles(jobCategoryFilter).icon : TagIcon;
                                    return <ActiveIcon className="w-5 h-5 shrink-0" />;
                                })()}
                                <span className="hidden md:block text-xs font-bold whitespace-nowrap">{jobCategoryFilter ? (JOB_CATEGORIES.find(c => c.id === jobCategoryFilter)?.label || jobCategoryFilter) : "All Categories"}</span>
                                {jobCategoryFilter && <span className={`absolute top-1.5 right-1.5 md:right-2 w-2 h-2 rounded-full border ${darkMode ? 'bg-red-500 border-slate-900' : 'bg-red-500 border-white'}`}></span>}
                            </button>

                            {isCategoryDropdownOpen && (
                                <div className={`absolute top-full right-0 mt-3 w-64 z-[60] rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                    <div className="max-h-60 overflow-y-auto p-2 space-y-1.5 hide-scrollbar">
                                        <button onClick={() => { setJobCategoryFilter(""); setIsCategoryDropdownOpen(false); }} className={`relative overflow-hidden w-full text-left p-3 rounded-xl transition-all duration-300 group border backdrop-blur-sm ${!jobCategoryFilter ? (darkMode ? 'bg-blue-400/10 border-blue-400 text-blue-400' : 'bg-blue-50 border-blue-600 text-blue-600') : `border-transparent ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}`}>
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
                    </div>
                </div>
            </div>

            {/* --- SECTIONS: SUGGESTED / RECENTLY POSTED --- */}
            {isFiltering ? (
                <div className="mt-6">
                    <h2 className={`text-sm font-black uppercase tracking-widest opacity-50 mb-4 pl-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Search Results</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 pt-6 pb-10 -mt-6">
                        {/* Passes 'false' to renderJobCard so they stay as a grid */}
                        {filteredJobs.length > 0 ? filteredJobs.map(job => renderJobCard(job, false)) : (
                            <div className="col-span-full text-center py-20"><SparklesIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" /><p className="opacity-50 font-black uppercase text-xs tracking-[0.3em] select-none cursor-default">No jobs found matching filters</p></div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="mt-6 space-y-10 w-full">
                    
                    {/* Suggested Section */}
                    <div className="w-full">
                        <div className="flex items-center justify-between mb-4 pl-2 pr-2">
                            <h2 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                Suggested For You <SparklesIcon className="w-5 h-5"/>
                            </h2>
                        </div>

                        {suggestedJobs.length > 0 ? (
                            <div 
                                ref={suggestedRef}
                                onMouseDown={(e) => handleMouseDown(e, suggestedRef)}
                                onMouseLeave={(e) => handleMouseLeave(e, suggestedRef)}
                                onMouseUp={(e) => handleMouseUp(e, suggestedRef)}
                                onMouseMove={(e) => handleMouseMove(e, suggestedRef)}
                                className="flex overflow-x-auto gap-4 md:gap-5 pt-6 pb-10 -mt-6 hide-scrollbar snap-x md:snap-none snap-mandatory w-full px-2 cursor-grab"
                            >
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
                        <div 
                            ref={recentRef}
                            onMouseDown={(e) => handleMouseDown(e, recentRef)}
                            onMouseLeave={(e) => handleMouseLeave(e, recentRef)}
                            onMouseUp={(e) => handleMouseUp(e, recentRef)}
                            onMouseMove={(e) => handleMouseMove(e, recentRef)}
                            className="flex overflow-x-auto gap-4 md:gap-5 pt-6 pb-10 -mt-6 hide-scrollbar snap-x md:snap-none snap-mandatory w-full px-2 cursor-grab"
                        >
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