import { useState } from "react";
import { MagnifyingGlassIcon, CheckCircleIcon, XMarkIcon, ClockIcon, ArrowUturnLeftIcon, ArchiveBoxIcon, ChatBubbleLeftRightIcon, EyeIcon, TrashIcon, StarIcon as StarIconOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

// --- GLOSSY APPLICANT CARD COMPONENT ---
const ApplicantCard = ({ app, darkMode, onUpdateStatus, onViewProfile, onMessage, onDelete, onRate, unreadCount }) => {
    let theme = {};

    if (app.status === 'accepted') {
        theme = {
            gradient: darkMode ? 'from-blue-600/20 to-blue-900/40 border-blue-500/30' : 'from-blue-50 to-blue-200/60 border-blue-300 shadow-[0_8px_20px_rgba(59,130,246,0.15)] ring-white/60',
            glow: darkMode ? 'hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] hover:border-blue-400/50' : 'hover:shadow-[0_15px_30px_rgba(59,130,246,0.3)] hover:border-blue-400',
            iconWrapper: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20',
            title: darkMode ? 'text-white' : 'text-blue-950',
            subtitle: darkMode ? 'text-blue-300' : 'text-blue-700',
            badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20',
            buttonBase: darkMode ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border-blue-500/20' : 'bg-white/60 hover:bg-white text-blue-800 border-blue-200 shadow-sm',
            divider: darkMode ? 'border-blue-500/20' : 'border-blue-200'
        };
    } else if (app.status === 'rejected' || app.status === 'withdrawn') {
        theme = {
            gradient: darkMode ? 'from-red-600/20 to-red-900/40 border-red-500/30' : 'from-red-50 to-red-200/60 border-red-300 shadow-[0_8px_20px_rgba(239,68,68,0.15)] ring-white/60',
            glow: darkMode ? 'hover:shadow-[0_0_30px_rgba(239,68,68,0.2)] hover:border-red-400/50' : 'hover:shadow-[0_15px_30px_rgba(239,68,68,0.3)] hover:border-red-400',
            iconWrapper: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/20',
            title: darkMode ? 'text-white' : 'text-red-950',
            subtitle: darkMode ? 'text-red-300' : 'text-red-700',
            badge: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20',
            buttonBase: darkMode ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/20' : 'bg-white/60 hover:bg-white text-red-800 border-red-200 shadow-sm',
            divider: darkMode ? 'border-red-500/20' : 'border-red-200'
        };
    } else if (app.status === 'archived') {
        theme = {
            gradient: darkMode ? 'from-slate-600/20 to-slate-900/40 border-slate-500/30' : 'from-slate-100 to-slate-200/60 border-slate-300 shadow-[0_8px_20px_rgba(100,116,139,0.15)] ring-white/60',
            glow: darkMode ? 'hover:shadow-[0_0_30px_rgba(100,116,139,0.2)] hover:border-slate-400/50' : 'hover:shadow-[0_15px_30px_rgba(100,116,139,0.3)] hover:border-slate-400',
            iconWrapper: 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/20',
            title: darkMode ? 'text-white' : 'text-slate-900',
            subtitle: darkMode ? 'text-slate-500' : 'text-slate-600',
            badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
            buttonBase: darkMode ? 'bg-slate-500/10 hover:bg-slate-500/20 text-slate-300 border-slate-500/20' : 'bg-white/60 hover:bg-white text-slate-800 border-slate-300 shadow-sm',
            divider: darkMode ? 'border-slate-500/20' : 'border-slate-300'
        };
    } else {
        // pending & withdrawal_pending -> Orange Theme
        theme = {
            gradient: darkMode ? 'from-orange-600/20 to-orange-900/40 border-orange-500/30' : 'from-orange-50 to-orange-200/60 border-orange-300 shadow-[0_8px_20px_rgba(249,115,22,0.15)] ring-white/60',
            glow: darkMode ? 'hover:shadow-[0_0_30px_rgba(249,115,22,0.2)] hover:border-orange-400/50' : 'hover:shadow-[0_15px_30px_rgba(249,115,22,0.3)] hover:border-orange-400',
            iconWrapper: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/20',
            title: darkMode ? 'text-white' : 'text-orange-950',
            subtitle: darkMode ? 'text-orange-500' : 'text-orange-700',
            badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
            buttonBase: darkMode ? 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border-orange-500/20' : 'bg-white/60 hover:bg-white text-orange-800 border-orange-200 shadow-sm',
            divider: darkMode ? 'border-orange-500/20' : 'border-orange-200'
        };
    }

    const iconContent = app.status === 'accepted' ? '🤝' : (app.status === 'rejected' || app.status === 'withdrawn') ? '❌' : app.status === 'archived' ? '📦' : '📄';

    return (
        <div className={`p-5 rounded-[2rem] border transition-all duration-300 relative group hover:-translate-y-1 flex flex-col backdrop-blur-xl bg-gradient-to-br ring-1 ring-inset h-[250px] ${theme.gradient} ${theme.glow} ${app.status === 'archived' ? 'opacity-80 hover:opacity-100' : ''}`}>
            
            {/* --- TOP SECTION (Pinned) --- */}
            <div className="flex justify-between items-start gap-4 shrink-0 mb-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner border ${theme.iconWrapper}`}>
                    {app.applicantProfilePic ? (
                        <img src={app.applicantProfilePic} alt="pfp" className="w-full h-full object-cover"/>
                    ) : (
                        <span className="font-black text-2xl">{app.applicantName?.charAt(0) || "U"}</span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className={`font-black text-lg leading-tight truncate ${theme.title}`}>{app.applicantName}</h4>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-1 truncate ${theme.subtitle}`}>Applying for: {app.jobTitle}</p>
                </div>
            </div>

            {/* --- MIDDLE SECTION (Flexible, Min-Height 0) --- */}
            <div className="flex-1 flex flex-col min-h-0 gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {app.jobType && (
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border backdrop-blur-md ${theme.badge}`}>
                            {app.jobType}
                        </span>
                    )}
                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border backdrop-blur-md ${theme.badge}`}>
                        {app.status.replace('_', ' ')}
                    </span>
                    {app.status === 'withdrawal_pending' && (
                        <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20">
                            Attention Required
                        </span>
                    )}
                </div>

                {/* Scrolling Reason Block - Text will NEVER be cut off! */}
                {app.status === 'withdrawal_pending' && app.withdrawalReason && (
                    <div className={`flex-1 overflow-y-auto hide-scrollbar p-2.5 rounded-xl border text-[10px] leading-relaxed font-medium italic ${darkMode ? 'bg-orange-500/10 border-orange-500/20 text-orange-200' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
                        <span className="font-bold uppercase tracking-wider text-[8px] block mb-1 opacity-70 not-italic">Reason for Withdrawal:</span>
                        "{app.withdrawalReason}"
                    </div>
                )}
            </div>

            {/* --- BOTTOM SECTION (Pinned) --- */}
            <div className={`flex flex-wrap items-center gap-2 pt-3 border-t shrink-0 ${theme.divider}`}>
                <button onClick={() => onViewProfile(app)} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border backdrop-blur-md ${theme.buttonBase}`}>
                    <EyeIcon className="w-4 h-4" /> Profile
                </button>

                {/* --- UPDATED: Accept button is now Orange! --- */}
                {app.status === 'pending' && (
                    <>
                        <button onClick={() => onUpdateStatus(app, 'accepted')} className="flex-none bg-orange-500 text-white p-3 rounded-xl shadow-lg hover:bg-orange-400 transition-colors active:scale-95 border border-orange-500" title="Accept Applicant">
                            <CheckCircleIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => onUpdateStatus(app, 'rejected')} className={`flex-none p-3 rounded-xl transition-all active:scale-95 border backdrop-blur-md hover:bg-red-500 hover:text-white hover:border-red-500 ${theme.buttonBase}`} title="Reject Applicant">
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    </>
                )}

                {app.status === 'withdrawal_pending' && (
                    <button onClick={() => onUpdateStatus(app, 'withdrawn')} className="flex-[2] bg-orange-500 text-white p-3 rounded-xl shadow-lg hover:bg-orange-400 transition-colors active:scale-95 font-bold text-[10px] uppercase tracking-widest">
                        Approve Withdrawal
                    </button>
                )}

                {app.status === 'accepted' && (
                    <>
                        {app.isRatedByEmployer ? (
                            <button disabled className={`flex-none p-3 rounded-xl opacity-50 cursor-not-allowed border ${theme.buttonBase}`} title="Rated">
                                <StarIconSolid className="w-4 h-4 text-amber-500" />
                            </button>
                        ) : (
                            <button onClick={() => onRate(app)} className={`flex-none p-3 rounded-xl transition-all active:scale-95 border backdrop-blur-md ${theme.buttonBase}`} title="Rate Applicant">
                                <StarIconOutline className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={() => onMessage(app)} className="flex-none bg-blue-600 text-white p-3 rounded-xl shadow-lg relative hover:bg-blue-500 transition-colors active:scale-95 border border-blue-500">
                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                            {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[7px] font-bold">{unreadCount}</span>}
                        </button>
                    </>
                )}

                {(app.status === 'rejected' || app.status === 'withdrawn') && app.status !== 'archived' && onUpdateStatus && (
                    <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(app, 'archived'); }} className={`flex-none p-3 rounded-xl transition-all active:scale-95 border backdrop-blur-md md:opacity-60 group-hover:opacity-100 ${theme.buttonBase}`} title="Archive Record">
                        <ArchiveBoxIcon className="w-4 h-4" />
                    </button>
                )}

                {app.status === 'archived' && onDelete && (
                    <button onClick={(e) => { e.stopPropagation(); onDelete(app.id); }} className={`flex-none p-3 rounded-xl transition-all active:scale-95 border backdrop-blur-md hover:bg-red-500 hover:text-white hover:border-red-500 ${theme.buttonBase}`} title="Delete Permanently">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

// --- MAIN TAB COMPONENT ---
export default function ApplicantsTab({ 
    receivedApplications = [], 
    applicantSearch = "",      
    setApplicantSearch,        
    handleUpdateApplicationStatus, 
    handleDeleteApplication,
    handleViewApplication,     
    handleStartChatFromExternal, 
    darkMode,
    conversations = [],
    currentUser,
    setSelectedApplicantToRate,
    setIsRatingApplicantModalOpen
}) {
    const [showArchived, setShowArchived] = useState(false);
    
    const filteredApps = receivedApplications.filter(app => 
        app.applicantName?.toLowerCase().includes(applicantSearch.toLowerCase()) || 
        app.jobTitle?.toLowerCase().includes(applicantSearch.toLowerCase())
    );

    const archivedApps = filteredApps.filter(app => app.status === 'archived');
    const acceptedApps = filteredApps.filter(app => app.status === 'accepted');
    const pendingApps = filteredApps.filter(app => app.status === 'pending');
    const withdrawalRequests = filteredApps.filter(app => app.status === 'withdrawal_pending');
    const rejectedWithdrawnApps = filteredApps.filter(app => app.status === 'rejected' || app.status === 'withdrawn');

    const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]'}`;

    return (
        <div className="animate-content space-y-10">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm w-full md:w-96 ${glassPanel}`}>
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search by name or job..." 
                            value={applicantSearch} 
                            onChange={(e) => setApplicantSearch(e.target.value)} 
                            className={`w-full bg-transparent border-none outline-none text-sm font-bold pl-9 pr-4 py-2.5 ${darkMode ? 'text-white placeholder-slate-400' : 'text-slate-800 placeholder-slate-400'}`} 
                        />
                    </div>
                </div>

                <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border shadow-sm font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                        showArchived 
                        ? 'bg-slate-500 text-white border-slate-500 shadow-slate-500/30' 
                        : (darkMode ? 'bg-slate-800/80 border-white/10 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900')
                    }`}
                >
                    <ArchiveBoxIcon className="w-5 h-5" />
                    {showArchived ? "Back to Active" : "View Archives"}
                </button>
            </div>

            {showArchived ? (
                <section className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex items-center gap-3">
                        <ArchiveBoxIcon className="w-5 h-5 text-slate-500" />
                        <h3 className="font-black text-sm uppercase tracking-[0.2em] text-slate-500">Archived Records ({archivedApps.length})</h3>
                        <div className="flex-1 h-px bg-slate-500/20"></div>
                    </div>
                    {archivedApps.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {archivedApps.map(app => (
                                <ApplicantCard 
                                    key={app.id} 
                                    app={app} 
                                    darkMode={darkMode} 
                                    onViewProfile={handleViewApplication} 
                                    onDelete={handleDeleteApplication}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No archived records found</p>
                        </div>
                    )}
                </section>
            ) : (
                <div className="space-y-10 animate-in fade-in duration-300">
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <CheckCircleIcon className="w-5 h-5 text-blue-500" />
                            <h3 className="font-black text-sm uppercase tracking-[0.2em] text-blue-500">Accepted ({acceptedApps.length})</h3>
                            <div className="flex-1 h-px bg-blue-500/20"></div>
                        </div>
                        {acceptedApps.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {acceptedApps.map(app => (
                                    <ApplicantCard 
                                        key={app.id} 
                                        app={app} 
                                        darkMode={darkMode} 
                                        onViewProfile={handleViewApplication} 
                                        onMessage={() => handleStartChatFromExternal({ id: app.applicantId, name: app.applicantName, profilePic: app.applicantProfilePic })} 
                                        onRate={(app) => { setSelectedApplicantToRate(app); setIsRatingApplicantModalOpen(true); }}
                                        unreadCount={conversations?.find(c => c.chatId?.includes(app.applicantId))?.[`unread_${currentUser?.uid}`] || 0}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No accepted applicants</p>
                            </div>
                        )}
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <ClockIcon className="w-5 h-5 text-orange-500" />
                            <h3 className="font-black text-sm uppercase tracking-[0.2em] text-orange-500">Pending Review ({pendingApps.length})</h3>
                            <div className="flex-1 h-px bg-orange-500/20"></div>
                        </div>
                        
                        {pendingApps.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {pendingApps.map(app => (
                                    <ApplicantCard 
                                        key={app.id} 
                                        app={app} 
                                        darkMode={darkMode} 
                                        onUpdateStatus={handleUpdateApplicationStatus} 
                                        onViewProfile={handleViewApplication} 
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No pending applications</p>
                            </div>
                        )}
                    </section>

                    {withdrawalRequests.length > 0 && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <ArrowUturnLeftIcon className="w-5 h-5 text-orange-500" />
                                <h3 className="font-black text-sm uppercase tracking-[0.2em] text-orange-500">Withdrawal Requested ({withdrawalRequests.length})</h3>
                                <div className="flex-1 h-px bg-orange-500/20"></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {withdrawalRequests.map(app => (
                                    <ApplicantCard 
                                        key={app.id} 
                                        app={app} 
                                        darkMode={darkMode} 
                                        onUpdateStatus={handleUpdateApplicationStatus} 
                                        onViewProfile={handleViewApplication} 
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="space-y-6 opacity-80 hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-3">
                            <XMarkIcon className="w-5 h-5 text-red-500" />
                            <h3 className="font-black text-sm uppercase tracking-[0.2em] text-red-500">Rejected / Withdrawn ({rejectedWithdrawnApps.length})</h3>
                            <div className="flex-1 h-px bg-red-500/20"></div>
                        </div>
                        {rejectedWithdrawnApps.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {rejectedWithdrawnApps.map(app => (
                                    <ApplicantCard 
                                        key={app.id} 
                                        app={app} 
                                        darkMode={darkMode} 
                                        onUpdateStatus={handleUpdateApplicationStatus} 
                                        onViewProfile={handleViewApplication} 
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No rejected or withdrawn applications</p>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}