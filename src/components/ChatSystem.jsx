// components/ChatSystem.jsx
import React, { useState, useRef } from "react";
import { 
  ChatBubbleOvalLeftEllipsisIcon, XMarkIcon, PaperAirplaneIcon, 
  PaperClipIcon, PhotoIcon, DocumentIcon 
} from "@heroicons/react/24/outline";

export default function ChatSystem({ chat, currentUser, darkMode }) {
  const {
    activeChat, messages, openBubbles, isBubbleVisible, isBubbleExpanded, 
    isChatMinimized, activeBubbleView, chatStatus, scrollRef,
    setIsBubbleVisible, setIsBubbleExpanded, setActiveBubbleView, 
    sendMessage, closeChat
  } = chat; // Use the object returned from the hook

  // Local State for Inputs
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // --- MOBILE DRAG LOGIC (Local to UI) ---
  const [bubblePos, setBubblePos] = useState({ x: window.innerWidth - 70, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e) => {
    setIsDragging(true);
    const touch = e.touches[0];
    dragOffset.current = { x: touch.clientX - bubblePos.x, y: touch.clientY - bubblePos.y };
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setBubblePos({ 
        x: Math.min(window.innerWidth - 60, Math.max(0, touch.clientX - dragOffset.current.x)), 
        y: Math.min(window.innerHeight - 100, Math.max(0, touch.clientY - dragOffset.current.y)) 
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    await sendMessage(newMessage, attachment);
    setNewMessage("");
    setAttachment(null);
    setIsUploading(false);
  };

  // --- RENDER HELPERS ---
  const glassPanel = `backdrop-blur-xl border ${darkMode ? 'bg-slate-900/90 border-white/10 text-white' : 'bg-white/90 border-slate-200 text-slate-800'}`;

  // If chat is completely closed/hidden
  if (!activeChat && !isBubbleVisible && openBubbles.length === 0) return null;

  return (
    <>
      {/* --- MOBILE BUBBLE --- */}
      {isBubbleVisible && (
        <div 
            style={{ top: bubblePos.y, left: bubblePos.x }} 
            className="fixed z-[999] touch-none"
            onTouchStart={handleTouchStart} 
            onTouchMove={handleTouchMove} 
            onTouchEnd={() => setIsDragging(false)}
        >
            {!isBubbleExpanded && (
                <button 
                    onClick={() => !isDragging && setIsBubbleExpanded(true)}
                    className="w-14 h-14 rounded-full shadow-2xl bg-blue-600 flex items-center justify-center text-white"
                >
                    <ChatBubbleOvalLeftEllipsisIcon className="w-7 h-7" />
                </button>
            )}
        </div>
      )}

      {/* --- DESKTOP CHAT WINDOW --- */}
      {(!isChatMinimized && activeChat) && (
        <div className={`fixed bottom-0 right-8 w-80 h-[500px] rounded-t-2xl shadow-2xl flex flex-col z-[500] ${glassPanel}`}>
           {/* HEADER */}
           <div className="p-4 border-b flex justify-between items-center bg-blue-600 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                    {activeChat.name.charAt(0)}
                 </div>
                 <div>
                    <h3 className="font-bold text-sm">{activeChat.name}</h3>
                    <p className="text-[10px] opacity-80">{chatStatus.isOnline ? 'Online' : 'Offline'}</p>
                 </div>
              </div>
              <button onClick={closeChat}><XMarkIcon className="w-5 h-5"/></button>
           </div>

           {/* MESSAGES */}
           <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
              {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.senderId === currentUser.uid ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-800'}`}>
                          {msg.fileUrl && <img src={msg.fileUrl} className="mb-2 rounded-lg max-h-32"/>}
                          <p>{msg.text}</p>
                      </div>
                  </div>
              ))}
              <div ref={scrollRef} />
           </div>

           {/* INPUT */}
           <form onSubmit={handleSend} className="p-3 border-t flex gap-2 items-center">
              <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setAttachment(e.target.files[0])} />
              <button type="button" onClick={() => fileInputRef.current.click()} className="p-2 hover:bg-black/5 rounded-full">
                  <PaperClipIcon className="w-5 h-5 opacity-50"/>
              </button>
              <input 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm"
                  placeholder="Type a message..."
              />
              <button disabled={isUploading} type="submit" className="p-2 text-blue-600">
                  <PaperAirplaneIcon className="w-5 h-5"/>
              </button>
           </form>
           {attachment && (
              <div className="absolute bottom-16 left-4 right-4 p-2 bg-blue-100 dark:bg-slate-800 rounded-lg text-xs flex justify-between">
                  <span className="truncate">{attachment.name}</span>
                  <button onClick={() => setAttachment(null)}><XMarkIcon className="w-4 h-4"/></button>
              </div>
           )}
        </div>
      )}
    </>
  );
}