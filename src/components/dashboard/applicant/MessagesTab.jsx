import { ChatBubbleLeftRightIcon, MagnifyingGlassIcon, ChevronLeftIcon, PaperClipIcon, PaperAirplaneIcon, XMarkIcon, ArrowUturnLeftIcon, EllipsisHorizontalIcon, DocumentIcon, PhotoIcon, ChevronDownIcon, ChatBubbleOvalLeftEllipsisIcon } from "@heroicons/react/24/outline";

export default function MessagesTab({ 
    conversations, activeChat, openChat, closeChat, 
    messages, newMessage, setNewMessage, handleSendMessageWrapper, 
    chatSearch, setChatSearch, filteredChats, 
    isChatOptionsOpen, setIsChatOptionsOpen, handleMinimizeToBubble, handleCloseChat,
    replyingTo, setReplyingTo, attachment, setAttachment, isUploading,
    chatFileRef, handleFileSelect, scrollRef, setLightboxUrl, formatTime, 
    auth, darkMode, isMobile, getAvatarUrl 
}) {
    
    const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;

    // Sub-component for Avatar
    const MessageAvatar = ({ isMe, user }) => { 
        const pic = isMe ? auth.currentUser?.photoURL : (user?.profilePic || getAvatarUrl(user)); 
        const initial = isMe ? "M" : (user?.name?.charAt(0) || "U"); 
        return ( <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 shadow-sm border border-black/5 dark:border-white/10 bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[8px] font-black uppercase"> {pic ? <img src={pic} alt="User" className="w-full h-full object-cover" /> : initial} </div> ); 
    };

    return (
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 animate-content ${isMobile ? (activeChat ? 'h-screen pb-0' : 'h-[calc(100vh-14rem)] pb-2') : 'h-[calc(100vh-10rem)]'}`}>
            
            {/* LEFT COLUMN: CONVERSATION LIST */}
            <div className={`lg:col-span-1 rounded-[2.5rem] overflow-hidden flex flex-col ${glassPanel} ${(isMobile && activeChat) ? 'hidden' : 'flex'} ${isMobile ? 'h-full mb-4' : 'h-full'}`}>
                <div className="p-4 md:p-6 border-b border-gray-500/10 shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <div><h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>Messages</h3><p className="text-xs opacity-50 font-bold uppercase mt-1">{filteredChats.length} Conversations</p></div>
                    </div>
                    <div className={`flex items-center p-1.5 rounded-2xl border transition-all ${darkMode ? 'bg-slate-800 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                        <MagnifyingGlassIcon className="w-4 h-4 ml-2 text-slate-400" />
                        <input value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search chats..." className="bg-transparent border-none outline-none text-xs p-2 w-full font-bold" />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
                    {filteredChats.length > 0 ? (
                        filteredChats.map(c => {
                            const otherId = c.participants.find(p => p !== auth.currentUser.uid);
                            const name = c.names?.[otherId] || "User"; 
                            const otherPic = c.profilePics?.[otherId];
                            const unread = c[`unread_${auth.currentUser.uid}`] || 0;
                            const isActive = activeChat?.id === otherId;

                            return (
                                <button key={c.chatId} onClick={() => openChat({ id: otherId, name, profilePic: otherPic })} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all relative group ${isActive ? 'bg-blue-600/10 border-blue-500 border' : darkMode ? 'hover:bg-white/5 border-transparent border' : 'hover:bg-slate-100 border-transparent border'}`}>
                                    <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-black shrink-0 overflow-hidden ${isActive ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent' : (darkMode ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600')}`}>
                                        {otherPic ? <img src={otherPic} alt={name} className="w-full h-full object-cover" /> : name.charAt(0)}
                                    </div>
                                    <div className="flex-1 text-left overflow-hidden">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`font-black text-sm truncate ${isActive ? 'text-blue-500' : darkMode ? 'text-white' : 'text-slate-900'}`}>{name}</span>
                                            <span className={`text-[9px] font-bold opacity-40`}>{formatTime(c.lastTimestamp)}</span>
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
                        <div className="flex-1 flex flex-col items-center justify-center opacity-40 h-full py-20"><ChatBubbleOvalLeftEllipsisIcon className="w-12 h-12 mb-2"/><p className="text-sm font-bold">No chats found</p></div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: CHAT INTERFACE */}
            <div className={`${isMobile && activeChat ? 'fixed inset-0 z-[60] rounded-none border-0' : 'lg:col-span-2 rounded-[2.5rem] border flex flex-col overflow-hidden relative'} ${(isMobile && !activeChat) ? 'hidden' : 'flex flex-col'} ${glassPanel} ${isMobile && activeChat ? 'bg-slate-900' : ''}`}>
                {activeChat ? (
                    <>
                        <div className="p-4 border-b border-gray-500/10 flex justify-between items-center bg-white/5 backdrop-blur-sm z-10 shrink-0">
                            <div className="flex items-center gap-3">
                                {isMobile && (<button onClick={() => closeChat()} className="p-2 -ml-2 rounded-full hover:bg-white/10"><ChevronLeftIcon className="w-6 h-6"/></button>)}
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md overflow-hidden">{activeChat.profilePic ? <img src={activeChat.profilePic} className="w-full h-full object-cover" alt="chat-pfp"/> : activeChat.name.charAt(0)}</div>
                                <div><h4 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{activeChat.name}</h4><p className="text-xs opacity-50 font-bold uppercase flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Active Now</p></div>
                            </div>
                            <div className="relative">
                                <button onClick={() => setIsChatOptionsOpen(!isChatOptionsOpen)} className={`p-2.5 rounded-xl transition-colors ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}><EllipsisHorizontalIcon className="w-6 h-6 opacity-50"/></button>
                                {isChatOptionsOpen && (
                                    <div className={`absolute right-0 top-14 w-60 rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200 z-50 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                        <div className="p-2 space-y-1">
                                            <button onClick={handleMinimizeToBubble} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-bold text-xs uppercase tracking-wider transition-colors ${darkMode ? 'hover:bg-white/5 text-blue-400' : 'hover:bg-blue-50 text-blue-500'}`}><ChevronDownIcon className="w-4 h-4" /> Minimize to Bubble</button>
                                            <div className={`h-px my-1 ${darkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            <button onClick={handleCloseChat} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-bold text-xs uppercase tracking-wider transition-colors ${darkMode ? 'hover:bg-white/5 text-red-400' : 'hover:bg-red-50 text-red-500'}`}><XMarkIcon className="w-4 h-4" /> Close Chat</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 no-scrollbar" onClick={() => setIsChatOptionsOpen(false)}>
                            {messages.map((msg) => {
                                const isMe = msg.senderId === auth.currentUser.uid;
                                const isSystem = msg.type === 'system';
                                const isMedia = msg.fileType === 'image' || msg.fileType === 'video';
                                if(isSystem) return <div key={msg.id} className="text-center text-[10px] font-bold uppercase tracking-widest opacity-30 my-4">{msg.text}</div>;
                                
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                                        {msg.replyTo && (<div className={`mb-1 px-4 py-2 rounded-2xl text-xs opacity-60 flex items-center gap-2 max-w-xs ${isMe ? 'bg-blue-600/20 text-blue-200' : 'bg-slate-500/20 text-slate-400'}`}><ArrowUturnLeftIcon className="w-3 h-3"/><span className="truncate">{msg.replyTo.type === 'image' ? 'Image' : msg.replyTo.type === 'video' ? 'Video' : msg.replyTo.text}</span></div>)}
                                        <div className={`flex items-end gap-3 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <MessageAvatar isMe={isMe} user={activeChat} />
                                            <div className="relative group/bubble flex flex-col gap-1">
                                                {msg.fileUrl && (
                                                    <div className={`overflow-hidden rounded-2xl ${isMedia ? 'bg-transparent' : (isMe ? 'bg-blue-600' : darkMode ? 'bg-slate-800' : 'bg-white border border-slate-200')}`}>
                                                        {msg.fileType === 'image' && <img src={msg.fileUrl} onClick={() => setLightboxUrl(msg.fileUrl)} className="max-w-full max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity rounded-2xl" alt="attachment" />}
                                                        {msg.fileType === 'video' && <video src={msg.fileUrl} controls className="max-w-full max-h-60 rounded-2xl" />}
                                                        {msg.fileType === 'file' && <a href={msg.fileUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${!isMe && 'bg-black/5'}`}><DocumentIcon className="w-6 h-6"/><span className="underline font-bold truncate">{msg.fileName}</span></a>}
                                                    </div>
                                                )}
                                                {msg.text && (
                                                    <div className={`p-4 rounded-[1.5rem] shadow-sm text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : darkMode ? 'bg-slate-800 text-white rounded-bl-none' : 'bg-white text-slate-900 rounded-bl-none border border-black/5'}`}><p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p></div>
                                                )}
                                                <button onClick={() => setReplyingTo({ id: msg.id, text: msg.text, senderId: msg.senderId, fileType: msg.fileType })} className={`absolute top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${isMe ? '-left-10 hover:bg-white/10 text-slate-400' : '-right-10 hover:bg-white/10 text-slate-400'}`}><ArrowUturnLeftIcon className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                        <p className={`text-[9px] font-bold mt-1.5 opacity-30 select-none ${isMe ? 'text-right mr-12' : 'text-left ml-12'}`}>{formatTime(msg.createdAt)}</p>
                                    </div>
                                )
                            })}
                            <div ref={scrollRef}/>
                        </div>

                        <div className="p-4 border-t border-gray-500/10 bg-white/5 backdrop-blur-sm shrink-0 pb-10 lg:pb-4">
                            {replyingTo && (<div className={`mb-3 flex items-center justify-between p-3 rounded-2xl text-xs font-bold border-l-4 border-blue-500 animate-in slide-in-from-bottom-2 ${darkMode ? 'bg-slate-800' : 'bg-white/10'}`}><div className="flex flex-col"><span className="text-blue-500 uppercase tracking-widest text-[9px] mb-1">Replying to {replyingTo.senderId === auth.currentUser.uid ? "Yourself" : activeChat.name}</span><span className="truncate max-w-[200px] opacity-70">{replyingTo.fileType ? `[${replyingTo.fileType}]` : replyingTo.text}</span></div><button onClick={() => setReplyingTo(null)} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-colors"><XMarkIcon className="w-4 h-4"/></button></div>)}
                            {attachment && (<div className="mb-3 relative inline-block animate-in zoom-in duration-200"><div className="p-2 pr-8 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">{attachment.type.startsWith('image/') ? <PhotoIcon className="w-5 h-5 text-blue-500"/> : <DocumentIcon className="w-5 h-5 text-blue-500"/>}<span className="text-xs font-bold text-blue-500 truncate max-w-[200px]">{attachment.name}</span></div><button onClick={() => {setAttachment(null); chatFileRef.current.value = "";}} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600"><XMarkIcon className="w-3 h-3"/></button></div>)}
                            <form onSubmit={handleSendMessageWrapper} className="flex gap-2 items-end">
                                <input type="file" ref={chatFileRef} onChange={handleFileSelect} className="hidden" />
                                <button type="button" onClick={() => chatFileRef.current.click()} className={`p-3 rounded-xl transition-colors ${darkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'}`}><PaperClipIcon className="w-5 h-5"/></button>
                                <div className={`flex-1 rounded-xl flex items-center px-4 py-3 border transition-all ${darkMode ? 'bg-slate-800 border-transparent focus-within:border-blue-500' : 'bg-white border-slate-200 focus-within:border-blue-300 shadow-inner'}`}><textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessageWrapper(e); } }} placeholder="Type a message..." className="w-full bg-transparent outline-none text-sm font-medium resize-none max-h-24 hide-scrollbar" rows={1} /></div>
                                <button type="submit" disabled={(!newMessage.trim() && !attachment) || isUploading} className="p-3.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50">{isUploading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <PaperAirplaneIcon className="w-5 h-5"/>}</button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 p-10 select-none"><ChatBubbleLeftRightIcon className="w-16 h-16 mb-4"/><h3 className="text-2xl font-black mb-2">Your Inbox</h3><p className="text-xs max-w-xs">Select a conversation from the list to start messaging.</p></div>
                )}
            </div>
        </div>
    );
}