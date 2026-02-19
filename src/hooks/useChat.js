// src/hooks/useChat.js
import { useState, useEffect, useRef } from "react";
import { 
  collection, query, where, onSnapshot, addDoc, 
  serverTimestamp, setDoc, doc, updateDoc, increment, getDoc 
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth } from "../firebase/config"; 

export const useChat = (currentUser, isMobile) => {
  // State
  const [activeChat, setActiveChat] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [openBubbles, setOpenBubbles] = useState([]);
  
  // UI State
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isBubbleExpanded, setIsBubbleExpanded] = useState(false);
  const [activeBubbleView, setActiveBubbleView] = useState('inbox');
  const [chatStatus, setChatStatus] = useState({ isOnline: false, lastSeen: null });

  // Refs
  const scrollRef = useRef(null);

  // 1. Fetch Conversations
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "conversations"), where("participants", "array-contains", currentUser.uid));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const convos = snap.docs.map(d => {
        const data = d.data();
        const otherId = data.participants.find(p => p !== currentUser.uid);
        return { id: d.id, ...data, otherId };
      });
      convos.sort((a, b) => (b.lastTimestamp?.seconds || 0) - (a.lastTimestamp?.seconds || 0));
      setConversations(convos);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // 2. Determine Effective Chat ID (Mobile vs Desktop)
  const effectiveActiveChatId = (isBubbleVisible && isMobile) 
    ? (activeBubbleView !== 'inbox' ? activeBubbleView : null) 
    : activeChat?.id;

  // 3. Fetch Messages & Mark Read
  useEffect(() => {
    if (!effectiveActiveChatId || !currentUser) return;
    
    const chatId = [currentUser.uid, effectiveActiveChatId].sort().join("_");

    // Mark as read
    if ((!isMobile && !isChatMinimized) || (isMobile && isBubbleVisible && isBubbleExpanded)) {
       updateDoc(doc(db, "conversations", chatId), { [`unread_${currentUser.uid}`]: 0 }).catch(() => {});
    }

    // Listen to messages
    const qChat = query(collection(db, "messages"), where("chatId", "==", chatId));
    const unsubChat = onSnapshot(qChat, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    // Listen to User Status
    const unsubStatus = onSnapshot(doc(db, "applicants", effectiveActiveChatId), (snap) => {
        if(snap.exists()) setChatStatus({ isOnline: snap.data().isOnline, lastSeen: snap.data().lastSeen });
    });

    return () => { unsubChat(); unsubStatus(); };
  }, [effectiveActiveChatId, isChatMinimized, isBubbleVisible, isBubbleExpanded, currentUser, isMobile]);

  // 4. Send Message Handler
  const sendMessage = async (text, attachment, replyingTo) => {
    if ((!text.trim() && !attachment) || !effectiveActiveChatId) return;
    
    const chatId = [currentUser.uid, effectiveActiveChatId].sort().join("_");
    let fileUrl = null, fileType = 'text', fileName = null;

    if (attachment) {
      const storage = getStorage();
      const storageRef = ref(storage, `chat_attachments/${chatId}/${Date.now()}_${attachment.name}`);
      const uploadTask = await uploadBytes(storageRef, attachment);
      fileUrl = await getDownloadURL(uploadTask.ref);
      fileName = attachment.name;
      fileType = attachment.type.startsWith('image/') ? 'image' : 'file';
    }

    await addDoc(collection(db, "messages"), {
      chatId, text, senderId: currentUser.uid, receiverId: effectiveActiveChatId, createdAt: serverTimestamp(),
      fileUrl, fileType, fileName,
      replyTo: replyingTo || null
    });

    await setDoc(doc(db, "conversations", chatId), {
      chatId, lastMessage: fileType !== 'text' ? `Sent a ${fileType}` : text, lastTimestamp: serverTimestamp(),
      participants: [currentUser.uid, effectiveActiveChatId],
      [`unread_${effectiveActiveChatId}`]: increment(1),
    }, { merge: true });
  };

  // 5. Bubble Management Actions
  const openChat = (user) => {
    setActiveChat(user);
    setIsChatMinimized(false);
    if (!openBubbles.find(b => b.id === user.id)) {
        setOpenBubbles(prev => [user, ...prev]); 
    }
  };

  const closeChat = () => {
     setActiveChat(null);
     setIsChatMinimized(true);
  };

  return {
    // State
    activeChat, 
    setActiveChat, // <--- ADDED THIS EXPORT
    messages, 
    conversations, 
    openBubbles, 
    setOpenBubbles, // <--- ADDED THIS EXPORT
    
    // UI State
    isBubbleVisible, setIsBubbleVisible,
    isChatMinimized, setIsChatMinimized,
    isBubbleExpanded, setIsBubbleExpanded,
    activeBubbleView, setActiveBubbleView,
    chatStatus, scrollRef,
    
    // Actions
    sendMessage, openChat, closeChat,
    
    // Derived
    effectiveActiveChatId
  };
};