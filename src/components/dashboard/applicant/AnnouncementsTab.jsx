import { MegaphoneIcon, CalendarDaysIcon, DocumentTextIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

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

    // --- SHARED CARD THEME (Matches Job Cards) ---
    const theme = darkMode ? {
        title: 'text-blue-400',
        date: 'text-slate-400',
        badge: 'bg-blue-400/10 text-blue-400 border border-blue-400/30',
        cardBg: 'bg-slate-900 border border-white/10 shadow-sm',
        hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(96,165,250,0.25)]',
        bgIcon: 'text-blue-400 opacity-10',
        btnPrimary: 'bg-blue-400 text-slate-900 hover:bg-blue-500',
        modalBg: 'bg-slate-900 border-white/10 text-white'
    } : {
        title: 'text-white drop-shadow-md', 
        date: 'text-blue-100', 
        badge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]', 
        cardBg: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] ring-1 ring-inset ring-white/40',
        hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(37,99,235,0.5)]',
        bgIcon: 'text-white opacity-10',
        btnPrimary: 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg active:scale-95',
        modalBg: 'bg-white border-slate-200 text-slate-900'
    };

    return (
        <div className="animate-content">

            {/* Grid of Browserable Announcement Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 pt-2 pb-10">
                {announcements.length === 0 ? (
                    <div className="col-span-full text-center py-20">
                        <MegaphoneIcon className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                        <p className={`font-black uppercase text-xs tracking-[0.3em] select-none cursor-default ${darkMode ? 'opacity-40' : 'opacity-50 text-slate-500'}`}>No announcements yet</p>
                    </div>
                ) : (
                    announcements.map(ann => (
                        <div 
                            key={ann.id} 
                            onClick={() => setSelectedAnnounce(ann)}
                            className={`relative p-5 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 ${theme.hoverShadow} cursor-pointer flex flex-col justify-between min-h-[220px] ${theme.cardBg} w-full`}
                        >
                            {/* Large Background Icon */}
                            <div className={`absolute -right-4 bottom-0 md:-right-4 md:-bottom-4 rotate-12 transform group-hover:scale-110 transition-transform duration-500 pointer-events-none ${theme.bgIcon}`}>
                                <MegaphoneIcon className="w-40 h-40 md:w-48 md:h-48" />
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                
                                {/* Title */}
                                <div className="flex justify-between items-start gap-4 mb-2">
                                    <h3 className={`font-black text-xl leading-tight line-clamp-2 pt-1 ${theme.title}`}>{ann.title}</h3>
                                </div>
                                
                                {/* Date */}
                                <div className={`flex items-center gap-1.5 mb-4 ${theme.date}`}>
                                    <CalendarDaysIcon className="w-4 h-4 shrink-0" />
                                    <p className="text-[11px] font-bold uppercase tracking-wide opacity-80 truncate">{ann.date || "Recent"}</p>
                                </div>

                                {/* Badges */}
                                <div className="flex flex-wrap items-center gap-2 mb-6">
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide flex items-center gap-1 shadow-sm ${theme.badge}`}>
                                        <MegaphoneIcon className="w-3 h-3" />
                                        Announcement
                                    </span>
                                </div>

                                {/* Body Snippet & Action */}
                                <div className={`mt-auto pt-4 border-t flex flex-col gap-3 ${darkMode ? 'border-white/20' : 'border-white/20'}`}>
                                    <p className={`text-xs line-clamp-2 opacity-80 font-medium ${darkMode ? 'text-slate-300' : 'text-blue-50'}`}>
                                        {ann.body}
                                    </p>
                                    <div className="flex items-center justify-end mt-2">
                                        <button className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${theme.btnPrimary}`}>
                                            Read More
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Read More Modal Overlay using createPortal to float above everything */}
            {selectedAnnounce && createPortal(
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedAnnounce(null)}>
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className={`relative w-full max-w-md md:max-w-2xl p-6 sm:p-8 rounded-3xl shadow-2xl border animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh] ${theme.modalBg}`}
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
                                <div className="flex flex-col">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                        Announcement
                                    </span>
                                    <span className={`text-[11px] font-bold uppercase tracking-wide opacity-60 flex items-center gap-1 mt-0.5`}>
                                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                                        {selectedAnnounce.date || "Recent"}
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