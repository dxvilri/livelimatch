// src/components/ChatWindow.jsx
import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase/config";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, updateDoc, doc, getDocs, writeBatch } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { XMarkIcon, PaperAirplaneIcon, MinusIcon, ChatBubbleLeftRightIcon, ArrowUturnLeftIcon, EllipsisVerticalIcon, PaperClipIcon, PhotoIcon, DocumentIcon } from "@heroicons/react/24/outline";

const formatChatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);
  if (diffInHours < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  else if (diffInHours < 48) return "Yesterday";
  else return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// --- STRICT HELPER: Mobile ONLY Swipe & Hold ---
const SwipeableMessage = ({ isMe, isMobile, onReply, onLongPress, children }) => {
    const [touchStartPos, setTouchStartPos] = useState(null);
    const [offset, setOffset] = useState(0);
    const pressTimer = useRef(null);
    const isSwiping = useRef(false);

    if (!isMobile) return <div className="relative w-full">{children}</div>;

    const onTouchStart = (e) => {
        const touch = e.targetTouches[0];
        setTouchStartPos({ x: touch.clientX, y: touch.clientY });
        isSwiping.current = false;
        pressTimer.current = setTimeout(() => { if (!isSwiping.current) onLongPress(); }, 400);
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
            className="relative touch-pan-y w-full"
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

export default function ChatWindow({ activeChat, darkMode, isMinimized, setIsMinimized, setActiveChat, isMobile }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [chatStatus, setChatStatus] = useState({ isOnline: false });
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  // NEW: File attachment states for Bubble Chat
  const [attachment, setAttachment] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!activeChat) return;
    const unsubStatus = onSnapshot(doc(db, "applicants", activeChat.id), (snap) => {
      if(snap.exists()) setChatStatus({ isOnline: snap.data().isOnline });
    });
    return () => unsubStatus();
  }, [activeChat]);

  useEffect(() => {
    if (!activeChat || isMinimized || !auth.currentUser) return;
    const markAsRead = async () => {
      const chatId = [auth.currentUser.uid, activeChat.id].sort().join("_");
      const unreadQuery = query(collection(db, "messages"), where("chatId", "==", chatId), where("receiverId", "==", auth.currentUser.uid), where("isRead", "==", false));
      const querySnapshot = await getDocs(unreadQuery);
      const batch = writeBatch(db);
      querySnapshot.forEach((d) => batch.update(doc(db, "messages", d.id), { isRead: true }));
      await batch.commit();
    };
    markAsRead();
  }, [activeChat, isMinimized, messages.length]);

  useEffect(() => {
    if (!activeChat || !auth.currentUser) return;
    const chatId = [auth.currentUser.uid, activeChat.id].sort().join("_");
    const qChat = query(collection(db, "messages"), where("chatId", "==", chatId), orderBy("createdAt", "asc"));
    const unsubChat = onSnapshot(qChat, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubChat();
  }, [activeChat]);

  // NEW: handleSendMessage now uploads files just like useChat.js
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !activeChat) return;
    
    setIsUploading(true);
    const chatId = [auth.currentUser.uid, activeChat.id].sort().join("_");
    let fileUrl = null, fileType = 'text', fileName = null;

    if (attachment) {
      const storage = getStorage();
      const storageRef = ref(storage, `chat_attachments/${chatId}/${Date.now()}_${attachment.name}`);
      const uploadTask = await uploadBytes(storageRef, attachment);
      fileUrl = await getDownloadURL(uploadTask.ref);
      fileName = attachment.name;
      fileType = attachment.type.startsWith('image/') ? 'image' : 'file';
    }

    try {
      await addDoc(collection(db, "messages"), {
        chatId, text: newMessage, senderId: auth.currentUser.uid, receiverId: activeChat.id, createdAt: serverTimestamp(), isRead: false,
        replyTo: replyingTo || null,
        fileUrl, fileType, fileName
      });
      setNewMessage("");
      setAttachment(null);
      setReplyingTo(null);
    } catch (err) { console.error("Chat Error:", err); }
    setIsUploading(false);
  };

  const unsendMessage = async (messageId) => {
    try { await updateDoc(doc(db, "messages", messageId), { isUnsent: true, text: "Message unsent" }); } 
    catch (err) { console.error(err); }
  };

  const togglePinMessage = async (messageId, currentPinStatus) => {
    try { await updateDoc(doc(db, "messages", messageId), { isPinned: !currentPinStatus }); } 
    catch (err) { console.error(err); }
  };

  if (!activeChat) return null;
  if (isMinimized) return (
      <div className="fixed bottom-24 md:bottom-8 right-6 z-[200]">
        <button onClick={() => setIsMinimized(false)} className="w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all relative">
          <ChatBubbleLeftRightIcon className="w-7 h-7" />
        </button>
      </div>
  );

  return (
    <div className={`fixed bottom-24 md:bottom-8 right-6 z-[200] w-[90vw] md:w-[26rem] h-[500px] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-blue-500/20 ${darkMode ? 'bg-slate-900 shadow-black/50' : 'bg-white shadow-blue-500/10'}`}>
      
      {/* Header */}
      <div className="p-5 bg-blue-600 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-black text-xs">{activeChat.name?.charAt(0)}</div>
          <div className="flex flex-col">
            <span className="font-black text-[10px] uppercase tracking-widest leading-none">{activeChat.name}</span>
            <span className="text-[8px] opacity-70 font-bold uppercase mt-1 flex items-center gap-1">
               <span className={`w-1.5 h-1.5 rounded-full ${chatStatus.isOnline ? 'bg-green-400' : 'bg-slate-400'}`}></span>
               {chatStatus.isOnline ? 'Active Now' : 'Offline'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><MinusIcon className="w-5 h-5"/></button>
          <button onClick={() => setActiveChat(null)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><XMarkIcon className="w-5 h-5"/></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar" onClick={() => setActiveMenuId(null)}>
        {messages.map((msg, index) => {
          const isMe = msg.senderId === auth.currentUser.uid;
          const isMedia = msg.fileType === 'image' || msg.fileType === 'video';
          const showTime = index === messages.length - 1 || messages[index+1]?.senderId !== msg.senderId;

          return (
            <SwipeableMessage key={msg.id} isMe={isMe} isMobile={isMobile} onReply={() => setReplyingTo(msg)} onLongPress={() => setActiveMenuId(msg.id)}>
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group/msg relative w-full`}>
                  
                  {msg.replyTo && (
                      <div className={`mb-1 px-3 py-1 rounded-xl text-[10px] opacity-60 flex items-center gap-1 max-w-[70%] ${isMe ? 'bg-blue-600/20 text-blue-200' : 'bg-slate-500/20 text-slate-400'}`}>
                          <ArrowUturnLeftIcon className="w-2.5 h-2.5"/><span className="truncate">{msg.replyTo.isUnsent ? "Message unsent" : (msg.replyTo.fileType ? `[${msg.replyTo.fileType}]` : msg.replyTo.text)}</span>
                      </div>
                  )}

                  <div className={`flex items-end gap-2 max-w-full relative ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      
                      <div className="flex flex-col gap-1 relative max-w-[80%]">
                          {msg.isPinned && <span className={`text-[9px] font-bold text-yellow-500 uppercase tracking-wider mb-0.5 ${isMe ? 'text-right mr-2' : 'ml-2'}`}>📌 Pinned</span>}
                          
                          {msg.isUnsent ? (
                              <div className={`px-4 py-3 rounded-[1.5rem] text-[12px] italic border ${isMe ? 'text-slate-400 border-slate-200 dark:border-slate-700 rounded-br-none' : 'text-slate-400 border-slate-200 dark:border-slate-700 rounded-bl-none'}`}>
                                  Message unsent
                              </div>
                          ) : (
                              <>
                                  {/* Bubble Chat Media Rendering */}
                                  {msg.fileUrl && (
                                      <div className={`overflow-hidden rounded-2xl ${isMedia ? 'bg-transparent' : (isMe ? 'bg-blue-600' : darkMode ? 'bg-slate-800' : 'bg-white border border-slate-200')}`}>
                                          {msg.fileType === 'image' && <img src={msg.fileUrl} className="max-w-full max-h-40 object-cover rounded-2xl" alt="attachment" />}
                                          {msg.fileType === 'video' && <video src={msg.fileUrl} controls className="max-w-full max-h-40 rounded-2xl" />}
                                          {msg.fileType === 'file' && <a href={msg.fileUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-2 p-2 text-xs rounded-xl ${!isMe && 'bg-black/5'}`}><DocumentIcon className="w-5 h-5"/><span className="underline font-bold truncate">{msg.fileName}</span></a>}
                                      </div>
                                  )}
                                  {msg.text && (
                                      <div className={`px-4 py-3 rounded-[1.5rem] text-[12px] font-bold shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : darkMode ? 'bg-white/10 text-white rounded-bl-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'}`}>
                                        {msg.text}
                                      </div>
                                  )}
                              </>
                          )}
                      </div>

                      {/* DESKTOP HOVER ACTIONS */}
                      {!isMobile && (
                          <div className="hidden md:flex opacity-0 group-hover/msg:opacity-100 transition-opacity gap-1 mb-1">
                             <button onClick={() => setReplyingTo(msg)} className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-full shadow-sm"><ArrowUturnLeftIcon className="w-3.5 h-3.5"/></button>
                             <div className="relative">
                                <button onClick={(e) => {e.stopPropagation(); setActiveMenuId(activeMenuId === msg.id ? null : msg.id)}} className="p-1 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full shadow-sm"><EllipsisVerticalIcon className="w-3.5 h-3.5"/></button>
                             </div>
                          </div>
                      )}

                      {/* FIXED MENU FOR BOTH DESKTOP & MOBILE */}
                      {activeMenuId === msg.id && (
                          <div className={`absolute z-50 bottom-full mb-1 ${isMe ? 'right-8' : 'left-8'} w-36 bg-white dark:bg-slate-800 shadow-xl rounded-xl border ${darkMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden text-[11px] font-bold animate-in zoom-in-95`}>
                              <button onClick={(e) => {e.stopPropagation(); setReplyingTo(msg); setActiveMenuId(null)}} className="w-full text-left px-3 py-2.5 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 border-b border-black/5 dark:border-white/5">Reply to</button>
                              <button onClick={(e) => {e.stopPropagation(); togglePinMessage(msg.id, msg.isPinned); setActiveMenuId(null)}} className={`w-full text-left px-3 py-2.5 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 border-b border-black/5 dark:border-white/5 ${msg.isPinned ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>{msg.isPinned ? "Unpin message" : "Pin a message"}</button>
                              {isMe && !msg.isUnsent && (
                                  <button onClick={(e) => {e.stopPropagation(); unsendMessage(msg.id); setActiveMenuId(null)}} className="w-full text-left px-3 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">Unsend</button>
                              )}
                          </div>
                      )}

                  </div>
                  
                  {showTime && (
                    <span className="text-[9px] font-black uppercase text-slate-400 mt-2 px-1">
                      {formatChatTime(msg.createdAt)} {isMe && msg.isRead && " • Seen"}
                    </span>
                  )}
                </div>
            </SwipeableMessage>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className={`border-t flex flex-col shrink-0 ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50'}`} onClick={() => setActiveMenuId(null)}>
        
        {/* Reply Preview */}
        {replyingTo && (
            <div className={`flex items-center justify-between p-2 text-[10px] font-bold border-b border-blue-500/20 bg-blue-500/10 text-blue-500`}>
                <span className="truncate">Replying to {replyingTo.senderId === auth.currentUser.uid ? "Yourself" : activeChat.name}: {replyingTo.isUnsent ? "Message unsent" : (replyingTo.fileType ? `[${replyingTo.fileType}]` : replyingTo.text)}</span>
                <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-blue-500/20 rounded-full"><XMarkIcon className="w-3 h-3"/></button>
            </div>
        )}

        {/* NEW: Attachment Preview in Bubble Chat */}
        {attachment && (
            <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-2">
                    {attachment.type.startsWith('image/') ? <PhotoIcon className="w-4 h-4 text-blue-500"/> : <DocumentIcon className="w-4 h-4 text-blue-500"/>}
                    <span className="text-[10px] font-bold text-blue-500 truncate max-w-[150px]">{attachment.name}</span>
                </div>
                <button type="button" onClick={() => {setAttachment(null); fileInputRef.current.value = "";}} className="p-1 text-slate-500 hover:text-red-500"><XMarkIcon className="w-3 h-3"/></button>
            </div>
        )}

        <form onSubmit={handleSendMessage} className="p-3 flex gap-2 items-center">
            {/* NEW: Attachment Input in Bubble Chat */}
            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setAttachment(e.target.files[0])} />
            <button type="button" onClick={() => fileInputRef.current.click()} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-slate-500">
                <PaperClipIcon className="w-5 h-5"/>
            </button>

            <input 
              autoFocus value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-transparent px-2 text-[11px] font-bold uppercase tracking-widest outline-none"
            />
            <button type="submit" disabled={(!newMessage.trim() && !attachment) || isUploading} className="p-2.5 bg-blue-600 text-white rounded-xl active:scale-95 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50">
              {isUploading ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <PaperAirplaneIcon className="w-4 h-4" />}
            </button>
        </form>
      </div>
    </div>
  );
}