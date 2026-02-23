import { useState, useEffect, useRef, cloneElement } from "react";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config"; 
import { createPortal } from "react-dom";
import { 
  collection, query, where, onSnapshot, orderBy,
  addDoc, serverTimestamp, setDoc, doc, updateDoc, deleteDoc, getDoc, getDocs, increment, arrayUnion
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// --- HOOKS ---
import { useChat } from "../hooks/useChat"; 

// --- ICONS ---
import { 
  BriefcaseIcon, XMarkIcon, 
  MapPinIcon, SunIcon, MoonIcon, 
  ChevronLeftIcon, ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon, PaperAirplaneIcon, EyeIcon,
  TrashIcon, CheckCircleIcon, CameraIcon, PencilSquareIcon, 
  PlusIcon, UsersIcon, ClockIcon, UserIcon, AcademicCapIcon,
  CalendarDaysIcon, BoltIcon, 
  EllipsisHorizontalIcon, PaperClipIcon, ArrowUturnLeftIcon, 
  PhotoIcon, DocumentIcon, UserCircleIcon,
  EnvelopeIcon, SparklesIcon,
  ChevronDownIcon,
  ChatBubbleOvalLeftEllipsisIcon, PhoneIcon,
  BellIcon, QuestionMarkCircleIcon, IdentificationIcon, LockClosedIcon,
  MegaphoneIcon, CpuChipIcon, TagIcon, StarIcon as StarIconOutline,
  Cog8ToothIcon, HomeIcon, UserGroupIcon, WrenchScrewdriverIcon, BookmarkIcon, Bars3BottomRightIcon,
  EllipsisVerticalIcon
} from "@heroicons/react/24/outline";

import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

// --- SUB-COMPONENTS ---
import Sidebar from "../components/dashboard/employer/Sidebar";
import DiscoverTab from "../components/dashboard/employer/DiscoverTab";
import ListingsTab from "../components/dashboard/employer/ListingsTab";
import ApplicantsTab from "../components/dashboard/employer/ApplicantsTab";
import MessagesTab from "../components/dashboard/employer/MessagesTab";
import ProfileTab from "../components/dashboard/employer/ProfileTab";
import RatingsTab from "../components/dashboard/employer/RatingsTab";
import SupportTab from "../components/dashboard/employer/SupportTab";
import AnnouncementsTab from "../components/dashboard/employer/AnnouncementsTab";
import RateApplicantModal from "../components/dashboard/employer/RateApplicantModal";

// --- CONSTANTS ---
import { PUROK_LIST, JOB_CATEGORIES, ADMIN_EMAIL, JOB_TYPES, BOT_FAQ } from "../utils/employerConstants";

// --- UTILITIES ---
const splitByNewLine = (text) => {
    if (!text) return [];
    return text.split('\n').filter(line => line.trim() !== '');
};

const getAvatarUrl = (user) => {
  if (!user) return null;
  return user.profilePic || user.photoURL || user.photoUrl || user.avatar || user.image || null;
};

const formatTime = (ts) => { 
  if (!ts) return "Just now"; 
  const date = ts?.toDate ? ts.toDate() : new Date(); 
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); 
};

const formatLastSeen = (timestamp) => {
    if (!timestamp) return { text: "Offline", isOnline: false };
    const now = new Date();
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMins = Math.floor((now - date) / 60000);
    
    if (diffMins < 3) return { text: "Active Now", isOnline: true };
    if (diffMins < 60) return { text: `Last seen ${diffMins}m ago`, isOnline: false };
    if (diffMins < 1440) return { text: `Last seen ${Math.floor(diffMins/60)}h ago`, isOnline: false };
    return { text: "Offline", isOnline: false };
};

// --- STYLES ---
const glassPanel = (darkMode) => `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;
const glassNavBtn = (darkMode) => `relative p-3 rounded-xl transition-all duration-300 ease-out group ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-blue-500'}`;
const activeGlassNavBtn = (darkMode) => `relative p-3 rounded-xl transition-all duration-300 ease-out scale-110 -translate-y-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`;

