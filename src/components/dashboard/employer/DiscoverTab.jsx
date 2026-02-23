import { useRef, useEffect } from "react";
import { 
    UsersIcon, BriefcaseIcon, ClockIcon, ChatBubbleLeftRightIcon, 
    MagnifyingGlassIcon, MapPinIcon, ChevronDownIcon, TagIcon, 
    MegaphoneIcon, SparklesIcon, AcademicCapIcon, SunIcon, 
    Cog8ToothIcon, WrenchScrewdriverIcon, HomeIcon, UserGroupIcon,
    BoltIcon
} from "@heroicons/react/24/outline";

export default function DiscoverTab({
    discoverTalents, myPostedJobs, receivedApplications, unreadMsgCount,
    talentSearch, setTalentSearch, talentSitioFilter, setTalentSitioFilter,
    talentCategoryFilter, setTalentCategoryFilter, isSitioDropdownOpen, setIsSitioDropdownOpen,
    isCategoryDropdownOpen, setIsCategoryDropdownOpen, selectedTalent, setSelectedTalent,
    handleStartChatFromExternal, darkMode, JOB_CATEGORIES, PUROK_LIST,
    displayAnnouncement, handleViewAnnouncement, setActiveTab, getAvatarUrl,
    onImmediateHire
}) {

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

    // --- STYLES ---
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
            'EDUCATION': { text: 'text-blue-400', bgLight: 'bg-blue-400/10', border: 'border-blue-400/30', btnPrimary: 'bg-blue-400 text-slate-900 hover:bg-blue-500', bgIcon: 'text-blue-400', cardBg: 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(96,165,250,0.25)]' },
            'AGRICULTURE': { text: 'text-green-400', bgLight: 'bg-green-400/10', border: 'border-green-400/30', btnPrimary: 'bg-green-400 text-slate-900 hover:bg-green-500', bgIcon: 'text-green-400', cardBg: 'bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(74,222,128,0.25)]' },
            'AUTOMOTIVE': { text: 'text-slate-400', bgLight: 'bg-slate-400/10', border: 'border-slate-400/30', btnPrimary: 'bg-slate-400 text-slate-900 hover:bg-slate-500', bgIcon: 'text-slate-400', cardBg: 'bg-gradient-to-br from-slate-500/20 to-slate-500/5 border border-slate-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(148,163,184,0.25)]' },
            'CARPENTRY': { text: 'text-yellow-400', bgLight: 'bg-yellow-400/10', border: 'border-yellow-400/30', btnPrimary: 'bg-yellow-400 text-slate-900 hover:bg-yellow-500', bgIcon: 'text-yellow-400', cardBg: 'bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(250,204,21,0.25)]' },
            'HOUSEHOLD': { text: 'text-pink-400', bgLight: 'bg-pink-400/10', border: 'border-pink-400/30', btnPrimary: 'bg-pink-400 text-slate-900 hover:bg-pink-500', bgIcon: 'text-pink-400', cardBg: 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 border border-pink-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(244,114,182,0.25)]' },
            'CUSTOMER_SERVICE': { text: 'text-purple-400', bgLight: 'bg-purple-400/10', border: 'border-purple-400/30', btnPrimary: 'bg-purple-400 text-slate-900 hover:bg-purple-500', bgIcon: 'text-purple-400', cardBg: 'bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(192,132,252,0.25)]' },
        };
        const fallbackDark = { text: 'text-slate-400', bgLight: 'bg-slate-400/10', border: 'border-slate-400/30', btnPrimary: 'bg-slate-400 text-slate-900 hover:bg-slate-500', bgIcon: 'text-slate-400', cardBg: 'bg-gradient-to-br from-slate-500/20 to-slate-500/5 border border-slate-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(148,163,184,0.25)]' };

        if (isDark) {
            const cat = darkColors[categoryId] || fallbackDark;
            return {
                title: cat.text,
                location: cat.text,
                badge: `${cat.bgLight} ${cat.text} ${cat.border}`,
                btnPrimary: cat.btnPrimary,
                bgIcon: cat.bgIcon,
                cardBg: cat.cardBg,
                hoverShadow: cat.hoverShadow
            };
        } else {
            return {
                title: 'text-white drop-shadow-md', 
                location: 'text-blue-100', 
                badge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]', 
                btnPrimary: 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg active:scale-95', 
                bgIcon: 'text-white', 
                cardBg: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] ring-1 ring-inset ring-white/40',
                hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(37,99,235,0.5)]'
            };
        }
    };

    // --- 1. FILTERING LOGIC ---
    const filteredTalents = discoverTalents.filter(user => {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        const matchesSearch = fullName.includes(talentSearch.toLowerCase()) || (user.skills && user.skills.toLowerCase().includes(talentSearch.toLowerCase()));
        const matchesSitio = talentSitioFilter ? (user.sitio === talentSitioFilter) : true;
        
        const matchesCategory = talentCategoryFilter ? (
            (user.category === talentCategoryFilter) || 
            (user.title && user.title.toLowerCase().includes(talentCategoryFilter.toLowerCase())) ||
            (user.skills && user.skills.toLowerCase().includes(talentCategoryFilter.toLowerCase()))
        ) : true;

        return matchesSearch && matchesSitio && matchesCategory;
    });

    // --- 2. SUGGESTION LOGIC ---
    const isFiltering = (talentSearch?.length > 0) || (talentSitioFilter?.length > 0) || (talentCategoryFilter?.length > 0);
    
    // Suggest candidates based on the categories or locations of jobs the employer has posted
    const employerCategories = [...new Set(myPostedJobs.map(job => job.category).filter(Boolean))];
    const employerSitios = [...new Set(myPostedJobs.map(job => job.sitio).filter(Boolean))];

    const suggestedTalents = filteredTalents.filter(user => {
        const matchCategory = user.category && employerCategories.includes(user.category);
        const matchLocation = user.sitio && employerSitios.includes(user.sitio);
        return matchCategory || matchLocation;
    });
    
    // Everything else falls into recently joined
    const recentTalents = filteredTalents.filter(user => !suggestedTalents.includes(user));

    // --- 3. REUSABLE CARD RENDERER ---
    const renderCandidateCard = (user, isHorizontal = false) => {
        const pic = getAvatarUrl(user);
        const isHired = receivedApplications.some(app => app.applicantId === user.id && app.status === 'accepted');
        const catStyle = user.category ? getCatStyles(user.category) : getCatStyles('');
        const theme = getCardTheme(user.category, darkMode);
        const CatIcon = catStyle.icon;

        // Narrower dimensions when horizontal so it sits well in sideways scroll
        const sizingClass = isHorizontal ? 'w-[45vw] sm:w-[220px] shrink-0 snap-start' : 'w-full';
        const baseCardStyle = `group relative p-4 md:p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col items-center text-center cursor-pointer overflow-hidden ${sizingClass}`;

        return (
            <div key={user.id} onClick={() => setSelectedTalent(user)} className={`${baseCardStyle} ${theme.cardBg} ${theme.hoverShadow}`}>
                
                {/* Large Background Icon to match Job Cards */}
                <div className={`absolute -right-4 bottom-0 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform duration-500 pointer-events-none ${theme.bgIcon}`}>
                    <CatIcon className="w-32 h-32 md:w-40 md:h-40" />
                </div>

                <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10">
                    <span className={`flex h-2.5 w-2.5 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-slate-300/50 dark:bg-slate-600'} shadow-sm`}></span>
                </div>
                
                <div className="w-14 h-14 md:w-16 md:h-16 mb-3 md:mb-4 rounded-[1rem] md:rounded-[1.5rem] overflow-hidden shrink-0 relative z-10 shadow-sm border border-white/20">
                    {pic ? <img src={pic} alt={user.firstName} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-lg font-black">{user.firstName ? user.firstName.charAt(0) : "U"}</div>}
                </div>
                
                <h3 className={`text-xs md:text-sm font-black mb-0.5 truncate w-full relative z-10 ${theme.title}`}>{user.firstName} {user.lastName}</h3>
                
                {/* Overflow strictly clamped so the bio doesn't push the card size */}
                <p className={`text-[9px] line-clamp-2 mb-3 px-1 leading-tight mt-1 overflow-hidden text-ellipsis relative z-10 ${theme.location}`}>
                    {user.bio || user.aboutMe || "No bio available."}
                </p>
                
                {/* CATEGORY BADGE ONLY - CENTERED */}
                <div className="mt-auto mb-3 md:mb-4 flex flex-wrap items-center justify-center gap-1.5 w-full relative z-10">
                    {user.category ? (
                        <div className={`px-2.5 py-1 rounded-full text-[8px] md:text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 shadow-sm ${theme.badge}`}>
                            <CatIcon className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[120px]">{JOB_CATEGORIES.find(c => c.id === user.category)?.label || user.category}</span>
                        </div>
                    ) : (
                        <div className={`px-2.5 py-1 rounded-full text-[8px] md:text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 shadow-sm ${theme.badge}`}>
                            <TagIcon className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[120px]">Uncategorized</span>
                        </div>
                    )}
                </div>

                {/* IMMEDIATE HIRE BUTTON */}
                <button 
                    disabled={isHired}
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if (onImmediateHire) {
                            onImmediateHire(user);
                        } else {
                            setSelectedTalent(user);
                        }
                    }} 
                    className={`w-full py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 relative z-10 shrink-0 ${isHired ? 'bg-slate-500/20 text-slate-500 cursor-not-allowed border border-white/10' : theme.btnPrimary}`}
                >
                    <BoltIcon className={`w-3 h-3 ${isHired ? 'fill-current' : ''}`} /> 
                    <span className="hidden md:inline">{isHired ? 'Hired' : 'Immediate Hire'}</span>
                    <span className="md:hidden">{isHired ? 'Hired' : 'Hire'}</span>
                </button>
            </div>
        );
    };

    return (
        <div className="animate-content">
            <div className="space-y-6 mb-8">
                
                {/* --- STATS CARDS --- */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mt-4 md:mt-8">
                    <div onClick={() => setActiveTab("Discover")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer ${darkMode ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/20 border backdrop-blur-xl' : 'bg-gradient-to-br from-blue-200 to-blue-400 border border-blue-300 shadow-md'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-blue-900'}`}>{discoverTalents.length}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>Candidates</p>
                        </div>
                        <UsersIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-20 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-700'}`}/>
                    </div>

                    <div onClick={() => setActiveTab("Listings")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer ${darkMode ? 'bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20 border backdrop-blur-xl' : 'bg-gradient-to-br from-blue-200 to-blue-400 border border-blue-300 shadow-md'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-blue-900'}`}>{myPostedJobs.length}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-purple-200' : 'text-blue-800'}`}>Listings</p>
                        </div>
                        <BriefcaseIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-20 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-700'}`}/>
                    </div>

                    <div onClick={() => setActiveTab("Applicants")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer ${darkMode ? 'bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/20 border backdrop-blur-xl' : 'bg-gradient-to-br from-blue-200 to-blue-400 border border-blue-300 shadow-md'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-blue-900'}`}>{receivedApplications.filter(a => a.status === 'pending').length}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-amber-200' : 'text-blue-800'}`}>Pending</p>
                        </div>
                        <ClockIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-20 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-700'}`}/>
                    </div>

                    <div onClick={() => setActiveTab("Messages")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer ${darkMode ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 border-pink-500/20 border backdrop-blur-xl' : 'bg-gradient-to-br from-blue-200 to-blue-400 border border-blue-300 shadow-md'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-blue-900'}`}>{unreadMsgCount}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-pink-200' : 'text-blue-800'}`}>Unread Msgs</p>
                        </div>
                        <ChatBubbleLeftRightIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-20 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-700'}`}/>
                    </div>
                </div>

                {/* --- SEARCH BAR & FILTERS --- */}
                <div className="flex flex-col gap-3 w-full relative z-40">
                    
                    {/* MOBILE Heads Up */}
                    {displayAnnouncement && (
                        <div className={`md:hidden w-full rounded-2xl shadow-sm p-1.5 flex items-center relative overflow-hidden group border ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-blue-600 border-transparent shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]'}`}>
                            {darkMode ? (
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-blue-500/5 to-transparent pointer-events-none z-0"></div>
                            ) : null}
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
                            placeholder="Search name or skill..." 
                            value={talentSearch} 
                            onChange={(e) => setTalentSearch(e.target.value)} 
                            className={glassInput + " pl-3 pr-2 py-2.5"} 
                        />
                        
                        {/* Divider */}
                        <div className={`w-px h-6 mx-1 shrink-0 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                        
                        {/* Location Dropdown Icon */}
                        <div className="relative shrink-0">
                            <button 
                                onClick={() => { setIsSitioDropdownOpen(!isSitioDropdownOpen); setIsCategoryDropdownOpen(false); }} 
                                className={`p-2 md:px-4 md:py-2 flex items-center gap-2 rounded-xl transition-colors relative ${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'} ${talentSitioFilter ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'text-slate-400'}`}
                            >
                                <MapPinIcon className="w-5 h-5 shrink-0" />
                                <span className="hidden md:block text-xs font-bold whitespace-nowrap">{talentSitioFilter || "All Locations"}</span>
                                {talentSitioFilter && <span className={`absolute top-1.5 right-1.5 md:right-2 w-2 h-2 rounded-full border ${darkMode ? 'bg-red-500 border-slate-900' : 'bg-red-500 border-white'}`}></span>}
                            </button>
                            
                            {isSitioDropdownOpen && (
                                <div className={`absolute top-full right-0 mt-3 w-56 z-[60] rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                    <div className="max-h-60 overflow-y-auto p-2 space-y-1 hide-scrollbar">
                                        <button onClick={() => { setTalentSitioFilter(""); setIsSitioDropdownOpen(false); }} className={`w-full text-left p-3 rounded-xl transition-colors ${!talentSitioFilter ? (darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600') : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`}><span className="text-xs font-bold block">All Locations</span></button>
                                        {PUROK_LIST.map(p => (
                                            <button key={p} onClick={() => { setTalentSitioFilter(p); setIsSitioDropdownOpen(false); }} className={`w-full text-left p-3 rounded-xl transition-colors ${talentSitioFilter === p ? (darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600') : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`}><span className="text-xs font-bold block">{p}</span></button>
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
                                className={`p-2 md:px-4 md:py-2 flex items-center gap-2 rounded-xl transition-colors relative ${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'} ${talentCategoryFilter ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'text-slate-400'}`}
                            >
                                {(() => {
                                    const ActiveIcon = talentCategoryFilter ? getCatStyles(talentCategoryFilter).icon : TagIcon;
                                    return <ActiveIcon className="w-5 h-5 shrink-0" />;
                                })()}
                                <span className="hidden md:block text-xs font-bold whitespace-nowrap">{talentCategoryFilter ? (JOB_CATEGORIES.find(c => c.id === talentCategoryFilter)?.label || talentCategoryFilter) : "All Categories"}</span>
                                {talentCategoryFilter && <span className={`absolute top-1.5 right-1.5 md:right-2 w-2 h-2 rounded-full border ${darkMode ? 'bg-red-500 border-slate-900' : 'bg-red-500 border-white'}`}></span>}
                            </button>

                            {isCategoryDropdownOpen && (
                                <div className={`absolute top-full right-0 mt-3 w-64 z-[60] rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                    <div className="max-h-60 overflow-y-auto p-2 space-y-1.5 hide-scrollbar">
                                        <button onClick={() => { setTalentCategoryFilter(""); setIsCategoryDropdownOpen(false); }} className={`relative overflow-hidden w-full text-left p-3 rounded-xl transition-all duration-300 group border backdrop-blur-sm ${!talentCategoryFilter ? (darkMode ? 'bg-blue-400/10 border-blue-400 text-blue-400' : 'bg-blue-50 border-blue-600 text-blue-600') : `border-transparent ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}`}>
                                            <div className="flex items-center gap-3 relative z-10">
                                                <TagIcon className={`w-5 h-5 transition-colors ${!talentCategoryFilter ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'text-slate-400'}`} />
                                                <span className={`text-xs font-black block transition-colors ${!talentCategoryFilter ? (darkMode ? 'text-blue-400' : 'text-blue-600') : darkMode ? 'text-white group-hover:text-blue-400' : 'text-slate-700 group-hover:text-blue-600'}`}>All Categories</span>
                                            </div>
                                        </button>
                                        
                                        {JOB_CATEGORIES.map(c => {
                                            const catStyle = getCatStyles(c.id);
                                            const CatIcon = catStyle.icon;
                                            const isSelected = talentCategoryFilter === c.id;
                                            return (
                                                <button 
                                                    key={c.id} 
                                                    onClick={() => { setTalentCategoryFilter(c.id); setIsCategoryDropdownOpen(false); }} 
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

            {/* --- SECTIONS: SUGGESTED / RECENTLY JOINED --- */}
            {isFiltering ? (
                <div className="mt-6">
                    <h2 className={`text-sm font-black uppercase tracking-widest opacity-50 mb-4 pl-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Search Results</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 relative z-0 pt-6 pb-10 -mt-6">
                        {filteredTalents.length > 0 ? filteredTalents.map(user => renderCandidateCard(user, false)) : (
                            <div className="col-span-full text-center py-20">
                                <SparklesIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                                <p className="opacity-50 font-black uppercase text-xs tracking-[0.3em] select-none cursor-default">No talents found matching filters</p>
                            </div>
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

                        {suggestedTalents.length > 0 ? (
                            <div 
                                ref={suggestedRef}
                                onMouseDown={(e) => handleMouseDown(e, suggestedRef)}
                                onMouseLeave={(e) => handleMouseLeave(e, suggestedRef)}
                                onMouseUp={(e) => handleMouseUp(e, suggestedRef)}
                                onMouseMove={(e) => handleMouseMove(e, suggestedRef)}
                                className="flex overflow-x-auto gap-3 md:gap-4 pt-6 pb-10 -mt-6 hide-scrollbar snap-x md:snap-none snap-mandatory w-full px-2 cursor-grab"
                            >
                                {/* Passes 'true' to renderCandidateCard to enable horizontal specific styling */}
                                {suggestedTalents.map(user => renderCandidateCard(user, true))}
                            </div>
                        ) : (
                            <div className={`mx-2 p-8 rounded-3xl border border-dashed flex flex-col items-center justify-center text-center ${darkMode ? 'border-white/20 bg-white/5' : 'border-slate-300 bg-slate-50'}`}>
                                <SparklesIcon className={`w-10 h-10 mb-3 ${darkMode ? 'text-blue-400/50' : 'text-blue-600/50'}`}/>
                                <p className={`text-sm font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>No Suggestions Yet</p>
                                <p className="text-xs font-bold opacity-60">Post a job in a specific category or location to get personalized candidate suggestions.</p>
                            </div>
                        )}
                    </div>

                    {/* Recently Joined Section */}
                    <div className="w-full">
                        <div className="flex items-center justify-between mb-4 pl-2 pr-2">
                            <h2 className={`text-sm font-black uppercase tracking-widest opacity-50 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                Recently Joined
                            </h2>
                        </div>
                        <div 
                            ref={recentRef}
                            onMouseDown={(e) => handleMouseDown(e, recentRef)}
                            onMouseLeave={(e) => handleMouseLeave(e, recentRef)}
                            onMouseUp={(e) => handleMouseUp(e, recentRef)}
                            onMouseMove={(e) => handleMouseMove(e, recentRef)}
                            className="flex overflow-x-auto gap-3 md:gap-4 pt-6 pb-10 -mt-6 hide-scrollbar snap-x md:snap-none snap-mandatory w-full px-2 cursor-grab"
                        >
                             {/* Passes 'true' to renderCandidateCard to enable horizontal specific styling */}
                            {recentTalents.length > 0 ? recentTalents.map(user => renderCandidateCard(user, true)) : (
                                <div className="w-full text-center py-20"><SparklesIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" /><p className="opacity-50 font-black uppercase text-xs tracking-[0.3em] select-none cursor-default">No talents available right now</p></div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}