import { useState, useRef, useEffect } from "react";
import { MagnifyingGlassIcon, ChatBubbleLeftRightIcon, ChevronLeftIcon, EllipsisHorizontalIcon, ChevronDownIcon, XMarkIcon, PaperClipIcon, PaperAirplaneIcon, PhotoIcon, DocumentIcon, ChatBubbleOvalLeftEllipsisIcon, TrashIcon } from "@heroicons/react/24/outline";
import MessageBubble from "../../MessageBubble";

export default function MessagesTab({ 
    chatStatus, unsendMessage, deleteChat, togglePinMessage, myProfileImage,
    isMobile, activeChat, conversations, openChat, closeChat, sendMessage, messages, setActiveChat, currentUser, adminUser, darkMode, setLightboxUrl, onMinimize, isChatMinimized, setIsChatMinimized, isBubbleVisible, setIsBubbleVisible, openBubbles, setOpenBubbles, activeBubbleView, setActiveBubbleView, markConversationAsRead, bubbleSearch, setBubbleSearch, isDesktopInboxVisible, setIsDesktopInboxVisible, chatSearch, setChatSearch, scrollRef, formatTime, getAvatarUrl, isChatOptionsOpen, setIsChatOptionsOpen
}) {
    const [activeMenuId, setActiveMenuId] = useState(null); 
    const [menuPosition, setMenuPosition] = useState('top');

    const [newMessage, setNewMessage] = useState("");
    const [attachment, setAttachment] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const chatFileRef = useRef(null);
    
    useEffect(() => {
        setIsChatOptionsOpen(false);
        setActiveMenuId(null);
        setReplyingTo(null);
    }, [activeChat?.id, setIsChatOptionsOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !attachment) || isUploading) return;
        
        setIsUploading(true);
        try {
            await sendMessage(newMessage, attachment, replyingTo);
            setNewMessage("");
            setAttachment(null);
            setReplyingTo(null);
            if (chatFileRef.current) chatFileRef.current.value = "";
        } catch (err) {
            console.error("Error sending message:", err);
        } finally {
            setIsUploading(false);
        }
    };

    const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;
    const filteredChats = conversations.filter(c => { const otherId = c.participants?.find(p => p !== currentUser?.uid); if (adminUser && otherId === adminUser.id) return false; const name = c.names?.[otherId] || "User"; return name.toLowerCase().includes(chatSearch.toLowerCase()); });
    
    return (
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 animate-content ${isMobile ? (activeChat ? 'h-screen pb-0' : 'h-[calc(100vh-14rem)] pb-2') : 'h-[calc(100vh-10rem)]'}`}>
            <div className={`lg:col-span-1 rounded-[2.5rem] overflow-hidden flex flex-col ${glassPanel} ${(isMobile && activeChat) ? 'hidden' : 'flex'} ${isMobile ? 'h-full mb-4' : 'h-full'}`}>
                <div className="p-4 md:p-6 border-b border-gray-500/10 shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>Messages</h3>
                    </div>
                    <div className={`flex items-center p-1.5 rounded-2xl border transition-all ${darkMode ? 'bg-slate-800 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                        <MagnifyingGlassIcon className="w-4 h-4 ml-2 text-slate-400" />
                        <input value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search chats..." className="bg-transparent border-none outline-none text-xs p-2 w-full font-bold" />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
                    {filteredChats.length > 0 ? (
                        filteredChats.map(c => {
                            const otherId = c.participants.find(p => p !== currentUser.uid);
                            const name = c.names?.[otherId] || "User"; 
                            const otherPic = c.profilePics?.[otherId];
                            const unread = c[`unread_${currentUser.uid}`] || 0;
                            const isActive = activeChat?.id === otherId;

                            return (
                                <button key={c.chatId} onClick={() => openChat({ id: otherId, name, profilePic: otherPic })} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all relative group ${isActive ? 'bg-blue-600/10 border-blue-500 border' : darkMode ? 'hover:bg-white/5 border-transparent border' : 'hover:bg-slate-100 border-transparent border'}`}>
                                    <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-black shrink-0 overflow-hidden ${isActive ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent' : (darkMode ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600')}`}>
                                        {otherPic ? <img src={otherPic} alt={name} className="w-full h-full object-cover" /> : name.charAt(0)}
                                    </div>
                                    <div className="flex-1 text-left overflow-hidden">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`font-black text-sm truncate ${isActive ? 'text-blue-500' : darkMode ? 'text-white' : 'text-slate-900'}`}>{name}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className={`text-xs truncate max-w-[85%] font-medium ${unread > 0 ? 'text-blue-500 font-bold' : 'opacity-60'}`}>{c.lastMessage}</span>
                                            {unread > 0 && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>}
                                        </div>
                                    </div>
                                </button>
                            )
                        })
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-40 h-full py-20">
                            <ChatBubbleOvalLeftEllipsisIcon className="w-12 h-12 mb-2"/>
                            <p className="text-sm font-bold">No chats found</p>
                        </div>
                    )}
                </div>
            </div>

            <div className={`${isMobile && activeChat ? 'fixed inset-0 z-[60] rounded-none border-0' : 'lg:col-span-2 rounded-[2.5rem] border flex flex-col overflow-hidden relative'} ${(isMobile && !activeChat) ? 'hidden' : 'flex flex-col'} ${glassPanel} ${isMobile && activeChat ? 'bg-slate-900' : ''}`}>
                {activeChat ? (
                    <>
                        <div className="p-4 border-b border-gray-500/10 flex justify-between items-center bg-white/5 backdrop-blur-sm z-50 shrink-0 relative">
                            <div className="flex items-center gap-3">
                                {isMobile && (
                                    <button onClick={() => closeChat()} className="p-2 -ml-2 rounded-full hover:bg-white/10"><ChevronLeftIcon className="w-6 h-6"/></button>
                                )}
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md overflow-hidden">
                                    {activeChat.profilePic ? <img src={activeChat.profilePic} className="w-full h-full object-cover" alt="chat-pfp"/> : activeChat.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{activeChat.name}</h4>
                                    <p className="text-xs opacity-50 font-bold uppercase flex items-center gap-1">
                                    <span className={`w-2 h-2 rounded-full ${chatStatus?.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span> 
                                    {chatStatus?.text || (chatStatus?.isOnline ? 'Active Now' : 'Offline')}
                                    </p>
                                </div>
                            </div>

                            <div className="relative">
                                <button onClick={() => setIsChatOptionsOpen(!isChatOptionsOpen)} className={`p-2.5 rounded-xl transition-colors ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}><EllipsisHorizontalIcon className="w-6 h-6 opacity-50"/></button>
                                {isChatOptionsOpen && (
                                    <div className={`absolute right-0 top-14 w-60 rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200 z-50 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                        <div className="p-2 space-y-1">
                                            <button onClick={onMinimize} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-bold text-xs uppercase tracking-wider transition-colors ${darkMode ? 'hover:bg-white/5 text-blue-400' : 'hover:bg-blue-50 text-blue-500'}`}><ChevronDownIcon className="w-4 h-4" /> Minimize to Bubble</button>
                                            <div className={`h-px my-1 ${darkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            <button onClick={closeChat} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-bold text-xs uppercase tracking-wider transition-colors ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}><XMarkIcon className="w-4 h-4" /> Close Chat</button>
                                            <button onClick={() => { setIsChatOptionsOpen(false); if(deleteChat) deleteChat(activeChat.id); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-bold text-xs uppercase tracking-wider transition-colors ${darkMode ? 'hover:bg-white/5 text-red-400' : 'hover:bg-red-50 text-red-500'}`}><TrashIcon className="w-4 h-4" /> Delete Conversation</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 no-scrollbar" onClick={() => {setIsChatOptionsOpen(false); setActiveMenuId(null);}}>
                            {messages.map((msg, index) => {
                                const isMe = msg.senderId === currentUser.uid;
                                const myPic = myProfileImage || currentUser?.photoURL || currentUser?.profilePic || null;
                                const otherPic = activeChat?.profilePic || getAvatarUrl(activeChat) || null;
                                
                                const currentConv = conversations.find(c => c.participants?.includes(currentUser?.uid) && c.participants?.includes(activeChat?.id));
                                const unreadByOther = currentConv ? (currentConv[`unread_${activeChat?.id}`] || 0) : 0;
                                const isUnseen = (messages.length - 1 - index) < unreadByOther;
                                
                                let statusText = "";
                                if (isMe && !msg.isUnsent) {
                                    if (!isUnseen) statusText = "Seen";
                                    else if (chatStatus?.isOnline) statusText = "Delivered";
                                    else statusText = "Sent";
                                }
                                
                                return (
                                    <MessageBubble
                                        key={msg.id}
                                        msg={msg}
                                        isMe={isMe}
                                        isMobile={isMobile}
                                        darkMode={darkMode}
                                        myPic={myPic}
                                        otherPic={otherPic}
                                        senderName={activeChat?.name}
                                        statusText={statusText}
                                        formatTime={formatTime}
                                        setLightboxUrl={setLightboxUrl}
                                        setReplyingTo={setReplyingTo}
                                        togglePinMessage={togglePinMessage}
                                        unsendMessage={unsendMessage}
                                        activeMenuId={activeMenuId}
                                        setActiveMenuId={setActiveMenuId}
                                        menuPosition={menuPosition}
                                        setMenuPosition={setMenuPosition}
                                    />
                                );
                            })}
                            <div ref={scrollRef}/>
                        </div>

                        <div className="p-4 border-t border-gray-500/10 bg-white/5 backdrop-blur-sm shrink-0 pb-10 lg:pb-4" onClick={() => setActiveMenuId(null)}>
                            
                            {/* GUARANTEED GRAY INPUT PREVIEW */}
                           {replyingTo && (
    <div className={`mb-3 flex items-center justify-between p-3 rounded-2xl text-xs font-bold border-l-4 border-blue-500 animate-in slide-in-from-bottom-2 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
        <div className="flex flex-col">
            <span className="text-blue-500 uppercase tracking-widest text-[9px] mb-1">Replying to {replyingTo.senderId === currentUser.uid ? "Yourself" : activeChat.name}</span>
            <span className={`truncate max-w-[200px] font-medium ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                {replyingTo.isUnsent ? "Message unsent" : (replyingTo.fileType ? `[${replyingTo.fileType}]` : replyingTo.text)}
            </span>
        </div>
        <button onClick={() => setReplyingTo(null)} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-colors"><XMarkIcon className="w-4 h-4 text-slate-400 hover:text-red-500"/></button>
    </div>
)}

                            {attachment && (
                                <div className="mb-3 relative inline-block animate-in zoom-in duration-200">
                                    <div className={`p-2 pr-8 border rounded-xl flex items-center gap-3 ${darkMode ? 'bg-blue-500/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                                        {attachment.type.startsWith('image/') ? <PhotoIcon className="w-5 h-5 text-blue-500"/> : <DocumentIcon className="w-5 h-5 text-blue-500"/>}
                                        <span className="text-xs font-bold text-blue-500 truncate max-w-[200px]">{attachment.name}</span>
                                    </div>
                                    <button onClick={() => {setAttachment(null); if (chatFileRef.current) chatFileRef.current.value = "";}} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600"><XMarkIcon className="w-3 h-3"/></button>
                                </div>
                            )}

                            <form onSubmit={handleSend} className="flex gap-2 items-end">
                                <input type="file" ref={chatFileRef} onChange={(e) => setAttachment(e.target.files[0])} className="hidden" />
                                <button type="button" onClick={() => chatFileRef.current?.click()} className={`p-3 rounded-xl transition-colors ${darkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'}`}>
                                    <PaperClipIcon className="w-5 h-5"/>
                                </button>
                                
                                <div className={`flex-1 rounded-xl flex items-center px-4 py-3 border transition-all ${darkMode ? 'bg-slate-800 border-transparent focus-within:border-blue-500' : 'bg-white border-slate-200 focus-within:border-blue-300 shadow-inner'}`}>
                                    <textarea 
                                        value={newMessage} onChange={e => setNewMessage(e.target.value)} 
                                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} 
                                        placeholder="Type a message..." 
                                        className="w-full bg-transparent outline-none text-sm font-medium resize-none max-h-24 no-scrollbar" 
                                        rows={1} 
                                    />
                                </div>

                                <button type="submit" disabled={(!newMessage.trim() && !attachment) || isUploading} className="p-3.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50">
                                    {isUploading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <PaperAirplaneIcon className="w-5 h-5"/>}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 p-10 select-none">
                        <ChatBubbleLeftRightIcon className="w-16 h-16 mb-4"/>
                        <h3 className="text-2xl font-black mb-2">Your Inbox</h3>
                        <p className="text-xs max-w-xs">Select a conversation from the list to start messaging.</p>
                    </div>
                )}
            </div>
        </div>
    );
}