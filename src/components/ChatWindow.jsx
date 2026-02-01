import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase/config";
import { 
  collection, query, where, onSnapshot, 
  addDoc, serverTimestamp, orderBy, updateDoc, doc, getDocs, writeBatch
} from "firebase/firestore";
import { 
  XMarkIcon, PaperAirplaneIcon, MinusIcon, ChatBubbleLeftRightIcon 
} from "@heroicons/react/24/outline";

// Helper to format timestamps like Messenger
const formatChatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffInHours < 48) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

export default function ChatWindow({ activeChat, darkMode, isMinimized, setIsMinimized, setActiveChat }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef(null);

  // 1. Mark messages as READ when activeChat changes or window is opened
  useEffect(() => {
    if (!activeChat || isMinimized || !auth.currentUser) return;

    const markAsRead = async () => {
      const chatId = [auth.currentUser.uid, activeChat.id].sort().join("_");
      const unreadQuery = query(
        collection(db, "messages"),
        where("chatId", "==", chatId),
        where("receiverId", "==", auth.currentUser.uid),
        where("isRead", "==", false)
      );

      const querySnapshot = await getDocs(unreadQuery);
      const batch = writeBatch(db);
      querySnapshot.forEach((d) => {
        batch.update(doc(db, "messages", d.id), { isRead: true });
      });
      await batch.commit();
    };

    markAsRead();
  }, [activeChat, isMinimized, messages.length]); // Re-run when new messages arrive

  // 2. Fetch Messages
  useEffect(() => {
    if (!activeChat || !auth.currentUser) return;

    const chatId = [auth.currentUser.uid, activeChat.id].sort().join("_");
    
    const qChat = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      orderBy("createdAt", "asc")
    );

    const unsubChat = onSnapshot(qChat, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => unsubChat();
  }, [activeChat]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const chatId = [auth.currentUser.uid, activeChat.id].sort().join("_");
    try {
      await addDoc(collection(db, "messages"), {
        chatId,
        text: newMessage,
        senderId: auth.currentUser.uid,
        receiverId: activeChat.id,
        createdAt: serverTimestamp(),
        isRead: false, // Added for notification system
      });
      setNewMessage("");
    } catch (err) { console.error("Chat Error:", err); }
  };

  if (!activeChat) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-24 md:bottom-8 right-6 z-[200]">
        <button 
          onClick={() => setIsMinimized(false)}
          className="w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all relative"
        >
          <ChatBubbleLeftRightIcon className="w-7 h-7" />
          {/* Notification Badge Example */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-24 md:bottom-8 right-6 z-[200] w-[90vw] md:w-96 h-[500px] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-blue-500/20 ${darkMode ? 'bg-slate-900 shadow-black/50' : 'bg-white shadow-blue-500/10'}`}>
      {/* Header */}
      <div className="p-5 bg-blue-600 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-black text-xs">{activeChat.name?.charAt(0)}</div>
          <div className="flex flex-col">
            <span className="font-black text-[10px] uppercase tracking-widest leading-none">{activeChat.name}</span>
            <span className="text-[8px] opacity-70 font-bold uppercase mt-1">Active Now</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><MinusIcon className="w-5 h-5"/></button>
          <button onClick={() => setActiveChat(null)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><XMarkIcon className="w-5 h-5"/></button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => {
          const isMe = msg.senderId === auth.currentUser.uid;
          const showTime = index === messages.length - 1 || messages[index+1]?.senderId !== msg.senderId;

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-[1.5rem] text-[12px] font-bold shadow-sm ${
                isMe 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : darkMode ? 'bg-white/10 text-white rounded-bl-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'
              }`}>
                {msg.text}
              </div>
              {/* Timestamp displayed under the last message of a group */}
              {showTime && (
                <span className="text-[9px] font-black uppercase text-slate-400 mt-2 px-1">
                  {formatChatTime(msg.createdAt)}
                  {isMe && msg.isRead && " • Seen"}
                </span>
              )}
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className={`p-4 border-t flex gap-2 ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50'}`}>
        <input 
          autoFocus
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-transparent px-4 text-[11px] font-bold uppercase tracking-widest outline-none"
        />
        <button type="submit" className="p-3 bg-blue-600 text-white rounded-xl active:scale-95 transition-all shadow-lg shadow-blue-600/20">
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}