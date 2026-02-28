import React, { useState, useRef } from "react";
import { ArrowUturnLeftIcon, DocumentIcon, EllipsisVerticalIcon, PhotoIcon } from "@heroicons/react/24/outline";

export const SwipeableMessage = ({ isMe, isMobile, onReply, onLongPress, isActive, children }) => {
    const [touchStartPos, setTouchStartPos] = useState(null);
    const [offset, setOffset] = useState(0);
    const pressTimer = useRef(null);
    const isSwiping = useRef(false);

    if (!isMobile) return <div className={`relative w-full group/msg ${isActive ? 'z-[100]' : 'z-0'}`}>{children}</div>;

    const onTouchStart = (e) => {
        const touch = e.targetTouches[0];
        const clientY = touch.clientY;
        const target = e.currentTarget;
        setTouchStartPos({ x: touch.clientX, y: clientY });
        isSwiping.current = false;
        
        pressTimer.current = setTimeout(() => {
            if (!isSwiping.current) {
                const container = target.closest('.overflow-y-auto, .hide-scrollbar');
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
            className={`relative touch-pan-y w-full group/msg ${isActive ? 'z-[100]' : 'z-0'}`}
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

export default function MessageBubble({
    msg, isMe, isMobile, darkMode, myPic, otherPic, senderName, statusText,
    formatTime, setLightboxUrl, setReplyingTo, togglePinMessage, unsendMessage,
    activeMenuId, setActiveMenuId, menuPosition, setMenuPosition
}) {
    if (msg.type === 'system') {
        return <div className={`text-center text-[10px] font-bold uppercase tracking-widest opacity-40 my-4 ${darkMode ? 'text-slate-400' : 'text-blue-800'}`}>{msg.text}</div>;
    }

    const isMedia = msg.fileType === 'image' || msg.fileType === 'video';
    const isActive = activeMenuId === msg.id;

    const handleReply = (e) => {
        e.preventDefault(); e.stopPropagation();
        setReplyingTo({ id: msg.id, text: msg.text, senderId: msg.senderId, fileType: msg.fileType, isUnsent: msg.isUnsent });
        setActiveMenuId(null);
    };

    const handlePin = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (togglePinMessage) togglePinMessage(msg.id, msg.isPinned);
        setActiveMenuId(null);
    };

    const handleUnsend = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (unsendMessage) unsendMessage(msg.id);
        setActiveMenuId(null);
    };

    return (
        <SwipeableMessage
            isMe={isMe}
            isMobile={isMobile}
            isActive={isActive}
            onReply={handleReply}
            onLongPress={(pos) => { setMenuPosition(pos); setActiveMenuId(msg.id); }}
        >
            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} relative w-full`}>
                
                {/* 1. Replied Message Preview (EXPLICITLY SOFT GRAY FOR CONTACT USER) */}
                {msg.replyTo && (
                    <div className={`mb-1 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 max-w-[250px] border 
                        ${isMe 
                            ? 'bg-blue-50 text-blue-500 border-blue-100 dark:bg-slate-700 dark:text-blue-300 dark:border-white/10' 
                            : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-white/10 dark:text-slate-400'
                        }`}>
                        <ArrowUturnLeftIcon className={`w-3.5 h-3.5 shrink-0 ${isMe ? 'text-blue-500' : 'text-slate-400'}`}/>
                        <span className={`truncate ${isMe ? 'text-blue-600 dark:text-blue-300' : 'text-slate-500 dark:text-slate-300'}`}>
                            {msg.replyTo.isUnsent ? "Message unsent" : (msg.replyTo.type === 'image' || msg.replyTo.fileType === 'image' ? 'Image' : msg.replyTo.type === 'video' || msg.replyTo.fileType === 'video' ? 'Video' : msg.replyTo.text)}
                        </span>
                    </div>
                )}
                
                {/* 2. Message Body & Avatar */}
                <div className={`flex items-end gap-2 max-w-[85%] relative ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-6 h-6 rounded-full overflow-hidden shrink-0 shadow-sm flex items-center justify-center text-[9px] font-black uppercase ${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}`}> 
                        {isMe ? (myPic ? <img src={myPic} className="w-full h-full object-cover" alt="Me" /> : "M") : (otherPic ? <img src={otherPic} className="w-full h-full object-cover" alt="Other" /> : (senderName?.charAt(0) || "U"))} 
                    </div>
                    
                    <div className="flex flex-col gap-1 relative">
                        {msg.isPinned && <span className={`text-[9px] font-bold text-yellow-500 uppercase tracking-wider mb-0.5 ${isMe ? 'text-right mr-2' : 'ml-2'}`}>📌 Pinned</span>}
                        {msg.isUnsent ? (
                            <div className={`px-3 py-2.5 rounded-2xl text-[12.5px] shadow-sm italic border ${isMe ? 'bg-transparent text-slate-400 border-slate-300 dark:border-slate-600 rounded-br-none' : 'bg-transparent text-slate-400 border-slate-300 dark:border-slate-600 rounded-bl-none'}`}>Message unsent</div>
                        ) : (
                            <>
                                {msg.fileUrl && (
                                    <div className={`overflow-hidden rounded-2xl ${isMedia ? 'bg-transparent shadow-md' : (isMe ? 'bg-blue-600 shadow-md' : 'shadow-sm border ' + (darkMode ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'))}`}>
                                        {msg.fileType === 'image' && <img src={msg.fileUrl} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLightboxUrl && setLightboxUrl(msg.fileUrl); }} className="max-w-full max-h-48 object-cover rounded-2xl cursor-pointer hover:opacity-90 relative z-10" alt="Attachment" />}
                                        {msg.fileType === 'video' && <video src={msg.fileUrl} controls className="max-w-full max-h-48 rounded-2xl" />}
                                        {msg.fileType === 'file' && <a href={msg.fileUrl} target="_blank" rel="noreferrer" className={`p-3 text-[11px] font-bold underline truncate flex items-center gap-2 ${isMe ? 'text-white' : (darkMode ? 'text-blue-400' : 'text-blue-600')}`}><DocumentIcon className="w-4 h-4"/>{msg.fileName}</a>}
                                    </div>
                                )}
                                {msg.text && (
                                    <div className={`px-3 py-2.5 rounded-2xl text-[13px] font-medium leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-br-none shadow-md' : (darkMode ? 'bg-slate-800 text-white rounded-bl-none border border-white/10 shadow-sm' : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm')}`}>
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Desktop Menu Hover Buttons */}
                    {!isMobile && (
                        <div className="hidden md:flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity mb-2">
                            <button onClick={handleReply} className={`p-1.5 rounded-full shadow-sm transition-colors border ${darkMode ? 'text-blue-400 bg-slate-800 hover:bg-slate-700 border-white/10' : 'text-blue-600 bg-white hover:bg-slate-50 border-slate-200'}`} title="Reply"><ArrowUturnLeftIcon className="w-3.5 h-3.5"/></button>
                            <div className="relative">
                                <button onClick={(e) => {
                                    e.stopPropagation(); 
                                    const container = e.currentTarget.closest('.overflow-y-auto, .hide-scrollbar');
                                    if (container) {
                                        const containerRect = container.getBoundingClientRect();
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setMenuPosition((rect.top - containerRect.top) < 180 ? 'bottom' : 'top');
                                    } else {
                                        setMenuPosition(e.clientY < window.innerHeight / 2 ? 'bottom' : 'top');
                                    }
                                    setActiveMenuId(isActive ? null : msg.id);
                                }} className={`p-1.5 rounded-full shadow-sm transition-colors border ${darkMode ? 'text-slate-400 bg-slate-800 hover:bg-slate-700 border-white/10' : 'text-blue-600 bg-white hover:bg-slate-50 border-slate-200'}`} title="More"><EllipsisVerticalIcon className="w-3.5 h-3.5"/></button>
                            </div>
                        </div>
                    )}

                    {/* Context Menu (Mobile Hold / Desktop Click) */}
                    {isActive && (
                        <div className={`absolute z-[200] ${menuPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'} ${isMe ? 'right-12' : 'left-12'} w-40 shadow-xl rounded-xl border overflow-hidden text-xs font-bold animate-in zoom-in-95 backdrop-blur-xl ${darkMode ? 'border-white/10 bg-slate-900/95 text-white' : 'border-slate-200 bg-white/95 text-slate-800'}`}>
                            <button onPointerDown={handleReply} onClick={handleReply} className={`w-full text-left px-4 py-3 border-b ${darkMode ? 'border-white/10 hover:bg-white/10' : 'border-slate-100 hover:bg-slate-50'}`}>Reply to</button>
                            {togglePinMessage && (
                                <button onPointerDown={handlePin} onClick={handlePin} className={`w-full text-left px-4 py-3 border-b ${darkMode ? 'border-white/10 hover:bg-white/10' : 'border-slate-100 hover:bg-slate-50'} ${msg.isPinned ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>{msg.isPinned ? "Unpin message" : "Pin message"}</button>
                            )}
                            {isMe && !msg.isUnsent && unsendMessage && (
                                <button onPointerDown={handleUnsend} onClick={handleUnsend} className={`w-full text-left px-4 py-3 text-red-500 transition-colors ${darkMode ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50'}`}>Unsend</button>
                            )}
                        </div>
                    )}
                </div>
                
                <p className={`text-[9px] font-bold mt-1.5 opacity-40 select-none flex items-center gap-1.5 ${isMe ? 'justify-end mr-12' : 'justify-start ml-12'}`}>
                    <span>{formatTime(msg.createdAt)}</span>
                    {isMe && !msg.isUnsent && statusText && (
                        <><span>•</span><span className={statusText === 'Seen' ? (darkMode ? 'text-blue-400' : 'text-blue-600') : ''}>{statusText}</span></>
                    )}
                </p>
            </div>
        </SwipeableMessage>
    );
}