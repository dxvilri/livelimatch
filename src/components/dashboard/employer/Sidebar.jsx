import { 
    XMarkIcon, StarIcon as StarIconOutline, MegaphoneIcon, QuestionMarkCircleIcon, 
    SunIcon, MoonIcon, ArrowLeftOnRectangleIcon, LockClosedIcon 
} from "@heroicons/react/24/outline";

// Internal reusable NavBtn component
function NavBtn({ icon, label, active, onClick, darkMode, open, badge, badgeColor }) {
    return (
        <button onClick={onClick} title={!open ? label : ''} className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group relative overflow-hidden ${active ? 'bg-transparent' : `${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-blue-600'}`} ${!open && 'lg:justify-center'}`}>
            <div className={`relative z-10 shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : ''}`}>{icon}</div>
            <span className={`relative z-10 font-bold text-xs uppercase tracking-widest whitespace-nowrap overflow-hidden transition-all duration-300 ${!open ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'} ${active ? 'text-blue-600 dark:text-blue-400' : ''}`}>{label}</span>
            {(badge > 0 && open) && <span className={`absolute right-3 ${badgeColor || 'bg-red-500'} text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm z-10`}>{badge}</span>}
            {(badge > 0 && !open) && <span className={`hidden lg:block absolute top-2 right-2 w-2.5 h-2.5 ${badgeColor || 'bg-red-500'} rounded-full border-2 border-white dark:border-slate-900 animate-pulse z-10`}></span>}
            {(badge > 0 && !open) && <span className={`lg:hidden absolute right-3 ${badgeColor || 'bg-red-500'} text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm z-10`}>{badge}</span>}
        </button>
    );
}

export default function Sidebar({
    isOpen, setIsOpen, activeTab, setActiveTab, darkMode, setDarkMode,
    handleLogout, employerData, profileImage, isVerified
}) {

    // --- STYLES ---
    const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;

    return (
        <aside 
            className={`fixed top-0 right-0 h-full w-64 z-[100] rounded-l-3xl flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${glassPanel} 
            ${isOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}
        >
            {/* Top User Header */}
            <div className="h-24 flex items-center justify-center relative mt-8 cursor-pointer" onClick={() => { setActiveTab("Profile"); setIsOpen(false); }}>
                <div className={`flex items-center gap-3 p-2 pr-4 rounded-2xl transition-all duration-300 hover:bg-white/10 group`}>
                    
                    {/* Small Inline Profile Pic */}
                    <div className={`relative group shrink-0 w-12 h-12 rounded-2xl overflow-hidden shadow-lg border select-none ${darkMode ? 'border-white/10 bg-slate-800' : 'border-slate-200 bg-slate-100'}`}>
                        {profileImage ? (
                            <img src={profileImage} alt="Profile" className="w-full h-full object-cover transition-transform duration-300" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-black text-lg">
                                {employerData?.firstName ? employerData.firstName.charAt(0) : "E"}
                            </div>
                        )}
                    </div>

                    <div className="text-left overflow-hidden">
                        <h1 className="font-black text-sm tracking-tight leading-none truncate max-w-[120px]">
                            {employerData?.firstName || "User"} {employerData?.lastName || ""}
                        </h1>
                        <p className="text-[10px] opacity-60 font-bold uppercase tracking-wider group-hover:text-blue-500 transition-colors">
                            View Profile
                        </p>
                    </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="absolute top-0 right-4 p-2 opacity-50 hover:opacity-100">
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 space-y-3 py-4 overflow-y-auto no-scrollbar">
                {isVerified ? (
                    <NavBtn active={activeTab==="Ratings"} onClick={()=>{setActiveTab("Ratings"); setIsOpen(false)}} icon={<StarIconOutline className="w-6 h-6"/>} label="Ratings" open={true} dark={darkMode} />
                ) : (
                    <NavBtn active={false} onClick={()=>{}} icon={<LockClosedIcon className="w-6 h-6 text-slate-500"/>} label="Ratings Locked" open={true} dark={darkMode} />
                )}
                <div className={`h-px mx-4 my-2 ${darkMode ? 'bg-white/10' : 'bg-slate-900/10'}`}></div>
                <NavBtn active={activeTab==="Announcements"} onClick={()=>{setActiveTab("Announcements"); setIsOpen(false)}} icon={<MegaphoneIcon className="w-6 h-6"/>} label="Announcements" open={true} dark={darkMode} />
                <div className={`h-px mx-4 my-2 ${darkMode ? 'bg-white/10' : 'bg-slate-900/10'}`}></div>
                <NavBtn active={activeTab==="Support"} onClick={()=>{setActiveTab("Support"); setIsOpen(false)}} icon={<QuestionMarkCircleIcon className="w-6 h-6"/>} label="Help & Support" open={true} dark={darkMode} />
                <div className={`h-px mx-4 my-2 ${darkMode ? 'bg-white/10' : 'bg-slate-900/10'}`}></div>
            </nav>

            {/* Footer Settings/Logout Actions */}
            <div className="p-4 space-y-3">
                <button 
                    onClick={() => setDarkMode(!darkMode)}
                    className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all duration-300 ${darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}
                >
                    {darkMode ? <SunIcon className="w-6 h-6 text-amber-400"/> : <MoonIcon className="w-6 h-6 text-slate-600"/>}
                    <span className="text-xs font-bold whitespace-nowrap">Switch Theme</span>
                </button>

                <button 
                    onClick={handleLogout}
                    className={`w-full p-3 rounded-2xl flex items-center gap-3 text-red-500 transition-all duration-300 hover:bg-red-500/10`}
                >
                    <ArrowLeftOnRectangleIcon className="w-6 h-6"/>
                    <span className="text-xs font-bold whitespace-nowrap">Logout</span>
                </button>
            </div>
        </aside>
    );
}