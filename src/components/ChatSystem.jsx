// src/components/ChatSystem.jsx
import React, { useState, useRef, useEffect } from "react";
import { 
  ChatBubbleOvalLeftEllipsisIcon, XMarkIcon, PaperAirplaneIcon, 
  PaperClipIcon, PhotoIcon, DocumentIcon, ArrowUturnLeftIcon, 
  EllipsisVerticalIcon, ChevronDownIcon, ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon, ChevronLeftIcon
} from "@heroicons/react/24/outline";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

// --- HELPERS ---
const formatTime = (ts) => {
    if (!ts) return "Just now";
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const getAvatarUrl = (user) => user?.profilePic || user?.photoURL || user?.avatar || user?.image || null;

// --- STRICT HELPER: Mobile ONLY Swipe & Hold ---
const SwipeableMessage = ({ isMe, isMobile, onReply, onLongPress, children }) => {
    const [touchStartPos, setTouchStartPos] = useState(null);
    const [offset, setOffset] = useState(0);
    const pressTimer = useRef(null);
    const isSwiping = useRef(false);

    if (!isMobile) return <div className="relative w-full group/msg">{children}</div>;

    const onTouchStart = (e) => {
        const touch = e.targetTouches[0];
        const clientY = touch.clientY;
        const target = e.currentTarget;
        setTouchStartPos({ x: touch.clientX, y: clientY });
        isSwiping.current = false;
        pressTimer.current = setTimeout(() => { 
            if (!isSwiping.current) {
                // Determine if we are near the top of the scrollable chat container
                const container = target.closest('.overflow-y-auto');
                let pos = 'top';
                if (container) {
                    const containerRect = container.getBoundingClientRect();
                    pos = (clientY - containerRect.top) < 180 ? 'bottom' : 'top';
                } else {
                    pos = clientY < window.innerHeight / 2 ? 'bottom' : 'top';
                }
                onLongPress(pos);
            }
        }, 400);
    };

    const onTouchMove = (e) => {
        if (!touchStartPos) return;
        const touch = e.targetTouches[0];
        const diffX = touch.clientX - touchStartPos.x;
        const diffY = touch.clientY - touchStartPos.y;

        if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
            isSwiping.current = true;
            clearTimeout(pressTimer.current);
        }
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (!isMe && diffX > 0) setOffset(Math.min(diffX, 60)); 
            if (isMe && diffX < 0) setOffset(Math.max(diffX, -60)); 
        }
    };

    const onTouchEnd = () => {
        clearTimeout(pressTimer.current);
        if (Math.abs(offset) > 40) onReply();
        setOffset(0);
        setTouchStartPos(null);
    };

    return (
        <div 
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}
            style={{ transform: `translateX(${offset}px)`, transition: offset === 0 ? 'transform 0.3s ease-out' : 'none' }}
            className="relative touch-pan-y w-full group/msg"
        >
             {offset !== 0 && (
                <div className={`absolute top-1/2 -translate-y-1/2 ${isMe ? 'right-full mr-4' : 'left-full ml-4'} opacity-50`}>
                    <ArrowUturnLeftIcon className="w-5 h-5 text-slate-400"/>
                </div>
            )}
            {children}
        </div>
    );
};

