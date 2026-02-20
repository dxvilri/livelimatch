import { PencilSquareIcon, CameraIcon, UserIcon, MapPinIcon, BriefcaseIcon, AcademicCapIcon, TagIcon, ChevronDownIcon, EnvelopeIcon, PhoneIcon, SunIcon, Cog8ToothIcon, WrenchScrewdriverIcon, HomeIcon, UserGroupIcon } from "@heroicons/react/24/outline";

export default function ProfileTab({ 
    applicantData, setApplicantData, profileImage, setProfileImage, imgScale, setImgScale,
    isEditingProfile, setIsEditingProfile, fileInputRef, isEditingImage, setIsEditingImage,
    loading, setLoading, handleSaveProfile, currentUser, darkMode, JOB_CATEGORIES,
    isProfileCategoryDropdownOpen, setIsProfileCategoryDropdownOpen
}) {
    const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;
    const displayName = `${applicantData.firstName} ${applicantData.lastName}`.trim() || "Applicant";
    const splitByNewLine = (text) => (!text ? [] : text.split('\n').filter(line => line.trim() !== ''));

    // --- COLOR & ICON MAPPING FOR CATEGORIES ---
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

    const ProfilePicComponent = ({ sizeClasses = "w-12 h-12", isCollapsed = false }) => ( 
        <div className={`relative group shrink-0 ${sizeClasses} rounded-2xl overflow-hidden shadow-lg border select-none ${darkMode ? 'border-white/10 bg-slate-800' : 'border-slate-200 bg-slate-100'}`}> 
            {profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover transition-transform duration-300" style={{ transform: `scale(${imgScale})` }} /> : <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-black text-lg">{applicantData.firstName ? applicantData.firstName.charAt(0) : "A"}</div>} 
            {!isCollapsed && <button onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"><CameraIcon className="w-5 h-5 text-white" /></button>} 
        </div> 
    );

    return (
        <div className="animate-content space-y-6">
            <div className={`relative z-50 p-8 md:p-10 rounded-[2.5rem] border ${glassPanel}`}>
                <div className="absolute top-8 right-8 z-20">
                    <button onClick={(e) => { e.stopPropagation(); if(isEditingProfile) handleSaveProfile(); else setIsEditingProfile(true); }} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 ${isEditingProfile ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/20'}`}>{isEditingProfile ? <>{loading ? 'Saving...' : 'Save Changes'}</> : <><PencilSquareIcon className="w-4 h-4" /> Edit Profile</>}</button>
                </div>
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="w-32 h-32 shrink-0 rounded-[2rem] border-2 border-dashed border-slate-500/20 p-2 select-none"><ProfilePicComponent sizeClasses="w-full h-full" isCollapsed={!isEditingProfile} /></div>
                    <div className="space-y-4 w-full pt-2">
                        <div>
                            <h2 className="text-3xl font-black tracking-tight cursor-default mb-3">{displayName}</h2>
                            
                            {isEditingProfile ? (
                                <div className="relative z-[100] w-full md:w-72">
                                    <button onClick={() => setIsProfileCategoryDropdownOpen(!isProfileCategoryDropdownOpen)} className={`w-full flex items-center justify-between p-3 rounded-xl border outline-none font-bold text-sm transition-all text-left ${darkMode ? 'bg-slate-800 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                                        {(() => {
                                            const activeStyle = applicantData.category ? getCatStyles(applicantData.category) : getCatStyles('EDUCATION');
                                            const ActiveIcon = activeStyle.icon;
                                            return (
                                                <div className="flex items-center gap-3 relative z-10">
                                                    <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${applicantData.category ? `${activeStyle.bgLight} ${activeStyle.text}` : 'bg-slate-500/10 text-slate-500'}`}>
                                                        <ActiveIcon className="w-4 h-4" />
                                                    </div>
                                                    <span className={`truncate ${applicantData.category ? activeStyle.text : 'text-slate-500'}`}>
                                                        {applicantData.category ? JOB_CATEGORIES.find(c => c.id === applicantData.category)?.label : "Choose a category..."}
                                                    </span>
                                                </div>
                                            )
                                        })()}
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 relative z-10 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}><ChevronDownIcon className={`w-3 h-3 transition-transform ${isProfileCategoryDropdownOpen ? 'rotate-180' : ''}`}/></div>
                                    </button>
                                    
                                    {isProfileCategoryDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsProfileCategoryDropdownOpen(false)}></div>
                                            <div className={`absolute top-full left-0 mt-2 w-full z-50 rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                                <div className="max-h-60 overflow-y-auto p-2 space-y-1.5 hide-scrollbar">
                                                    
                                                    <button onClick={() => { setApplicantData({...applicantData, category: ""}); setIsProfileCategoryDropdownOpen(false); }} className={`w-full text-left p-3 rounded-xl transition-colors ${!applicantData.category ? 'bg-slate-600 text-white' : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <TagIcon className="w-5 h-5 opacity-50"/>
                                                            <span className="text-xs font-bold block">No Category</span>
                                                        </div>
                                                    </button>
                                                    
                                                    {JOB_CATEGORIES.map(c => {
                                                        const catStyle = getCatStyles(c.id);
                                                        const CatIcon = catStyle.icon;
                                                        const isSelected = applicantData.category === c.id;
                                                        return (
                                                            <button 
                                                                key={c.id} 
                                                                onClick={() => { setApplicantData({...applicantData, category: c.id}); setIsProfileCategoryDropdownOpen(false); }} 
                                                                className={`relative overflow-hidden w-full text-left p-3 rounded-xl transition-all duration-300 group border backdrop-blur-sm ${isSelected ? catStyle.active : `border-transparent ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-white'} ${catStyle.hover}`}`}
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
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className={`relative overflow-hidden inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-black text-sm uppercase tracking-wider cursor-default group transition-all duration-300 shadow-sm ${applicantData.category ? `${getCatStyles(applicantData.category).bgLight} ${getCatStyles(applicantData.category).borderActive} ${getCatStyles(applicantData.category).text}` : 'text-slate-500 border-slate-200 bg-slate-50'}`}>
                                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-1000 ease-in-out z-0 pointer-events-none" />
                                    {(() => {
                                        const ActiveIcon = applicantData.category ? getCatStyles(applicantData.category).icon : TagIcon;
                                        return <ActiveIcon className="w-5 h-5 relative z-10" />
                                    })()}
                                    <span className="relative z-10">{applicantData.category ? JOB_CATEGORIES.find(c => c.id === applicantData.category)?.label : "No Category Selected"}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-6 text-xs font-bold text-slate-500 cursor-default select-none mt-4">
                            <div className="flex items-center gap-2">
                                <MapPinIcon className="w-4 h-4" />
                                <span className={!applicantData.sitio ? 'opacity-50 italic' : ''}>{applicantData.sitio || "Sitio not set"}</span>
                            </div>
                            
                            {currentUser?.email && (
                                <div className="flex items-center gap-2">
                                    <EnvelopeIcon className="w-4 h-4" />
                                    <span className="text-slate-500">{currentUser.email}</span>
                                </div>
                            )}

                            {currentUser?.phoneNumber && (
                                <div className="flex items-center gap-2">
                                    <PhoneIcon className="w-4 h-4" />
                                    <span className="text-slate-500">{currentUser.phoneNumber}</span>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* Rest of grids remain unchanged below */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
                <div className={`col-span-1 lg:col-span-2 p-8 rounded-[2.5rem] relative overflow-hidden ${glassPanel}`}>
                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-500/20"></div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><UserIcon className="w-5 h-5" /></div>
                        <h3 className={`font-black uppercase tracking-widest text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>Professional Summary</h3>
                    </div>
                    {isEditingProfile ? <textarea value={applicantData.bio} onChange={(e) => setApplicantData({...applicantData, bio: e.target.value})} placeholder="Introduce yourself to employers..." className={`w-full h-32 p-4 rounded-xl text-sm bg-transparent border resize-none outline-none select-text focus:ring-2 ring-blue-500/50 ${darkMode ? 'border-white/20 text-slate-300' : 'border-slate-300 text-slate-600'}`} /> : <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{applicantData.bio || "No information added yet."}</p>}
                </div>
                
                <div className={`p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col h-[28rem] ${glassPanel}`}>
                    <div className="absolute top-0 left-0 w-2 h-full bg-amber-500/20"></div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500"><BriefcaseIcon className="w-5 h-5" /></div>
                        <h3 className={`font-black uppercase tracking-widest text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>Experience</h3>
                    </div>
                    
                    <div className="overflow-y-auto no-scrollbar flex-1 pr-2">
                        {isEditingProfile ? (
                            <div className="space-y-3">
                                {(() => {
                                    const expLines = applicantData.experience ? applicantData.experience.split('\n') : [''];
                                    return expLines.map((line, i) => (
                                        <div key={i} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 w-full">
                                            <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 w-16 text-right ${darkMode ? 'text-amber-500' : 'text-amber-600'}`}>Work at</span>
                                            <input
                                                type="text"
                                                value={line}
                                                placeholder="Company Name / Role..."
                                                autoFocus={i === expLines.length - 1 && expLines.length > 1}
                                                className={`w-full min-w-0 p-3 rounded-xl text-sm bg-transparent border outline-none focus:border-amber-500 transition-colors ${darkMode ? 'border-white/20 text-slate-300' : 'border-slate-300 text-slate-600'}`}
                                                onChange={(e) => { const newLines = [...expLines]; newLines[i] = e.target.value; setApplicantData({...applicantData, experience: newLines.join('\n')}); }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') { e.preventDefault(); const newLines = [...expLines]; newLines.splice(i + 1, 0, ""); setApplicantData({...applicantData, experience: newLines.join('\n')}); }
                                                    if (e.key === 'Backspace' && line === '' && expLines.length > 1) { e.preventDefault(); const newLines = [...expLines]; newLines.splice(i, 1); setApplicantData({...applicantData, experience: newLines.join('\n')}); }
                                                }}
                                            />
                                        </div>
                                    ));
                                })()}
                                <p className="text-[9px] text-center opacity-40 uppercase font-bold pt-2">Press Enter to add new experience</p>
                            </div>
                        ) : (
                            <div className="relative ml-3 space-y-6 pb-2">
                                {applicantData.experience ? splitByNewLine(applicantData.experience).map((line, i) => (
                                    <div key={i} className="relative pl-6">
                                        <span className="absolute -left-[4.5px] top-2 w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                        <div className="flex flex-col">
                                            <span className={`text-[9px] font-black uppercase tracking-widest mb-0.5 opacity-60 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>Work at</span>
                                            <p className={`text-sm font-bold leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{line}</p>
                                        </div>
                                    </div>
                                )) : <div className="pl-6 text-sm opacity-50 italic">No experience listed.</div>}
                            </div>
                        )}
                    </div>
                </div>

                <div className={`p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col h-[28rem] ${glassPanel}`}>
                    <div className="absolute top-0 left-0 w-2 h-full bg-purple-500/20"></div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500"><AcademicCapIcon className="w-5 h-5" /></div>
                        <h3 className={`font-black uppercase tracking-widest text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>Education</h3>
                    </div>
                    
                    <div className="overflow-y-auto no-scrollbar flex-1 pr-2">
                         {isEditingProfile ? (
                            <div className="space-y-4">
                                {(() => {
                                    const labels = ["Primary School", "Secondary School", "College Graduated at"];
                                    const eduLines = applicantData.education ? applicantData.education.split('\n') : ['', '', ''];
                                    return labels.map((label, i) => (
                                        <div key={i} className="space-y-1 w-full">
                                            <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{label}</label>
                                            <input
                                                type="text"
                                                value={eduLines[i] || ''}
                                                placeholder={`Enter ${label}...`}
                                                className={`w-full min-w-0 p-3 rounded-xl text-sm bg-transparent border outline-none focus:border-purple-500 transition-colors ${darkMode ? 'border-white/20 text-slate-300' : 'border-slate-300 text-slate-600'}`}
                                                onChange={(e) => {
                                                    const newLines = [...eduLines];
                                                    while (newLines.length <= i) newLines.push("");
                                                    newLines[i] = e.target.value;
                                                    setApplicantData({...applicantData, education: newLines.join('\n')});
                                                }}
                                            />
                                        </div>
                                    ));
                                })()}
                            </div>
                         ) : (
                             <div className="relative ml-3 space-y-6 pb-2">
                                 {applicantData.education ? splitByNewLine(applicantData.education).map((line, i) => {
                                     const labels = ["Primary School", "Secondary School", "College Graduated at"];
                                     return (
                                         <div key={i} className="relative pl-6">
                                             <span className="absolute -left-[4.5px] top-2 w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                                             <div className="flex flex-col">
                                                 <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                                     {labels[i] || "Additional Education"}
                                                 </span>
                                                 <p className={`text-sm font-bold leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{line}</p>
                                             </div>
                                         </div>
                                     );
                                 }) : <div className="pl-6 text-sm opacity-50 italic">No education listed.</div>}
                             </div>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
}