import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase/config"; 
import { EyeIcon, ChatBubbleLeftRightIcon, StarIcon as StarIconOutline, ArchiveBoxIcon, XMarkIcon, TrashIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

export default function ApplicationCard({ app, darkMode, onWithdraw, onArchive, onDelete, onView, onChat, unreadCount, isAccepted, isRejected, onRate, employerPic }) {
    
    const [liveEmployerPic, setLiveEmployerPic] = useState(null);

    useEffect(() => {
        let isMounted = true;
        if (app.employerId) {
            getDoc(doc(db, "employers", app.employerId))
                .then(snap => {
                    if (snap.exists() && isMounted) {
                        setLiveEmployerPic(snap.data().profilePic);
                    }
                })
                .catch(err => console.error("Error fetching live employer pic:", err));
        }
        return () => { isMounted = false; };
    }, [app.employerId]);

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
    const displayImage = liveEmployerPic || employerPic || app.employerLogo;

    return (
      <div className={`p-5 rounded-[2rem] border transition-all duration-300 relative group hover:-translate-y-1 flex flex-col backdrop-blur-xl bg-gradient-to-br ring-1 ring-inset h-[250px] ${theme.gradient} ${theme.glow} ${app.status === 'archived' ? 'opacity-80 hover:opacity-100' : ''}`}>
        
        <div className="flex justify-between items-start gap-4 shrink-0 mb-3">
           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl overflow-hidden shrink-0 shadow-inner border ${theme.iconWrapper}`}>
               {displayImage ? <img src={displayImage} alt={app.employerName} className="w-full h-full object-cover"/> : <span>{iconContent}</span>}
           </div>
           <div className="flex-1 min-w-0">
               <h4 className={`font-black text-lg leading-tight truncate ${theme.title}`} title={app.jobTitle}>{app.jobTitle}</h4>
               <p className={`text-[10px] font-black uppercase tracking-widest mt-1 truncate ${theme.subtitle}`} title={app.employerName}>{app.employerName}</p>
           </div>
        </div>
        
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
                       Awaiting Employer
                   </span>
               )}
            </div>

            {app.status === 'withdrawal_pending' && app.withdrawalReason && (
                <div className={`flex-1 overflow-y-auto hide-scrollbar p-2.5 rounded-xl border text-[10px] leading-relaxed font-medium italic ${darkMode ? 'bg-orange-500/10 border-orange-500/20 text-orange-200' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
                    <span className="font-bold uppercase tracking-wider text-[8px] block mb-1 opacity-70 not-italic">Reason for Withdrawal:</span>
                    "{app.withdrawalReason}"
                </div>
            )}
        </div>
        
        <div className={`flex flex-wrap items-center gap-2 pt-3 border-t shrink-0 ${theme.divider}`}>
            
            <button onClick={onView} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border backdrop-blur-md ${theme.buttonBase}`}>
                <EyeIcon className="w-4 h-4" /> View
            </button>
            
            {app.status === 'accepted' && (
              <>
                {app.isRatedByApplicant ? (
                    <button disabled className={`flex-none p-3 rounded-xl opacity-50 cursor-not-allowed border ${theme.buttonBase}`} title="Rated">
                        <StarIconSolid className="w-4 h-4 text-amber-500" />
                    </button>
                ) : (
                    <button onClick={onRate} className={`flex-none p-3 rounded-xl transition-all active:scale-95 border backdrop-blur-md ${theme.buttonBase}`} title="Rate Employer">
                        <StarIconOutline className="w-4 h-4" />
                    </button>
                )}

                <button onClick={onChat} className="flex-none bg-blue-600 text-white p-3 rounded-xl shadow-lg relative hover:bg-blue-500 transition-colors active:scale-95 border border-blue-500">
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[7px] font-bold">{unreadCount}</span>}
                </button>
              </>
            )}

            {(app.status === 'rejected' || app.status === 'withdrawn') && app.status !== 'archived' && onArchive ? (
                <button onClick={(e) => { e.stopPropagation(); onArchive(app.id); }} className={`flex-none p-3 rounded-xl transition-all active:scale-95 border backdrop-blur-md md:opacity-60 group-hover:opacity-100 ${theme.buttonBase}`} title="Archive Application">
                    <ArchiveBoxIcon className="w-4 h-4" />
                </button>
            ) : null}

            {/* Withdraw Action is now strictly PENDING only! */}
            {app.status === 'pending' && onWithdraw ? (
                <button onClick={(e) => { e.stopPropagation(); onWithdraw(); }} className={`flex-none p-3 rounded-xl transition-all active:scale-95 border backdrop-blur-md md:opacity-60 group-hover:opacity-100 ${theme.buttonBase} hover:bg-red-500 hover:text-white hover:border-red-500`} title="Withdraw Application">
                    <XMarkIcon className="w-4 h-4" />
                </button>
            ) : null}

            {app.status === 'archived' && onDelete && (
                <button onClick={(e) => { e.stopPropagation(); onDelete(app.id); }} className={`flex-none p-3 rounded-xl transition-all active:scale-95 border backdrop-blur-md hover:bg-red-500 hover:text-white hover:border-red-500 ${theme.buttonBase}`} title="Delete Permanently">
                    <TrashIcon className="w-4 h-4" />
                </button>
            )}

        </div>
      </div>
    );
}