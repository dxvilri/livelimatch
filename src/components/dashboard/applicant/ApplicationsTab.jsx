import { useState } from "react";
import { MagnifyingGlassIcon, ClockIcon, CheckCircleIcon, XMarkIcon, ArrowUturnLeftIcon, ArchiveBoxIcon } from "@heroicons/react/24/outline";
import ApplicationCard from "./ApplicationCard";

export default function ApplicationsTab({
    myApplications, applicationSearch, setApplicationSearch,
    handleWithdrawApplication, handleArchiveApplication, handleDeleteApplication, handleViewApplicationDetails,
    handleStartChatFromExternal, conversations, currentUser, darkMode, onRateEmployer
}) {
    const [showArchived, setShowArchived] = useState(false);

    const filteredApplications = myApplications.filter(app => 
        app.jobTitle.toLowerCase().includes(applicationSearch.toLowerCase()) || 
        (app.employerName && app.employerName.toLowerCase().includes(applicationSearch.toLowerCase()))
    );
    
    const archivedApps = filteredApplications.filter(app => app.status === 'archived');
    const acceptedApps = filteredApplications.filter(app => app.status === 'accepted');
    const pendingApps = filteredApplications.filter(app => app.status === 'pending');
    const withdrawalRequests = filteredApplications.filter(app => app.status === 'withdrawal_pending');
    const rejectedWithdrawnApps = filteredApplications.filter(app => app.status === 'rejected' || app.status === 'withdrawn');

    const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;
    const glassInput = `w-full bg-transparent border-none outline-none text-sm font-bold placeholder-slate-400 ${darkMode ? 'text-white' : 'text-slate-800'}`;

    return (
        <div className="animate-content space-y-10">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm w-full md:w-96 ${glassPanel}`}>
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search applications..." 
                            value={applicationSearch} 
                            onChange={(e) => setApplicationSearch(e.target.value)} 
                            className={glassInput + " pl-9 pr-4 py-2.5"} 
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
                        <h3 className="font-black text-sm uppercase tracking-[0.2em] text-slate-500 select-none cursor-default">Archived Records ({archivedApps.length})</h3>
                        <div className="flex-1 h-px bg-slate-500/20"></div>
                    </div>
                    {archivedApps.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {archivedApps.map(app => (
                                <ApplicationCard
                                    key={app.id} app={app} darkMode={darkMode}
                                    onView={() => handleViewApplicationDetails(app)}
                                    onDelete={() => handleDeleteApplication(app.id)} 
                                />
                            ))}
                        </div>
                    ) : (
                        <div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none cursor-default">No archived records found</p>
                        </div>
                    )}
                </section>
            ) : (
                <div className="space-y-10 animate-in fade-in duration-300">
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <CheckCircleIcon className="w-5 h-5 text-blue-500" />
                            <h3 className="font-black text-sm uppercase tracking-[0.2em] text-blue-500 select-none cursor-default">Accepted ({acceptedApps.length})</h3>
                            <div className="flex-1 h-px bg-blue-500/20"></div>
                        </div>
                        {acceptedApps.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {acceptedApps.map(app => (
                                    <ApplicationCard
                                        key={app.id} app={app} darkMode={darkMode} isAccepted={true}
                                        onChat={() => handleStartChatFromExternal({ id: app.employerId, name: app.employerName || "Employer", profilePic: app.employerLogo || null })}
                                        onView={() => handleViewApplicationDetails(app)}
                                        unreadCount={conversations.find(c => c.chatId.includes(app.employerId))?.[`unread_${currentUser.uid}`] || 0}
                                        onRate={() => onRateEmployer(app)}
                                        /* REMOVED onWithdraw HERE */
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none cursor-default">No accepted applications</p>
                            </div>
                        )}
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <ClockIcon className="w-5 h-5 text-orange-500" />
                            <h3 className="font-black text-sm uppercase tracking-[0.2em] text-orange-500 select-none cursor-default">Pending Review ({pendingApps.length})</h3>
                            <div className="flex-1 h-px bg-orange-500/20"></div>
                        </div>
                        {pendingApps.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {pendingApps.map(app => (
                                    <ApplicationCard
                                        key={app.id} app={app} darkMode={darkMode}
                                        onWithdraw={() => handleWithdrawApplication(app)}
                                        onView={() => handleViewApplicationDetails(app)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none cursor-default">No pending applications</p>
                            </div>
                        )}
                    </section>
                    
                    {withdrawalRequests.length > 0 && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <ArrowUturnLeftIcon className="w-5 h-5 text-orange-500" />
                                <h3 className="font-black text-sm uppercase tracking-[0.2em] text-orange-500 select-none cursor-default">Withdrawal Requested ({withdrawalRequests.length})</h3>
                                <div className="flex-1 h-px bg-orange-500/20"></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {withdrawalRequests.map(app => (
                                    <ApplicationCard
                                        key={app.id} app={app} darkMode={darkMode}
                                        onView={() => handleViewApplicationDetails(app)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="space-y-6 opacity-80 hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-3">
                            <XMarkIcon className="w-5 h-5 text-red-500" />
                            <h3 className="font-black text-sm uppercase tracking-[0.2em] text-red-500 select-none cursor-default">Rejected / Withdrawn ({rejectedWithdrawnApps.length})</h3>
                            <div className="flex-1 h-px bg-red-500/20"></div>
                        </div>
                        {rejectedWithdrawnApps.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {rejectedWithdrawnApps.map(app => (
                                    <ApplicationCard
                                        key={app.id} app={app} darkMode={darkMode} isRejected={true}
                                        onArchive={() => handleArchiveApplication(app.id)}
                                        onView={() => handleViewApplicationDetails(app)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none cursor-default">No rejected or withdrawn applications</p>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}