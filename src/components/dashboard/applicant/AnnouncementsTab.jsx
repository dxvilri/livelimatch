import { MegaphoneIcon, CalendarDaysIcon, DocumentTextIcon, XMarkIcon, EyeIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

// --- FORMATTER HELPER ---
const formatDateTime = (createdAt, fallbackDate) => {
    if (createdAt?.toDate) {
        const dateObj = createdAt.toDate();
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        return `${dateStr} • ${timeStr}`;
    }
    return fallbackDate || "Recent";
};

// --- GLOSSY ANNOUNCEMENT CARD COMPONENT ---
const AnnouncementCard = ({ ann, darkMode, onClick }) => {
    const theme = {
        gradient: darkMode ? 'from-blue-600/20 to-blue-900/40 border-blue-500/30' : 'from-blue-50 to-blue-200/60 border-blue-300 shadow-[0_8px_20px_rgba(59,130,246,0.15)] ring-white/60',
        glow: darkMode ? 'hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] hover:border-blue-400/50' : 'hover:shadow-[0_15px_30px_rgba(59,130,246,0.3)] hover:border-blue-400',
        iconWrapper: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20',
        title: darkMode ? 'text-white' : 'text-blue-950',
        subtitle: darkMode ? 'text-blue-300' : 'text-blue-700',
        buttonBase: darkMode ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border-blue-500/20' : 'bg-white/60 hover:bg-white text-blue-800 border-blue-200 shadow-sm',
        divider: darkMode ? 'border-blue-500/20' : 'border-blue-200',
        bgIcon: darkMode ? 'text-blue-400 opacity-10' : 'text-blue-600 opacity-5'
    };

    const displayDateTime = formatDateTime(ann.createdAt, ann.date);

    return (
        <div className={`p-5 rounded-[2rem] border transition-all duration-300 relative group hover:-translate-y-1 flex flex-col backdrop-blur-xl bg-gradient-to-br ring-1 ring-inset h-[250px] ${theme.gradient} ${theme.glow}`}>
            
            {/* Background watermark icon */}
            <div className={`absolute -right-4 bottom-0 md:-right-4 md:-bottom-4 rotate-12 transform group-hover:scale-110 transition-transform duration-500 pointer-events-none ${theme.bgIcon}`}>
                <MegaphoneIcon className="w-40 h-40 md:w-48 md:h-48" />
            </div>

            {/* --- TOP SECTION (Pinned) --- */}
            <div className="flex justify-between items-start gap-4 shrink-0 mb-3 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner border ${theme.iconWrapper}`}>
                    <MegaphoneIcon className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className={`font-black text-lg leading-tight line-clamp-2 ${theme.title}`} title={ann.title}>
                        {ann.title}
                    </h4>
                    <p className={`text-[9px] font-black uppercase tracking-widest mt-1.5 truncate flex items-center gap-1 ${theme.subtitle}`}>
                        <CalendarDaysIcon className="w-3 h-3 shrink-0" /> {displayDateTime}
                    </p>
                </div>
            </div>

            {/* --- MIDDLE SECTION (Flexible, Min-Height 0, Scrollable Content) --- */}
            <div className="flex-1 flex flex-col min-h-0 gap-2 mb-3 relative z-10">
                {/* Scrolling Content Block */}
                <div className={`flex-1 overflow-y-auto hide-scrollbar p-2.5 rounded-xl border text-[10px] leading-relaxed font-medium italic ${darkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                    <span className="font-bold uppercase tracking-wider text-[8px] block mb-0.5 opacity-70 not-italic">Context:</span>
                    "{ann.body}"
                </div>
            </div>

            {/* --- BOTTOM SECTION (Pinned) --- */}
            <div className={`flex flex-wrap items-center gap-2 pt-3 border-t shrink-0 mt-auto relative z-10 ${theme.divider}`}>
                <button onClick={onClick} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border backdrop-blur-md ${theme.buttonBase}`}>
                    <EyeIcon className="w-4 h-4" /> Read More
                </button>
            </div>
        </div>
    );
};


export default function AnnouncementsTab({ announcements, darkMode }) {
    const [selectedAnnounce, setSelectedAnnounce] = useState(null);

    // Lock background scrolling when modal is open
    useEffect(() => {
        if (selectedAnnounce) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [selectedAnnounce]);

    const modalThemeBg = darkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900';

    return (
        <div className="animate-content">

            {/* Grid of Browsable Announcement Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 pt-2 pb-10">
                {announcements.length === 0 ? (
                    <div className="col-span-full text-center py-20">
                        <MegaphoneIcon className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                        <p className={`font-black uppercase text-xs tracking-[0.3em] select-none cursor-default ${darkMode ? 'opacity-40' : 'opacity-50 text-slate-500'}`}>No announcements yet</p>
                    </div>
                ) : (
                    announcements.map(ann => (
                        <AnnouncementCard 
                            key={ann.id} 
                            ann={ann} 
                            darkMode={darkMode} 
                            onClick={() => setSelectedAnnounce(ann)} 
                        />
                    ))
                )}
            </div>

            {/* Read More Modal Overlay using createPortal to float above everything */}
            {selectedAnnounce && createPortal(
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedAnnounce(null)}>
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className={`relative w-full max-w-md md:max-w-2xl p-6 sm:p-8 rounded-3xl shadow-2xl border animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh] ${modalThemeBg}`}
                    >
                        {/* Close Button */}
                        <button onClick={() => setSelectedAnnounce(null)} className={`absolute top-4 right-4 z-20 p-2 rounded-full transition-colors ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                            <XMarkIcon className="w-5 h-5"/>
                        </button>

                        {/* Sticky Header Section */}
                        <div className="shrink-0 mb-5 border-b pb-5 border-slate-200 dark:border-white/10">
                            <div className="flex items-center gap-4 mb-5">
                                <div className={`p-3 md:p-4 rounded-2xl shrink-0 ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                    <MegaphoneIcon className="w-8 h-8 md:w-10 md:h-10 -rotate-12"/>
                                </div>
                                <div className="flex flex-col justify-center">
                                    <span className={`text-[12px] font-black uppercase tracking-widest opacity-60 flex items-center gap-1.5`}>
                                        <CalendarDaysIcon className="w-4 h-4" />
                                        {formatDateTime(selectedAnnounce.createdAt, selectedAnnounce.date)}
                                    </span>
                                </div>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black leading-tight pr-8">{selectedAnnounce.title}</h2>
                        </div>

                        {/* Scrollable Content Section */}
                        <div className="flex-1 overflow-y-auto hide-scrollbar -mx-2 px-2">
                            <div className={`p-5 sm:p-6 rounded-2xl min-h-full ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                <div className="flex items-center gap-2 mb-4 opacity-50">
                                    <DocumentTextIcon className="w-5 h-5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Details</span>
                                </div>
                                <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-medium opacity-90">
                                    {selectedAnnounce.body}
                                </p>
                            </div>
                        </div>

                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}