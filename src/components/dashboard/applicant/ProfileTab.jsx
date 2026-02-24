import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { 
    CameraIcon, PencilSquareIcon, CheckCircleIcon, 
    MapPinIcon, BriefcaseIcon, AcademicCapIcon, 
    TagIcon, UserCircleIcon, PhoneIcon, XMarkIcon, 
    EnvelopeIcon, ClockIcon, SunIcon, Cog8ToothIcon, 
    WrenchScrewdriverIcon, HomeIcon, UserGroupIcon,
    DocumentIcon, PhotoIcon, ArrowDownTrayIcon
} from "@heroicons/react/24/outline";

export default function ProfileTab({
    applicantData, setApplicantData, profileImage, setProfileImage, 
    isEditingProfile, setIsEditingProfile, fileInputRef, 
    setIsEditingImage, loading, handleSaveProfile, darkMode, 
    JOB_CATEGORIES, isProfileCategoryDropdownOpen, setIsProfileCategoryDropdownOpen,
    resumeImageFile, setResumeImageFile, resumeDocFile, setResumeDocFile, setLightboxUrl
}) {
    
    // Controls which view the user is looking at in the body
    const [profileSubTab, setProfileSubTab] = useState("details"); // 'details' | 'resume'

    // --- SCROLL LOCK FOR MODAL ---
    useEffect(() => {
        if (isProfileCategoryDropdownOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [isProfileCategoryDropdownOpen]);

    // --- CATEGORY COLOR CODING ---
    const getCatStyles = (id) => {
        const map = {
            'EDUCATION': { icon: AcademicCapIcon, text: darkMode ? 'text-blue-400' : 'text-blue-600', bgLight: darkMode ? 'bg-blue-400/10' : 'bg-blue-600/10', active: darkMode ? 'bg-blue-400/20 border-blue-400 shadow-lg shadow-blue-500/20' : 'bg-blue-50 border-blue-500 shadow-lg shadow-blue-500/20', hover: darkMode ? 'hover:border-blue-400/50' : 'hover:border-blue-300', hoverText: darkMode ? 'group-hover:text-blue-400' : 'group-hover:text-blue-600' },
            'AGRICULTURE': { icon: SunIcon, text: 'text-green-500', bgLight: 'bg-green-500/10', active: darkMode ? 'bg-green-500/20 border-green-500 shadow-lg shadow-green-500/20' : 'bg-green-50 border-green-500 shadow-lg shadow-green-500/20', hover: 'hover:border-green-400', hoverText: 'group-hover:text-green-600' },
            'AUTOMOTIVE': { icon: Cog8ToothIcon, text: 'text-slate-500', bgLight: 'bg-slate-500/10', active: darkMode ? 'bg-slate-500/20 border-slate-500 shadow-lg shadow-slate-500/20' : 'bg-slate-50 border-slate-500 shadow-lg shadow-slate-500/20', hover: 'hover:border-slate-400', hoverText: 'group-hover:text-slate-600' },
            'CARPENTRY': { icon: WrenchScrewdriverIcon, text: 'text-yellow-500', bgLight: 'bg-yellow-500/10', active: darkMode ? 'bg-yellow-500/20 border-yellow-500 shadow-lg shadow-yellow-500/20' : 'bg-yellow-50 border-yellow-500 shadow-lg shadow-yellow-500/20', hover: 'hover:border-yellow-400', hoverText: 'group-hover:text-yellow-600' },
            'HOUSEHOLD': { icon: HomeIcon, text: 'text-pink-500', bgLight: 'bg-pink-500/10', active: darkMode ? 'bg-pink-500/20 border-pink-500 shadow-lg shadow-pink-500/20' : 'bg-pink-50 border-pink-500 shadow-lg shadow-pink-500/20', hover: 'hover:border-pink-400', hoverText: 'group-hover:text-pink-600' },
            'CUSTOMER_SERVICE': { icon: UserGroupIcon, text: 'text-purple-500', bgLight: 'bg-purple-500/10', active: darkMode ? 'bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/20' : 'bg-purple-50 border-purple-500 shadow-lg shadow-purple-500/20', hover: 'hover:border-purple-400', hoverText: 'group-hover:text-purple-600' },
        };
        return map[id] || { icon: TagIcon, text: 'text-slate-500', bgLight: 'bg-slate-500/10', active: 'bg-slate-500/10 border-slate-500', hover: 'hover:border-slate-500/50', hoverText: 'group-hover:text-slate-500' }; 
    };

    // --- SPLIT THEME LOGIC ---
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

    // Derived preview images
    const previewImage = resumeImageFile ? URL.createObjectURL(resumeImageFile) : applicantData.resumeImageUrl;

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
                    <UserCircleIcon className={`w-64 h-64 text-white`} />
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start text-center md:text-left">
                    
                    {/* Avatar & Verification Badge */}
                    <div className="relative group shrink-0 mt-2">
                        <div className={`w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] overflow-hidden border-4 shadow-2xl ${darkMode ? 'border-slate-800' : 'border-white/50'}`}>
                            {profileImage ? (
                                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center text-5xl font-black ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-white/20 text-white'}`}>
                                    {applicantData.firstName?.charAt(0) || "U"}
                                </div>
                            )}
                        </div>

                        {/* VERIFICATION BADGE ON AVATAR */}
                        <div className="absolute -top-2 -right-2 md:top-0 md:-right-2 z-20" title={applicantData.verificationStatus === 'verified' ? "Verified" : "Pending Review"}>
                            <div className={`flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full shadow-xl border-4 ${darkMode ? 'bg-slate-800 border-slate-900' : 'bg-white border-blue-400/50'}`}>
                                {applicantData.verificationStatus === 'verified' ? (
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
                            {applicantData.firstName} {applicantData.lastName}
                        </h2>

                        {/* FIXED CONTACT INFO (Uneditable) */}
                        <p className={`text-lg font-bold mb-6 mt-4 flex items-center justify-center md:justify-start gap-2 ${theme.headerSub}`}>
                            {applicantData.contact?.includes('@') ? (
                                <EnvelopeIcon className="w-5 h-5 opacity-80" />
                            ) : (
                                <PhoneIcon className="w-5 h-5 opacity-80" />
                            )}
                            {applicantData.contact || "No contact info available"}
                        </p>
                        
                        {/* INLINE LOCATION & CATEGORY */}
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 items-center">
                            <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${theme.headerBadge}`}>
                                <MapPinIcon className="w-4 h-4" /> {applicantData.sitio || "No Location"}
                            </span>
                            
                            {/* Category Badge / Dropdown Button */}
                            {isEditingProfile ? (
                                <button onClick={() => setIsProfileCategoryDropdownOpen(true)} className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:bg-white/30 ${theme.headerInput}`}>
                                    <TagIcon className="w-4 h-4" />
                                    {applicantData.category ? JOB_CATEGORIES.find(c => c.id === applicantData.category)?.label : "Select Category"}
                                </button>
                            ) : (
                                <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${theme.headerBadge}`}>
                                    <TagIcon className="w-4 h-4" /> {applicantData.category ? JOB_CATEGORIES.find(c => c.id === applicantData.category)?.label : "No Category"}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons & Sub-Tab Switcher */}
                    <div className="absolute top-6 right-6 md:static z-50 flex flex-col items-end md:items-stretch gap-2 w-auto md:w-48">
                        {isEditingProfile ? (
                            <div className="flex flex-col gap-2 w-full">
                                <button onClick={handleSaveProfile} disabled={loading} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${theme.headerBtnPrimary}`}>
                                    {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/> : <CheckCircleIcon className="w-4 h-4"/>}
                                    Save Profile
                                </button>
                                <button onClick={() => {
                                    setIsEditingProfile(false);
                                    setResumeImageFile(null); // Clear unsaved changes
                                    setResumeDocFile(null);
                                }} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-center ${theme.headerBtnSecondary}`}>
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setIsEditingProfile(true)} className={`p-3 md:px-6 md:py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 w-full ${theme.headerBtnSecondary}`}>
                                <PencilSquareIcon className="w-5 h-5 md:w-4 md:h-4" />
                                <span className="hidden md:block">Edit Profile</span>
                            </button>
                        )}

                        {/* --- SINGLE CHANGING TEXT BUTTON FOR SUB-TABS --- */}
                        <button 
                            onClick={() => setProfileSubTab(prev => prev === "details" ? "resume" : "details")}
                            className={`p-3 md:px-6 md:py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 w-full transition-all ${theme.headerBtnSecondary}`}
                        >
                            {profileSubTab === "details" ? (
                                <>
                                    <DocumentIcon className="w-5 h-5 md:w-4 md:h-4" />
                                    <span className="hidden md:block">View Resume</span>
                                </>
                            ) : (
                                <>
                                    <UserCircleIcon className="w-5 h-5 md:w-4 md:h-4" />
                                    <span className="hidden md:block">Profile Details</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- 3. DYNAMIC CONTENT SECTION --- */}
            {profileSubTab === "details" ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* ABOUT ME */}
                    <div className={`p-6 md:p-8 rounded-[2rem] relative overflow-hidden ${theme.contentCard}`}>
                        <h3 className={`text-xs font-black uppercase tracking-widest mb-4 opacity-80 flex items-center gap-2 ${theme.contentTitle}`}>
                            <UserCircleIcon className="w-5 h-5"/> About Me
                        </h3>
                        {isEditingProfile ? (
                            <textarea 
                                value={applicantData.bio || ''} 
                                onChange={(e) => setApplicantData({...applicantData, bio: e.target.value})} 
                                placeholder="Tell employers a little bit about yourself, your work ethic, and your goals..."
                                rows={4}
                                className={`${theme.contentInput} resize-none text-sm`}
                            />
                        ) : (
                            <p className={`text-sm leading-relaxed whitespace-pre-wrap font-medium ${theme.contentSub}`}>
                                {applicantData.bio || "No description provided. Click 'Edit Profile' to add one."}
                            </p>
                        )}
                    </div>

                    {/* EXPERIENCE & EDUCATION */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`p-6 md:p-8 rounded-[2rem] relative overflow-hidden flex flex-col ${theme.contentCard}`}>
                            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 opacity-80 flex items-center gap-2 ${theme.contentTitle}`}>
                                <BriefcaseIcon className="w-5 h-5"/> Work Experience
                            </h3>
                            {isEditingProfile ? (
                                <textarea 
                                    value={applicantData.experience || ''} 
                                    onChange={(e) => setApplicantData({...applicantData, experience: e.target.value})} 
                                    placeholder="List your past jobs, responsibilities, and achievements..."
                                    rows={6}
                                    className={`${theme.contentInput} resize-none flex-1 text-sm`}
                                />
                            ) : (
                                <p className={`text-sm leading-relaxed whitespace-pre-wrap font-medium flex-1 ${theme.contentSub}`}>
                                    {applicantData.experience || "No work experience listed."}
                                </p>
                            )}
                        </div>

                        <div className={`p-6 md:p-8 rounded-[2rem] relative overflow-hidden flex flex-col ${theme.contentCard}`}>
                            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 opacity-80 flex items-center gap-2 ${theme.contentTitle}`}>
                                <AcademicCapIcon className="w-5 h-5"/> Education
                            </h3>
                            {isEditingProfile ? (
                                <textarea 
                                    value={applicantData.education || ''} 
                                    onChange={(e) => setApplicantData({...applicantData, education: e.target.value})} 
                                    placeholder="List your educational background, degrees, or certifications..."
                                    rows={6}
                                    className={`${theme.contentInput} resize-none flex-1 text-sm`}
                                />
                            ) : (
                                <p className={`text-sm leading-relaxed whitespace-pre-wrap font-medium flex-1 ${theme.contentSub}`}>
                                    {applicantData.education || "No education listed."}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`p-6 md:p-8 rounded-[2rem] relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 ${theme.contentCard}`}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className={`text-xs font-black uppercase tracking-widest opacity-80 flex items-center gap-2 ${theme.contentTitle}`}>
                            <DocumentIcon className="w-5 h-5"/> Resume Attachments
                        </h3>
                        {!isEditingProfile && (
                            <button onClick={() => setIsEditingProfile(true)} className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 flex items-center gap-1">
                                <PencilSquareIcon className="w-4 h-4"/> Edit Resume
                            </button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* 1. Resume Image Block */}
                        <div className="space-y-3">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${theme.contentSub}`}>Resume Image (Optional)</p>
                            
                            {isEditingProfile ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <input 
                                            type="file" 
                                            accept="image/jpeg,image/png,image/jpg" 
                                            onChange={(e) => setResumeImageFile(e.target.files[0])} 
                                            className={`${theme.contentInput} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-500 file:transition-colors`} 
                                        />
                                    </div>
                                    {/* Preview of newly selected image or existing image */}
                                    {previewImage && (
                                        <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner group">
                                            <img src={previewImage} className="w-full h-full object-cover" alt="Resume Preview" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button onClick={(e) => { e.preventDefault(); setLightboxUrl(previewImage); }} className="p-3 bg-white text-slate-900 rounded-full hover:scale-110 transition-transform">
                                                    <CameraIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                applicantData.resumeImageUrl ? (
                                    <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm group">
                                        <img src={applicantData.resumeImageUrl} alt="Resume" className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxUrl(applicantData.resumeImageUrl)} />
                                        <div className="absolute top-2 right-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl text-white text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            Click to Expand
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`w-full h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center opacity-50 ${darkMode ? 'border-white/20' : 'border-slate-300'}`}>
                                        <PhotoIcon className="w-8 h-8 mb-2" />
                                        <span className="text-xs font-bold uppercase tracking-widest text-center px-4">No Image Uploaded</span>
                                    </div>
                                )
                            )}
                        </div>

                        {/* 2. Resume Document Block */}
                        <div className="space-y-3">
                            <p className={`text-[10px] font-black uppercase tracking-widest flex items-center justify-between ${theme.contentSub}`}>
                                <span>Resume Document (PDF/Doc)</span>
                                {isEditingProfile && <span className="text-red-500 font-bold">* Required</span>}
                            </p>

                            {isEditingProfile ? (
                                <div className="space-y-4">
                                    <input 
                                        type="file" 
                                        accept=".pdf,.doc,.docx" 
                                        onChange={(e) => setResumeDocFile(e.target.files[0])} 
                                        className={`${theme.contentInput} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-500 file:transition-colors`} 
                                    />
                                    {/* Preview Filename if selected */}
                                    {resumeDocFile && (
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                                            <DocumentIcon className="w-6 h-6 shrink-0" />
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-bold truncate">{resumeDocFile.name}</p>
                                                <p className="text-[10px] uppercase tracking-widest opacity-70">Ready to save</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                applicantData.resumeFileUrl ? (
                                    <a 
                                        href={applicantData.resumeFileUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className={`w-full p-5 rounded-2xl flex items-center gap-4 border transition-all group ${darkMode ? 'bg-slate-800 border-white/10 hover:bg-slate-700 text-white' : 'bg-white border-blue-200 hover:border-blue-400 hover:shadow-lg text-slate-800'}`}
                                    >
                                        <div className={`p-4 rounded-xl transition-colors ${darkMode ? 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/40' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                            <ArrowDownTrayIcon className="w-7 h-7"/>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-black text-sm group-hover:text-blue-500 transition-colors">Download Resume File</p>
                                            <p className="text-[10px] uppercase font-bold opacity-50 tracking-widest mt-0.5">Click to view or save</p>
                                        </div>
                                    </a>
                                ) : (
                                    <div className={`w-full p-6 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 border-dashed opacity-50 ${darkMode ? 'border-white/20 text-white' : 'border-slate-300 text-slate-600'}`}>
                                        <div className="p-3 bg-slate-500/10 rounded-xl"><DocumentIcon className="w-8 h-8"/></div>
                                        <p className="font-bold text-xs uppercase tracking-widest">No File Uploaded</p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- CATEGORY POPUP MODAL --- */}
            {isProfileCategoryDropdownOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsProfileCategoryDropdownOpen(false)}>
                    <div 
                        className={`w-full max-w-2xl p-6 md:p-8 rounded-[2rem] shadow-2xl border animate-in zoom-in-95 ${darkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white/95 backdrop-blur-3xl border-blue-200 ring-1 ring-inset ring-white/60 shadow-[0_30px_60px_-15px_rgba(37,99,235,0.3)] text-slate-900'}`} 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`font-black text-xl md:text-2xl tracking-tight ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Select Specialization</h3>
                            <button onClick={() => setIsProfileCategoryDropdownOpen(false)} className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-white/10 bg-slate-800' : 'hover:bg-blue-100 bg-blue-50 text-blue-900'}`}>
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:gap-4 max-h-[45vh] md:max-h-[60vh] overflow-y-auto pr-2 hide-scrollbar p-1">
                            {JOB_CATEGORIES.map(c => {
                                const isSelected = applicantData.category === c.id;
                                const catStyle = getCatStyles(c.id);
                                const CatIcon = catStyle.icon;
                                
                                return (
                                    <button 
                                        key={c.id} 
                                        onClick={() => { setApplicantData({...applicantData, category: c.id}); setIsProfileCategoryDropdownOpen(false); }} 
                                        className={`w-full flex flex-col items-center justify-center text-center p-4 md:p-5 rounded-2xl border-2 transition-all duration-300 group ${isSelected ? catStyle.active : `border-transparent ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-blue-50 shadow-sm hover:shadow-md'}`}`}
                                    >
                                        <div className={`p-3 rounded-2xl mb-3 transition-transform group-hover:scale-110 ${catStyle.bgLight} ${catStyle.text}`}>
                                            <CatIcon className="w-8 h-8 md:w-10 md:h-10" />
                                        </div>
                                        <span className={`block font-black text-xs md:text-sm transition-colors ${isSelected ? catStyle.text : darkMode ? 'text-white group-hover:text-slate-300' : 'text-slate-800 group-hover:text-blue-900'}`}>
                                            {c.label}
                                        </span>
                                        <span className={`text-[9px] md:text-[10px] font-bold block mt-1 transition-colors line-clamp-2 ${isSelected ? catStyle.text : 'opacity-60 group-hover:opacity-80'}`}>
                                            {c.examples}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>,
                document.body
            )}
            
        </div>
    );
}