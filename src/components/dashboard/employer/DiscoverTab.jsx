import { 
    UsersIcon, BriefcaseIcon, ClockIcon, ChatBubbleLeftRightIcon, 
    MagnifyingGlassIcon, MapPinIcon, ChevronDownIcon, TagIcon, 
    MegaphoneIcon, SparklesIcon 
} from "@heroicons/react/24/outline";

export default function DiscoverTab({
    discoverTalents, myPostedJobs, receivedApplications, unreadMsgCount,
    talentSearch, setTalentSearch, talentSitioFilter, setTalentSitioFilter,
    talentCategoryFilter, setTalentCategoryFilter, isSitioDropdownOpen, setIsSitioDropdownOpen,
    isCategoryDropdownOpen, setIsCategoryDropdownOpen, selectedTalent, setSelectedTalent,
    handleStartChatFromExternal, darkMode, JOB_CATEGORIES, PUROK_LIST,
    displayAnnouncement, handleViewAnnouncement, setActiveTab, getAvatarUrl
}) {

    // --- STYLES ---
    const glassPanel = `backdrop-blur-xl transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white/60 border-slate-200 text-slate-800'}`;
    const glassInput = `w-full flex-1 bg-transparent outline-none font-bold text-xs ${darkMode ? 'text-white placeholder-slate-400' : 'text-slate-800 placeholder-slate-500'}`;
    const glassCard = `backdrop-blur-md border rounded-2xl transition-all duration-300 group hover:-translate-y-1 ${darkMode ? 'bg-slate-800/40 border-white/5 hover:bg-slate-800/60 hover:border-blue-500/30' : 'bg-white/40 border-white/60 hover:bg-white/70 hover:border-blue-300/50 hover:shadow-lg'}`;

    // --- FILTER LOGIC ---
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

    return (
        <div className="animate-content">
            <div className="space-y-6 mb-8">
                
                {/* --- STATS CARDS --- */}
                {/* Mirrored exactly to Applicant Dashboard's FindJobs Tab (Richer Blue in Light Mode) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mt-4 md:mt-8">
                    <div onClick={() => setActiveTab("Discover")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/20 border backdrop-blur-xl' : 'bg-gradient-to-br from-blue-200 to-blue-400 border border-blue-300 shadow-md'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-blue-900'}`}>{discoverTalents.length}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>Candidates</p>
                        </div>
                        <UsersIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-20 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-700'}`}/>
                    </div>

                    <div onClick={() => setActiveTab("Listings")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20 border backdrop-blur-xl' : 'bg-gradient-to-br from-blue-200 to-blue-400 border border-blue-300 shadow-md'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-blue-900'}`}>{myPostedJobs.length}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-purple-200' : 'text-blue-800'}`}>Listings</p>
                        </div>
                        <BriefcaseIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-20 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-700'}`}/>
                    </div>

                    <div onClick={() => setActiveTab("Applicants")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/20 border backdrop-blur-xl' : 'bg-gradient-to-br from-blue-200 to-blue-400 border border-blue-300 shadow-md'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-blue-900'}`}>{receivedApplications.filter(a => a.status === 'pending').length}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-amber-200' : 'text-blue-800'}`}>Pending</p>
                        </div>
                        <ClockIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-20 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-700'}`}/>
                    </div>

                    <div onClick={() => setActiveTab("Messages")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 border-pink-500/20 border backdrop-blur-xl' : 'bg-gradient-to-br from-blue-200 to-blue-400 border border-blue-300 shadow-md'}`}>
                        <div className="relative z-10">
                            <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-blue-900'}`}>{unreadMsgCount}</h3>
                            <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-pink-200' : 'text-blue-800'}`}>Unread Msgs</p>
                        </div>
                        <ChatBubbleLeftRightIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-20 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-700'}`}/>
                    </div>
                </div>

                {/* --- FILTER BAR --- */}
                <div className={`flex flex-col lg:flex-row items-center p-1.5 rounded-2xl border shadow-sm w-full gap-2 lg:gap-0 relative z-40 ${glassPanel}`}>
                    
                    <div className="relative w-full lg:flex-1 min-w-0">
                        <MagnifyingGlassIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        <input type="text" placeholder="Search name or skill..." value={talentSearch} onChange={(e) => setTalentSearch(e.target.value)} className={glassInput + " pl-10 pr-4 py-2.5"} />
                    </div>
                    
                    <div className={`hidden lg:block w-px h-6 mx-2 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    
                    <div className="relative w-full lg:w-auto lg:min-w-[180px] shrink-0">
                        <button onClick={() => { setIsSitioDropdownOpen(!isSitioDropdownOpen); setIsCategoryDropdownOpen(false); }} className={`w-full lg:w-48 flex items-center justify-between pl-2 pr-2 py-1.5 outline-none font-bold text-xs cursor-pointer transition-colors rounded-xl border lg:border-none ${darkMode ? 'text-white hover:bg-white/5 border-white/10' : 'text-slate-700 hover:bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0"><MapPinIcon className="w-4 h-4" /></div>
                                <span className="truncate">{talentSitioFilter || "All Locations"}</span>
                            </div>
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}><ChevronDownIcon className={`w-3 h-3 transition-transform ${isSitioDropdownOpen ? 'rotate-180' : ''}`}/></div>
                        </button>
                        {isSitioDropdownOpen && (
                            <div className={`absolute top-full left-0 mt-2 w-full lg:w-56 z-[60] rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                <div className="max-h-60 overflow-y-auto p-1 space-y-1 hide-scrollbar">
                                    <button onClick={() => { setTalentSitioFilter(""); setIsSitioDropdownOpen(false); }} className={`w-full text-left p-3 rounded-lg transition-colors ${!talentSitioFilter ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                                        <span className="text-xs font-bold block">All Locations</span>
                                    </button>
                                    {PUROK_LIST.map(p => (
                                        <button key={p} onClick={() => { setTalentSitioFilter(p); setIsSitioDropdownOpen(false); }} className={`w-full text-left p-3 rounded-lg transition-colors ${talentSitioFilter === p ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                                            <span className="text-xs font-bold block">{p}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {isSitioDropdownOpen && <div className="fixed inset-0 z-[50]" onClick={() => setIsSitioDropdownOpen(false)}></div>}
                    </div>

                    <div className={`hidden lg:block w-px h-6 mx-2 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>

                    <div className="relative w-full lg:w-auto lg:min-w-[180px] shrink-0">
                        <button onClick={() => { setIsCategoryDropdownOpen(!isCategoryDropdownOpen); setIsSitioDropdownOpen(false); }} className={`w-full lg:w-48 flex items-center justify-between pl-2 pr-2 py-1.5 outline-none font-bold text-xs cursor-pointer transition-colors rounded-xl border lg:border-none ${darkMode ? 'text-white hover:bg-white/5 border-white/10' : 'text-slate-700 hover:bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 shrink-0"><TagIcon className="w-4 h-4" /></div>
                                <span className="truncate">{talentCategoryFilter ? JOB_CATEGORIES.find(c => c.id === talentCategoryFilter)?.label : "All Categories"}</span>
                            </div>
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}><ChevronDownIcon className={`w-3 h-3 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}/></div>
                        </button>
                        {isCategoryDropdownOpen && (
                            <div className={`absolute top-full left-0 mt-2 w-full lg:w-56 z-[60] rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                <div className="max-h-60 overflow-y-auto p-1 space-y-1 hide-scrollbar">
                                    <button onClick={() => { setTalentCategoryFilter(""); setIsCategoryDropdownOpen(false); }} className={`w-full text-left p-3 rounded-lg transition-colors ${!talentCategoryFilter ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                                        <span className="text-xs font-bold block">All Categories</span>
                                    </button>
                                    {JOB_CATEGORIES.map(c => (
                                        <button key={c.id} onClick={() => { setTalentCategoryFilter(c.id); setIsCategoryDropdownOpen(false); }} className={`w-full text-left p-3 rounded-lg transition-colors group ${talentCategoryFilter === c.id ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold block">{c.label}</span>
                                                <span className={`text-[9px] mt-0.5 font-medium truncate ${talentCategoryFilter === c.id ? 'text-white/70' : 'opacity-50'}`}>{c.examples}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {isCategoryDropdownOpen && <div className="fixed inset-0 z-[50]" onClick={() => setIsCategoryDropdownOpen(false)}></div>}
                    </div>

                    {/* ANNOUNCEMENT NOTICE */}
                    {displayAnnouncement && (
                        <>
                            <div className={`hidden lg:block w-px h-6 mx-2 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                            <button
                                onClick={() => handleViewAnnouncement(displayAnnouncement.id)}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all group overflow-hidden text-left relative w-full lg:w-64 shrink-0 ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                            >
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

            {/* --- CANDIDATES GRID --- */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 relative z-0">
                {filteredTalents.length > 0 ? filteredTalents.map(user => {
                    const pic = getAvatarUrl(user);
                    return (
                        <div key={user.id} onClick={() => setSelectedTalent(user)} className={`group relative p-4 md:p-5 ${glassCard} flex flex-col items-center text-center cursor-pointer`}>
                            <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10"><span className={`flex h-2.5 w-2.5 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'} shadow-sm`}></span></div>
                            <div className="w-14 h-14 md:w-16 md:h-16 mb-3 md:mb-4 rounded-[1rem] md:rounded-[1.5rem] overflow-hidden">
                                {pic ? <img src={pic} alt={user.firstName} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-lg font-black">{user.firstName ? user.firstName.charAt(0) : "U"}</div>}
                            </div>
                            <h3 className={`text-xs md:text-sm font-black mb-0.5 truncate w-full ${darkMode ? 'text-white' : 'text-slate-900'}`}>{user.firstName} {user.lastName}</h3>
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 truncate w-full">{user.title || "Applicant"}</p>
                            <p className={`text-[9px] line-clamp-2 mb-3 px-1 min-h-[2.5em] leading-tight ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{user.bio || user.aboutMe || "No bio available."}</p>
                            <div className={`mt-auto mb-3 md:mb-4 px-2 py-1 rounded-full text-[8px] md:text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 max-w-full ${darkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                                <MapPinIcon className="w-3 h-3 shrink-0" />
                                <span className="truncate">{user.sitio || user.location || "Remote"}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleStartChatFromExternal({ id: user.id, name: `${user.firstName} ${user.lastName}`, profilePic: pic || null }); }} className="w-full py-2 rounded-xl font-black text-[9px] uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                                <ChatBubbleLeftRightIcon className="w-3 h-3" /> 
                                <span className="hidden md:inline">Message</span>
                                <span className="md:hidden">Chat</span>
                            </button>
                        </div>
                    );
                }) : (
                    <div className="col-span-full text-center py-20">
                        <SparklesIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <p className="opacity-50 font-black uppercase text-xs tracking-[0.3em] select-none cursor-default">No talents found</p>
                    </div>
                )}
            </div>
        </div>
    );
}