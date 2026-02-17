import { useEffect, useRef } from "react";
import { PlusIcon, ChatBubbleLeftRightIcon, TrashIcon, ChevronLeftIcon, CpuChipIcon, PaperAirplaneIcon, PaperClipIcon, MegaphoneIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { BOT_FAQ } from "../../../utils/applicantConstants";

export default function SupportTab({ 
    supportTickets, activeSupportTicket, setActiveSupportTicket, isSupportOpen, setIsSupportOpen,
    ticketMessage, setTicketMessage, supportAttachment, setSupportAttachment, isSupportUploading,
    handleSendSupportMessage, handleSendFAQ, handleCloseSupportTicket, handleDeleteTicket, 
    handleSupportFileSelect, isBotTyping, darkMode, isMobile, auth 
}) {
    const ticketScrollRef = useRef(null);
    const supportFileRef = useRef(null);

    useEffect(() => {
        if (activeSupportTicket || isSupportOpen) {
            setTimeout(() => { ticketScrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, 100);
        }
    }, [activeSupportTicket, activeSupportTicket?.messages, isSupportOpen]);

    const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;

    return (
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 animate-content ${isMobile ? (isSupportOpen ? 'h-screen pb-0' : 'h-[calc(100vh-14rem)] pb-2') : 'h-[calc(100vh-10rem)]'}`}>
            {/* TICKET LIST */}
            <div className={`lg:col-span-1 rounded-[2.5rem] overflow-hidden flex flex-col ${glassPanel} ${(isMobile && isSupportOpen) ? 'hidden' : 'flex'} ${isMobile ? 'h-full mb-4' : 'h-full'}`}>
                <div className="p-4 md:p-6 border-b border-gray-500/10 flex justify-between items-center">
                    <div><h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>My Tickets</h3><p className="text-xs opacity-50 font-bold uppercase mt-1">{supportTickets.length} Total Requests</p></div>
                    <button onClick={() => { setActiveSupportTicket(null); setIsSupportOpen(true); }} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"><PlusIcon className="w-5 h-5"/></button>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">
                    {supportTickets.length > 0 ? (
                        supportTickets.map((ticket) => (
                            <div key={ticket.id} onClick={() => { setActiveSupportTicket(ticket); setIsSupportOpen(true); }} className={`p-4 rounded-2xl cursor-pointer transition-all border group relative ${activeSupportTicket?.id === ticket.id ? 'bg-blue-600/10 border-blue-500' : darkMode ? 'bg-white/5 border-transparent hover:bg-white/10' : 'bg-slate-100 border-transparent hover:bg-slate-200'}`}>
                                <div className="flex justify-between items-start mb-1"><h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>Request #{ticket.ticketId}</h4><span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${ticket.status === 'closed' ? 'bg-slate-500/20 text-slate-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{ticket.status || 'open'}</span></div>
                                <p className="text-xs opacity-50 truncate">{ticket.messages && ticket.messages.length > 0 ? ticket.messages[ticket.messages.length - 1].text : 'No messages'}</p>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteTicket(ticket.id); }} className="hidden lg:block absolute bottom-2 right-2 p-1.5 rounded-lg bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"><TrashIcon className="w-3 h-3"/></button>
                            </div>
                        ))
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-40"><ChatBubbleLeftRightIcon className="w-8 h-8 md:w-12 md:h-12 mb-2"/><p className="text-sm font-bold">No history yet</p><button onClick={() => setIsSupportOpen(true)} className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest">Contact Admin</button></div>
                    )}
                </div>
            </div>

            {/* CHAT AREA */}
            <div className={`${isMobile && isSupportOpen ? 'fixed inset-0 z-[60] rounded-none border-0' : 'lg:col-span-2 rounded-[2.5rem] border flex flex-col overflow-hidden relative'} ${(isMobile && !isSupportOpen) ? 'hidden' : 'flex flex-col'} ${glassPanel} ${isMobile && isSupportOpen ? 'bg-slate-900' : ''}`}>
                <div className="p-4 border-b border-gray-500/10 flex justify-between items-center bg-white/5 backdrop-blur-sm z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        {isMobile && (<button onClick={() => setIsSupportOpen(false)} className="p-2 -ml-2 rounded-full hover:bg-white/10"><ChevronLeftIcon className="w-6 h-6"/></button>)}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md"><CpuChipIcon className="w-6 h-6"/></div>
                        <div><h4 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{activeSupportTicket ? `Request #${activeSupportTicket.ticketId}` : "New Request"}</h4><p className="text-xs opacity-50 font-bold uppercase flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Admin & Bot Active</p></div>
                    </div>
                    <div className="flex items-center gap-2">{activeSupportTicket && activeSupportTicket.status !== 'closed' && (<button onClick={() => handleCloseSupportTicket(activeSupportTicket.id)} className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-red-500 hover:text-white transition-all">Close Request</button>)}</div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 no-scrollbar">
                    {activeSupportTicket ? (
                        activeSupportTicket.messages && activeSupportTicket.messages.length > 0 ? (
                            activeSupportTicket.messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-sm shadow-blue-500/20 shadow-lg' : `rounded-tl-sm ${darkMode ? 'bg-white/10 text-white' : 'bg-white text-slate-800 shadow-sm'}`}`}>
                                        {msg.imageUrl && (<img src={msg.imageUrl} alt="Attachment" className="rounded-lg mb-2 max-h-48 w-full object-cover border border-white/20"/>)}
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                </div>
                            ))
                        ) : null
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-30 text-center px-4"><MegaphoneIcon className="w-16 h-16 mb-4"/><p className="font-bold text-lg">New Support Message</p><p className="text-xs mt-2 max-w-xs">Ask about Verification, Job Applications, or Account Management.</p></div>
                    )}
                    {isBotTyping && (<div className="flex justify-start animate-in fade-in slide-in-from-bottom-2"><div className={`p-4 rounded-2xl rounded-tl-sm flex items-center gap-1 ${darkMode ? 'bg-white/10' : 'bg-white shadow-sm'}`}><div className="w-2 h-2 rounded-full bg-slate-400 typing-dot"></div><div className="w-2 h-2 rounded-full bg-slate-400 typing-dot"></div><div className="w-2 h-2 rounded-full bg-slate-400 typing-dot"></div></div></div>)}
                    <div ref={ticketScrollRef} />
                </div>

                <div className="p-4 border-t border-gray-500/10 bg-white/5 backdrop-blur-sm shrink-0 pb-10 lg:pb-4">
                    {activeSupportTicket?.status === 'closed' ? (
                        <div className="text-center p-2 text-[10px] font-black uppercase opacity-50 italic">This request is closed. Start a new one to continue.</div>
                    ) : (
                        <>
                            <div className="flex gap-2 overflow-x-auto pb-3 mb-2 hide-scrollbar">{BOT_FAQ.map((faq) => ( <button key={faq.id} onClick={() => handleSendFAQ(faq)} className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 whitespace-nowrap border ${darkMode ? 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600'}`}>{faq.question}</button> ))}</div>
                            {supportAttachment && (<div className="mb-2 p-2 bg-blue-500/10 rounded-lg flex items-center justify-between animate-in zoom-in-95"><span className="text-xs text-blue-500 truncate max-w-[200px] font-bold">{supportAttachment.name}</span><button onClick={() => setSupportAttachment(null)}><XMarkIcon className="w-4 h-4 text-blue-500"/></button></div>)}
                            <form onSubmit={handleSendSupportMessage} className="flex gap-2 items-center">
                                <input type="file" ref={supportFileRef} onChange={handleSupportFileSelect} className="hidden" accept="image/*" />
                                <button type="button" onClick={() => supportFileRef.current.click()} className={`p-3 rounded-xl transition-colors ${darkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'}`}><PaperClipIcon className="w-5 h-5"/></button>
                                <input type="text" value={ticketMessage} onChange={(e) => setTicketMessage(e.target.value)} placeholder="Type your message..." className={`flex-1 p-3 rounded-xl border-none outline-none text-sm font-medium ${darkMode ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-white text-slate-800 shadow-inner'}`} />
                                <button type="submit" disabled={isSupportUploading} className="p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50">{isSupportUploading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <PaperAirplaneIcon className="w-5 h-5"/>}</button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}