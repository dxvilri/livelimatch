import { useState } from "react";
import { MagnifyingGlassIcon, ClockIcon, CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import ApplicationCard from "./ApplicationCard";

export default function ApplicationsTab({ 
    myApplications, conversations, auth, handleWithdrawApplication, 
    handleDeleteApplication, handleViewApplicationDetails, 
    handleStartChatFromExternal, darkMode, 
    setSelectedEmployerToRate, setIsRatingEmployerModalOpen 
}) {
    const [applicationSearch, setApplicationSearch] = useState("");

    const filteredApplications = myApplications.filter(app => app.jobTitle.toLowerCase().includes(applicationSearch.toLowerCase()) || (app.employerName && app.employerName.toLowerCase().includes(applicationSearch.toLowerCase())));
    const pendingApplications = filteredApplications.filter(app => app.status === 'pending');
    const acceptedApplications = filteredApplications.filter(app => app.status === 'accepted');
    const rejectedApplications = filteredApplications.filter(app => app.status === 'rejected' || app.status === 'withdrawn');

    const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;
    const glassInput = `w-full bg-transparent border-none outline-none text-sm font-bold placeholder-slate-400 ${darkMode ? 'text-white' : 'text-slate-800'}`;

    return (
        <div className="animate-content space-y-10">
            <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm w-full md:w-96 ${glassPanel}`}>
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Search applications..." value={applicationSearch} onChange={(e) => setApplicationSearch(e.target.value)} className={glassInput + " pl-9 pr-4 py-2.5"} />
                </div>
            </div>

            <section className="space-y-6">
                <div className="flex items-center gap-3"><ClockIcon className="w-5 h-5 text-amber-500" /><h3 className="font-black text-sm uppercase tracking-[0.2em] text-amber-500 select-none cursor-default">Pending Review ({pendingApplications.length})</h3><div className="flex-1 h-px bg-amber-500/10"></div></div>
                <div className="space-y-4">
                    {pendingApplications.length > 0 ? pendingApplications.map(app => (
                        <ApplicationCard key={app.id} app={app} darkMode={darkMode} onWithdraw={() => handleWithdrawApplication(app.id)} onView={() => handleViewApplicationDetails(app)} />
                    )) : (<div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none cursor-default">No pending applications</p></div>)}
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-blue-500" /><h3 className="font-black text-sm uppercase tracking-[0.2em] text-blue-500 select-none cursor-default">Accepted Applications ({acceptedApplications.length})</h3><div className="flex-1 h-px bg-blue-500/10"></div></div>
                <div className="space-y-4">
                    {acceptedApplications.length > 0 ? acceptedApplications.map(app => (
                        <ApplicationCard 
                            key={app.id} app={app} darkMode={darkMode} isAccepted={true}
                            onChat={() => handleStartChatFromExternal({ id: app.employerId, name: app.employerName || "Employer", profilePic: app.employerLogo || null })}
                            onView={() => handleViewApplicationDetails(app)}
                            unreadCount={conversations.find(c => c.chatId.includes(app.employerId))?.[`unread_${auth.currentUser.uid}`] || 0}
                            onRate={() => { setSelectedEmployerToRate(app); setIsRatingEmployerModalOpen(true); }}
                            onWithdraw={() => handleWithdrawApplication(app.id)} 
                        />
                    )) : (<div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none cursor-default">No accepted applications</p></div>)}
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-3"><XMarkIcon className="w-5 h-5 text-red-500" /><h3 className="font-black text-sm uppercase tracking-[0.2em] text-red-500 select-none cursor-default">Rejected / Withdrawn ({rejectedApplications.length})</h3><div className="flex-1 h-px bg-red-500/10"></div></div>
                <div className="space-y-4">
                    {rejectedApplications.length > 0 ? rejectedApplications.map(app => (
                        <ApplicationCard 
                            key={app.id} app={app} darkMode={darkMode} isRejected={true}
                            onWithdraw={() => handleDeleteApplication(app.id)}
                            onView={() => handleViewApplicationDetails(app)}
                        />
                    )) : (<div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none cursor-default">No history found</p></div>)}
                </div>
            </section>
        </div>
    );
}