export default function ChatSystem({ chat, currentUser, profileImage, darkMode }) {
  if (!currentUser || !chat) return null;

  const {
    conversations = [], activeChat, setActiveChat, openChat, closeChat,
    sendMessage, messages = [], setOpenBubbles, openBubbles = [],
    isBubbleVisible, setIsBubbleVisible, isChatMinimized, setIsChatMinimized,
    isBubbleExpanded, setIsBubbleExpanded, activeBubbleView, setActiveBubbleView,
    scrollRef, unsendMessage
  } = chat;

  // --- LOCAL UI STATE ---
  const [isDesktopInboxVisible, setIsDesktopInboxVisible] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [bubbleSearch, setBubbleSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState('top');
  const [lightboxUrl, setLightboxUrl] = useState(null);
  
  const chatFileRef = useRef(null);
  const bubbleFileRef = useRef(null);

  // --- RESPONSIVE DETECTION ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- MOBILE DRAG LOGIC ---
  const [bubblePos, setBubblePos] = useState({ x: window.innerWidth - 70, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e) => { setIsDragging(true); const touch = e.touches[0]; dragOffset.current = { x: touch.clientX - bubblePos.x, y: touch.clientY - bubblePos.y }; };
  const handleTouchMove = (e) => { if (!isDragging) return; const touch = e.touches[0]; setBubblePos({ x: Math.min(window.innerWidth - 60, Math.max(0, touch.clientX - dragOffset.current.x)), y: Math.min(window.innerHeight - 100, Math.max(0, touch.clientY - dragOffset.current.y)) }); };
  const handleTouchEnd = () => { 
      setIsDragging(false); 
      const trashX = window.innerWidth / 2; const trashY = window.innerHeight - 80; 
      if (Math.hypot((bubblePos.x + 28) - trashX, (bubblePos.y + 28) - trashY) < 60) { setIsBubbleVisible(false); setOpenBubbles([]); return; } 
      setBubblePos(prev => ({ ...prev, x: prev.x < window.innerWidth / 2 ? 0 : window.innerWidth - 56 })); 
  };

  // --- HANDLERS ---
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachment) return;
    setIsUploading(true);
    await sendMessage(newMessage, attachment, replyingTo);
    setNewMessage(""); setAttachment(null); setReplyingTo(null);
    setIsUploading(false);
  };

  const markConversationAsRead = async (otherUserId) => {
    if (!currentUser || !otherUserId) return;
    try { await updateDoc(doc(db, "conversations", [currentUser.uid, otherUserId].sort().join("_")), { [`unread_${currentUser.uid}`]: 0 }); } catch (e) { }
  };

  const togglePinMessage = async (messageId, currentPinStatus) => {
    try { await updateDoc(doc(db, "messages", messageId), { isPinned: !currentPinStatus }); } catch (err) {}
  };

  const effectiveActiveChatUser = (isBubbleVisible && isMobile) ? openBubbles.find(b => b.id === activeBubbleView) : activeChat;
  const filteredChats = conversations.filter(c => { const name = c.names?.[c.participants.find(p => p !== currentUser?.uid)] || "User"; return name.toLowerCase().includes(chatSearch.toLowerCase()); });
  const bubbleFilteredChats = conversations.filter(c => { const name = c.names?.[c.participants.find(p => p !== currentUser?.uid)] || "User"; return name.toLowerCase().includes(bubbleSearch.toLowerCase()); });
  const totalUnread = conversations.reduce((acc, curr) => acc + (curr[`unread_${currentUser?.uid}`] || 0), 0);

  return (
    <>
      {isBubbleVisible && isMobile && (
        <>
            {!isBubbleExpanded && (
                <div style={{ top: bubblePos.y, left: bubblePos.x }} className="fixed z-[201] touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="relative">
                        <button onClick={() => { if (!isDragging) setIsBubbleExpanded(true); }} className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-90 overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                            {activeBubbleView !== 'inbox' && effectiveActiveChatUser ? (
                                (getAvatarUrl(effectiveActiveChatUser)) ? <img src={getAvatarUrl(effectiveActiveChatUser)} className="w-full h-full object-cover" alt="pfp" /> : <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">{effectiveActiveChatUser.name.charAt(0)}</div>
                            ) : <ChatBubbleOvalLeftEllipsisIcon className={`w-7 h-7 ${darkMode ? 'text-white' : 'text-blue-600'}`} />}
                        </button>
                        {totalUnread > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm pointer-events-none z-10 animate-in zoom-in">{totalUnread}</span>}
                    </div>
                </div>
            )}
            
            {isDragging && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] w-16 h-16 rounded-full flex items-center justify-center border-4 border-slate-400/30 bg-transparent animate-in zoom-in backdrop-blur-sm"><XMarkIcon className="w-8 h-8 text-slate-400" /></div>}
            
            {isBubbleExpanded && (
                <div className="fixed inset-0 z-[1000] flex flex-col bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="pt-12 px-4 pb-4 flex items-center gap-4 overflow-x-auto no-scrollbar pointer-events-auto">
                        {openBubbles.map((chat) => (
                            <div key={chat.id} className="relative group flex flex-col items-center gap-1 shrink-0">
                                <button onClick={() => { setActiveBubbleView(chat.id); openChat(chat); markConversationAsRead(chat.id); }} className={`w-14 h-14 rounded-full overflow-hidden shadow-lg transition-all border-2 ${activeBubbleView === chat.id ? 'border-blue-500 scale-110' : 'border-transparent opacity-60'}`}>
                                    {getAvatarUrl(chat) ? <img src={getAvatarUrl(chat)} className="w-full h-full object-cover" alt="pfp" /> : <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">{chat.name.charAt(0)}</div>}
                                </button>
                                {activeBubbleView === chat.id && (<button onClick={(e) => { e.stopPropagation(); const newBubbles = openBubbles.filter(b => b.id !== chat.id); setOpenBubbles(newBubbles); if(activeBubbleView === chat.id) setActiveBubbleView(newBubbles.length ? newBubbles[0].id : 'inbox'); }} className="absolute -top-1 -right-1 bg-slate-500 text-white rounded-full p-0.5 shadow-md animate-in zoom-in border-none"><XMarkIcon className="w-3 h-3"/></button>)}
                            </div>
                        ))}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                            <button onClick={() => setActiveBubbleView('inbox')} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all border-2 ${activeBubbleView === 'inbox' ? 'border-blue-500 scale-110' : 'border-white dark:border-slate-700 opacity-60'} ${darkMode ? 'bg-slate-800' : 'bg-white'}`}><ChatBubbleOvalLeftEllipsisIcon className="w-7 h-7 text-blue-500" /></button>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-end relative" onClick={() => setIsBubbleExpanded(false)}>
                        <div className={`w-full h-[85vh] rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col animate-in slide-in-from-bottom duration-300 ${darkMode ? 'bg-slate-900' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
                            {activeBubbleView === 'inbox' ? (
                                <div className="flex flex-col h-full">
                                    <div className={`p-5 flex justify-between items-center ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                                        <h3 className={`font-black text-2xl ${darkMode ? 'text-white' : 'text-slate-900'}`}>Chats</h3>
                                        <button onClick={() => setIsBubbleExpanded(false)} className={`p-2 rounded-full ${darkMode ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800'}`}><ChevronDownIcon className="w-5 h-5"/></button> 
                                    </div>
                                    <div className="px-5 pb-2">
                                        <div className={`flex items-center p-2 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                            <MagnifyingGlassIcon className="w-4 h-4 ml-2 text-slate-400" />
                                            <input value={bubbleSearch} onChange={(e) => setBubbleSearch(e.target.value)} placeholder="Search..." className={`bg-transparent border-none outline-none text-xs p-1.5 w-full font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`} />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
                                        {bubbleFilteredChats.map(c => {
                                            const otherId = c.participants.find(p => p !== currentUser.uid);
                                            const name = c.names?.[otherId] || "User";
                                            const unread = c[`unread_${currentUser.uid}`] || 0;
                                            return (
                                                <button key={c.chatId} onClick={() => { const userObj = { id: otherId, name, profilePic: c.profilePics?.[otherId] }; if(!openBubbles.find(b => b.id === userObj.id)) setOpenBubbles(prev => [userObj, ...prev]); openChat(userObj); setActiveBubbleView(otherId); markConversationAsRead(otherId); }} className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-colors ${darkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                                                    <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800 flex items-center justify-center">{c.profilePics?.[otherId] ? <img src={c.profilePics[otherId]} className="w-full h-full object-cover" alt="pfp" /> : <span className="font-bold">{name.charAt(0)}</span>}</div>
                                                    <div className="flex-1 text-left overflow-hidden">
                                                        <div className="flex justify-between items-center"><span className="font-black text-sm truncate">{name}</span><span className="text-[9px] opacity-40">{formatTime(c.lastTimestamp)}</span></div>
                                                        <div className="flex justify-between items-center"><p className="text-[11px] truncate opacity-60">{c.lastMessage}</p>{unread > 0 && <span className="min-w-[14px] h-[14px] flex items-center justify-center bg-blue-500 text-white text-[9px] rounded-full px-1 font-bold">{unread}</span>}</div>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ) : (
                                effectiveActiveChatUser && (
                                    <>
                                        <div className={`p-4 flex justify-between items-center shrink-0 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => setActiveBubbleView('inbox')} className={`p-1 -ml-2 rounded-full ${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}><ChevronLeftIcon className="w-6 h-6"/></button>
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200">{getAvatarUrl(effectiveActiveChatUser) ? <img src={getAvatarUrl(effectiveActiveChatUser)} className="w-full h-full object-cover" /> : <span className="flex items-center justify-center h-full font-bold">{effectiveActiveChatUser.name.charAt(0)}</span>}</div>
                                                <div><h3 className={`font-black text-base leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>{effectiveActiveChatUser.name}</h3></div>
                                            </div>
                                            <button onClick={() => setIsBubbleExpanded(false)}><ChevronDownIcon className="w-6 h-6 text-blue-500"/></button>
                                        </div>
                                        <div className={`flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50/50'}`} onClick={() => setActiveMenuId(null)}>
                                            {messages.map((msg) => {
                                                const isMe = msg.senderId === currentUser.uid;
                                                const myPic = profileImage || currentUser?.photoURL || null;
                                                const otherPic = getAvatarUrl(effectiveActiveChatUser) || null;
                                                
                                                if(msg.type === 'system') return <div key={msg.id} className="text-center text-[10px] font-bold uppercase tracking-widest opacity-30 my-4">{msg.text}</div>;

                                                return (
                                                    <SwipeableMessage key={msg.id} isMe={isMe} isMobile={true} onReply={() => setReplyingTo({ id: msg.id, text: msg.text, senderId: msg.senderId, fileType: msg.fileType, isUnsent: msg.isUnsent })} onLongPress={(pos) => { setMenuPosition(pos); setActiveMenuId(msg.id); }}>
                                                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} relative w-full`}>
                                                            {msg.replyTo && (
                                                                <div className={`mb-1 px-3 py-1.5 rounded-xl text-[10px] flex items-center gap-1.5 max-w-[75%] ${isMe ? 'bg-blue-50 dark:bg-slate-700' : 'bg-gray-100 dark:bg-slate-800'}`}>
                                                                    <ArrowUturnLeftIcon className={`w-3 h-3 shrink-0 ${isMe ? 'text-blue-500 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}/>
                                                                    <span className={`truncate font-bold ${isMe ? 'text-blue-600 dark:text-blue-200' : 'text-gray-600 dark:text-gray-300'}`}>
                                                                        {msg.replyTo.isUnsent ? "Message unsent" : (msg.replyTo.fileType ? `[${msg.replyTo.fileType}]` : msg.replyTo.text)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className={`flex items-end gap-2 max-w-[85%] relative ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                                <div className={`w-6 h-6 rounded-full overflow-hidden shrink-0 shadow-sm flex items-center justify-center text-[9px] font-black uppercase ${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}`}> 
                                                                    {isMe ? (myPic ? <img src={myPic} className="w-full h-full object-cover" /> : "M") : (otherPic ? <img src={otherPic} className="w-full h-full object-cover" /> : (effectiveActiveChatUser?.name?.charAt(0) || "U"))} 
                                                                </div>
                                                                <div className="flex flex-col gap-1 relative">
                                                                    {msg.isPinned && <span className={`text-[9px] font-bold text-yellow-500 uppercase tracking-wider mb-0.5 ${isMe ? 'text-right mr-2' : 'ml-2'}`}>📌 Pinned</span>}
                                                                    {msg.isUnsent ? (
                                                                        <div className={`px-4 py-3 rounded-[1.25rem] text-[12px] italic ${isMe ? (darkMode ? 'text-slate-400 bg-slate-800 rounded-br-none' : 'text-slate-500 bg-slate-100 rounded-br-none') : (darkMode ? 'text-slate-400 bg-slate-800 rounded-bl-none' : 'text-slate-500 bg-slate-100 rounded-bl-none')}`}>
                                                                            Message unsent
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            {msg.fileUrl && (
                                                                                <div className={`overflow-hidden rounded-2xl ${msg.fileType === 'image' || msg.fileType === 'video' ? 'bg-transparent' : (isMe ? 'bg-blue-600' : darkMode ? 'bg-slate-800' : 'bg-white shadow-sm')}`}>
                                                                                    {msg.fileType === 'image' && <img src={msg.fileUrl} onClick={() => setLightboxUrl(msg.fileUrl)} className="max-w-full max-h-48 object-cover rounded-2xl cursor-pointer hover:opacity-90 shadow-sm" alt="attachment" />}
                                                                                    {msg.fileType === 'video' && <video src={msg.fileUrl} controls className="max-w-full max-h-48 rounded-2xl shadow-sm" />}
                                                                                    {msg.fileType === 'file' && <a href={msg.fileUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-2 p-3 text-xs rounded-xl ${!isMe && 'bg-black/5'}`}><DocumentIcon className="w-5 h-5"/><span className="underline font-bold truncate">{msg.fileName}</span></a>}
                                                                                </div>
                                                                            )}
                                                                            {msg.text && (
                                                                                <div className={`px-4 py-3 rounded-[1.25rem] text-[13px] shadow-sm leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-br-none' : (darkMode ? 'bg-slate-800 text-white rounded-bl-none' : 'bg-white text-slate-800 rounded-bl-none')}`}>
                                                                                    {msg.text}
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>

                                                                {activeMenuId === msg.id && (
                                                                    <div className={`absolute z-50 ${menuPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-1'} ${isMe ? 'right-12' : 'left-12'} w-40 bg-white dark:bg-slate-800 shadow-xl rounded-xl border ${darkMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden text-xs font-bold animate-in zoom-in-95`}>
                                                                        <button onClick={(e) => {e.stopPropagation(); setReplyingTo({ id: msg.id, text: msg.text, senderId: msg.senderId, fileType: msg.fileType, isUnsent: msg.isUnsent }); setActiveMenuId(null)}} className="w-full text-left px-4 py-3 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 border-b border-black/5 dark:border-white/5">Reply to</button>
                                                                        <button onClick={(e) => {e.stopPropagation(); togglePinMessage(msg.id, msg.isPinned); setActiveMenuId(null)}} className={`w-full text-left px-4 py-3 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 border-b border-black/5 dark:border-white/5 ${msg.isPinned ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>{msg.isPinned ? "Unpin message" : "Pin a message"}</button>
                                                                        {isMe && !msg.isUnsent && (
                                                                            <button onClick={(e) => {e.stopPropagation(); if(unsendMessage) unsendMessage(msg.id); setActiveMenuId(null)}} className="w-full text-left px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">Unsend message</button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className={`text-[9px] font-bold opacity-40 mt-1 ${isMe ? 'mr-10' : 'ml-10'}`}>{formatTime(msg.createdAt)}</span>
                                                        </div>
                                                    </SwipeableMessage>
                                                )
                                            })}
                                            <div ref={scrollRef}/>
                                        </div>
                                        <div className={`p-3 shrink-0 ${darkMode ? 'bg-slate-900' : 'bg-white'}`} onClick={() => setActiveMenuId(null)}>
                                            {replyingTo && (
                                                <div className={`mb-3 flex justify-between items-center p-3 rounded-xl border-l-4 border-blue-500 text-[10px] font-bold ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                                                    <div className="flex flex-col">
                                                        <span className="text-blue-500 uppercase tracking-widest mb-0.5">Replying to {replyingTo.senderId === currentUser.uid ? 'You' : (effectiveActiveChatUser?.name || 'User')}</span>
                                                        <span className={`truncate max-w-[200px] font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>{replyingTo.isUnsent ? "Message unsent" : (replyingTo.fileType ? `[${replyingTo.fileType}]` : replyingTo.text)}</span>
                                                    </div>
                                                    <button onClick={() => setReplyingTo(null)} className={`p-1.5 rounded-full transition-colors ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}><XMarkIcon className="w-4 h-4 text-blue-500"/></button>
                                                </div>
                                            )}
                                            {attachment && (
                                                <div className="mb-3 relative inline-block animate-in zoom-in duration-200">
                                                    <div className={`p-2 pr-8 rounded-xl flex items-center gap-3 ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                                                        {attachment.type.startsWith('image/') ? <PhotoIcon className="w-5 h-5 text-blue-500"/> : <DocumentIcon className="w-5 h-5 text-blue-500"/>}
                                                        <span className="text-xs font-bold text-blue-500 truncate max-w-[150px]">{attachment.name}</span>
                                                    </div>
                                                    <button onClick={() => {setAttachment(null); if(bubbleFileRef.current) bubbleFileRef.current.value = "";}} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600"><XMarkIcon className="w-3 h-3"/></button>
                                                </div>
                                            )}
                                            <form onSubmit={handleSend} className="flex gap-2 items-end">
                                                <input type="file" ref={bubbleFileRef} onChange={(e) => setAttachment(e.target.files[0])} className="hidden" />
                                                <button type="button" onClick={() => bubbleFileRef.current?.click()} className={`p-2.5 rounded-xl transition-colors ${darkMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><PaperClipIcon className="w-5 h-5"/></button>
                                                <div className={`flex-1 rounded-2xl flex items-center px-4 py-2 transition-all ${darkMode ? 'bg-slate-800 focus-within:ring-1 focus-within:ring-blue-500' : 'bg-slate-100 focus-within:ring-1 focus-within:ring-blue-400'}`}>
                                                    <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} placeholder="Aa" className={`w-full bg-transparent outline-none text-sm resize-none max-h-24 no-scrollbar py-1.5 ${darkMode ? 'text-white placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'}`} rows={1} />
                                                </div>
                                                <button disabled={(!newMessage.trim() && !attachment) || isUploading} type="submit" className="p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50">
                                                    {isUploading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <PaperAirplaneIcon className="w-5 h-5"/>}
                                                </button>
                                            </form>
                                        </div>
                                    </>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
      )}

      {!isMobile && (
          <div className="fixed z-[200] bottom-6 right-4 md:right-6 flex flex-col-reverse items-end gap-3 pointer-events-none">
              
              <div className="pointer-events-auto relative">
                  <button onClick={() => { setIsDesktopInboxVisible(!isDesktopInboxVisible); setActiveChat(null); }} className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-90 overflow-hidden bg-blue-600`}>
                      <ChatBubbleLeftRightIcon className="w-7 h-7 text-white" />
                  </button>
                  {totalUnread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm pointer-events-none z-20 animate-bounce">{totalUnread}</span>}
              </div>

              {openBubbles.map((chat) => {
                  const unread = chat[`unread_${currentUser.uid}`] || 0;
                  return (
                  <div key={chat.id} className="pointer-events-auto relative group flex items-center gap-3">
                      <span className="absolute right-full mr-3 px-3 py-1.5 rounded-xl bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">{chat.name}</span>
                      <div className="relative">
                          <button onClick={() => { openChat(chat); setIsChatMinimized(false); setIsDesktopInboxVisible(false); markConversationAsRead(chat.id); }} className="w-14 h-14 rounded-full shadow-2xl overflow-hidden transition-all hover:scale-110 active:scale-95 border-2 border-transparent hover:border-blue-500">
                              {getAvatarUrl(chat) ? (<img src={getAvatarUrl(chat)} alt="pfp" className="w-full h-full object-cover" />) : (<div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">{chat.name.charAt(0)}</div>)}
                          </button>
                          {unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm z-20 animate-bounce">{unread}</span>}
                          <button onClick={(e) => { e.stopPropagation(); setOpenBubbles(prev => prev.filter(b => b.id !== chat.id)); }} className="absolute -top-1 -left-1 w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><XMarkIcon className="w-3 h-3 text-slate-600 dark:text-slate-300" /></button>
                      </div>
                  </div>
              )})}

              {isDesktopInboxVisible && !activeChat && (
                  <div className="fixed z-[210] pointer-events-auto bottom-24 right-6 animate-in slide-in-from-bottom-4 duration-300">
                      <div className={`w-[340px] h-[500px] rounded-[2rem] shadow-[0_15px_50px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                          <div className={`p-5 flex justify-between items-center ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                              <h3 className={`font-black text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>Messages</h3>
                              <button onClick={() => setIsDesktopInboxVisible(false)} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg"><XMarkIcon className="w-5 h-5 opacity-50"/></button>
                          </div>
                          <div className="p-3 pb-0">
                              <div className={`flex items-center p-2 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                  <MagnifyingGlassIcon className="w-4 h-4 ml-2 text-slate-400" />
                                  <input value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search chats..." className={`bg-transparent border-none outline-none text-xs p-1.5 w-full font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`} />
                              </div>
                          </div>
                          <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
                              {filteredChats.map(c => {
                                  const otherId = c.participants.find(p => p !== currentUser.uid);
                                  const name = c.names?.[otherId] || "User";
                                  const unread = c[`unread_${currentUser.uid}`] || 0;
                                  return (
                                      <button 
                                          key={c.chatId} 
                                          onClick={() => { 
                                              const userObj = { id: otherId, name, profilePic: c.profilePics?.[otherId] }; 
                                              openChat(userObj); 
                                              setIsDesktopInboxVisible(false); 
                                              markConversationAsRead(otherId); 
                                          }} 
                                          className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-colors ${darkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}
                                      >
                                          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800 flex items-center justify-center">{c.profilePics?.[otherId] ? <img src={c.profilePics[otherId]} className="w-full h-full object-cover" alt="pfp" /> : <span className="font-bold text-lg">{name.charAt(0)}</span>}</div>
                                          <div className="flex-1 text-left overflow-hidden">
                                              <div className="flex justify-between items-center mb-1"><span className={`font-black text-sm truncate ${unread > 0 ? (darkMode ? 'text-white' : 'text-slate-900') : ''}`}>{name}</span><span className="text-[10px] opacity-40">{formatTime(c.lastTimestamp)}</span></div>
                                              <div className="flex justify-between items-center"><p className={`text-xs truncate max-w-[80%] ${unread > 0 ? 'font-bold text-blue-500' : 'opacity-60'}`}>{c.lastMessage}</p>{unread > 0 && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0"></span>}</div>
                                          </div>
                                      </button>
                                  )
                              })}
                          </div>
                      </div>
                  </div>
              )}

              {!isChatMinimized && activeChat && (
                  <div className={`fixed z-[210] pointer-events-auto bottom-24 right-6`}>
                      <div className={`w-[360px] h-[520px] rounded-[2rem] shadow-[0_15px_50px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                          <div className={`p-4 flex justify-between items-center bg-blue-600 text-white shrink-0`}>
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-white/20 overflow-hidden shadow-inner">{getAvatarUrl(activeChat) ? <img src={getAvatarUrl(activeChat)} className="w-full h-full object-cover" alt="pfp"/> : <span className="flex items-center justify-center h-full font-black text-lg">{activeChat.name.charAt(0)}</span>}</div>
                                  <div><span className="font-black text-sm block leading-tight">{activeChat.name}</span><span className="text-[10px] opacity-80 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>Active</span></div>
                              </div>
                              <div className="flex gap-1">
                                  <button onClick={() => { setIsChatMinimized(true); setOpenBubbles(prev => [...prev, activeChat].filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i)); setActiveBubbleView(activeChat.id); closeChat(); }} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><ChevronDownIcon className="w-5 h-5"/></button>
                                  <button onClick={closeChat} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><XMarkIcon className="w-5 h-5"/></button>
                              </div>
                          </div>
                          
                          <div className={`flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50/50'}`} onClick={() => setActiveMenuId(null)}>
                              {messages.map((msg) => {
                                  const isMe = msg.senderId === currentUser.uid;
                                  const myPic = profileImage || currentUser?.photoURL || null;
                                  const otherPic = getAvatarUrl(activeChat) || null;

                                  if(msg.type === 'system') return <div key={msg.id} className="text-center text-[10px] font-bold uppercase tracking-widest opacity-30 my-4">{msg.text}</div>;

                                  return (
                                      <SwipeableMessage key={msg.id} isMe={isMe} isMobile={false} onReply={() => {}} onLongPress={() => {}}>
                                          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} relative w-full`}>
                                              {msg.replyTo && (
                                                  <div className={`mb-1 px-3 py-1.5 rounded-xl text-[10px] flex items-center gap-1.5 max-w-[75%] ${isMe ? 'bg-blue-50 dark:bg-slate-700' : 'bg-gray-100 dark:bg-slate-800'}`}>
                                                      <ArrowUturnLeftIcon className={`w-3 h-3 shrink-0 ${isMe ? 'text-blue-500 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}/>
                                                      <span className={`truncate font-bold ${isMe ? 'text-blue-600 dark:text-blue-200' : 'text-gray-600 dark:text-gray-300'}`}>
                                                          {msg.replyTo.isUnsent ? "Message unsent" : (msg.replyTo.fileType ? `[${msg.replyTo.fileType}]` : msg.replyTo.text)}
                                                      </span>
                                                  </div>
                                              )}
                                              <div className={`flex items-end gap-2 max-w-[85%] relative ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                  <div className={`w-6 h-6 rounded-full overflow-hidden shrink-0 shadow-sm flex items-center justify-center text-[9px] font-black uppercase ${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}`}> 
                                                      {isMe ? (myPic ? <img src={myPic} className="w-full h-full object-cover" /> : "M") : (otherPic ? <img src={otherPic} className="w-full h-full object-cover" /> : (activeChat?.name?.charAt(0) || "U"))} 
                                                  </div>
                                                  <div className="flex flex-col gap-1 relative">
                                                      {msg.isPinned && <span className={`text-[9px] font-bold text-yellow-500 uppercase tracking-wider mb-0.5 ${isMe ? 'text-right mr-2' : 'ml-2'}`}>📌 Pinned</span>}
                                                      {msg.isUnsent ? (
                                                          <div className={`px-4 py-3 rounded-[1.25rem] text-[12px] italic ${isMe ? (darkMode ? 'text-slate-400 bg-slate-800 rounded-br-none' : 'text-slate-500 bg-slate-100 rounded-br-none') : (darkMode ? 'text-slate-400 bg-slate-800 rounded-bl-none' : 'text-slate-500 bg-slate-100 rounded-bl-none')}`}>
                                                              Message unsent
                                                          </div>
                                                      ) : (
                                                          <>
                                                              {msg.fileUrl && (
                                                                  <div className={`overflow-hidden rounded-2xl ${msg.fileType === 'image' || msg.fileType === 'video' ? 'bg-transparent' : (isMe ? 'bg-blue-600' : darkMode ? 'bg-slate-800' : 'bg-white shadow-sm')}`}>
                                                                      {msg.fileType === 'image' && <img src={msg.fileUrl} onClick={() => setLightboxUrl(msg.fileUrl)} className="max-w-full max-h-48 object-cover rounded-2xl cursor-pointer hover:opacity-90 shadow-sm" alt="attachment" />}
                                                                      {msg.fileType === 'video' && <video src={msg.fileUrl} controls className="max-w-full max-h-48 rounded-2xl shadow-sm" />}
                                                                      {msg.fileType === 'file' && <a href={msg.fileUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-2 p-3 text-xs rounded-xl ${!isMe && 'bg-black/5'}`}><DocumentIcon className="w-5 h-5"/><span className="underline font-bold truncate">{msg.fileName}</span></a>}
                                                                  </div>
                                                              )}
                                                              {msg.text && (
                                                                  <div className={`px-4 py-3 rounded-[1.25rem] text-[13px] shadow-sm leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-br-none' : (darkMode ? 'bg-slate-800 text-white rounded-bl-none' : 'bg-white text-slate-800 rounded-bl-none')}`}>
                                                                      {msg.text}
                                                                  </div>
                                                              )}
                                                          </>
                                                      )}
                                                  </div>

                                                  <div className="hidden md:flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity mb-2">
                                                      <button onClick={() => setReplyingTo({ id: msg.id, text: msg.text, senderId: msg.senderId, fileType: msg.fileType, isUnsent: msg.isUnsent })} className="p-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full text-blue-500 hover:scale-110 transition-transform shadow-sm" title="Reply">
                                                          <ArrowUturnLeftIcon className="w-3.5 h-3.5"/>
                                                      </button>
                                                      <div className="relative">
                                                          <button onClick={(e) => {
                                                              e.stopPropagation(); 
                                                              const container = e.currentTarget.closest('.overflow-y-auto');
                                                              if (container) {
                                                                  const containerRect = container.getBoundingClientRect();
                                                                  const rect = e.currentTarget.getBoundingClientRect();
                                                                  setMenuPosition((rect.top - containerRect.top) < 180 ? 'bottom' : 'top');
                                                              } else {
                                                                  setMenuPosition(e.clientY < window.innerHeight / 2 ? 'bottom' : 'top');
                                                              }
                                                              setActiveMenuId(activeMenuId === msg.id ? null : msg.id);
                                                          }} className="p-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full text-slate-500 hover:scale-110 transition-transform shadow-sm" title="More">
                                                              <EllipsisVerticalIcon className="w-3.5 h-3.5"/>
                                                          </button>
                                                      </div>
                                                  </div>

                                                  {activeMenuId === msg.id && (
                                                      <div className={`absolute z-50 ${menuPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-1'} ${isMe ? 'right-12' : 'left-12'} w-40 bg-white dark:bg-slate-800 shadow-xl rounded-xl border ${darkMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden text-xs font-bold animate-in zoom-in-95`}>
                                                          <button onClick={(e) => {e.stopPropagation(); setReplyingTo({ id: msg.id, text: msg.text, senderId: msg.senderId, fileType: msg.fileType, isUnsent: msg.isUnsent }); setActiveMenuId(null)}} className="w-full text-left px-4 py-3 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 border-b border-black/5 dark:border-white/5">Reply to</button>
                                                          <button onClick={(e) => {e.stopPropagation(); togglePinMessage(msg.id, msg.isPinned); setActiveMenuId(null)}} className={`w-full text-left px-4 py-3 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 border-b border-black/5 dark:border-white/5 ${msg.isPinned ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>{msg.isPinned ? "Unpin message" : "Pin a message"}</button>
                                                          {isMe && !msg.isUnsent && (
                                                              <button onClick={(e) => {e.stopPropagation(); if(unsendMessage) unsendMessage(msg.id); setActiveMenuId(null)}} className="w-full text-left px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">Unsend message</button>
                                                          )}
                                                      </div>
                                                  )}
                                              </div>
                                              <span className={`text-[9px] font-bold opacity-40 mt-1 ${isMe ? 'mr-10' : 'ml-10'}`}>{formatTime(msg.createdAt)}</span>
                                          </div>
                                      </SwipeableMessage>
                                  )
                              })}
                              <div ref={scrollRef}/>
                          </div>
                          
                          <div className={`p-3 shrink-0 ${darkMode ? 'bg-slate-900' : 'bg-white'}`} onClick={() => setActiveMenuId(null)}>
                              {replyingTo && (
                                  <div className={`mb-3 flex justify-between items-center p-3 rounded-xl border-l-4 border-blue-500 text-[10px] font-bold ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                                      <div className="flex flex-col">
                                          <span className="text-blue-500 uppercase tracking-widest mb-0.5">Replying to {replyingTo.senderId === currentUser.uid ? 'You' : (activeChat?.name || 'User')}</span>
                                          <span className={`truncate max-w-[200px] font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>{replyingTo.isUnsent ? "Message unsent" : (replyingTo.fileType ? `[${replyingTo.fileType}]` : replyingTo.text)}</span>
                                      </div>
                                      <button onClick={() => setReplyingTo(null)} className={`p-1.5 rounded-full transition-colors ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}><XMarkIcon className="w-4 h-4 text-blue-500"/></button>
                                  </div>
                              )}
                              {attachment && (
                                  <div className="mb-3 relative inline-block animate-in zoom-in duration-200">
                                      <div className={`p-2 pr-8 rounded-xl flex items-center gap-3 ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                                          {attachment.type.startsWith('image/') ? <PhotoIcon className="w-5 h-5 text-blue-500"/> : <DocumentIcon className="w-5 h-5 text-blue-500"/>}
                                          <span className="text-xs font-bold text-blue-500 truncate max-w-[150px]">{attachment.name}</span>
                                      </div>
                                      <button onClick={() => {setAttachment(null); if(chatFileRef.current) chatFileRef.current.value = "";}} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600"><XMarkIcon className="w-3 h-3"/></button>
                                  </div>
                              )}
                              <form onSubmit={handleSend} className="flex gap-2 items-end">
                                  <input type="file" ref={chatFileRef} onChange={(e) => setAttachment(e.target.files[0])} className="hidden" />
                                  <button type="button" onClick={() => chatFileRef.current?.click()} className={`p-2.5 rounded-xl transition-colors ${darkMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><PaperClipIcon className="w-5 h-5"/></button>
                                  <div className={`flex-1 rounded-2xl flex items-center px-4 py-2 transition-all ${darkMode ? 'bg-slate-800 focus-within:ring-1 focus-within:ring-blue-500' : 'bg-slate-100 focus-within:ring-1 focus-within:ring-blue-400'}`}>
                                      <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} placeholder="Aa" className={`w-full bg-transparent outline-none text-sm resize-none max-h-24 no-scrollbar py-1.5 ${darkMode ? 'text-white placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'}`} rows={1} />
                                  </div>
                                  <button disabled={(!newMessage.trim() && !attachment) || isUploading} type="submit" className="p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50">
                                      {isUploading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <PaperAirplaneIcon className="w-5 h-5"/>}
                                  </button>
                              </form>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}
    </>
  );
}