// --- MOBILE SWIPE HELPER ---
const SwipeableMessage = ({ isMe, isMobile, onReply, onLongPress, children }) => {
    const [touchStartPos, setTouchStartPos] = useState(null);
    const [offset, setOffset] = useState(0);
    const pressTimer = useRef(null);
    const isSwiping = useRef(false);

    if (!isMobile) return <div className="relative w-full group">{children}</div>;

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
            className="relative touch-pan-y w-full group"
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

export default function EmployerDashboard() {
  const { userData } = useAuth(); 
  const [activeTab, setActiveTab] = useState("Discover"); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [loading, setLoading] = useState(false); 
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const togglePinMessage = async (msgId, currentPinnedStatus) => {
      try { await updateDoc(doc(db, "messages", msgId), { isPinned: !currentPinnedStatus }); } 
      catch (err) { console.error("Failed to pin message", err); }
  };

  // --- SUPPORT TICKET STATE ---
  const [supportTickets, setSupportTickets] = useState([]); 
  const [activeSupportTicket, setActiveSupportTicket] = useState(null); 
  const [ticketMessage, setTicketMessage] = useState("");
  const [supportAttachment, setSupportAttachment] = useState(null); 
  const [isSupportUploading, setIsSupportUploading] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [lastTicketCreatedAt, setLastTicketCreatedAt] = useState(0); 
  const [isBotTyping, setIsBotTyping] = useState(false);
  const ticketScrollRef = useRef(null);
  const supportFileRef = useRef(null); 

  // --- LOCAL BUBBLE & UI STATES ---
  const [isDesktopInboxVisible, setIsDesktopInboxVisible] = useState(false); 
  const [bubblePos, setBubblePos] = useState({ x: window.innerWidth - 80, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
    
  // --- INTEGRATED CHAT HOOK ---
  const chat = useChat(auth.currentUser, isMobile);
  const { 
    conversations, activeChat, openChat, closeChat, sendMessage, messages, setActiveChat,
    openBubbles, setOpenBubbles, isBubbleVisible, setIsBubbleVisible,
    isChatMinimized, setIsChatMinimized, isBubbleExpanded, setIsBubbleExpanded,
    activeBubbleView, setActiveBubbleView, scrollRef, unsendMessage
  } = chat;

  // Additional Chat UI States
  const [newMessage, setNewMessage] = useState("");
  const [isChatOptionsOpen, setIsChatOptionsOpen] = useState(false); 
  const [chatSearch, setChatSearch] = useState(""); 
  const [bubbleSearch, setBubbleSearch] = useState("");
  const [replyingTo, setReplyingTo] = useState(null); 
  const [attachment, setAttachment] = useState(null); 
  const [isUploading, setIsUploading] = useState(false); 
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const chatFileRef = useRef(null); 
  const bubbleFileRef = useRef(null);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
    
  // --- EMPLOYER SPECIFIC STATES ---
  const [announcements, setAnnouncements] = useState([]);
  const [lastReadAnnouncementId, setLastReadAnnouncementId] = useState(localStorage.getItem("lastReadAnnounce")); 
  const [myPostedJobs, setMyPostedJobs] = useState([]); 
  const [receivedApplications, setReceivedApplications] = useState([]); 
  const [searchTerm, setSearchTerm] = useState("");
  const [currentAnnounceIndex, setCurrentAnnounceIndex] = useState(0);

  useEffect(() => {
    if (announcements.length > 1) {
        const interval = setInterval(() => {
            setCurrentAnnounceIndex(prev => (prev + 1) % announcements.length);
        }, 5000); 
        return () => clearInterval(interval);
    }
  }, [announcements.length]);

  const displayAnnouncement = announcements[currentAnnounceIndex];
  const [isRatingApplicantModalOpen, setIsRatingApplicantModalOpen] = useState(false);
  const [selectedApplicantToRate, setSelectedApplicantToRate] = useState(null);
      
  // -- DISCOVER TALENT STATES --
  const [discoverTalents, setDiscoverTalents] = useState([]);
  const [talentSearch, setTalentSearch] = useState("");
  const [talentSitioFilter, setTalentSitioFilter] = useState(""); 
  const [talentCategoryFilter, setTalentCategoryFilter] = useState(""); 
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false); 
  const [isSitioDropdownOpen, setIsSitioDropdownOpen] = useState(false); 
  const [selectedTalent, setSelectedTalent] = useState(null); 

  // -- APPLICATIONS STATES --
  const [applicantSearch, setApplicantSearch] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null); 
  const [modalApplicant, setModalApplicant] = useState(null); 
  const [modalJob, setModalJob] = useState(null); 
  const [modalLoading, setModalLoading] = useState(false);
  
  // --- JOB MODAL STATES ---
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false); 
  const [isJobCategoryDropdownOpen, setIsJobCategoryDropdownOpen] = useState(false); 
  const [jobForm, setJobForm] = useState({ title: "", sitio: "", salary: "", type: "Full-time", description: "", category: "" }); 
  
  // --- PROFILE STATES ---
  const [profileImage, setProfileImage] = useState(null);
  const [imgScale, setImgScale] = useState(1);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [employerData, setEmployerData] = useState({ 
      firstName: "", lastName: "", sitio: "", title: "Employer", 
      aboutMe: "", workExperience: "", education: "", 
      verificationStatus: "pending" 
  });

  const [reviews, setReviews] = useState([]); 
  const [averageRating, setAverageRating] = useState(0); 

  const isVerified = employerData.verificationStatus === 'verified';
  const effectiveActiveChatUser = (isBubbleVisible && isMobile) ? openBubbles.find(b => b.id === activeBubbleView) : activeChat;
  const isFullScreenPage = isMobile && ((activeTab === "Messages" && activeChat) || (activeTab === "Support" && isSupportOpen));
  
  const filteredChats = conversations.filter(c => { const otherId = c.participants?.find(p => p !== auth.currentUser?.uid); if (adminUser && otherId === adminUser.id) return false; const name = c.names?.[otherId] || "User"; return name.toLowerCase().includes(chatSearch.toLowerCase()); });
  const bubbleFilteredChats = conversations.filter(c => { const otherId = c.participants?.find(p => p !== auth.currentUser?.uid); if (adminUser && otherId === adminUser.id) return false; const name = c.names?.[otherId] || "User"; return name.toLowerCase().includes(bubbleSearch.toLowerCase()); });

  // --- HELPERS & HANDLERS ---
  const markConversationAsRead = async (otherUserId) => {
      if (!auth.currentUser || !otherUserId) return;
      const myId = auth.currentUser.uid;
      const chatId = [myId, otherUserId].sort().join("_");
      try {
          const convRef = doc(db, "conversations", chatId);
          await updateDoc(convRef, { [`unread_${myId}`]: 0 });
      } catch (e) {}
  };

  const handleFileSelect = (e) => {
    if (e.target.files[0]) {
        setAttachment(e.target.files[0]);
    }
  };

  useEffect(() => {
    if(activeTab !== "Support") {
      setIsSupportOpen(false);
      setActiveSupportTicket(null);
    }
  }, [activeTab]);

  useEffect(() => {
    const isModalActive = selectedApplication !== null || selectedTalent !== null || isJobModalOpen || isEditingImage || lightboxUrl !== null || isBubbleExpanded;
    if (isModalActive) document.body.style.overflow = "hidden"; 
    else document.body.style.overflow = "auto";    
    return () => { document.body.style.overflow = "auto"; };
  }, [selectedApplication, selectedTalent, isJobModalOpen, isEditingImage, lightboxUrl, isBubbleExpanded]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
      if (!auth.currentUser) return;
      const ticketsQuery = query(collection(db, "support_tickets"), where("userId", "==", auth.currentUser.uid));
      const unsubTickets = onSnapshot(ticketsQuery, (snapshot) => {
          const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          tickets.sort((a, b) => (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0));
          setSupportTickets(tickets);
          setActiveSupportTicket(currentActiveTicket => {
              if (!currentActiveTicket) return null; 
              const updatedTicket = tickets.find(t => t.id === currentActiveTicket.id);
              return updatedTicket || currentActiveTicket;
          });
      });
      return () => unsubTickets();
  }, [auth.currentUser]);
        
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
      const fetchAdmin = async () => {
          try {
            let q = query(collection(db, "admins"), where("email", "==", ADMIN_EMAIL));
            let snap = await getDocs(q);
            if (!snap.empty) {
                const docData = snap.docs[0].data();
                setAdminUser({ id: snap.docs[0].id, collection: 'admins', ...docData });
            }
          } catch (e) {}
      };
      fetchAdmin();
  }, []);

  // FIX: Properly wipe bubbles to prevent ghost resurrects
  useEffect(() => {
    if (activeTab === "Messages" || activeTab === "Support") {
        setIsBubbleVisible(false);
        setIsBubbleExpanded(false);
        setIsDesktopInboxVisible(false);
        setOpenBubbles([]); 
    } else {
        if (typeof setActiveChat === 'function') setActiveChat(null); 
    }
  }, [activeTab, setActiveChat, setIsBubbleVisible, setIsBubbleExpanded, setIsDesktopInboxVisible, setOpenBubbles]);

  useEffect(() => {
     if(activeTab === "Discover") {
        const fetchTalents = async () => {
            try {
                const q = query(collection(db, "applicants"));
                const querySnapshot = await getDocs(q);
                const talents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const validTalents = talents.filter(t => t.firstName || t.lastName);
                setDiscoverTalents(validTalents);
            } catch (err) {}
        };
        fetchTalents();
     }
     if(activeTab === "Ratings") {
         const fetchReviews = () => {
             const q = query(collection(db, "reviews"), where("employerId", "==", auth.currentUser.uid), orderBy("createdAt", "desc"));
             const unsub = onSnapshot(q, (snap) => {
                 const revs = snap.docs.map(d => ({id: d.id, ...d.data()}));
                 setReviews(revs);
                 if(revs.length > 0) {
                     const total = revs.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0);
                     setAverageRating((total / revs.length).toFixed(1));
                 } else { setAverageRating(0); }
             });
             return unsub;
         };
         const unsubReviews = fetchReviews();
         return () => unsubReviews && unsubReviews();
     }
   }, [activeTab]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const userRef = doc(db, "employers", auth.currentUser.uid);
    const setOnline = async () => { try { await setDoc(userRef, { isOnline: true }, { merge: true }); } catch(e) {} };
    setOnline();
    const unsubProfile = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.profilePic) setProfileImage(data.profilePic);
        if (data.imgScale) setImgScale(data.imgScale);
        setEmployerData(prev => ({
            ...prev,
            firstName: data.firstName || userData?.firstName || "",
            lastName: data.lastName || userData?.lastName || "",
            sitio: data.sitio || data.location || "", 
            title: data.title || "Employer", 
            aboutMe: data.aboutMe || "",
            workExperience: data.workExperience || "",
            education: data.education || "",
            verificationStatus: data.verificationStatus || "pending" 
        }));
      }
    });
    return () => { unsubProfile(); setDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true }).catch(console.error); };
  }, [auth.currentUser, userData]);

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const qJobs = query(collection(db, "jobs"), where("employerId", "==", auth.currentUser.uid));
    const unsubJobs = onSnapshot(qJobs, (snap) => {
      const jobsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      jobsData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setMyPostedJobs(jobsData);
    });

    const qApps = query(collection(db, "applications"), where("employerId", "==", auth.currentUser.uid));
    const unsubApps = onSnapshot(qApps, (snap) => {
      const appsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      appsData.sort((a, b) => (b.appliedAt?.seconds || 0) - (a.appliedAt?.seconds || 0));
      setReceivedApplications(appsData);
    });

    const qAnnouncements = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const unsubAnnouncements = onSnapshot(qAnnouncements, (snap) => {
       setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubJobs(); unsubApps(); unsubAnnouncements(); };
  }, [auth.currentUser]);

  // FIX: Properly redirect to Messages tab without forcefully opening floating bubbles
  const handleStartChatFromExternal = (userObj) => {
    if (!isVerified) return alert("Your account must be verified to send messages.");
    const pic = getAvatarUrl(userObj) || userObj.profilePic;
    openChat({ ...userObj, profilePic: pic });
    markConversationAsRead(userObj.id);
    setIsChatMinimized(false);
    setActiveTab("Messages");
    setIsBubbleVisible(false);
    setIsBubbleExpanded(false);
    setIsDesktopInboxVisible(false);
  };

  const handleSendMessageWrapper = async (e) => {
    e.preventDefault();
    const targetChat = activeChat || (isBubbleVisible && activeBubbleView !== 'inbox' ? openBubbles.find(b => b.id === activeBubbleView) : null);
    if (!targetChat) return;
    
    const myId = auth.currentUser.uid;
    const otherId = targetChat.id;
    const chatId = [myId, otherId].sort().join("_");
    
    let recipientName = targetChat.name;
    let recipientPic = targetChat.profilePic;

    if (!recipientName || recipientName === "User" || recipientName === "Applicant" || !recipientPic) {
        try {
            const userSnap = await getDoc(doc(db, "applicants", otherId)); 
            if (userSnap.exists()) {
                const d = userSnap.data();
                const realName = `${d.firstName || ""} ${d.lastName || ""}`.trim();
                if(realName) recipientName = realName;
                if(d.profilePic) recipientPic = d.profilePic;
            }
        } catch (err) {}
    }
    
    const conversationMetaUpdate = {
        [`names.${myId}`]: displayName || "Employer", [`names.${otherId}`]: recipientName || "Applicant",
        [`profilePics.${myId}`]: profileImage || null, [`profilePics.${otherId}`]: recipientPic || null,
        participants: [myId, otherId]
    };
    
    if (!attachment) {
        if (!newMessage.trim()) return;
        if (activeChat || effectiveActiveChatUser) { 
             await sendMessage(newMessage, null, replyingTo); 
        } 
        await setDoc(doc(db, "conversations", chatId), { chatId, lastMessage: newMessage, lastTimestamp: serverTimestamp(), [`unread_${otherId}`]: increment(1), ...conversationMetaUpdate }, { merge: true });
        setNewMessage(""); setReplyingTo(null);
    } else {
        setIsUploading(true);
        try {
            const storage = getStorage(auth.app);
            const storageRef = ref(storage, `chat_attachments/${chatId}/${Date.now()}_${attachment.name}`);
            const uploadTask = await uploadBytes(storageRef, attachment);
            const fileUrl = await getDownloadURL(uploadTask.ref);
            let fileType = attachment.type.startsWith('image/') ? 'image' : attachment.type.startsWith('video/') ? 'video' : 'file';
            
             await addDoc(collection(db, "messages"), {
                chatId, text: newMessage, senderId: auth.currentUser.uid, receiverId: otherId, createdAt: serverTimestamp(), 
                fileUrl: fileUrl || null, fileType: fileType, fileName: attachment.name,
                replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, senderName: replyingTo.senderId === auth.currentUser.uid ? "You" : recipientName, type: replyingTo.fileType || 'text' } : null
             });
             
             await setDoc(doc(db, "conversations", chatId), { chatId, lastMessage: `Sent a ${fileType}`, lastTimestamp: serverTimestamp(), [`unread_${otherId}`]: increment(1), ...conversationMetaUpdate }, { merge: true });
            
            setNewMessage(""); setAttachment(null); setReplyingTo(null); 
            if (chatFileRef.current) chatFileRef.current.value = ""; 
            if (bubbleFileRef.current) bubbleFileRef.current.value = ""; 
        } catch (err) { alert("Failed to send file."); } finally { setIsUploading(false); }
    }
  };

  const handleSupportFileSelect = (e) => { if (e.target.files[0]) setSupportAttachment(e.target.files[0]); };

  const handleSendFAQ = async (faq) => {
      const userMsg = { sender: 'user', text: faq.question, timestamp: new Date() };
      const botMsg = { sender: 'admin', text: `🤖 ${faq.answer}`, timestamp: new Date() };
      try {
          if (activeSupportTicket) {
               if(activeSupportTicket.status === 'closed') { alert("This ticket is closed. Please start a new one."); return; }
               await updateDoc(doc(db, "support_tickets", activeSupportTicket.id), { messages: arrayUnion(userMsg, botMsg), lastUpdated: serverTimestamp(), status: 'open' });
          } else {
              const ticketIdString = Math.floor(1000 + Math.random() * 9000).toString();
              const newTicketRef = await addDoc(collection(db, "support_tickets"), { ticketId: ticketIdString, user: displayName, userId: auth.currentUser.uid, type: 'Employer', status: 'open', lastUpdated: serverTimestamp(), messages: [userMsg, botMsg] });
              setLastTicketCreatedAt(Date.now());
              const newTicketSnap = await getDoc(newTicketRef);
              setActiveSupportTicket({ id: newTicketRef.id, ...newTicketSnap.data() });
          }
      } catch (err) {}
  };

  const handleSendSupportMessage = async (e) => {
      e.preventDefault();
      if (!ticketMessage.trim() && !supportAttachment) return;
      const now = Date.now();
      const cooldown = 5 * 60 * 1000;
      if (!activeSupportTicket && (now - lastTicketCreatedAt < cooldown)) {
          const remaining = Math.ceil((cooldown - (now - lastTicketCreatedAt)) / 60000);
          alert(`Please wait ${remaining} more minute(s) before opening a new support request.`);
          return;
      }
      setIsSupportUploading(true);
      try {
          let imageUrl = null;
          if (supportAttachment) {
             const storage = getStorage(auth.app);
             const storageRef = ref(storage, `support_attachments/${auth.currentUser.uid}/${Date.now()}_${supportAttachment.name}`);
             const uploadTask = await uploadBytes(storageRef, supportAttachment);
             imageUrl = await getDownloadURL(uploadTask.ref);
          }
          const msgObj = { sender: 'user', text: ticketMessage, imageUrl: imageUrl || null, timestamp: new Date() };

          if (activeSupportTicket) {
              await updateDoc(doc(db, "support_tickets", activeSupportTicket.id), { messages: arrayUnion(msgObj), lastUpdated: serverTimestamp(), status: 'open' });
          } else {
              const ticketIdString = Math.floor(1000 + Math.random() * 9000).toString();
              const newTicketRef = await addDoc(collection(db, "support_tickets"), { ticketId: ticketIdString, user: displayName, userId: auth.currentUser.uid, type: 'Employer', status: 'open', lastUpdated: serverTimestamp(), messages: [msgObj] });
              setLastTicketCreatedAt(now);
              const newTicketSnap = await getDoc(newTicketRef);
              setActiveSupportTicket({ id: newTicketRef.id, ...newTicketSnap.data() });
          }
          setTicketMessage(""); setSupportAttachment(null); if(supportFileRef.current) supportFileRef.current.value = ""; 
      } catch (err) {} finally { setIsSupportUploading(false); }
  };
  
  const handleCloseSupportTicket = async (ticketId) => {
      if(!confirm("Close this support request?")) return;
      try {
          await updateDoc(doc(db, "support_tickets", ticketId), { status: 'closed', lastUpdated: serverTimestamp() });
          setActiveSupportTicket(null); setIsSupportOpen(false);
      } catch (err) {}
  };

  const handleDeleteTicket = async (ticketId) => {
    if(confirm("Delete this conversation permanently?")) {
        try {
            await deleteDoc(doc(db, "support_tickets", ticketId));
            if(activeSupportTicket?.id === ticketId) { setActiveSupportTicket(null); setIsSupportOpen(false); }
        } catch(err) {}
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setProfileImage(reader.result); setIsEditingImage(true); };
      reader.readAsDataURL(file);
    }
  };

  const dataURLtoBlob = (dataurl) => {
    try {
      const arr = dataurl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while(n--) u8arr[n] = bstr.charCodeAt(n);
      return new Blob([u8arr], {type:mime});
    } catch (e) { return null; }
  };

  const saveProfileImage = async () => {
    if (!auth.currentUser || !profileImage) return;
    setLoading(true);
    try {
      const storage = getStorage(auth.app);
      const storageRef = ref(storage, `company_logos/${auth.currentUser.uid}`);
      const blob = dataURLtoBlob(profileImage);
      if (!blob) throw new Error("Failed to process image data.");
      const uploadTask = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(uploadTask.ref);
      await setDoc(doc(db, "employers", auth.currentUser.uid), {
        profilePic: downloadURL, imgScale: imgScale, uid: auth.currentUser.uid, updatedAt: serverTimestamp()
      }, { merge: true });
      setIsEditingImage(false);
      alert("Profile picture updated successfully!");
    } catch (err) { alert(`Error: ${err.message}`); } 
    finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
        await setDoc(doc(db, "employers", auth.currentUser.uid), {
            title: employerData.title || "Employer", aboutMe: employerData.aboutMe,
            workExperience: employerData.workExperience, education: employerData.education, updatedAt: serverTimestamp()
        }, { merge: true });
        setIsEditingProfile(false);
    } catch (err) { alert("Error saving profile: " + err.message); } 
    finally { setLoading(false); }
  };

  const handleOpenJobModal = (job = null) => {
    if (!isVerified) return alert("Your account is pending verification. You cannot post jobs yet.");
    if (job) {
      setEditingJobId(job.id);
      setJobForm({ title: job.title, sitio: job.sitio || "", salary: job.salary, type: job.type, description: job.description, category: job.category || "" });
    } else {
      setEditingJobId(null);
      setJobForm({ title: "", sitio: "", salary: "", type: "Full-time", description: "", category: "" });
    }
    setIsJobModalOpen(true); setIsLocationDropdownOpen(false); setIsJobCategoryDropdownOpen(false);
  };

  const handleSaveJob = async () => {
    if (!jobForm.title || !jobForm.salary) return alert("Title and Salary are required.");
    setLoading(true);
    try {
      const jobData = {
        ...jobForm, employerId: auth.currentUser.uid, employerName: `${employerData.firstName} ${employerData.lastName}`, 
        employerLogo: profileImage || "", updatedAt: serverTimestamp(), status: "active"
      };
      if (editingJobId) await updateDoc(doc(db, "jobs", editingJobId), jobData);
      else await addDoc(collection(db, "jobs"), { ...jobData, createdAt: serverTimestamp() });
      setIsJobModalOpen(false); setActiveTab("Listings");
    } catch (err) { alert("Error saving job: " + err.message); } 
    finally { setLoading(false); }
  };

  const handleDeleteJob = async (jobId) => {
    if (window.confirm("Are you sure? This will hide the job from applicants.")) {
      try { await deleteDoc(doc(db, "jobs", jobId)); } catch (err) { alert("Error deleting job: " + err.message); }
    }
  };

  const handleViewApplication = async (app) => {
    setModalLoading(true); setModalApplicant(null); setModalJob(null); setSelectedApplication(app);
    try {
        if (!app.isViewed) updateDoc(doc(db, "applications", app.id), { isViewed: true }).catch(err => console.error(err));
        if (app.applicantId) { 
            const userSnap = await getDoc(doc(db, "applicants", app.applicantId)); 
            if (userSnap.exists()) { setModalApplicant(userSnap.data()); }
        }
        if (app.jobId) { const jobSnap = await getDoc(doc(db, "jobs", app.jobId)); if (jobSnap.exists()) setModalJob(jobSnap.data()); }
    } catch (err) { alert("Could not load details."); } finally { setModalLoading(false); }
  };

  const handleUpdateApplicationStatus = async (appId, newStatus) => {
    if (!window.confirm(`Mark this applicant as ${newStatus}?`)) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "applications", appId), { status: newStatus, isReadByApplicant: false });
      if (selectedApplication?.id === appId) setSelectedApplication(prev => ({ ...prev, status: newStatus }));
    } catch (err) { alert("Error updating status: " + err.message); } finally { setLoading(false); }
  };

  const handleDeleteApplication = async (appId) => {
    if (!window.confirm("Delete this application?")) return;
    setLoading(true);
    try { await deleteDoc(doc(db, "applications", appId)); if (selectedApplication?.id === appId) setSelectedApplication(null); } catch (err) { alert("Error deleting: " + err.message); } finally { setLoading(false); }
  };
  
  const handleSubmitApplicantRating = async (ratingData) => {
    if (!auth.currentUser || !selectedApplicantToRate) return;
    setLoading(true);
    try {
        await addDoc(collection(db, "reviews"), {
            targetId: selectedApplicantToRate.applicantId, reviewerId: auth.currentUser.uid,
            reviewerName: displayName, reviewerPic: profileImage || null,
            rating: ratingData.rating, comment: ratingData.comment, type: 'applicant_review', createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, "applications", selectedApplicantToRate.id), { isRatedByEmployer: true });
        alert("Applicant rated successfully!"); setIsRatingApplicantModalOpen(false);
    } catch (error) { alert("Failed to submit rating."); } finally { setLoading(false); }
  };
  
  const handleViewAnnouncement = (annId) => {
     setActiveTab("Announcements"); setIsNotifOpen(false); setLastReadAnnouncementId(annId);
     localStorage.setItem("lastReadAnnounce", annId);
  };

  // --- TOUCH HANDLERS FOR BUBBLES ---
  const handleTouchStart = (e) => { setIsDragging(true); const touch = e.touches[0]; dragOffset.current = { x: touch.clientX - bubblePos.x, y: touch.clientY - bubblePos.y }; };
  const handleTouchMove = (e) => { if (!isDragging) return; const touch = e.touches[0]; const bubbleSize = 56; let newX = touch.clientX - dragOffset.current.x; let newY = touch.clientY - dragOffset.current.y; newY = Math.max(0, Math.min(newY, window.innerHeight - 80)); newX = Math.max(0, Math.min(newX, window.innerWidth - bubbleSize)); setBubblePos({ x: newX, y: newY }); };
  const handleTouchEnd = () => { setIsDragging(false); const trashX = window.innerWidth / 2; const trashY = window.innerHeight - 80; const dist = Math.hypot((bubblePos.x + 28) - trashX, (bubblePos.y + 28) - trashY); if (dist < 60) { setIsBubbleVisible(false); setOpenBubbles([]); return; } if (bubblePos.x < window.innerWidth / 2) setBubblePos(prev => ({ ...prev, x: 0 })); else setBubblePos(prev => ({ ...prev, x: window.innerWidth - 56 })); };

  const handleLogout = () => { signOut(auth); };

  const displayName = `${employerData.firstName} ${employerData.lastName}`.trim() || "Employer";
  const newAppCount = receivedApplications.filter(a => a.status === 'pending' && !a.isViewed).length;
  const latestAnnouncement = announcements.length > 0 ? announcements[0] : null;
  const hasNewAnnouncement = latestAnnouncement && latestAnnouncement.id !== lastReadAnnouncementId;
  const totalNotifications = newAppCount + (hasNewAnnouncement ? 1 : 0);
  const unreadMsgCount = conversations.reduce((acc, curr) => {
    const otherId = curr.participants.find(p => p !== auth.currentUser?.uid);
    if (adminUser && otherId === adminUser.id) return acc;
    return acc + (curr[`unread_${auth.currentUser?.uid}`] || 0);
  }, 0);

  const getJobStyle = (type) => { const found = JOB_TYPES.find(j => j.id === type); if (found) return found; return { icon: <BoltIcon className="w-6 h-6"/>, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' }; };

  const ProfilePicComponent = ({ sizeClasses = "w-12 h-12", isCollapsed = false }) => (
    <div className={`relative group shrink-0 ${sizeClasses} rounded-2xl overflow-hidden shadow-lg border select-none ${darkMode ? 'border-white/10 bg-slate-800' : 'border-slate-200 bg-slate-100'}`}>
      {profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover transition-transform duration-300" style={{ transform: `scale(${imgScale})` }} /> : <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-black text-lg">{employerData.firstName ? employerData.firstName.charAt(0) : "E"}</div>}
      {!isCollapsed && <button onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"><CameraIcon className="w-5 h-5 text-white" /></button>}
    </div>
  );

return (
    <div className={`relative min-h-screen transition-colors duration-500 font-sans pb-24 md:pb-0 select-none cursor-default overflow-x-hidden ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
        
      {!isVerified && (
        <div className={`fixed top-0 left-0 right-0 h-10 z-[60] flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-white shadow-lg ${employerData.verificationStatus === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`}>
            {employerData.verificationStatus === 'rejected' 
              ? "Account Verification Rejected. Please update your profile." 
              : "Account Pending Verification. Some features are limited."}
        </div>
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; } 
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes glass-shine {
          0% { transform: translateX(-150%) skewX(-20deg); opacity: 0; }
          40% { opacity: 0.8; }
          100% { transform: translateX(250%) skewX(-20deg); opacity: 0; }
        }
        .shine-effect::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.75) 50%, transparent 100%);
          transform: translateX(-150%);
          animation: glass-shine 2s ease-out;
          pointer-events: none;
        }
        
        @keyframes content-wipe { 0% { opacity: 0; transform: translateY(10px) scale(0.99); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-content { animation: content-wipe 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .typing-dot { animation: typing 1.4s infinite ease-in-out both; }
        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes typing { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
      `}</style>
        
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-40 animate-pulse ${darkMode ? 'bg-blue-900' : 'bg-blue-300'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-40 animate-pulse delay-1000 ${darkMode ? 'bg-purple-900' : 'bg-purple-300'}`}></div>
      </div>
        
      {/* Modals & Overlays */}
      {/* 5. IMAGE LIGHTBOX OVERLAY */}
      {lightboxUrl && createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200" style={{ zIndex: 999999 }} onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}>
            <button onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }} className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors" style={{ zIndex: 9999999 }}>
                <XMarkIcon className="w-8 h-8"/>
            </button>
            <img src={lightboxUrl} alt="Enlarged attachment" className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200" style={{ zIndex: 9999999 }} onClick={(e) => e.stopPropagation()} />
        </div>, document.body
      )}

      <header className={`fixed top-0 left-0 right-0 z-40 h-20 px-6 flex items-center justify-between transition-all duration-300 backdrop-blur-xl border-b ${darkMode ? 'bg-slate-900/80 border-white/5' : 'bg-white/80 border-slate-200'} ${(isFullScreenPage) ? '-translate-y-full' : 'translate-y-0'} ${!isVerified && !isFullScreenPage ? 'top-10' : 'top-0'}`}>
            <div className="flex items-center gap-3">
                 <h1 className={`font-black text-lg tracking-tight leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>LIVELI<span className="text-blue-500">MATCH</span></h1>
            </div>

            <div className="hidden lg:flex items-center gap-24">
                {['Discover', 'Listings', 'Applicants', 'Messages'].map(tab => (
                    <button key={tab} onClick={() => isVerified && setActiveTab(tab)} className={`${activeTab === tab ? activeGlassNavBtn(darkMode) : glassNavBtn(darkMode)} ${!isVerified && 'opacity-50 cursor-not-allowed'}`}>
                        {tab === 'Discover' && <SparklesIcon className="w-7 h-7 relative z-10" />}
                        {tab === 'Listings' && <BriefcaseIcon className="w-7 h-7 relative z-10" />}
                        {tab === 'Applicants' && <div className="relative"><UsersIcon className="w-7 h-7 relative z-10" />{newAppCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 border-2 border-white rounded-full animate-pulse z-20"></span>}</div>}
                        {tab === 'Messages' && <div className="relative"><ChatBubbleLeftRightIcon className="w-7 h-7 relative z-10" />{unreadMsgCount > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full z-20 border-none">{unreadMsgCount}</span>}</div>}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-4">
                <div className="relative">
                    <button onClick={() => isVerified && setIsNotifOpen(!isNotifOpen)} className={`relative p-2 rounded-full transition-all active:scale-95 ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-600'} ${!isVerified && 'opacity-50 cursor-not-allowed'}`}>
                        <BellIcon className="w-6 h-6" />
                        {isVerified && totalNotifications > 0 && <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}
                    </button>
                    {isNotifOpen && isVerified && (
                        <div className={`fixed top-20 left-1/2 -translate-x-1/2 w-[90%] md:absolute md:translate-x-0 md:top-12 md:right-0 md:w-80 md:left-auto rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200 z-[100] ${darkMode ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'}`}>
                             <div className="p-3 border-b border-white/5 font-black text-xs uppercase tracking-widest opacity-50">Notifications</div>
                             <div className="p-2 space-y-1">
                                 {latestAnnouncement && (
                                     <button onClick={() => handleViewAnnouncement(latestAnnouncement.id)} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm font-bold ${hasNewAnnouncement ? 'text-pink-500 bg-pink-500/10' : 'opacity-50'}`}>
                                          <div className="flex flex-col overflow-hidden mr-2"><span className="text-[10px] uppercase tracking-wider opacity-70">Announcement</span><span className="truncate">{latestAnnouncement.title}</span></div>
                                          {hasNewAnnouncement && <span className="bg-pink-500 w-2 h-2 rounded-full shrink-0"></span>}
                                     </button>
                                 )}
                                 <button onClick={() => { setActiveTab("Applicants"); setIsNotifOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm font-bold ${newAppCount > 0 ? 'text-amber-500 bg-amber-500/10' : 'opacity-50'}`}>
                                          <span>New Applicants</span><span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{newAppCount}</span>
                                 </button>
                                 {totalNotifications === 0 && <div className="text-center py-4 opacity-30 text-xs font-bold uppercase">No new notifications</div>}
                             </div>
                        </div>
                    )}
                </div>

                <div onClick={() => setActiveTab("Profile")} className="cursor-pointer group">
                    <div className={`w-10 h-10 rounded-full overflow-hidden border-2 shadow-sm transition-transform active:scale-95 ${darkMode ? 'border-slate-600 group-hover:border-white' : 'border-white group-hover:border-blue-500'}`}>
                        {profileImage ? <img src={profileImage} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold">{employerData.firstName ? employerData.firstName.charAt(0) : "E"}</div>}
                    </div>
                </div>
                  
                <button onClick={() => setIsSidebarOpen(true)} className={`p-2 rounded-xl transition-colors ${darkMode ? 'text-white hover:bg-white/10' : 'text-slate-900 hover:bg-slate-100'}`}><Bars3BottomRightIcon className="w-7 h-7" /></button>
            </div>
      </header>

      <Sidebar 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          darkMode={darkMode} 
          setDarkMode={setDarkMode} 
          handleLogout={handleLogout} 
          employerData={employerData} 
          profileImage={profileImage} 
          isVerified={isVerified} 
      />

      <main className={`relative z-10 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${(isFullScreenPage) ? 'p-0 pt-0' : 'p-4 lg:p-8 pt-24 lg:pt-28'}`}>
        
        {!(isFullScreenPage) && (
        <header className={`mb-6 lg:mb-8 flex items-center justify-between p-4 md:p-5 rounded-2xl transition-all duration-300 relative overflow-hidden ${darkMode ? 'bg-slate-900 border border-white/10 shadow-sm' : 'bg-white border border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-4 relative z-10">
                <div className={`p-2 rounded-xl hidden md:block ${darkMode ? 'bg-blue-400/10 text-blue-400' : 'bg-blue-600/10 text-blue-600'}`}>
                    {activeTab === "Discover" && <SparklesIcon className="w-6 h-6"/>}
                    {activeTab === "Listings" && <BriefcaseIcon className="w-6 h-6"/>}
                    {activeTab === "Applicants" && <UsersIcon className="w-6 h-6"/>}
                    {activeTab === "Messages" && <ChatBubbleLeftRightIcon className="w-6 h-6"/>}
                    {activeTab === "Profile" && <UserCircleIcon className="w-6 h-6"/>}
                    {activeTab === "Ratings" && <StarIconOutline className="w-6 h-6"/>}
                    {activeTab === "Support" && <QuestionMarkCircleIcon className="w-6 h-6"/>}
                    {activeTab === "Announcements" && <MegaphoneIcon className="w-6 h-6"/>}
                </div>
                <div>
                    <h2 className={`text-xl lg:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>{activeTab === "Profile" ? "Profile" : activeTab === "Support" ? "Help & Support" : activeTab}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Employer Workspace</p>
                </div>
            </div>
        </header>
        )}

        {/* --- TABS RENDERING --- */}
        {activeTab === "Profile" && (
            <ProfileTab 
                employerData={employerData}
                setEmployerData={setEmployerData}
                profileImage={profileImage}
                setProfileImage={setProfileImage}
                imgScale={imgScale}
                setImgScale={setImgScale}
                isEditingProfile={isEditingProfile}
                setIsEditingProfile={setIsEditingProfile}
                fileInputRef={fileInputRef}
                isEditingImage={isEditingImage}
                setIsEditingImage={setIsEditingImage}
                loading={loading}
                setLoading={setLoading}
                handleSaveProfile={handleSaveProfile}
                currentUser={auth.currentUser}
                darkMode={darkMode}
                splitByNewLine={splitByNewLine}
                ProfilePicComponent={ProfilePicComponent}
            />
        )}

        {activeTab === "Support" && (
            <SupportTab 
                supportTickets={supportTickets}
                activeSupportTicket={activeSupportTicket}
                setActiveSupportTicket={setActiveSupportTicket}
                ticketMessage={ticketMessage}
                setTicketMessage={setTicketMessage}
                supportAttachment={supportAttachment}
                setSupportAttachment={setSupportAttachment}
                isSupportUploading={isSupportUploading}
                isSupportOpen={isSupportOpen}
                setIsSupportOpen={setIsSupportOpen}
                handleSendSupportMessage={handleSendSupportMessage}
                handleCloseSupportTicket={handleCloseSupportTicket}
                handleDeleteTicket={handleDeleteTicket}
                handleSendFAQ={handleSendFAQ}
                handleSupportFileSelect={handleSupportFileSelect}
                supportFileRef={supportFileRef}
                ticketScrollRef={ticketScrollRef}
                isBotTyping={isBotTyping}
                darkMode={darkMode}
                isMobile={isMobile}
                BOT_FAQ={BOT_FAQ}
            />
        )}

        {activeTab === "Announcements" && (
            <AnnouncementsTab announcements={announcements} darkMode={darkMode} />
        )}

        {isVerified && activeTab === "Discover" && (
            <DiscoverTab 
                discoverTalents={discoverTalents}
                myPostedJobs={myPostedJobs}
                receivedApplications={receivedApplications}
                unreadMsgCount={unreadMsgCount}
                talentSearch={talentSearch}
                setTalentSearch={setTalentSearch}
                talentSitioFilter={talentSitioFilter}
                setTalentSitioFilter={setTalentSitioFilter}
                talentCategoryFilter={talentCategoryFilter}
                setTalentCategoryFilter={setTalentCategoryFilter}
                isSitioDropdownOpen={isSitioDropdownOpen}
                setIsSitioDropdownOpen={setIsSitioDropdownOpen}
                isCategoryDropdownOpen={isCategoryDropdownOpen}
                setIsCategoryDropdownOpen={setIsCategoryDropdownOpen}
                selectedTalent={selectedTalent}
                setSelectedTalent={setSelectedTalent}
                handleStartChatFromExternal={handleStartChatFromExternal}
                darkMode={darkMode}
                JOB_CATEGORIES={JOB_CATEGORIES}
                PUROK_LIST={PUROK_LIST}
                displayAnnouncement={displayAnnouncement}
                handleViewAnnouncement={handleViewAnnouncement}
                setActiveTab={setActiveTab}
                getAvatarUrl={getAvatarUrl}
            />
        )}

        {isVerified && activeTab === "Ratings" && (
            <RatingsTab 
                reviews={reviews} 
                averageRating={averageRating} 
                darkMode={darkMode} 
                formatTime={formatTime} 
            />
        )}

        {isVerified && activeTab === "Listings" && (
            <ListingsTab 
                myPostedJobs={myPostedJobs}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                handleOpenJobModal={handleOpenJobModal}
                handleDeleteJob={handleDeleteJob}
                receivedApplications={receivedApplications}
                darkMode={darkMode}
                getJobStyle={getJobStyle}
                JOB_CATEGORIES={JOB_CATEGORIES}
            />
        )}

        {isVerified && activeTab === "Applicants" && (
            <ApplicantsTab 
                receivedApplications={receivedApplications}
                applicantSearch={applicantSearch}
                setApplicantSearch={setApplicantSearch}
                handleUpdateApplicationStatus={handleUpdateApplicationStatus}
                handleDeleteApplication={handleDeleteApplication}
                handleViewApplication={handleViewApplication}
                handleStartChatFromExternal={handleStartChatFromExternal}
                conversations={conversations}
                currentUser={auth.currentUser}
                darkMode={darkMode}
                setSelectedApplicantToRate={setSelectedApplicantToRate}
                setIsRatingApplicantModalOpen={setIsRatingApplicantModalOpen}
            />
        )}

        {isVerified && activeTab === "Messages" && (
            <MessagesTab 
                isMobile={isMobile}
                myProfileImage={profileImage || employerData?.profilePic}
                activeChat={activeChat}
                togglePinMessage={togglePinMessage}
                chatStatus={activeChat ? formatLastSeen(conversations.find(c => c.chatId.includes(activeChat.id))?.lastTimestamp) : null}
                conversations={conversations}
                openChat={openChat}
                closeChat={closeChat}
                sendMessage={sendMessage}
                messages={messages}
                setActiveChat={setActiveChat}
                currentUser={auth.currentUser}
                adminUser={adminUser}
                darkMode={darkMode}
                setLightboxUrl={setLightboxUrl}
                onMinimize={() => { 
                    setIsChatMinimized(true); 
                    setIsBubbleVisible(true); 
                    if(activeChat) { 
                        setOpenBubbles(prev => [...prev, activeChat].filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i)); 
                        setActiveBubbleView(activeChat.id); 
                    }
                    setBubblePos({ x: window.innerWidth - 80, y: 100 });
                    closeChat(); 
                    setActiveTab("Discover"); 
                }}
                isChatMinimized={isChatMinimized}
                setIsChatMinimized={setIsChatMinimized}
                isBubbleVisible={isBubbleVisible}
                setIsBubbleVisible={setIsBubbleVisible}
                openBubbles={openBubbles}
                setOpenBubbles={setOpenBubbles}
                activeBubbleView={activeBubbleView}
                setActiveBubbleView={setActiveBubbleView}
                markConversationAsRead={markConversationAsRead}
                bubbleSearch={bubbleSearch}
                setBubbleSearch={setBubbleSearch}
                isDesktopInboxVisible={isDesktopInboxVisible}
                setIsDesktopInboxVisible={setIsDesktopInboxVisible}
                chatSearch={chatSearch}
                setChatSearch={setChatSearch}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                attachment={attachment}
                setAttachment={setAttachment}
                isUploading={isUploading}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                chatFileRef={chatFileRef}
                bubbleFileRef={bubbleFileRef}
                scrollRef={scrollRef}
                handleSendMessageWrapper={handleSendMessageWrapper}
                handleFileSelect={handleFileSelect}
                formatTime={formatTime}
                getAvatarUrl={getAvatarUrl}
                isChatOptionsOpen={isChatOptionsOpen}
                setIsChatOptionsOpen={setIsChatOptionsOpen}
                unsendMessage={unsendMessage}
            />
        )}

        {!isVerified && !["Support", "Profile", "Announcements"].includes(activeTab) && (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] animate-in fade-in zoom-in-95">
                <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6"><LockClosedIcon className="w-10 h-10 text-red-500"/></div>
                <h2 className={`text-2xl font-black mb-2 uppercase tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Feature Locked</h2>
                <p className="text-sm opacity-60 font-medium max-w-xs text-center mb-8">
                    Your account verification is {employerData.verificationStatus}. Please contact support or update your profile to unlock this feature.
                </p>
                <button onClick={() => setActiveTab("Support")} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                    Contact Support
                </button>
            </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t px-6 py-3 flex justify-around items-center z-[80] transition-transform duration-300 backdrop-blur-xl ${(isFullScreenPage) ? 'translate-y-full' : 'translate-y-0'} ${darkMode ? 'bg-slate-900/70 border-white/10' : 'bg-white/70 border-white/20'}`}>
        <button onClick={() => setActiveTab("Discover")} className={`relative p-2 transition-all duration-300 ease-out overflow-hidden ${activeTab === "Discover" ? 'scale-125 text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}><SparklesIcon className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab("Listings")} className={`relative p-2 transition-all duration-300 ease-out overflow-hidden ${activeTab === "Listings" ? 'scale-125 text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}><BriefcaseIcon className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab("Applicants")} className={`relative p-2 transition-all duration-300 ease-out overflow-hidden ${activeTab === "Applicants" ? 'scale-125 text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
            <div className="relative"><UsersIcon className="w-6 h-6" />{newAppCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white animate-pulse"></span>}</div>
        </button>
        <button onClick={() => setActiveTab("Messages")} className={`relative p-2 transition-all duration-300 ease-out overflow-hidden ${activeTab === "Messages" ? 'scale-125 text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
            <div className="relative"><ChatBubbleLeftRightIcon className="w-6 h-6" />{unreadMsgCount > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1 rounded-full min-w-[16px] text-center">{unreadMsgCount}</span>}</div>
        </button>
      </nav>

      <RateApplicantModal 
        isOpen={isRatingApplicantModalOpen}
        onClose={() => setIsRatingApplicantModalOpen(false)}
        onSubmit={handleSubmitApplicantRating}
        applicantName={selectedApplicantToRate?.applicantName || "Applicant"}
        darkMode={darkMode} 
      />

      {/* =========================================================
          CHAT BUBBLES OVERLAY
          ========================================================= */}
      {isBubbleVisible && (
        isMobile ? (
            <>
                {!isBubbleExpanded && (
                    <div style={{ top: bubblePos.y, left: bubblePos.x }} className="fixed z-[201] touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                        <div className="relative">
                            <button onClick={(e) => { if (!isDragging) { setIsBubbleExpanded(true); if(effectiveActiveChatUser) { openChat(effectiveActiveChatUser); markConversationAsRead(effectiveActiveChatUser.id); } } }} className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-90 overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                                {activeBubbleView !== 'inbox' && effectiveActiveChatUser ? ((getAvatarUrl(effectiveActiveChatUser) || effectiveActiveChatUser.profilePic) ? <img src={getAvatarUrl(effectiveActiveChatUser) || effectiveActiveChatUser.profilePic} className="w-full h-full object-cover" alt="pfp" /> : <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">{effectiveActiveChatUser.name.charAt(0)}</div>) : <ChatBubbleOvalLeftEllipsisIcon className={`w-7 h-7 ${darkMode ? 'text-white' : 'text-blue-600'}`} />}
                            </button>
                            {(() => { const activeUnread = activeBubbleView !== 'inbox' && effectiveActiveChatUser ? (conversations.find(c => c.chatId.includes(effectiveActiveChatUser.id))?.[`unread_${auth.currentUser.uid}`] || 0) : conversations.reduce((acc, curr) => acc + (curr[`unread_${auth.currentUser?.uid}`] || 0), 0); return activeUnread > 0 ? <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm pointer-events-none z-10 animate-in zoom-in border-none">{activeUnread}</span> : null; })()}
                        </div>
                    </div>
                )}
                {isDragging && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] w-16 h-16 rounded-full flex items-center justify-center border-4 border-slate-400/30 bg-transparent animate-in zoom-in backdrop-blur-sm"><XMarkIcon className="w-8 h-8 text-slate-400" /></div>}
                {isBubbleExpanded && (
                    <div className="fixed inset-0 z-[1000] flex flex-col bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="pt-12 px-4 pb-4 flex items-center gap-4 overflow-x-auto hide-scrollbar pointer-events-auto">
                            {openBubbles.map((chat) => {
                                const unread = chat[`unread_${auth.currentUser.uid}`] || 0;
                                const chatPic = chat.profilePic || conversations.find(c => c.chatId.includes(chat.id))?.profilePics?.[chat.id];
                                return (
                                    <div key={chat.id} className="relative group flex flex-col items-center gap-1 shrink-0">
                                        <button onClick={() => { setActiveBubbleView(chat.id); openChat(chat); markConversationAsRead(chat.id); }} className={`w-14 h-14 rounded-full overflow-hidden shadow-lg transition-all ${activeBubbleView === chat.id ? 'scale-110 shadow-blue-500/50' : 'opacity-60'}`}>
                                            {chatPic ? <img src={chatPic} className="w-full h-full object-cover" alt="pfp" /> : <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">{chat.name.charAt(0)}</div>}
                                        </button>
                                        {unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full shadow-sm z-20 border-none">{unread}</span>}
                                        {activeBubbleView === chat.id && (<button onClick={(e) => { e.stopPropagation(); const newBubbles = openBubbles.filter(b => b.id !== chat.id); setOpenBubbles(newBubbles); if(activeBubbleView === chat.id) { setActiveBubbleView(newBubbles.length ? newBubbles[0].id : 'inbox'); } }} className="absolute -top-1 -right-1 bg-slate-500 text-white rounded-full p-0.5 shadow-md animate-in zoom-in border-none"><XMarkIcon className="w-3 h-3"/></button>)}
                                    </div>
                                );
                            })}
                            <div className="flex flex-col items-center gap-1 shrink-0">
                                <button onClick={() => setActiveBubbleView('inbox')} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all border-2 ${activeBubbleView === 'inbox' ? 'border-blue-500 scale-110' : 'border-white dark:border-slate-700 opacity-60'} ${darkMode ? 'bg-slate-800' : 'bg-white'}`}><ChatBubbleOvalLeftEllipsisIcon className="w-7 h-7 text-blue-500" /></button>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col justify-end relative" onClick={() => setIsBubbleExpanded(false)}>
                            <div className={`w-full h-[80vh] rounded-t-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`} onClick={(e) => e.stopPropagation()}>
                                {activeBubbleView === 'inbox' ? (
                                    <div className="flex flex-col h-full">
                                        <div className={`p-5 flex justify-between items-center ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                                            <h3 className={`font-black text-2xl ${darkMode ? 'text-white' : 'text-slate-900'}`}>Chats</h3>
                                            <button onClick={() => setIsBubbleExpanded(false)} className="p-2 bg-slate-100 dark:bg-white/10 rounded-full"><ChevronDownIcon className="w-5 h-5 opacity-50"/></button> 
                                        </div>
                                        <div className="px-5 pb-2"><div className={`flex items-center p-2 rounded-xl border ${darkMode ? 'bg-slate-800 border-white/5' : 'bg-slate-100 border-slate-200'}`}><MagnifyingGlassIcon className="w-4 h-4 ml-2 text-slate-400" /><input value={bubbleSearch} onChange={(e) => setBubbleSearch(e.target.value)} placeholder="Search..." className="bg-transparent border-none outline-none text-xs p-1.5 w-full font-bold" /></div></div>
                                        <div className="flex-1 overflow-y-auto p-2 hide-scrollbar">
                                            {bubbleFilteredChats.map(c => {
                                                const otherId = c.participants.find(p => p !== auth.currentUser.uid);
                                                const name = c.names?.[otherId] || "User";
                                                const otherPic = c.profilePics?.[otherId];
                                                const unread = c[`unread_${auth.currentUser.uid}`] || 0;
                                                return (
                                                    <button key={c.chatId} onClick={() => { const userObj = { id: otherId, name, profilePic: otherPic }; if(!openBubbles.find(b => b.id === userObj.id)) { setOpenBubbles(prev => [userObj, ...prev]); } openChat(userObj); setActiveBubbleView(otherId); markConversationAsRead(otherId); }} className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-colors ${darkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                                                        <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800 flex items-center justify-center">{otherPic ? <img src={otherPic} className="w-full h-full object-cover" alt="other-pfp" /> : <span className="font-bold">{name.charAt(0)}</span>}</div>
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
                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200">{(getAvatarUrl(effectiveActiveChatUser) || effectiveActiveChatUser.profilePic) ? <img src={getAvatarUrl(effectiveActiveChatUser) || effectiveActiveChatUser.profilePic} className="w-full h-full object-cover" alt="header-pfp" /> : <span className="flex items-center justify-center h-full font-bold">{effectiveActiveChatUser.name.charAt(0)}</span>}</div>
                                                    <div>
                                                        <h3 className={`font-black text-base leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>{effectiveActiveChatUser.name}</h3>
                                                        <p className="text-[10px] font-bold opacity-60 uppercase flex items-center gap-1 mt-0.5">
                                                            {(() => {
                                                                const status = formatLastSeen(conversations.find(c => c.chatId.includes(effectiveActiveChatUser.id))?.lastTimestamp);
                                                                return <><span className={`w-2 h-2 rounded-full ${status.isOnline ? 'bg-green-500' : 'bg-slate-400'}`}></span> {status.text}</>;
                                                            })()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4 text-blue-500"><button onClick={() => setIsBubbleExpanded(false)}><ChevronDownIcon className="w-6 h-6"/></button></div>
                                            </div>
                                            
                                            <div className={`flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50/50'}`} onClick={() => setActiveMenuId(null)}>
                                                {messages.map((msg, index) => {
                                                    const isMe = msg.senderId === auth.currentUser.uid;
                                                    const myPic = profileImage || employerData?.profilePic || null;
                                                    const otherPic = effectiveActiveChatUser?.profilePic || getAvatarUrl(effectiveActiveChatUser) || null;
                                                    
                                                    const currentConv = conversations.find(c => c.participants?.includes(auth.currentUser.uid) && c.participants?.includes(effectiveActiveChatUser.id));
                                                    const unreadByOther = currentConv ? (currentConv[`unread_${effectiveActiveChatUser.id}`] || 0) : 0;
                                                    const isUnseen = (messages.length - 1 - index) < unreadByOther;
                                                    const status = formatLastSeen(currentConv?.lastTimestamp);
                                                    
                                                    let statusText = "";
                                                    if (isMe && !msg.isUnsent) {
                                                        if (!isUnseen) statusText = "Seen";
                                                        else if (status.isOnline) statusText = "Delivered";
                                                        else statusText = "Sent";
                                                    }

                                                    if(msg.type === 'system') return <div key={msg.id} className="text-center text-[10px] font-bold uppercase tracking-widest opacity-30 my-4">{msg.text}</div>;
                                                    
                                                    return (
                                                        <SwipeableMessage key={msg.id} isMe={isMe} isMobile={true} onReply={() => setReplyingTo({ id: msg.id, text: msg.text, senderId: msg.senderId, fileType: msg.fileType })} onLongPress={() => setActiveMenuId(msg.id)}>
                                                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}>
                                                                {msg.replyTo && <div className={`mb-1 px-3 py-1.5 rounded-xl text-[10px] opacity-60 flex items-center gap-2 max-w-[250px] ${isMe ? 'bg-blue-600/20 text-blue-200' : 'bg-slate-500/20 text-slate-400'}`}><ArrowUturnLeftIcon className="w-3 h-3"/><span className="truncate">{msg.replyTo.type === 'image' ? 'Image' : msg.replyTo.type === 'video' ? 'Video' : msg.replyTo.text}</span></div>}
                                                                <div className={`flex items-end gap-3 max-w-[85%] relative ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                                    <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 shadow-sm border border-black/5 dark:border-white/10 bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[8px] font-black uppercase"> 
                                                                        {isMe ? (myPic ? <img src={myPic} className="w-full h-full object-cover" /> : "M") : (otherPic ? <img src={otherPic} className="w-full h-full object-cover" /> : effectiveActiveChatUser.name.charAt(0))} 
                                                                    </div>
                                                                    <div className="relative group/bubble flex flex-col gap-1">
                                                                        {msg.isPinned && <span className={`text-[9px] font-bold text-yellow-500 uppercase tracking-wider mb-0.5 ${isMe ? 'text-right' : 'text-left'}`}>📌 Pinned</span>}
                                                                        {msg.isUnsent ? (
                                                                            <div className={`px-3 py-2.5 rounded-2xl text-[12.5px] shadow-sm italic border ${isMe ? 'bg-transparent text-slate-400 border-slate-300 dark:border-slate-600 rounded-br-none' : 'bg-transparent text-slate-400 border-slate-300 dark:border-slate-600 rounded-bl-none'}`}>Message unsent</div>
                                                                        ) : (
                                                                            <>
                                                                                {msg.fileUrl && <div className={`overflow-hidden rounded-2xl ${msg.fileType === 'image' || msg.fileType === 'video' ? 'bg-transparent' : (isMe ? 'bg-blue-600' : darkMode ? 'bg-slate-800' : 'bg-white border border-slate-200')}`}>{msg.fileType === 'image' && <img src={msg.fileUrl} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLightboxUrl(msg.fileUrl); }} className="max-w-full max-h-40 object-cover rounded-2xl cursor-pointer hover:opacity-90 relative z-10" />}{msg.fileType === 'video' && <video src={msg.fileUrl} controls className="max-w-full max-h-40 rounded-2xl" />}{msg.fileType === 'file' && <div className="p-3 text-[11px] font-bold underline truncate flex items-center gap-2"><DocumentIcon className="w-4 h-4"/>{msg.fileName}</div>}</div>}
                                                                                {msg.text && <div className={`px-3 py-2.5 rounded-2xl text-[12.5px] shadow-sm leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-br-none' : darkMode ? 'bg-slate-800 text-white rounded-bl-none' : 'bg-white text-slate-900 rounded-bl-none border border-black/5'}`}><p className="whitespace-pre-wrap">{msg.text}</p></div>}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {activeMenuId === msg.id && (
                                                                        <div className={`absolute z-50 bottom-full mb-2 ${isMe ? 'right-8' : 'left-8'} w-40 shadow-xl rounded-xl border overflow-hidden text-xs font-bold animate-in zoom-in-95 ${darkMode ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
                                                                            <button onClick={(e) => {e.stopPropagation(); setReplyingTo({ id: msg.id, text: msg.text, senderId: msg.senderId, fileType: msg.fileType }); setActiveMenuId(null)}} className={`w-full text-left px-4 py-3 border-b transition-colors ${darkMode ? 'border-white/5 hover:bg-slate-700' : 'border-slate-100 hover:bg-slate-50'}`}>Reply to</button>
                                                                            <button onClick={(e) => {e.stopPropagation(); togglePinMessage(msg.id, msg.isPinned); setActiveMenuId(null)}} className={`w-full text-left px-4 py-3 border-b transition-colors ${darkMode ? 'border-white/5 hover:bg-slate-700' : 'border-slate-100 hover:bg-slate-50'} ${msg.isPinned ? 'text-yellow-500' : ''}`}>{msg.isPinned ? "Unpin message" : "Pin message"}</button>
                                                                            {isMe && !msg.isUnsent && (
                                                                                <button onClick={(e) => {e.stopPropagation(); if(unsendMessage) unsendMessage(msg.id); setActiveMenuId(null)}} className={`w-full text-left px-4 py-3 transition-colors ${darkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}>Unsend</button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <p className={`text-[8px] font-black mt-1.5 opacity-40 flex items-center gap-1 ${isMe ? 'justify-end mr-10' : 'justify-start ml-10'}`}>
                                                                    <span>{formatTime(msg.createdAt)}</span>
                                                                    {isMe && !msg.isUnsent && (
                                                                        <><span>•</span><span className={statusText === 'Seen' ? 'text-blue-500' : ''}>{statusText}</span></>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </SwipeableMessage>
                                                    )
                                                })}
                                                <div ref={scrollRef}/>
                                            </div>
                                            
                                            <div className={`p-3 shrink-0 ${darkMode ? 'bg-slate-900' : 'bg-white'}`} onClick={() => setActiveMenuId(null)}>
                                                {replyingTo && <div className="mb-2 flex justify-between items-center p-2.5 bg-blue-500/10 rounded-xl border-l-4 border-blue-500 text-[10px] font-bold"><div className="flex flex-col"><span className="text-blue-500 uppercase">Replying to {replyingTo.senderId === auth.currentUser.uid ? 'You' : effectiveActiveChatUser.name}</span><span className="truncate max-w-[200px] opacity-70">{replyingTo.text}</span></div><button onClick={() => setReplyingTo(null)}><XMarkIcon className="w-4 h-4 text-blue-500"/></button></div>}
                                                {attachment && (
                                                    <div className="mb-3 relative inline-block animate-in zoom-in duration-200">
                                                        <div className="p-2 pr-8 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">
                                                            {attachment.type.startsWith('image/') ? <PhotoIcon className="w-5 h-5 text-blue-500"/> : <DocumentIcon className="w-5 h-5 text-blue-500"/>}
                                                            <span className="text-xs font-bold text-blue-500 truncate max-w-[200px]">{attachment.name}</span>
                                                        </div>
                                                        <button onClick={() => {setAttachment(null); bubbleFileRef.current.value = "";}} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600"><XMarkIcon className="w-3 h-3"/></button>
                                                    </div>
                                                )}
                                                <form onSubmit={handleSendMessageWrapper} className={`flex gap-2 items-center`}>
                                                    <input type="file" ref={bubbleFileRef} onChange={handleFileSelect} className="hidden" />
                                                    <button type="button" onClick={() => bubbleFileRef.current.click()} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><PaperClipIcon className="w-5 h-5"/></button>
                                                    <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Aa" className={`flex-1 px-4 py-2 text-sm outline-none rounded-full ${darkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900'}`} />
                                                    <button type="submit" disabled={(!newMessage.trim() && !attachment) || isUploading} className="p-2 text-blue-600 disabled:opacity-30 active:scale-90 transition-transform">{isUploading ? <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> : <PaperAirplaneIcon className="w-6 h-6" />}</button>
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
        ) : (
            // --- DESKTOP VIEW BUBBLES ---
            <div className="fixed z-[200] bottom-6 right-4 md:right-6 flex flex-col-reverse items-end gap-3 pointer-events-none">
                <div className="pointer-events-auto relative">
                    <button onClick={() => { setIsDesktopInboxVisible(!isDesktopInboxVisible); setActiveChat(null); }} className={`group relative w-12 h-12 md:w-14 md:h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-90 overflow-hidden ${darkMode ? 'bg-blue-600' : 'bg-blue-600'}`}>
                        <ChatBubbleLeftRightIcon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    </button>
                    {conversations.reduce((acc, curr) => acc + (curr[`unread_${auth.currentUser?.uid}`] || 0), 0) > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm pointer-events-none z-20 animate-bounce border-none">{conversations.reduce((acc, curr) => acc + (curr[`unread_${auth.currentUser?.uid}`] || 0), 0)}</span>}
                </div>
                {openBubbles.map((chat) => {
                    const unread = chat[`unread_${auth.currentUser.uid}`] || 0;
                    const chatPic = chat.profilePic || conversations.find(c => c.chatId.includes(chat.id))?.profilePics?.[chat.id];
                    return (
                    <div key={chat.id} className="pointer-events-auto relative group flex items-center gap-3">
                        <span className="absolute right-full mr-3 px-3 py-1.5 rounded-xl bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">{chat.name}</span>
                        <div className="relative">
                            <button onClick={() => { openChat(chat); setIsChatMinimized(false); setIsDesktopInboxVisible(false); markConversationAsRead(chat.id); }} className="w-12 h-12 md:w-14 md:h-14 rounded-full shadow-2xl overflow-hidden transition-all hover:scale-110 active:scale-95">
                                {chatPic ? (<img src={chatPic} alt="pfp" className="w-full h-full object-cover" />) : (<div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">{chat.name.charAt(0)}</div>)}
                            </button>
                            {unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm z-20 animate-bounce border-none">{unread}</span>}
                            <button onClick={(e) => { e.stopPropagation(); setOpenBubbles(prev => prev.filter(b => b.id !== chat.id)); if (openBubbles.length <= 1) setIsBubbleVisible(false); }} className="absolute -top-1 -left-1 w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none"><XMarkIcon className="w-3 h-3 text-slate-600 dark:text-slate-300" /></button>
                        </div>
                    </div>
                )})}
                {isDesktopInboxVisible && !activeChat && (
                    <div className="fixed z-[210] pointer-events-auto bottom-6 right-24 animate-in slide-in-from-right-4 duration-300">
                        <div className={`w-[320px] h-[450px] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                            <div className={`p-5 flex justify-between items-center ${darkMode ? 'bg-slate-900 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <h3 className={`font-black text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>Chats</h3>
                                <button onClick={() => setIsDesktopInboxVisible(false)} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg"><XMarkIcon className="w-5 h-5 opacity-50"/></button>
                            </div>
                            <div className="p-3 pb-0">
                                <div className={`flex items-center p-1.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                                    <MagnifyingGlassIcon className="w-4 h-4 ml-2 text-slate-400" />
                                    <input value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search..." className="bg-transparent border-none outline-none text-[11px] p-1.5 w-full font-bold" />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 hide-scrollbar">
                                {filteredChats.map(c => {
                                    const otherId = c.participants.find(p => p !== auth.currentUser.uid);
                                    const name = c.names?.[otherId] || "User";
                                    const otherPic = c.profilePics?.[otherId];
                                    const unread = c[`unread_${auth.currentUser.uid}`] || 0;
                                    return (
                                        <button key={c.chatId} onClick={() => { const userObj = { id: otherId, name, profilePic: otherPic }; openChat(userObj); setIsDesktopInboxVisible(false); markConversationAsRead(otherId); }} className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-colors ${darkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                                            <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800 flex items-center justify-center">{otherPic ? <img src={otherPic} className="w-full h-full object-cover" alt="pfp" /> : <span className="font-bold">{name.charAt(0)}</span>}</div>
                                            <div className="flex-1 text-left overflow-hidden">
                                                <div className="flex justify-between items-center"><span className="font-black text-sm truncate">{name}</span><span className="text-[9px] opacity-40">{formatTime(c.lastTimestamp)}</span></div>
                                                <div className="flex justify-between items-center"><p className="text-[11px] truncate opacity-60">{c.lastMessage}</p>{unread > 0 && <span className="min-w-[14px] h-[14px] flex items-center justify-center bg-blue-500 text-white text-[9px] rounded-full px-1 font-bold">{unread}</span>}</div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
                {!isChatMinimized && activeChat && activeTab !== "Support" && (
                    <div className="fixed z-[210] pointer-events-auto bottom-6 right-24">
                        <div className={`w-[320px] h-[450px] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                            
                            <div className={`p-4 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-white/20 overflow-hidden border border-white/20">{(getAvatarUrl(activeChat) || activeChat.profilePic) ? <img src={getAvatarUrl(activeChat) || activeChat.profilePic} className="w-full h-full object-cover" alt="pfp"/> : <span className="flex items-center justify-center h-full font-black">{activeChat.name.charAt(0)}</span>}</div>
                                    <div>
                                        <span className="font-black text-xs uppercase block">{activeChat.name}</span>
                                        <span className="text-[9px] opacity-90 font-bold flex items-center gap-1 mt-0.5">
                                            {(() => {
                                                const status = formatLastSeen(conversations.find(c => c.chatId.includes(activeChat.id))?.lastTimestamp);
                                                return <><span className={`w-1.5 h-1.5 rounded-full ${status.isOnline ? 'bg-green-400' : 'bg-slate-300'}`}></span> {status.text}</>;
                                            })()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1"><button onClick={() => { setIsChatMinimized(true); setIsBubbleVisible(true); setOpenBubbles(prev => [...prev, activeChat].filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i)); setActiveBubbleView(activeChat.id); closeChat(); }} className="p-1.5 hover:bg-white/20 rounded-lg"><ChevronDownIcon className="w-4 h-4"/></button><button onClick={closeChat} className="p-1.5 hover:bg-white/20 rounded-lg"><XMarkIcon className="w-4 h-4"/></button></div>
                            </div>
                            
                            <div className={`flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`} onClick={() => setActiveMenuId(null)}>
                                {messages.map((msg, index) => {
                                    const isMe = msg.senderId === auth.currentUser.uid;
                                    const myPic = profileImage || employerData?.profilePic || null;
                                    const otherPic = activeChat?.profilePic || getAvatarUrl(activeChat) || null;

                                    const currentConv = conversations.find(c => c.participants?.includes(auth.currentUser.uid) && c.participants?.includes(activeChat.id));
                                    const unreadByOther = currentConv ? (currentConv[`unread_${activeChat.id}`] || 0) : 0;
                                    const isUnseen = (messages.length - 1 - index) < unreadByOther;
                                    const status = formatLastSeen(currentConv?.lastTimestamp);
                                    
                                    let statusText = "";
                                    if (isMe && !msg.isUnsent) {
                                        if (!isUnseen) statusText = "Seen";
                                        else if (status.isOnline) statusText = "Delivered";
                                        else statusText = "Sent";
                                    }

                                    if(msg.type === 'system') return <div key={msg.id} className="text-center text-[9px] font-black uppercase tracking-widest opacity-30 my-2">{msg.text}</div>;
                                    
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                                            {msg.replyTo && <div className={`mb-1 px-3 py-1.5 rounded-xl text-[10px] opacity-60 flex items-center gap-2 max-w-[250px] ${isMe ? 'bg-blue-600/20 text-blue-200' : 'bg-slate-500/20 text-slate-400'}`}><ArrowUturnLeftIcon className="w-3 h-3"/><span className="truncate">{msg.replyTo.type === 'image' ? 'Image' : msg.replyTo.type === 'video' ? 'Video' : msg.replyTo.text}</span></div>}
                                            <div className={`flex items-end gap-2 max-w-[85%] relative ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 shadow-sm border border-black/5 dark:border-white/10 bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[8px] font-black uppercase"> 
                                                    {isMe ? (myPic ? <img src={myPic} className="w-full h-full object-cover" /> : "M") : (otherPic ? <img src={otherPic} className="w-full h-full object-cover" /> : activeChat.name.charAt(0))} 
                                                </div>
                                                <div className="relative group/bubble flex flex-col gap-1">
                                                    {msg.isPinned && <span className={`text-[9px] font-bold text-yellow-500 uppercase tracking-wider mb-0.5 ${isMe ? 'text-right' : 'text-left'}`}>📌 Pinned</span>}
                                                    {msg.isUnsent ? (
                                                        <div className={`px-3 py-2.5 rounded-2xl text-[12.5px] shadow-sm italic border ${isMe ? 'bg-transparent text-slate-400 border-slate-300 dark:border-slate-600 rounded-br-none' : 'bg-transparent text-slate-400 border-slate-300 dark:border-slate-600 rounded-bl-none'}`}>Message unsent</div>
                                                    ) : (
                                                        <>
                                                            {msg.fileUrl && <div className={`overflow-hidden rounded-2xl ${msg.fileType === 'image' || msg.fileType === 'video' ? 'bg-transparent' : (isMe ? 'bg-blue-600' : darkMode ? 'bg-slate-800' : 'bg-white border border-black/5')}`}>{msg.fileType === 'image' && <img src={msg.fileUrl} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLightboxUrl(msg.fileUrl); }} className="max-w-full max-h-40 object-cover rounded-2xl cursor-pointer hover:opacity-90 relative z-10" />}{msg.fileType === 'video' && <video src={msg.fileUrl} controls className="max-w-full max-h-40 rounded-2xl" />}{msg.fileType === 'file' && <div className="p-3 text-[11px] font-bold underline truncate flex items-center gap-2"><DocumentIcon className="w-4 h-4"/>{msg.fileName}</div>}</div>}
                                                            {msg.text && <div className={`px-3 py-2.5 rounded-2xl text-[12.5px] shadow-sm leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-br-none' : darkMode ? 'bg-slate-800 text-white rounded-bl-none' : 'bg-white text-slate-900 rounded-bl-none border border-black/5'}`}><p className="whitespace-pre-wrap">{msg.text}</p></div>}
                                                        </>
                                                    )}
                                                </div>

                                                <div className={`hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity gap-1 mb-2 items-center`}>
                                                    <button onClick={() => setReplyingTo({ id: msg.id, text: msg.text, senderId: msg.senderId, fileType: msg.fileType })} className={`p-1.5 rounded-full shadow-sm transition-colors ${darkMode ? 'text-blue-400 bg-slate-800 hover:bg-slate-700' : 'text-blue-500 bg-white hover:bg-slate-100'}`}><ArrowUturnLeftIcon className="w-3.5 h-3.5"/></button>
                                                    <div className="relative">
                                                        <button onClick={(e) => {e.stopPropagation(); setActiveMenuId(activeMenuId === msg.id ? null : msg.id)}} className={`p-1.5 rounded-full shadow-sm transition-colors ${darkMode ? 'text-slate-400 bg-slate-800 hover:bg-slate-700' : 'text-slate-500 bg-white hover:bg-slate-100'}`}><EllipsisVerticalIcon className="w-3.5 h-3.5"/></button>
                                                    </div>
                                                </div>

                                                {activeMenuId === msg.id && (
                                                    <div className={`absolute z-50 bottom-full mb-2 ${isMe ? 'right-8' : 'left-8'} w-40 shadow-xl rounded-xl border overflow-hidden text-xs font-bold animate-in zoom-in-95 ${darkMode ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
                                                        <button onClick={(e) => {e.stopPropagation(); setReplyingTo({ id: msg.id, text: msg.text, senderId: msg.senderId, fileType: msg.fileType }); setActiveMenuId(null)}} className={`w-full text-left px-4 py-3 border-b transition-colors ${darkMode ? 'border-white/5 hover:bg-slate-700' : 'border-slate-100 hover:bg-slate-50'}`}>Reply to</button>
                                                        <button onClick={(e) => {e.stopPropagation(); togglePinMessage(msg.id, msg.isPinned); setActiveMenuId(null)}} className={`w-full text-left px-4 py-3 border-b transition-colors ${darkMode ? 'border-white/5 hover:bg-slate-700' : 'border-slate-100 hover:bg-slate-50'} ${msg.isPinned ? 'text-yellow-500' : ''}`}>{msg.isPinned ? "Unpin message" : "Pin message"}</button>
                                                        {isMe && !msg.isUnsent && (
                                                            <button onClick={(e) => {e.stopPropagation(); if(unsendMessage) unsendMessage(msg.id); setActiveMenuId(null)}} className={`w-full text-left px-4 py-3 transition-colors ${darkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}>Unsend</button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <p className={`text-[8px] font-black mt-1.5 opacity-40 flex items-center gap-1 ${isMe ? 'justify-end mr-10' : 'justify-start ml-10'}`}>
                                                <span>{formatTime(msg.createdAt)}</span>
                                                {isMe && !msg.isUnsent && (
                                                    <><span>•</span><span className={statusText === 'Seen' ? 'text-blue-500' : ''}>{statusText}</span></>
                                                )}
                                            </p>
                                        </div>
                                    )
                                })}
                                <div ref={scrollRef}/>
                            </div>
                            
                            <div className={`p-3 shrink-0 ${darkMode ? 'bg-slate-900' : 'bg-white'}`} onClick={() => setActiveMenuId(null)}>
                                {replyingTo && <div className="mb-2 flex justify-between items-center p-2.5 bg-blue-500/10 rounded-xl border-l-4 border-blue-500 text-[10px] font-bold"><div className="flex flex-col"><span className="text-blue-500 uppercase">Replying to {replyingTo.senderId === auth.currentUser.uid ? 'You' : activeChat.name}</span><span className="truncate max-w-[200px] opacity-70">{replyingTo.text}</span></div><button onClick={() => setReplyingTo(null)}><XMarkIcon className="w-4 h-4 text-blue-500"/></button></div>}
                                {attachment && (
                                    <div className="mb-3 relative inline-block animate-in zoom-in duration-200">
                                        <div className="p-2 pr-8 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">
                                            {attachment.type.startsWith('image/') ? <PhotoIcon className="w-5 h-5 text-blue-500"/> : <DocumentIcon className="w-5 h-5 text-blue-500"/>}
                                            <span className="text-xs font-bold text-blue-500 truncate max-w-[200px]">{attachment.name}</span>
                                        </div>
                                        <button onClick={() => {setAttachment(null); chatFileRef.current.value = "";}} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600"><XMarkIcon className="w-3 h-3"/></button>
                                    </div>
                                )}
                                <form onSubmit={handleSendMessageWrapper} className={`flex gap-2 items-center`}>
                                    <input type="file" ref={chatFileRef} onChange={handleFileSelect} className="hidden" />
                                    <button type="button" onClick={() => chatFileRef.current?.click()} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><PaperClipIcon className="w-5 h-5"/></button>
                                    <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Aa" className={`flex-1 px-4 py-2 text-sm outline-none rounded-full ${darkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900'}`} />
                                    <button type="submit" disabled={(!newMessage.trim() && !attachment) || isUploading} className="p-2 text-blue-600 disabled:opacity-30 active:scale-90 transition-transform">{isUploading ? <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> : <PaperAirplaneIcon className="w-6 h-6" />}</button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        ))}
    </div>
  );
}