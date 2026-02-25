import { 
    MagnifyingGlassIcon, ClockIcon, CheckCircleIcon, XMarkIcon, 
    EyeIcon, TrashIcon, ChatBubbleLeftRightIcon, StarIcon as StarIconOutline 
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

// Internal Component for the individual Applicant Card
function ApplicantCard({ app, darkMode, onAccept, onReject, onView, onChat, onDelete, onRate, isAccepted, isRejected, unreadCount }) {
    // Dynamic border and icon logic
    const borderColorClass = isAccepted 
        ? 'border-l-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
        : isRejected 
            ? 'border-l-red-500 opacity-80' 
            : 'border-l-amber-500';

    const iconBgClass = isAccepted ? 'bg-blue-500/10' : isRejected ? 'bg-red-500/10' : 'bg-amber-500/10';
    const iconContent = isAccepted ? '🤝' : isRejected ? '❌' : '📄';

    return (
        <div className={`p-4 md:p-8 rounded-[2.5rem] border-l-8 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 transition-all relative overflow-hidden group hover:shadow-xl backdrop-blur-md ${darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-white border-white/40 shadow-md'} ${borderColorClass}`}>
            <div className="flex items-start gap-4 md:gap-5">
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-[1.2rem] flex items-center justify-center text-xl md:text-2xl shadow-inner select-none overflow-hidden shrink-0 ${iconBgClass}`}>
                    {app.applicantProfilePic ? (
                        <img src={app.applicantProfilePic} alt={app.applicantName} className="w-full h-full object-cover"/>
                    ) : (
                        <span>{iconContent}</span>
                    )}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h4 className={`font-black text-base md:text-lg leading-none select-none cursor-default ${darkMode ? 'text-white' : 'text-slate-900'}`}>{app.applicantName}</h4>
                        {app.status === 'pending' && !app.isViewed && (
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                        )}
                    </div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 md:mt-2 select-none cursor-default truncate max-w-[200px]">{app.jobTitle}</p>
                    {isRejected && (
                        <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-2">
                            {app.status === 'withdrawn' ? 'Withdrawn' : 'Rejected'}
                        </p>
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                <button onClick={onView} className={`flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-3 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${darkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    <EyeIcon className="w-4 h-4" /> View
                </button>
                
                {!isAccepted && !isRejected && (
                    <>
                        <button title="Reject" onClick={onReject} className={`flex-1 md:flex-none justify-center flex p-3 rounded-2xl transition-all active:scale-95 ${darkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}><XMarkIcon className="w-5 h-5" /></button>
                        <button title="Accept" onClick={onAccept} className={`flex-1 md:flex-none justify-center flex p-3 rounded-2xl transition-all active:scale-95 ${darkMode ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}><CheckCircleIcon className="w-5 h-5" /></button>
                    </>
                )}

                {isAccepted && (
                    <>
                        {app.isRatedByEmployer ? (
                            <button disabled className={`flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest opacity-50 cursor-not-allowed ${darkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                <StarIconSolid className="w-4 h-4 text-amber-500" /> Rated
                            </button>
                        ) : (
                            <button onClick={onRate} className={`flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${darkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                <StarIconOutline className="w-4 h-4" /> Rate
                            </button>
                        )}
                        
                        <button onClick={onChat} className="flex-1 md:flex-none justify-center flex bg-blue-600 text-white p-3 rounded-2xl shadow-lg relative hover:bg-blue-500 transition-colors active:scale-95">
                            <ChatBubbleLeftRightIcon className="w-5 h-5" />
                            {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-bold px-1 min-w-[14px]">{unreadCount}</span>}
                        </button>
                    </>
                )}
                
                <div className={`w-px h-6 mx-1 ${darkMode ? 'bg-white/10' : 'bg-slate-300'}`}></div>
                <button title={isRejected ? "Delete Record" : "Delete Application"} onClick={(e) => { e.stopPropagation(); onDelete(); }} className={`flex-none p-3 rounded-2xl transition-all active:scale-95 group-hover:opacity-100 opacity-60 ${darkMode ? 'text-slate-500 hover:text-red-500 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}><TrashIcon className="w-5 h-5" /></button>
            </div>
        </div>
    );
}

export default function ApplicantsTab({
    receivedApplications, applicantSearch, setApplicantSearch, 
    handleUpdateApplicationStatus, handleDeleteApplication, 
    handleViewApplication, handleStartChatFromExternal, 
    conversations, currentUser, darkMode, setSelectedApplicantToRate, setIsRatingApplicantModalOpen
}) {
    
    // --- STYLES ---
    const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;
    const glassInput = `w-full bg-transparent border-none outline-none text-sm font-bold placeholder-slate-400 pl-10 pr-4 py-2.5 ${darkMode ? 'text-white' : 'text-slate-800'}`;

    // --- LOGIC ---
    const filteredApps = receivedApplications.filter(app => 
        app.applicantName.toLowerCase().includes(applicantSearch.toLowerCase()) || 
        app.jobTitle.toLowerCase().includes(applicantSearch.toLowerCase())
    );

    const pendingApplications = filteredApps.filter(app => app.status === 'pending');
    const acceptedApplications = filteredApps.filter(app => app.status === 'accepted');
    const rejectedApplications = filteredApps.filter(app => app.status === 'rejected' || app.status === 'withdrawn');

    return (
        <div className="animate-content space-y-10 mt-4 md:mt-8">
            {/* Search Bar */}
            <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm w-full md:w-96 ${glassPanel}`}>
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <input 
                        type="text" 
                        placeholder="Search applicant or job..." 
                        value={applicantSearch} 
                        onChange={(e) => setApplicantSearch(e.target.value)} 
                        className={glassInput} 
                    />
                </div>
            </div>

            {/* 1. Accepted Candidates Section (Now at the top) */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-blue-500" />
                    <h3 className="font-black text-sm uppercase tracking-[0.2em] text-blue-500 select-none cursor-default">
                        Accepted Candidates ({acceptedApplications.length})
                    </h3>
                    <div className="flex-1 h-px bg-blue-500/10"></div>
                </div>
                
                <div className="space-y-4">
                    {acceptedApplications.length > 0 ? (
                        acceptedApplications.map(app => (
                            <ApplicantCard 
                                key={app.id} 
                                app={app} 
                                darkMode={darkMode} 
                                isAccepted={true} 
                                onChat={() => handleStartChatFromExternal({ id: app.applicantId, name: app.applicantName, profilePic: app.applicantProfilePic || null })} 
                                onView={() => handleViewApplication(app)} 
                                onDelete={() => handleDeleteApplication(app.id)} 
                                unreadCount={conversations.find(c => c.chatId.includes(app.applicantId))?.[`unread_${currentUser?.uid}`] || 0} 
                                onRate={() => { setSelectedApplicantToRate(app); setIsRatingApplicantModalOpen(true); }} 
                            />
                        ))
                    ) : (
                        <div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none cursor-default">No accepted candidates found</p>
                        </div>
                    )}
                </div>
            </section>

            {/* 2. Pending Review Section (Now in the middle) */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <ClockIcon className="w-5 h-5 text-amber-500" />
                    <h3 className="font-black text-sm uppercase tracking-[0.2em] text-amber-500 select-none cursor-default">
                        Pending Review ({pendingApplications.length})
                    </h3>
                    <div className="flex-1 h-px bg-amber-500/10"></div>
                </div>
                
                <div className="space-y-4">
                    {pendingApplications.length > 0 ? (
                        pendingApplications.map(app => (
                            <ApplicantCard 
                                key={app.id} 
                                app={app} 
                                darkMode={darkMode} 
                                onAccept={() => handleUpdateApplicationStatus(app.id, 'accepted')} 
                                onReject={() => handleUpdateApplicationStatus(app.id, 'rejected')} 
                                onDelete={() => handleDeleteApplication(app.id)} 
                                onView={() => handleViewApplication(app)} 
                            />
                        ))
                    ) : (
                        <div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none cursor-default">No pending applications found</p>
                        </div>
                    )}
                </div>
            </section>

            {/* 3. Rejected / Withdrawn Section (Added to the bottom) */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <XMarkIcon className="w-5 h-5 text-red-500" />
                    <h3 className="font-black text-sm uppercase tracking-[0.2em] text-red-500 select-none cursor-default">
                        Rejected / Withdrawn ({rejectedApplications.length})
                    </h3>
                    <div className="flex-1 h-px bg-red-500/10"></div>
                </div>
                
                <div className="space-y-4">
                    {rejectedApplications.length > 0 ? (
                        rejectedApplications.map(app => (
                            <ApplicantCard 
                                key={app.id} 
                                app={app} 
                                darkMode={darkMode} 
                                isRejected={true}
                                onDelete={() => handleDeleteApplication(app.id)} 
                                onView={() => handleViewApplication(app)} 
                            />
                        ))
                    ) : (
                        <div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none cursor-default">No history found</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}