import { PencilSquareIcon, CameraIcon, UserIcon, MapPinIcon, BriefcaseIcon, AcademicCapIcon, TagIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export default function ProfileTab({ 
    applicantData, setApplicantData, profileImage, setProfileImage, imgScale, setImgScale,
    isEditingProfile, setIsEditingProfile, fileInputRef, isEditingImage, setIsEditingImage,
    loading, setLoading, handleSaveProfile, currentUser, darkMode, JOB_CATEGORIES,
    isProfileCategoryDropdownOpen, setIsProfileCategoryDropdownOpen
}) {
    const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;
    const displayName = `${applicantData.firstName} ${applicantData.lastName}`.trim() || "Applicant";
    const splitByNewLine = (text) => (!text ? [] : text.split('\n').filter(line => line.trim() !== ''));

    const ProfilePicComponent = ({ sizeClasses = "w-12 h-12", isCollapsed = false }) => ( 
        <div className={`relative group shrink-0 ${sizeClasses} rounded-2xl overflow-hidden shadow-lg border select-none ${darkMode ? 'border-white/10 bg-slate-800' : 'border-slate-200 bg-slate-100'}`}> 
            {profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover transition-transform duration-300" style={{ transform: `scale(${imgScale})` }} /> : <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-black text-lg">{applicantData.firstName ? applicantData.firstName.charAt(0) : "A"}</div>} 
            {!isCollapsed && <button onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"><CameraIcon className="w-5 h-5 text-white" /></button>} 
        </div> 
    );

    return (
        <div className="animate-content space-y-6">
            <div className={`relative p-8 md:p-10 rounded-[2.5rem] border overflow-hidden ${glassPanel}`}>
                <div className="absolute top-8 right-8 z-20">
                    <button onClick={(e) => { e.stopPropagation(); if(isEditingProfile) handleSaveProfile(); else setIsEditingProfile(true); }} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 ${isEditingProfile ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/20'}`}>{isEditingProfile ? <>{loading ? 'Saving...' : 'Save Changes'}</> : <><PencilSquareIcon className="w-4 h-4" /> Edit Profile</>}</button>
                </div>
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="w-32 h-32 shrink-0 rounded-[2rem] border-2 border-dashed border-slate-500/20 p-2 select-none"><ProfilePicComponent sizeClasses="w-full h-full" isCollapsed={!isEditingProfile} /></div>
                    <div className="space-y-4 w-full pt-2">
                        <div>
                            <h2 className="text-3xl font-black tracking-tight cursor-default mb-2">{displayName}</h2>
                            {isEditingProfile ? <input type="text" value={applicantData.title} onChange={(e) => setApplicantData({...applicantData, title: e.target.value})} className={`bg-transparent border-b-2 outline-none font-bold text-sm uppercase tracking-wider w-full md:w-1/2 select-text ${darkMode ? 'border-white/20 text-blue-400' : 'border-slate-400 text-blue-600'}`} placeholder="Job Title (e.g. Carpenter)" /> : <p className="text-blue-500 font-bold text-sm uppercase tracking-wider cursor-default">{applicantData.title || "Job Seeker"}</p>}
                            
                            {isEditingProfile && (
                                <div className="mt-4 relative z-50">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1 mb-1 block">Work Categorization</label>
                                    <button onClick={() => setIsProfileCategoryDropdownOpen(!isProfileCategoryDropdownOpen)} className={`w-full lg:w-64 flex items-center justify-between p-3 rounded-xl border outline-none font-bold text-sm transition-all text-left ${darkMode ? 'bg-slate-800 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 shrink-0"><TagIcon className="w-4 h-4" /></div>
                                            <span className="truncate">{applicantData.category ? JOB_CATEGORIES.find(c => c.id === applicantData.category)?.label : "Choose a category..."}</span>
                                        </div>
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}><ChevronDownIcon className={`w-3 h-3 transition-transform ${isProfileCategoryDropdownOpen ? 'rotate-180' : ''}`}/></div>
                                    </button>
                                    
                                    {isProfileCategoryDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsProfileCategoryDropdownOpen(false)}></div>
                                            <div className={`absolute top-full left-0 mt-2 w-full lg:w-64 z-50 rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                                <div className="max-h-60 overflow-y-auto p-1 space-y-1 hide-scrollbar">
                                                    <button onClick={() => { setApplicantData({...applicantData, category: ""}); setIsProfileCategoryDropdownOpen(false); }} className={`w-full text-left p-3 rounded-lg transition-colors ${!applicantData.category ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}><span className="text-xs font-bold block">No Category</span></button>
                                                    {JOB_CATEGORIES.map(c => (
                                                        <button key={c.id} onClick={() => { setApplicantData({...applicantData, category: c.id}); setIsProfileCategoryDropdownOpen(false); }} className={`w-full text-left p-3 rounded-lg transition-colors group ${applicantData.category === c.id ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                                                            <div className="flex flex-col"><span className="text-xs font-bold block">{c.label}</span><span className={`text-[9px] mt-0.5 font-medium truncate ${applicantData.category === c.id ? 'text-white/70' : 'opacity-50'}`}>{c.examples}</span></div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                            
                            {!isEditingProfile && applicantData.category && (
                                <div className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide bg-purple-500/10 text-purple-500 border border-purple-500/20 w-fit">
                                    <TagIcon className="w-3.5 h-3.5" />
                                    {JOB_CATEGORIES.find(c => c.id === applicantData.category)?.label || applicantData.category}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-6 text-xs font-bold text-slate-500 cursor-default select-none mt-4">
                            <div className="flex items-center gap-2"><MapPinIcon className="w-4 h-4" /><span className={!applicantData.sitio ? 'opacity-50 italic' : ''}>{applicantData.sitio || "Sitio not set"}</span></div>
                            <div className="flex items-center gap-2"><span className="text-slate-500">{currentUser?.email}</span></div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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