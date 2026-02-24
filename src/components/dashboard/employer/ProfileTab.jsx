import { useEffect } from "react";
import { 
    CameraIcon, PencilSquareIcon, CheckCircleIcon, 
    MapPinIcon, BriefcaseIcon, AcademicCapIcon, 
    UserCircleIcon, PhoneIcon, EnvelopeIcon, ClockIcon, PlusIcon, XMarkIcon
} from "@heroicons/react/24/outline";

export default function ProfileTab({
    employerData, setEmployerData, profileImage, setProfileImage, 
    isEditingProfile, setIsEditingProfile, fileInputRef, 
    setIsEditingImage, loading, handleSaveProfile, darkMode
}) {

    // --- SPLIT THEME LOGIC (Matched to Applicant Tab) ---
    const theme = darkMode ? {
        // Dark Mode: Header
        headerCard: 'bg-slate-900 border border-white/10 shadow-sm',
        headerTitle: 'text-white',
        headerSub: 'text-slate-400',
        headerInput: 'w-full bg-slate-800 border border-white/10 rounded-none px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all',
        headerBtnPrimary: 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg active:scale-95 transition-all',
        headerBtnSecondary: 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/10 transition-all',
        headerBadge: 'bg-slate-800 border border-white/10 text-slate-300',
        
        // Dark Mode: Content sections
        contentCard: 'bg-slate-900 border border-white/10 shadow-sm',
        contentTitle: 'text-white',
        contentSub: 'text-slate-400',
        contentInput: 'w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all',
    } : {
        // Light Mode: Header (Glossy Solid Blue)
        headerCard: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 shadow-[0_15px_30px_-5px_rgba(37,99,235,0.4)] ring-1 ring-inset ring-white/40',
        headerTitle: 'text-white drop-shadow-md',
        headerSub: 'text-blue-100',
        headerInput: 'bg-white/20 border border-white/30 rounded-xl px-4 py-2 text-white outline-none backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] transition-all',
        headerBtnPrimary: 'bg-white text-blue-600 hover:bg-blue-50 shadow-lg active:scale-95 transition-all',
        headerBtnSecondary: 'bg-white/10 text-white hover:bg-white/20 border border-white/30 transition-all',
        headerBadge: 'bg-white/20 border border-white/30 text-white backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]',
        
        // Light Mode: Content sections (Soft Frosted White/Blue)
        contentCard: 'bg-white/80 border border-blue-200 shadow-sm backdrop-blur-xl hover:shadow-md hover:border-blue-300 transition-all duration-300',
        contentTitle: 'text-blue-800',
        contentSub: 'text-slate-600',
        contentInput: 'w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner',
    };

    return (
        <div className="animate-content space-y-6 max-w-5xl mx-auto pb-10 relative">
            
            {/* Hidden File Input for Avatar */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => { 
                    if(e.target.files[0]) { 
                        setProfileImage(URL.createObjectURL(e.target.files[0])); 
                        setIsEditingImage(true); 
                    } 
                }} 
            />

            {/* --- 1. HEADER CARD (SOLID GLOSSY) --- */}
            <div className={`p-6 md:p-10 rounded-[2rem] relative overflow-hidden ${theme.headerCard}`}>
                <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none rotate-12">
                    <UserCircleIcon className={`w-64 h-64 ${darkMode ? 'text-white' : 'text-white'}`} />
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start text-center md:text-left">
                    
                    {/* Avatar & Verification Badge */}
                    <div className="relative group shrink-0 mt-2">
                        <div className={`w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] overflow-hidden border-4 shadow-2xl ${darkMode ? 'border-slate-800' : 'border-white/50'}`}>
                            {profileImage ? (
                                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center text-5xl font-black ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-white/20 text-white'}`}>
                                    {employerData.firstName?.charAt(0) || "E"}
                                </div>
                            )}
                        </div>

                        {/* VERIFICATION BADGE ON AVATAR */}
                        <div className="absolute -top-2 -right-2 md:top-0 md:-right-2 z-20" title={employerData.verificationStatus === 'verified' ? "Verified" : "Pending Review"}>
                            <div className={`flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full shadow-xl border-4 ${darkMode ? 'bg-slate-800 border-slate-900' : 'bg-white border-blue-400/50'}`}>
                                {employerData.verificationStatus === 'verified' ? (
                                    <CheckCircleIcon className="w-6 h-6 md:w-7 md:h-7 text-green-500" />
                                ) : (
                                    <ClockIcon className="w-6 h-6 md:w-7 md:h-7 text-amber-500" />
                                )}
                            </div>
                        </div>

                        {/* Edit Picture Button */}
                        {isEditingProfile && (
                            <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-3 -right-3 p-3 rounded-2xl bg-blue-600 text-white shadow-xl border-2 border-white hover:bg-blue-500 hover:scale-110 transition-all active:scale-95 z-20">
                                <CameraIcon className="w-6 h-6" />
                            </button>
                        )}
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1 w-full pt-2">
                        
                        {/* Name */}
                        <h2 className={`text-3xl md:text-5xl font-black tracking-tight mb-2 ${theme.headerTitle}`}>
                            {employerData.firstName} {employerData.lastName}
                        </h2>

                        {/* FIXED CONTACT INFO (Uneditable) */}
                        <p className={`text-lg font-bold mb-6 mt-4 flex items-center justify-center md:justify-start gap-2 ${theme.headerSub}`}>
                            {employerData.contact?.includes('@') ? (
                                <EnvelopeIcon className="w-5 h-5 opacity-80" />
                            ) : (
                                <PhoneIcon className="w-5 h-5 opacity-80" />
                            )}
                            {employerData.contact || "No contact info available"}
                        </p>
                        
                        {/* INLINE LOCATION */}
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 items-center">
                            <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${theme.headerBadge}`}>
                                <MapPinIcon className="w-4 h-4" /> {employerData.sitio || "No Location"}
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute top-6 right-6 md:static z-50">
                        {isEditingProfile ? (
                            <div className="flex flex-col gap-2">
                                <button onClick={handleSaveProfile} disabled={loading} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${theme.headerBtnPrimary}`}>
                                    {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/> : <CheckCircleIcon className="w-4 h-4"/>}
                                    Save Profile
                                </button>
                                <button onClick={() => setIsEditingProfile(false)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${theme.headerBtnSecondary}`}>
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setIsEditingProfile(true)} className={`p-3 md:px-6 md:py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${theme.headerBtnSecondary}`}>
                                <PencilSquareIcon className="w-5 h-5 md:w-4 md:h-4" />
                                <span className="hidden md:block">Edit Profile</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* --- 2. PROFESSIONAL SUMMARY SECTION (SOFT CONTENT) --- */}
            <div className={`p-6 md:p-8 rounded-[2rem] relative overflow-hidden ${theme.contentCard}`}>
                <h3 className={`text-xs font-black uppercase tracking-widest mb-4 opacity-80 flex items-center gap-2 ${theme.contentTitle}`}>
                    <UserCircleIcon className="w-5 h-5"/> Professional Summary
                </h3>
                {isEditingProfile ? (
                    <textarea 
                        value={employerData.aboutMe || ''} 
                        onChange={(e) => setEmployerData({...employerData, aboutMe: e.target.value})} 
                        placeholder="Write a professional summary..."
                        rows={4}
                        className={`${theme.contentInput} resize-none text-sm`}
                    />
                ) : (
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap font-medium ${theme.contentSub}`}>
                        {employerData.aboutMe || "No summary provided. Click 'Edit Profile' to add one."}
                    </p>
                )}
            </div>

            {/* --- 3. EXPERIENCE & EDUCATION GRID (SOFT CONTENT) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Work Experience */}
                <div className={`p-6 md:p-8 rounded-[2rem] relative overflow-hidden flex flex-col ${theme.contentCard}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest mb-4 opacity-80 flex items-center gap-2 ${theme.contentTitle}`}>
                        <BriefcaseIcon className="w-5 h-5"/> Experience
                    </h3>
                    {isEditingProfile ? (
                        <div className="space-y-3 flex-1">
                            {(employerData.workExperience || []).map((exp, index) => (
                                <div key={index} className="flex gap-2">
                                    <input 
                                        type="text"
                                        value={exp} 
                                        placeholder="Worked At..."
                                        onChange={(e) => {
                                            const newExp = [...(employerData.workExperience || [])];
                                            newExp[index] = e.target.value;
                                            setEmployerData({...employerData, workExperience: newExp});
                                        }} 
                                        className={`${theme.contentInput} py-2`} 
                                    />
                                    <button 
                                        onClick={() => {
                                            const newExp = [...(employerData.workExperience || [])];
                                            newExp.splice(index, 1);
                                            setEmployerData({...employerData, workExperience: newExp});
                                        }} 
                                        className={`p-2 rounded-xl transition-colors ${darkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                                        title="Remove Experience"
                                    >
                                        <XMarkIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            ))}
                            <button 
                                onClick={() => setEmployerData({...employerData, workExperience: [...(employerData.workExperience || []), '']})} 
                                className={`w-full py-3 border-2 border-dashed rounded-xl font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${darkMode ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white' : 'border-blue-200 text-blue-500 hover:bg-blue-50 hover:border-blue-300'}`}
                            >
                                <PlusIcon className="w-4 h-4"/> Add Work Experience
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1">
                            {employerData.workExperience && employerData.workExperience.filter(e => e.trim() !== '').length > 0 ? (
                                <ul className="space-y-3">
                                    {employerData.workExperience.filter(e => e.trim() !== '').map((exp, idx) => (
                                        <li key={idx} className={`text-sm font-medium flex items-start gap-3 ${theme.contentSub}`}>
                                            <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                                            {exp}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className={`text-sm font-medium ${theme.contentSub}`}>No work experience listed.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Education */}
                <div className={`p-6 md:p-8 rounded-[2rem] relative overflow-hidden flex flex-col ${theme.contentCard}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest mb-4 opacity-80 flex items-center gap-2 ${theme.contentTitle}`}>
                        <AcademicCapIcon className="w-5 h-5"/> Education
                    </h3>
                    {isEditingProfile ? (
                        <div className="space-y-4 flex-1">
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 block ${theme.contentTitle}`}>Primary School</label>
                                <input 
                                    type="text"
                                    value={employerData.education?.primary || ''} 
                                    onChange={(e) => setEmployerData({...employerData, education: { ...employerData.education, primary: e.target.value }})} 
                                    placeholder="Enter Primary School..."
                                    className={`${theme.contentInput} py-2`}
                                />
                            </div>
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 block ${theme.contentTitle}`}>Secondary School</label>
                                <input 
                                    type="text"
                                    value={employerData.education?.secondary || ''} 
                                    onChange={(e) => setEmployerData({...employerData, education: { ...employerData.education, secondary: e.target.value }})} 
                                    placeholder="Enter Secondary School..."
                                    className={`${theme.contentInput} py-2`}
                                />
                            </div>
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 block ${theme.contentTitle}`}>College Graduated At</label>
                                <input 
                                    type="text"
                                    value={employerData.education?.college || ''} 
                                    onChange={(e) => setEmployerData({...employerData, education: { ...employerData.education, college: e.target.value }})} 
                                    placeholder="Enter College / University..."
                                    className={`${theme.contentInput} py-2`}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 flex-1">
                            <div>
                                <span className={`text-[10px] font-black uppercase tracking-widest opacity-50 block mb-0.5 ${theme.contentTitle}`}>Primary School</span>
                                <p className={`text-sm font-medium ${employerData.education?.primary ? theme.contentSub : 'opacity-40 italic'}`}>
                                    {employerData.education?.primary || "Not specified"}
                                </p>
                            </div>
                            <div>
                                <span className={`text-[10px] font-black uppercase tracking-widest opacity-50 block mb-0.5 ${theme.contentTitle}`}>Secondary School</span>
                                <p className={`text-sm font-medium ${employerData.education?.secondary ? theme.contentSub : 'opacity-40 italic'}`}>
                                    {employerData.education?.secondary || "Not specified"}
                                </p>
                            </div>
                            <div>
                                <span className={`text-[10px] font-black uppercase tracking-widest opacity-50 block mb-0.5 ${theme.contentTitle}`}>College Graduated At</span>
                                <p className={`text-sm font-medium ${employerData.education?.college ? theme.contentSub : 'opacity-40 italic'}`}>
                                    {employerData.education?.college || "Not specified"}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
        </div>
    );
}