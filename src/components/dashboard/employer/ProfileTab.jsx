import { 
    PencilSquareIcon, MapPinIcon, UserIcon, 
    BriefcaseIcon, AcademicCapIcon 
} from "@heroicons/react/24/outline";

export default function ProfileTab({
    employerData, setEmployerData, profileImage, isEditingProfile, setIsEditingProfile,
    loading, handleSaveProfile, darkMode, splitByNewLine, ProfilePicComponent
}) {

    const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;
    const displayName = `${employerData.firstName} ${employerData.lastName}`.trim() || "Employer";

    return (
        <div className="animate-content space-y-6">
            <div className={`relative p-8 md:p-10 rounded-[2.5rem] border overflow-hidden ${glassPanel}`}>
                <div className="absolute top-8 right-8 z-20">
                    <button onClick={(e) => { e.stopPropagation(); if(isEditingProfile) handleSaveProfile(); else setIsEditingProfile(true); }} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 ${isEditingProfile ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/20'}`}>
                        {isEditingProfile ? <>{loading ? 'Saving...' : 'Save Changes'}</> : <><PencilSquareIcon className="w-4 h-4" /> Edit Profile</>}
                    </button>
                </div>
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="w-32 h-32 shrink-0 rounded-[2rem] border-2 border-dashed border-slate-500/20 p-2 select-none">
                        <ProfilePicComponent sizeClasses="w-full h-full" isCollapsed={!isEditingProfile} />
                    </div>
                    <div className="space-y-4 w-full pt-2">
                        <div>
                            <h2 className="text-3xl font-black tracking-tight cursor-default mb-2">{displayName}</h2>
                            {isEditingProfile ? (
                                <input type="text" value={employerData.title} onChange={(e) => setEmployerData({...employerData, title: e.target.value})} className={`bg-transparent border-b-2 outline-none font-bold text-sm uppercase tracking-wider w-full md:w-1/2 select-text ${darkMode ? 'border-white/20 text-blue-400' : 'border-slate-400 text-blue-600'}`} placeholder="Enter Title" /> 
                            ) : (
                                <p className="text-blue-500 font-bold text-sm uppercase tracking-wider cursor-default">{employerData.title || "Employer"}</p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-6 text-xs font-bold text-slate-500 cursor-default select-none mt-4">
                            <div className="flex items-center gap-2">
                                <MapPinIcon className="w-4 h-4" />
                                <span className={!employerData.sitio ? 'opacity-50 italic' : ''}>{employerData.sitio || "Sitio/Purok not set in registration"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PROFESSIONAL SUMMARY */}
                <div className={`col-span-1 lg:col-span-2 p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col ${glassPanel}`}>
                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-500/20"></div>
                    <div className="flex items-center gap-3 mb-6 shrink-0">
                        <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><UserIcon className="w-5 h-5" /></div>
                        <h3 className={`font-black uppercase tracking-[0.2em] text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>Professional Summary</h3>
                    </div>
                    {isEditingProfile ? (
                        <textarea 
                            value={employerData.aboutMe} 
                            onChange={(e) => setEmployerData({...employerData, aboutMe: e.target.value})} 
                            placeholder="Write a professional summary..." 
                            className={`w-full h-32 p-4 rounded-xl text-sm bg-transparent border resize-none outline-none select-text focus:ring-2 ring-blue-500/50 ${darkMode ? 'border-white/20 text-slate-300' : 'border-slate-300 text-slate-600'}`} 
                        />
                    ) : (
                        <p className={`text-sm leading-relaxed whitespace-pre-wrap pl-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {employerData.aboutMe || "No summary provided."}
                        </p>
                    )}
                </div>

                {/* EXPERIENCE SECTION */}
                <div className={`p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col h-[28rem] ${glassPanel}`}>
                    <div className="absolute top-0 left-0 w-2 h-full bg-amber-500/20"></div>
                    <div className="flex items-center gap-3 mb-6 shrink-0">
                        <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500"><BriefcaseIcon className="w-5 h-5" /></div>
                        <h3 className={`font-black uppercase tracking-[0.2em] text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>Experience</h3>
                    </div>
                    
                    <div className="overflow-y-auto no-scrollbar flex-1 pr-2">
                        {isEditingProfile ? (
                            <div className="space-y-3">
                                {(() => {
                                    const expLines = employerData.workExperience ? employerData.workExperience.split('\n') : [''];
                                    return expLines.map((line, i) => (
                                        <div key={i} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 w-full">
                                            <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 w-16 text-right ${darkMode ? 'text-amber-500' : 'text-amber-600'}`}>Work at</span>
                                            <input
                                                type="text"
                                                value={line}
                                                placeholder="Company Name / Role..."
                                                autoFocus={i === expLines.length - 1 && expLines.length > 1}
                                                className={`w-full min-w-0 p-3 rounded-xl text-sm bg-transparent border outline-none focus:border-amber-500 transition-colors ${darkMode ? 'border-white/20 text-slate-300' : 'border-slate-300 text-slate-600'}`}
                                                onChange={(e) => {
                                                    const newLines = [...expLines];
                                                    newLines[i] = e.target.value;
                                                    setEmployerData({...employerData, workExperience: newLines.join('\n')});
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const newLines = [...expLines];
                                                        newLines.splice(i + 1, 0, ""); 
                                                        setEmployerData({...employerData, workExperience: newLines.join('\n')});
                                                    }
                                                    if (e.key === 'Backspace' && line === '' && expLines.length > 1) {
                                                        e.preventDefault();
                                                        const newLines = [...expLines];
                                                        newLines.splice(i, 1);
                                                        setEmployerData({...employerData, workExperience: newLines.join('\n')});
                                                    }
                                                }}
                                            />
                                        </div>
                                    ));
                                })()}
                                <p className="text-[9px] text-center opacity-40 uppercase font-bold pt-2">Press Enter to add new experience</p>
                            </div>
                        ) : (
                            <div className="relative ml-3 space-y-6 pb-2">
                                {employerData.workExperience ? splitByNewLine(employerData.workExperience).map((line, i) => (
                                    <div key={i} className="relative pl-6">
                                        <span className="absolute -left-[4.5px] top-2 w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                        <div className="flex flex-col">
                                            <span className={`text-[9px] font-black uppercase tracking-widest mb-0.5 opacity-60 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>Work at</span>
                                            <p className={`text-sm font-bold leading-relaxed break-words whitespace-pre-wrap ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{line}</p>
                                        </div>
                                    </div>
                                )) : <div className="pl-6 text-sm opacity-50 italic">No experience listed.</div>}
                            </div>
                        )}
                    </div>
                </div>

                {/* EDUCATION SECTION */}
                <div className={`p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col h-[28rem] ${glassPanel}`}>
                    <div className="absolute top-0 left-0 w-2 h-full bg-purple-500/20"></div>
                    <div className="flex items-center gap-3 mb-6 shrink-0">
                        <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500"><AcademicCapIcon className="w-5 h-5" /></div>
                        <h3 className={`font-black uppercase tracking-[0.2em] text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>Education</h3>
                    </div>
                    
                    <div className="overflow-y-auto no-scrollbar flex-1 pr-2">
                        {isEditingProfile ? (
                            <div className="space-y-4">
                                {(() => {
                                    const labels = ["Primary School", "Secondary School", "College Graduated at"];
                                    const eduLines = employerData.education ? employerData.education.split('\n') : ['', '', ''];
                                    
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
                                                    setEmployerData({...employerData, education: newLines.join('\n')});
                                                }}
                                            />
                                        </div>
                                    ));
                                })()}
                            </div>
                        ) : (
                            <div className="relative ml-3 space-y-6 pb-2">
                                {employerData.education ? splitByNewLine(employerData.education).map((line, i) => {
                                    const labels = ["Primary School", "Secondary School", "College Graduated at"];
                                    return (
                                        <div key={i} className="relative pl-6">
                                            <span className="absolute -left-[4.5px] top-2 w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                                    {labels[i] || "Additional Education"}
                                                </span>
                                                <p className={`text-sm font-bold leading-relaxed break-words whitespace-pre-wrap ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{line}</p>
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