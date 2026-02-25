import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase/config"; // Added db import to fetch live data
import { CheckCircleIcon, ClockIcon, XMarkIcon, EyeIcon, ChatBubbleLeftRightIcon, StarIcon as StarIconOutline, TrashIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

export default function ApplicationCard({ app, darkMode, onWithdraw, onView, onChat, unreadCount, isAccepted, isRejected, onRate, employerPic }) {
    
    // State to hold the live picture
    const [liveEmployerPic, setLiveEmployerPic] = useState(null);

    // Fetch the absolute latest employer profile picture when the card loads
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

    const borderColorClass = isAccepted ? 'border-l-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : isRejected ? 'border-l-red-500 opacity-80' : 'border-l-amber-500';
    const iconBgClass = isAccepted ? 'bg-blue-500/10' : isRejected ? 'bg-red-500/10' : 'bg-amber-500/10';
    const iconContent = isAccepted ? '🤝' : isRejected ? '❌' : '📄';

    // Prioritize Live DB Pic -> Chat Pic -> Snapshot Pic
    const displayImage = liveEmployerPic || employerPic || app.employerLogo;

    return (
      <div className={`p-4 md:p-8 rounded-[2.5rem] border-l-8 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 transition-all relative overflow-hidden group hover:shadow-lg backdrop-blur-md ${darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-white/60 border-white/40 shadow-md'} ${borderColorClass}`}>
        <div className="flex items-start gap-4 md:gap-5">
          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-[1.2rem] flex items-center justify-center text-xl md:text-2xl shadow-inner select-none overflow-hidden shrink-0 ${iconBgClass}`}>
               {displayImage ? (
                   <img src={displayImage} alt={app.employerName} className="w-full h-full object-cover"/>
               ) : (
                   <span>{iconContent}</span>
               )}
          </div>
          <div>
              <div className="flex items-center gap-2">
                  <h4 className={`font-black text-base md:text-lg leading-none select-none cursor-default ${darkMode ? 'text-white' : 'text-slate-900'}`}>{app.jobTitle}</h4>
              </div>
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 md:mt-2 select-none cursor-default truncate max-w-[200px]">{app.employerName}</p>
              {isRejected && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-2">{app.status === 'withdrawn' ? 'Withdrawn' : 'Rejected'}</p>}
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
          <button onClick={onView} className={`flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-3 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${darkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><EyeIcon className="w-4 h-4" /> View</button>
            
          {isAccepted && (
            <>
              {app.isRatedByApplicant ? (
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
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[7px] font-bold">{unreadCount}</span>}
              </button>
            </>
          )}

          <div className={`w-px h-6 mx-1 ${darkMode ? 'bg-white/10' : 'bg-slate-300'}`}></div>
          <button title={isRejected ? "Delete Record" : "Withdraw Application"} onClick={(e) => { e.stopPropagation(); onWithdraw(); }} className={`flex-none p-3 rounded-2xl transition-all active:scale-95 group-hover:opacity-100 opacity-60 ${darkMode ? 'text-slate-500 hover:text-red-500 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}><TrashIcon className="w-5 h-5" /></button>
        </div>
      </div>
    );
}