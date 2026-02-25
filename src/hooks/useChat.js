// src/hooks/useChat.js
import { useState, useEffect, useRef } from "react";
import { 
  collection, query, where, onSnapshot, addDoc, 
  serverTimestamp, setDoc, doc, updateDoc, increment, getDoc,
  deleteDoc, writeBatch, getDocs 
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../firebase/config"; 

export const useChat = (currentUser, isMobile) => {
  const [activeChat, setActiveChat] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [openBubbles, setOpenBubbles] = useState([]);
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isBubbleExpanded, setIsBubbleExpanded] = useState(false);
  const [activeBubbleView, setActiveBubbleView] = useState('inbox');
  
  const [otherUserData, setOtherUserData] = useState(null);
  const [chatStatus, setChatStatus] = useState({ isOnline: false, lastSeen: null });
  const scrollRef = useRef(null);

  // 1. Fetch Conversations
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "conversations"), where("participants", "array-contains", currentUser.uid));
    
    const unsubscribe = onSnapshot(q, async (snap) => {
      // FIX: Dynamically fetch missing names and profile pics for all conversations
      const convos = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        const otherId = data.participants.find(p => p !== currentUser.uid);
        
        let name = data.names?.[otherId];
        let profilePic = data.profilePics?.[otherId];
        
        // If data is missing from the conversation document, fetch it dynamically!
        if (!name || !profilePic) {
            try {
                let userSnap = await getDoc(doc(db, "applicants", otherId));
                if (!userSnap.exists()) {
                    userSnap = await getDoc(doc(db, "employers", otherId));
                }
                if (userSnap.exists()) {
                    const uData = userSnap.data();
                    if (!name) name = `${uData.firstName || ""} ${uData.lastName || ""}`.trim() || uData.companyName || "User";
                    if (!profilePic) profilePic = uData.profilePic || uData.photoURL || uData.logo || null;
                }
            } catch (err) {
                console.error("Failed to fetch user details for chat", err);
            }
        }
        
        return { 
            id: d.id, 
            ...data, 
            otherId,
            names: { ...(data.names || {}), [otherId]: name || "User" },
            profilePics: { ...(data.profilePics || {}), [otherId]: profilePic || null }
        };
      }));
      
      convos.sort((a, b) => (b.lastTimestamp?.seconds || 0) - (a.lastTimestamp?.seconds || 0));
      setConversations(convos);
    });
    
    return () => unsubscribe();
  }, [currentUser]);

  const effectiveActiveChatId = (isBubbleVisible && isMobile) 
    ? (activeBubbleView !== 'inbox' ? activeBubbleView : null) 
    : activeChat?.id;

  // 2. Fetch Active Chat Messages and LIVE User Data
  useEffect(() => {
    if (!effectiveActiveChatId || !currentUser) {
        setOtherUserData(null);
        return;
    }
    
    const chatId = [currentUser.uid, effectiveActiveChatId].sort().join("_");

    // Clear unread count when viewing
    if ((!isMobile && !isChatMinimized) || (isMobile && isBubbleVisible && isBubbleExpanded)) {
       updateDoc(doc(db, "conversations", chatId), { [`unread_${currentUser.uid}`]: 0 }).catch(() => {});
    }

   // Fetch Messages
    const qChat = query(collection(db, "messages"), where("chatId", "==", chatId));
    const unsubChat = onSnapshot(qChat, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // FIX: Sort ascending (oldest to newest) AND handle Firebase's temporary null timestamps 
      // by defaulting them to Date.now() so they instantly appear at the bottom!
      msgs.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || Date.now();
          const timeB = b.createdAt?.toMillis?.() || Date.now();
          return timeA - timeB;
      });
      
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    // --- FIX: FETCH LIVE NAME, PICTURE AND SUPPORT EMPLOYERS ---
    let unsubStatus = () => {};

    const fetchUserData = async () => {
        let userSnap = await getDoc(doc(db, "applicants", effectiveActiveChatId));
        let collectionName = "applicants";
        
        if (!userSnap.exists()) {
            userSnap = await getDoc(doc(db, "employers", effectiveActiveChatId));
            collectionName = "employers";
        }
        
        if (userSnap.exists()) {
            const data = userSnap.data();
            setOtherUserData({
                id: effectiveActiveChatId,
                name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.companyName || "User",
                profilePic: data.profilePic || data.photoURL || data.logo || null,
                isOnline: data.isOnline,
                lastSeen: data.lastSeen
            });
            setChatStatus({ isOnline: data.isOnline, lastSeen: data.lastSeen });
            
            // Listen to the CORRECT collection for real-time status updates
            unsubStatus = onSnapshot(doc(db, collectionName, effectiveActiveChatId), (snap) => {
                if(snap.exists()) setChatStatus({ isOnline: snap.data().isOnline, lastSeen: snap.data().lastSeen });
            });
        }
    };

    fetchUserData();

    return () => { unsubChat(); unsubStatus(); };
  }, [effectiveActiveChatId, isChatMinimized, isBubbleVisible, isBubbleExpanded, currentUser, isMobile]);

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

  const unsendMessage = async (messageId) => {
    try {
      await updateDoc(doc(db, "messages", messageId), {
        isUnsent: true,
        text: "Message unsent",
        fileUrl: null,
        fileType: 'text',
        fileName: null
      });
    } catch (err) { console.error(err); }
  };

  const deleteChat = async (otherUserId) => {
    if (!currentUser || !otherUserId) return;
    const chatId = [currentUser.uid, otherUserId].sort().join("_");
    try {
      await deleteDoc(doc(db, "conversations", chatId));
      const q = query(collection(db, "messages"), where("chatId", "==", chatId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      setActiveChat(null);
    } catch (err) { console.error(err); }
  };

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
    activeChat, setActiveChat, messages, conversations, openBubbles, setOpenBubbles,
    isBubbleVisible, setIsBubbleVisible, isChatMinimized, setIsChatMinimized,
    isBubbleExpanded, setIsBubbleExpanded, activeBubbleView, setActiveBubbleView,
    chatStatus, scrollRef, effectiveActiveChatId, otherUserData, 
    sendMessage, openChat, closeChat, 
    unsendMessage, deleteChat 
  };
};