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
import { ArrowLeftOnRectangleIcon } from "@heroicons/react/24/outline";

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
  EllipsisVerticalIcon, ArrowDownTrayIcon
} from "@heroicons/react/24/outline";

import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

// --- SUB-COMPONENTS ---
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

  // -- NEW STATE FOR PROFILE/RESUME SWITCH --
  const [modalSubTab, setModalSubTab] = useState("details"); // 'details' | 'resume'
  
  // Reset modalSubTab when opening a modal
  useEffect(() => {
      if (selectedTalent || selectedApplication) setModalSubTab("details");
  }, [selectedTalent, selectedApplication]);
  
  // --- JOB MODAL STATES ---
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false); 
  const [isJobCategoryDropdownOpen, setIsJobCategoryDropdownOpen] = useState(false); 
  const [jobForm, setJobForm] = useState({ title: "", sitio: "", salary: "", type: "Full-time", description: "", category: "", capacity: "" });
  
  // --- PROFILE STATES ---
  const [profileImage, setProfileImage] = useState(null);
  const [imgScale, setImgScale] = useState(1);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const [employerData, setEmployerData] = useState({ 
      firstName: "", lastName: "", sitio: "", title: "Employer", contact: "", 
      aboutMe: "", 
      workExperience: [""], 
      education: { primary: "", secondary: "", college: "" }, 
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
             // FIX: Query 'targetId' and remove 'orderBy' to avoid Index requirement
             const q = query(collection(db, "reviews"), where("targetId", "==", auth.currentUser.uid));
             
             const unsub = onSnapshot(q, (snap) => {
                 let revs = snap.docs.map(d => ({id: d.id, ...d.data()}));
                 
                 // FIX: Sort locally by createdAt descending
                 revs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                 
                 setReviews(revs);
                 
                 if(revs.length > 0) {
                     // Ensure rating is treated as a number for calculation
                     const total = revs.reduce((acc, curr) => acc + (parseFloat(curr.rating) || 0), 0);
                     setAverageRating((total / revs.length).toFixed(1));
                 } else { 
                     setAverageRating(0); 
                 }
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
        
        if (data.profilePic && !isEditingImage) setProfileImage(data.profilePic);
        if (data.imgScale) setImgScale(data.imgScale);
        
        const parsedEducation = typeof data.education === 'object' && data.education !== null 
            ? { primary: data.education.primary || "", secondary: data.education.secondary || "", college: data.education.college || "" } 
            : { primary: "", secondary: "", college: typeof data.education === 'string' ? data.education : "" };

        const parsedExperience = Array.isArray(data.workExperience) 
            ? data.workExperience 
            : (typeof data.workExperience === 'string' && data.workExperience.trim() ? [data.workExperience] : [""]);
        
        setEmployerData(prev => ({
            ...prev,
            firstName: data.firstName || userData?.firstName || "",
            lastName: data.lastName || userData?.lastName || "",
            contact: data.contact || userData?.contact || data.email || userData?.email || "", 
            sitio: data.sitio || data.location || "", 
            title: data.title || "Employer", 
            aboutMe: data.aboutMe || "",
            workExperience: parsedExperience,
            education: parsedEducation,
            verificationStatus: data.verificationStatus || "pending" 
        }));
      }
    });
    return () => { unsubProfile(); setDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true }).catch(console.error); };
  }, [auth.currentUser, userData, isEditingImage]);

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

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
        let updatedProfilePicUrl = profileImage; 

        if (isEditingImage && fileInputRef.current?.files[0]) {
            const file = fileInputRef.current.files[0];
            const storage = getStorage(auth.app);
            const storageRef = ref(storage, `profile_pics/${auth.currentUser.uid}_${Date.now()}`); 
            const uploadTask = await uploadBytes(storageRef, file);
            updatedProfilePicUrl = await getDownloadURL(uploadTask.ref);
        }

        const cleanExperience = (employerData.workExperience || []).filter(e => e.trim() !== "");

        await setDoc(doc(db, "employers", auth.currentUser.uid), {
            title: employerData.title || "Employer", 
            aboutMe: employerData.aboutMe || "",
            workExperience: cleanExperience, 
            education: employerData.education || { primary: "", secondary: "", college: "" }, 
            profilePic: updatedProfilePicUrl,
            updatedAt: serverTimestamp()
        }, { merge: true });
        
        setIsEditingImage(false); 
        setIsEditingProfile(false); 
    } catch (err) { 
        alert("Error saving profile: " + err.message); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleOpenJobModal = (job = null) => {
    if (!isVerified) return alert("Your account is pending verification. You cannot post jobs yet.");
    if (job) {
      setEditingJobId(job.id);
      setJobForm({ title: job.title, sitio: job.sitio || "", salary: job.salary, type: job.type, description: job.description, category: job.category || "", capacity: job.capacity || "" });
    } else {
      setEditingJobId(null);
      setJobForm({ title: "", sitio: "", salary: "", type: "Full-time", description: "", category: "", capacity: "" });
    }
    setIsJobModalOpen(true); setIsLocationDropdownOpen(false); setIsJobCategoryDropdownOpen(false);
  };

  const handleSaveJob = async () => {
    if (!jobForm.title || !jobForm.salary) return alert("Title and Salary are required.");
    if (!jobForm.category) return alert("Category is required.");
    setLoading(true);
    try {
      const jobData = {
        ...jobForm, 
        capacity: Number(jobForm.capacity) || 0, // 0 means unlimited
        employerId: auth.currentUser.uid, 
        employerName: `${employerData.firstName} ${employerData.lastName}`, 
        employerLogo: profileImage || "", 
        updatedAt: serverTimestamp(), 
        status: "active"
      };
      if (editingJobId) {
          await updateDoc(doc(db, "jobs", editingJobId), jobData);
      } else {
          jobData.applicationCount = 0; // Initialize counter for applicants
          await addDoc(collection(db, "jobs"), { ...jobData, createdAt: serverTimestamp() });
      }
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
      
      // Free up a capacity slot if the applicant is rejected
      if (newStatus === 'rejected') {
          const appDoc = await getDoc(doc(db, "applications", appId));
          if (appDoc.exists() && appDoc.data().jobId) {
              await updateDoc(doc(db, "jobs", appDoc.data().jobId), { applicationCount: increment(-1) });
          }
      }

      if (selectedApplication?.id === appId) setSelectedApplication(prev => ({ ...prev, status: newStatus }));
    } catch (err) { alert("Error updating status: " + err.message); } finally { setLoading(false); }
  };

  const handleDeleteApplication = async (appId) => {
    if (!window.confirm("Delete this application?")) return;
    setLoading(true);
    try { 
        // Free up a capacity slot if deleted directly without being withdrawn/rejected first
        const appDoc = await getDoc(doc(db, "applications", appId));
        if (appDoc.exists() && appDoc.data().jobId && appDoc.data().status !== 'rejected' && appDoc.data().status !== 'withdrawn') {
            await updateDoc(doc(db, "jobs", appDoc.data().jobId), { applicationCount: increment(-1) });
        }
        await deleteDoc(doc(db, "applications", appId)); 
        if (selectedApplication?.id === appId) setSelectedApplication(null); 
    } catch (err) { alert("Error deleting: " + err.message); } finally { setLoading(false); }
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
                                 <button onClick={() => { setActiveTab("Applicants"); setIsNotifOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm font-bold ${newAppCount > 0 ? 'text-red-500 bg-red-500/10' : 'opacity-50'}`}>
                                    <span>New Applicants</span><span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{newAppCount}</span>
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

<aside
  className={`fixed top-0 right-0 h-full w-64 z-[100] rounded-l-3xl flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${glassPanel(darkMode)} ${
    isSidebarOpen ? "translate-x-0 shadow-2xl" : "translate-x-full"
  }`}
>
  <div
    className="h-24 flex items-center justify-center relative mt-8 cursor-pointer"
    onClick={() => {
      setActiveTab("Profile");
      setIsSidebarOpen(false);
    }}
  >
    <div className="flex items-center gap-3 p-2 pr-4 rounded-2xl hover:bg-white/10 group">
      <div className="w-12 h-12 rounded-2xl overflow-hidden">
        {profileImage ? (
          <img src={profileImage} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold">
            E
          </div>
        )}
      </div>

      <div>
        <h1 className="font-black text-sm tracking-tight">{displayName}</h1>
        <p className="text-[10px] opacity-60 font-bold uppercase group-hover:text-blue-500">
          View Profile
        </p>
      </div>
    </div>

    <button
      onClick={(e) => {
        e.stopPropagation();
        setIsSidebarOpen(false);
      }}
      className="absolute top-0 right-4 p-2 opacity-50 hover:opacity-100"
    >
      <XMarkIcon className="w-6 h-6" />
    </button>
  </div>

  <nav className="flex-1 px-4 space-y-3 py-4 overflow-y-auto no-scrollbar">
    <button
      onClick={() => {
        isVerified && setActiveTab("Ratings");
        setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${
        activeTab === "Ratings"
          ? "text-blue-500"
          : "text-slate-500 hover:text-blue-600"
      }`}
    >
      <StarIconOutline className="w-6 h-6" />
      <span className="font-bold text-xs uppercase tracking-widest">Ratings</span>
    </button>

    <button
      onClick={() => {
        setActiveTab("Announcements");
        setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${
        activeTab === "Announcements"
          ? "text-blue-500"
          : "text-slate-500 hover:text-blue-600"
      }`}
    >
      <MegaphoneIcon className="w-6 h-6" />
      <span className="font-bold text-xs uppercase tracking-widest">
        Announcements
      </span>
    </button>

    <button
      onClick={() => {
        setActiveTab("Support");
        setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${
        activeTab === "Support"
          ? "text-blue-500"
          : "text-slate-500 hover:text-blue-600"
      }`}
    >
      <QuestionMarkCircleIcon className="w-6 h-6" />
      <span className="font-bold text-xs uppercase tracking-widest">Support</span>
    </button>
  </nav>

  <div className="p-4 space-y-3">
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="w-full p-3 rounded-2xl flex items-center gap-3 bg-white/5 hover:bg-white/10"
    >
      {darkMode ? (
        <SunIcon className="w-6 h-6 text-amber-400" />
      ) : (
        <MoonIcon className="w-6 h-6 text-slate-600" />
      )}
      <span className="text-xs font-bold">Switch Theme</span>
    </button>

    <button
      onClick={handleLogout}
      className="w-full p-3 rounded-2xl flex items-center gap-3 text-red-500 hover:bg-red-500/10"
    >
      <ArrowLeftOnRectangleIcon className="w-6 h-6" />
      <span className="text-xs font-bold">Logout</span>
    </button>
  </div>
</aside>

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
            <div className="relative"><UsersIcon className="w-6 h-6" />{newAppCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}</div>
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
          JOB CREATION / EDITING MODAL (Refined Stats-Card Theme)
          ========================================================= */}
      {isJobModalOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsJobModalOpen(false)}>
              <div 
                  onClick={(e) => e.stopPropagation()} 
                  className={`relative w-full max-w-2xl p-6 md:p-8 rounded-[2.5rem] shadow-2xl border animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] hide-scrollbar 
                    ${darkMode 
                        ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-white/10 text-white' 
                        : 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 border-white/60 ring-1 ring-inset ring-white/40 text-blue-900 shadow-[0_20px_50px_-10px_rgba(37,99,235,0.2)]'}`}
              >
                  {/* Decorative Icon Background */}
                  <div className={`absolute -right-10 -bottom-10 opacity-[0.08] pointer-events-none rotate-12 transition-transform duration-500 ${darkMode ? 'text-white' : 'text-blue-600'}`}>
                      <BriefcaseIcon className="w-64 h-64" />
                  </div>

                  {/* Header */}
                  <div className="flex items-center justify-between mb-8 relative z-10">
                      <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl backdrop-blur-md border shadow-sm ${darkMode ? 'bg-blue-500/20 border-blue-500/30 text-white' : 'bg-white/60 border-white text-blue-600 shadow-inner'}`}>
                              <PlusIcon className="w-8 h-8"/>
                          </div>
                          <div>
                              <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-blue-900'}`}>{editingJobId ? 'Edit Job Listing' : 'Post New Job'}</h2>
                              <p className={`text-[10px] font-bold uppercase tracking-widest opacity-70 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                                  {editingJobId ? 'Update details below' : 'Fill in the details below'}
                              </p>
                          </div>
                      </div>
                      <button onClick={() => setIsJobModalOpen(false)} className={`p-2 rounded-full transition-all hover:scale-110 active:scale-95 ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white/40 hover:bg-white/60 text-blue-900 border border-white/60'}`}>
                          <XMarkIcon className="w-6 h-6"/>
                      </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
                      {/* 1. Job Title */}
                      <div className="md:col-span-2">
                          <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Job Title <span className="text-red-500">*</span></label>
                          <input 
                              type="text" 
                              value={jobForm.title} 
                              onChange={e => setJobForm({...jobForm, title: e.target.value})} 
                              className={`w-full p-4 rounded-2xl outline-none border transition-all font-bold text-sm shadow-inner backdrop-blur-md 
                                ${darkMode ? 'bg-slate-800/50 border-white/10 focus:border-blue-500 text-white' : 'bg-white/40 border-white/60 focus:bg-white/80 focus:border-blue-400 text-blue-900 placeholder-blue-400/60'}`} 
                              placeholder="e.g. Need Carpenter" 
                          />
                      </div>
                      
                      {/* 2A. Location Dropdown */}
                      <div className="relative">
                          <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Location (Sitio) <span className="text-red-500">*</span></label>
                          <button 
                              onClick={(e) => { e.preventDefault(); setIsLocationDropdownOpen(!isLocationDropdownOpen); setIsJobCategoryDropdownOpen(false); }}
                              className={`w-full p-4 rounded-2xl outline-none border transition-all font-bold text-sm text-left shadow-inner flex items-center justify-between backdrop-blur-md
                                ${darkMode ? 'bg-slate-800/50 border-white/10 text-white' : 'bg-white/40 border-white/60 text-blue-900'}`}
                          >
                              <span className={jobForm.sitio ? '' : 'opacity-50'}>{jobForm.sitio || "Select Location"}</span>
                              <ChevronDownIcon className={`w-5 h-5 transition-transform ${isLocationDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {isLocationDropdownOpen && (
                              <div className={`absolute z-[70] top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-blue-100 text-slate-900'}`}>
                                  <div className="max-h-48 overflow-y-auto p-2 space-y-1 hide-scrollbar">
                                      {PUROK_LIST.map(purok => (
                                          <button 
                                              key={purok} 
                                              onClick={(e) => { e.preventDefault(); setJobForm({...jobForm, sitio: purok}); setIsLocationDropdownOpen(false); }}
                                              className={`w-full text-left p-3 rounded-xl transition-colors text-xs font-bold ${jobForm.sitio === purok ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}`}
                                          >
                                              {purok}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* 2B. Category Dropdown */}
                      <div className="relative">
                          <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Category <span className="text-red-500">*</span></label>
                          <button 
                              onClick={(e) => { e.preventDefault(); setIsJobCategoryDropdownOpen(!isJobCategoryDropdownOpen); setIsLocationDropdownOpen(false); }}
                              className={`w-full p-4 rounded-2xl outline-none border transition-all font-bold text-sm text-left shadow-inner flex items-center justify-between backdrop-blur-md
                                ${darkMode ? 'bg-slate-800/50 border-white/10 text-white' : 'bg-white/40 border-white/60 text-blue-900'}`}
                          >
                              <span className={jobForm.category ? '' : 'opacity-50'}>{jobForm.category ? JOB_CATEGORIES.find(c => c.id === jobForm.category)?.label : "Select Category"}</span>
                              <ChevronDownIcon className={`w-5 h-5 transition-transform ${isJobCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {isJobCategoryDropdownOpen && (
                              <div className={`absolute z-[70] top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-blue-100 text-slate-900'}`}>
                                  <div className="max-h-48 overflow-y-auto p-2 space-y-1 hide-scrollbar">
                                      {JOB_CATEGORIES.map(cat => (
                                          <button 
                                              key={cat.id} 
                                              onClick={(e) => { e.preventDefault(); setJobForm({...jobForm, category: cat.id}); setIsJobCategoryDropdownOpen(false); }}
                                              className={`w-full text-left p-3 rounded-xl transition-colors text-xs font-bold ${jobForm.category === cat.id ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}`}
                                          >
                                              {cat.label}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* 3A. Salary */}
                      <div>
                          <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Salary (₱) <span className="text-red-500">*</span></label>
                          <input 
                              type="number" 
                              value={jobForm.salary} 
                              onChange={e => setJobForm({...jobForm, salary: e.target.value})} 
                              className={`w-full p-4 rounded-2xl outline-none border transition-all font-bold text-sm shadow-inner backdrop-blur-md
                                ${darkMode ? 'bg-slate-800/50 border-white/10 focus:border-blue-500 text-white' : 'bg-white/40 border-white/60 focus:bg-white/80 focus:border-blue-400 text-blue-900 placeholder-blue-400/60'}`} 
                              placeholder="e.g. 500" 
                          />
                      </div>

                      {/* 3B. Application Capacity */}
                      <div>
                          <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Capacity</label>
                          <input 
                              type="number" 
                              value={jobForm.capacity} 
                              onChange={e => setJobForm({...jobForm, capacity: e.target.value})} 
                              className={`w-full p-4 rounded-2xl outline-none border transition-all font-bold text-sm shadow-inner backdrop-blur-md
                                ${darkMode ? 'bg-slate-800/50 border-white/10 focus:border-blue-500 text-white' : 'bg-white/40 border-white/60 focus:bg-white/80 focus:border-blue-400 text-blue-900 placeholder-blue-400/60'}`} 
                              placeholder="Unlimited" 
                              min="1"
                          />
                      </div>

                      {/* 4. Job Type Icons Picker */}
                      <div className="md:col-span-2 mt-2">
                          <label className={`block text-[10px] font-black uppercase tracking-widest mb-3 ml-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Select Job Type <span className="text-red-500">*</span></label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {JOB_TYPES.map(type => {
                                  const isSelected = jobForm.type === type.id;
                                  return (
                                      <button 
                                          key={type.id}
                                          onClick={(e) => { e.preventDefault(); setJobForm({...jobForm, type: type.id}); }}
                                          className={`flex flex-col items-center justify-center p-4 rounded-[1.5rem] border transition-all duration-300 group
                                            ${isSelected 
                                                ? (darkMode ? 'bg-blue-600 border-blue-400 shadow-lg scale-105 text-white' : 'bg-blue-600 border-blue-500 text-white shadow-lg scale-105') 
                                                : (darkMode ? 'bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-700' : 'bg-white/40 border-white/60 text-blue-700 hover:bg-white/80 hover:text-blue-900')}`}
                                      >
                                          <div className={`mb-2 transition-transform duration-300 group-hover:scale-110 ${isSelected ? '' : 'opacity-60'}`}>
                                              {cloneElement(type.icon, { className: "w-8 h-8" })}
                                          </div>
                                          <span className="text-[10px] font-black uppercase tracking-widest">{type.id}</span>
                                      </button>
                                  )
                              })}
                          </div>
                      </div>

                      {/* 5. Description */}
                      <div className="md:col-span-2 mt-2">
                          <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Description</label>
                          <textarea 
                              value={jobForm.description} 
                              onChange={e => setJobForm({...jobForm, description: e.target.value})} 
                              rows="4" 
                              className={`w-full p-4 rounded-2xl outline-none border transition-all resize-none font-bold text-sm shadow-inner backdrop-blur-md
                                ${darkMode ? 'bg-slate-800/50 border-white/10 focus:border-blue-500 text-white' : 'bg-white/40 border-white/60 focus:bg-white/80 focus:border-blue-400 text-blue-900 placeholder-blue-400/60'}`} 
                              placeholder="Describe the job requirements, responsibilities, and schedule..."
                          ></textarea>
                      </div>

                      {/* Action Button */}
                      <div className="md:col-span-2 pt-4">
                          <button 
                              onClick={handleSaveJob} 
                              disabled={loading} 
                              className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3
                                ${darkMode 
                                    ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'}`}
                          >
                              {loading 
                                ? <div className={`w-5 h-5 border-2 rounded-full animate-spin border-white/30 border-t-white`}></div> 
                                : <>{editingJobId ? 'Update Listing' : 'Publish Listing'} <PaperAirplaneIcon className="w-4 h-4" /></>}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
      
     {/* =========================================================
          CANDIDATE DETAILS MODAL (Discover Tab)
          ========================================================= */}
      {selectedTalent && (() => {
          const getModalTheme = (categoryId, isDark) => {
              const darkColors = {
                  'EDUCATION': { text: 'text-blue-400', bgLight: 'bg-blue-400/10', border: 'border-blue-400/30', btn: 'bg-blue-400 text-slate-900 hover:bg-blue-500', saveActive: 'bg-blue-400 border-blue-400 text-slate-900', saveIdle: 'hover:bg-blue-400/10 hover:text-blue-400 hover:border-blue-400/50' },
                  'AGRICULTURE': { text: 'text-green-400', bgLight: 'bg-green-400/10', border: 'border-green-400/30', btn: 'bg-green-400 text-slate-900 hover:bg-green-500', saveActive: 'bg-green-400 border-green-400 text-slate-900', saveIdle: 'hover:bg-green-400/10 hover:text-green-400 hover:border-green-400/50' },
                  'AUTOMOTIVE': { text: 'text-slate-400', bgLight: 'bg-slate-400/10', border: 'border-slate-400/30', btn: 'bg-slate-400 text-slate-900 hover:bg-slate-500', saveActive: 'bg-slate-400 border-slate-400 text-slate-900', saveIdle: 'hover:bg-slate-400/10 hover:text-slate-400 hover:border-slate-400/50' },
                  'CARPENTRY': { text: 'text-yellow-400', bgLight: 'bg-yellow-400/10', border: 'border-yellow-400/30', btn: 'bg-yellow-400 text-slate-900 hover:bg-yellow-500', saveActive: 'bg-yellow-400 border-yellow-400 text-slate-900', saveIdle: 'hover:bg-yellow-400/10 hover:text-yellow-400 hover:border-yellow-400/50' },
                  'HOUSEHOLD': { text: 'text-pink-400', bgLight: 'bg-pink-400/10', border: 'border-pink-400/30', btn: 'bg-pink-400 text-slate-900 hover:bg-pink-500', saveActive: 'bg-pink-400 border-pink-400 text-slate-900', saveIdle: 'hover:bg-pink-400/10 hover:text-pink-400 hover:border-pink-400/50' },
                  'CUSTOMER_SERVICE': { text: 'text-purple-400', bgLight: 'bg-purple-400/10', border: 'border-purple-400/30', btn: 'bg-purple-400 text-slate-900 hover:bg-purple-500', saveActive: 'bg-purple-400 border-purple-400 text-slate-900', saveIdle: 'hover:bg-purple-400/10 hover:text-purple-400 hover:border-purple-400/50' },
              };
              const fallbackDark = { text: 'text-slate-400', bgLight: 'bg-slate-400/10', border: 'border-slate-400/30', btn: 'bg-slate-400 text-slate-900 hover:bg-slate-500', saveActive: 'bg-slate-400 border-slate-400 text-slate-900', saveIdle: 'hover:bg-slate-400/10 hover:text-slate-400 hover:border-slate-400/50' };
        
              if (isDark) {
                  const cat = darkColors[categoryId] || fallbackDark;
                  return { solid: cat.btn, badge: `${cat.bgLight} ${cat.border} ${cat.text}`, saveActive: cat.saveActive, saveIdle: `bg-slate-800 border-transparent text-slate-400 ${cat.saveIdle}` };
              } else {
                  return { solid: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 text-white', badge: 'bg-blue-600/10 border-blue-600/20 text-blue-600', saveActive: 'bg-blue-600 border-blue-600 text-white', saveIdle: 'bg-white border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200' };
              }
          };

          const theme = getModalTheme(selectedTalent.category, darkMode);
          const pic = getAvatarUrl(selectedTalent) || selectedTalent.profilePic;
          
          // Check if applicant is already immediately hired 
          const isHired = receivedApplications.some(app => app.applicantId === selectedTalent.id && app.status === 'accepted');

          const handleImmediateHire = async () => {
              if (!window.confirm(`Immediately hire ${selectedTalent.firstName}? They will automatically appear in your Applicants tab as Accepted.`)) return;
              setLoading(true);
              try {
                  await addDoc(collection(db, "applications"), {
                      jobId: myPostedJobs.length > 0 ? myPostedJobs[0].id : "direct_hire",
                      jobTitle: myPostedJobs.length > 0 ? myPostedJobs[0].title : "Direct Hire",
                      employerId: auth.currentUser.uid,
                      employerName: `${employerData.firstName} ${employerData.lastName}`.trim() || "Employer",
                      employerLogo: profileImage || "",
                      applicantId: selectedTalent.id,
                      applicantName: `${selectedTalent.firstName} ${selectedTalent.lastName}`.trim(),
                      applicantProfilePic: pic || "",
                      status: 'accepted',
                      appliedAt: serverTimestamp(),
                      isViewed: true,
                      isReadByApplicant: false,
                      isRatedByEmployer: false
                  });
                  alert(`${selectedTalent.firstName} has been successfully hired!`);
              } catch (err) {
                  alert("Error processing hire: " + err.message);
              } finally {
                  setLoading(false);
              }
          };

          return (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedTalent(null)}>
                <div 
                   onClick={(e) => e.stopPropagation()}
                   className={`relative w-full max-w-md md:max-w-4xl p-5 sm:p-8 rounded-3xl shadow-2xl border animate-in zoom-in-95 duration-300 flex flex-col md:flex-row md:gap-8 overflow-y-auto max-h-[70vh] sm:max-h-[90vh] hide-scrollbar ${darkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                >
                    <button onClick={() => setSelectedTalent(null)} className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-colors ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                        <XMarkIcon className="w-5 h-5"/>
                    </button>
                    
                    {/* --- LEFT SIDE: Candidate Info --- */}
                    <div className="flex flex-col items-center md:w-1/3 shrink-0 w-full mb-6 md:mb-0 pt-2">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] overflow-hidden mb-4 shrink-0 bg-slate-100 dark:bg-slate-800">
                            {pic ? (
                                <img src={pic} alt={selectedTalent.firstName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-4xl font-black text-white uppercase">{selectedTalent.firstName?.charAt(0) || "U"}</div>
                            )}
                        </div>
                        
                        <h2 className="text-2xl font-black mb-6 text-center leading-tight w-full">{selectedTalent.firstName} {selectedTalent.lastName}</h2>
                        
                        <div className="flex flex-col gap-4 text-xs font-bold text-slate-500 w-full items-center text-center cursor-default select-none">
                            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 w-full">
                                <div className="flex items-center gap-1.5">
                                    <MapPinIcon className="w-4 h-4 text-slate-500 shrink-0" />
                                    <span className={!selectedTalent.sitio ? 'opacity-50 italic' : ''}>{selectedTalent.sitio || "Location not set"}</span>
                                </div>
                                {selectedTalent.email && (
                                    <div className="flex items-center gap-1.5" title="Email">
                                        <EnvelopeIcon className="w-4 h-4 text-slate-500 shrink-0" />
                                        <span className="text-slate-500 truncate max-w-[150px]">{selectedTalent.email}</span>
                                    </div>
                                )}
                            </div>

                            {/* CATEGORY BADGE BELOW LOCATION/CONTACT */}
                            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 w-full">
                                {selectedTalent.category ? (
                                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1.5 ${theme.badge}`}>
                                        <TagIcon className="w-3.5 h-3.5" />
                                        {JOB_CATEGORIES.find(c => c.id === selectedTalent.category)?.label || selectedTalent.category}
                                    </span>
                                ) : (
                                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1.5 opacity-50`}>
                                        <TagIcon className="w-3.5 h-3.5" />
                                        Uncategorized
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- RIGHT SIDE: Candidate Details --- */}
                    <div className="w-full md:w-2/3 flex flex-col h-full max-h-[55vh] md:max-h-[70vh]">
                        
                        {/* Switch Sub-Header */}
                        <div className="flex justify-end mb-4 shrink-0">
                            <button 
                                onClick={() => setModalSubTab(prev => prev === "details" ? "resume" : "details")}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {modalSubTab === "details" ? (
                                    <><DocumentIcon className="w-4 h-4" /><span>View Resume</span></>
                                ) : (
                                    <><UserCircleIcon className="w-4 h-4" /><span>Profile Details</span></>
                                )}
                            </button>
                        </div>

                        {/* Scrollable Container */}
                        <div className="flex-1 overflow-y-auto hide-scrollbar space-y-4 pr-2 -mr-2 pb-2">
                            {modalSubTab === "details" ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className={`p-5 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">About Candidate</p>
                                        <p className="text-sm opacity-90 leading-relaxed whitespace-pre-wrap font-medium">{selectedTalent.aboutMe || selectedTalent.bio || "No bio provided."}</p>
                                    </div>
                                    
                                    <div className={`p-5 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">Educational Background</p>
                                        {typeof selectedTalent.education === 'object' && selectedTalent.education !== null ? (
                                            <div className="space-y-2">
                                                <p className="text-sm opacity-90"><span className="opacity-50 text-[10px] uppercase font-bold tracking-widest mr-2">Primary:</span>{selectedTalent.education.primary || "-"}</p>
                                                <p className="text-sm opacity-90"><span className="opacity-50 text-[10px] uppercase font-bold tracking-widest mr-2">Secondary:</span>{selectedTalent.education.secondary || "-"}</p>
                                                <p className="text-sm opacity-90"><span className="opacity-50 text-[10px] uppercase font-bold tracking-widest mr-2">College:</span>{selectedTalent.education.college || "-"}</p>
                                            </div>
                                        ) : (
                                            <p className={`text-sm leading-relaxed whitespace-pre-wrap font-medium ${selectedTalent.education ? 'opacity-90' : 'opacity-50 italic'}`}>
                                                {selectedTalent.education || "No educational background provided."}
                                            </p>
                                        )}
                                    </div>

                                    <div className={`p-5 rounded-xl flex-1 ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">Work Experience</p>
                                        {Array.isArray(selectedTalent.experience) || Array.isArray(selectedTalent.workExperience) ? (
                                            <ul className="space-y-2 pl-4 list-disc marker:text-blue-500">
                                                {(selectedTalent.experience || selectedTalent.workExperience).filter(e=>e.trim()!=='').length > 0 
                                                    ? (selectedTalent.experience || selectedTalent.workExperience).filter(e=>e.trim()!=='').map((exp, idx) => (
                                                        <li key={idx} className="text-sm opacity-90 font-medium pl-1">{exp}</li>
                                                    ))
                                                    : <p className="text-sm opacity-50 italic -ml-4">No work experience provided.</p>
                                                }
                                            </ul>
                                        ) : (
                                            <p className={`text-sm leading-relaxed whitespace-pre-wrap font-medium ${selectedTalent.workExperience || selectedTalent.experience ? 'opacity-90' : 'opacity-50 italic'}`}>
                                                {selectedTalent.workExperience || selectedTalent.experience || "No work experience provided."}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className={`p-5 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2"><PhotoIcon className="w-4 h-4"/> Resume Image</p>
                                        {selectedTalent.resumeImageUrl ? (
                                            <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm group bg-black/5">
                                                <img src={selectedTalent.resumeImageUrl} alt="Resume" className="w-full h-full object-contain cursor-pointer" onClick={() => setLightboxUrl(selectedTalent.resumeImageUrl)} />
                                                <div className="absolute top-2 right-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl text-white text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                    Click to Expand
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center opacity-50 ${darkMode ? 'border-white/20' : 'border-slate-300'}`}>
                                                <PhotoIcon className="w-6 h-6 mb-1" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">No Image Uploaded</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={`p-5 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2"><DocumentIcon className="w-4 h-4"/> Resume Document</p>
                                        {isHired ? (
                                            selectedTalent.resumeFileUrl ? (
                                                <a 
                                                    href={selectedTalent.resumeFileUrl} 
                                                    download={selectedTalent.resumeFileName || "Applicant_Resume"}
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className={`w-full p-4 rounded-xl flex items-center gap-4 border transition-all group ${darkMode ? 'bg-slate-800 border-white/10 hover:bg-slate-700 text-white' : 'bg-white border-blue-200 hover:border-blue-400 hover:shadow-lg text-slate-800'}`}
                                                >
                                                    <div className={`p-3 rounded-lg transition-colors ${darkMode ? 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/40' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                                        <ArrowDownTrayIcon className="w-6 h-6"/>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-sm group-hover:text-blue-500 transition-colors truncate">
                                                            {selectedTalent.resumeFileName || "Download Resume File"}
                                                        </p>
                                                        <p className="text-[10px] uppercase font-bold opacity-50 tracking-widest mt-0.5">Click to view or save</p>
                                                    </div>
                                                </a>
                                            ) : (
                                                <div className={`w-full p-4 rounded-xl flex flex-col items-center justify-center gap-1 border-2 border-dashed opacity-50 ${darkMode ? 'border-white/20' : 'border-slate-300'}`}>
                                                    <p className="font-bold text-[10px] uppercase tracking-widest">No File Uploaded</p>
                                                </div>
                                            )
                                        ) : (
                                            <div className={`w-full p-6 flex flex-col items-center justify-center text-center rounded-xl border-2 border-dashed opacity-60 ${darkMode ? 'border-white/20 text-white' : 'border-slate-300 text-slate-600'}`}>
                                                <LockClosedIcon className="w-6 h-6 mb-2" />
                                                <p className="font-bold text-[10px] uppercase tracking-widest">Resume Document Locked</p>
                                                <p className="text-[10px] font-medium mt-1 max-w-[200px]">You can only download the resume document once you hire this candidate.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                       {/* --- ACTIONS (Pinned to Bottom) --- */}
                        <div className="w-full flex gap-3 pt-2 shrink-0 mt-2">
                            <button onClick={() => { 
                                setSelectedTalent(null); 
                                handleStartChatFromExternal({ id: selectedTalent.id, name: `${selectedTalent.firstName} ${selectedTalent.lastName}`, profilePic: pic || null }); 
                            }} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg ${theme.solid}`}>
                                Message Candidate
                            </button>
                            
                            <button onClick={handleImmediateHire} disabled={isHired} title="Immediate Hire" className={`flex-none p-4 rounded-xl transition-all border ${isHired ? theme.saveActive : theme.saveIdle}`}>
                                <BoltIcon className={`w-6 h-6 ${isHired ? 'fill-current' : ''}`}/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          );
      })()}

      {/* =========================================================
          APPLICATION DETAILS MODAL (Applicants Tab)
          ========================================================= */}
      {selectedApplication && modalApplicant && (() => {
          const getModalTheme = (categoryId, isDark) => {
              const darkColors = {
                  'EDUCATION': { text: 'text-blue-400', bgLight: 'bg-blue-400/10', border: 'border-blue-400/30', btn: 'bg-blue-400 text-slate-900 hover:bg-blue-500' },
                  'AGRICULTURE': { text: 'text-green-400', bgLight: 'bg-green-400/10', border: 'border-green-400/30', btn: 'bg-green-400 text-slate-900 hover:bg-green-500' },
                  'AUTOMOTIVE': { text: 'text-slate-400', bgLight: 'bg-slate-400/10', border: 'border-slate-400/30', btn: 'bg-slate-400 text-slate-900 hover:bg-slate-500' },
                  'CARPENTRY': { text: 'text-yellow-400', bgLight: 'bg-yellow-400/10', border: 'border-yellow-400/30', btn: 'bg-yellow-400 text-slate-900 hover:bg-yellow-500' },
                  'HOUSEHOLD': { text: 'text-pink-400', bgLight: 'bg-pink-400/10', border: 'border-pink-400/30', btn: 'bg-pink-400 text-slate-900 hover:bg-pink-500' },
                  'CUSTOMER_SERVICE': { text: 'text-purple-400', bgLight: 'bg-purple-400/10', border: 'border-purple-400/30', btn: 'bg-purple-400 text-slate-900 hover:bg-purple-500' },
              };
              const fallbackDark = { text: 'text-slate-400', bgLight: 'bg-slate-400/10', border: 'border-slate-400/30', btn: 'bg-slate-400 text-slate-900 hover:bg-slate-500' };
        
              if (isDark) {
                  const cat = darkColors[categoryId] || fallbackDark;
                  return { solid: cat.btn, badge: `${cat.bgLight} ${cat.border} ${cat.text}`, text: cat.text };
              } else {
                  return { solid: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 text-white', badge: 'bg-blue-600/10 border-blue-600/20 text-blue-600', text: 'text-blue-600' };
              }
          };

          const appliedCategory = modalApplicant.category || modalJob?.category;
          const theme = getModalTheme(appliedCategory, darkMode);
          const pic = getAvatarUrl(modalApplicant) || modalApplicant.profilePic || selectedApplication.applicantProfilePic;
          
          const isHired = selectedApplication.status === 'accepted';

          return (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedApplication(null)}>
                <div 
                   onClick={(e) => e.stopPropagation()}
                   className={`relative w-full max-w-md md:max-w-4xl p-5 sm:p-8 rounded-3xl shadow-2xl border animate-in zoom-in-95 duration-300 flex flex-col md:flex-row md:gap-8 overflow-y-auto max-h-[70vh] sm:max-h-[90vh] hide-scrollbar ${darkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                >
                    <button onClick={() => setSelectedApplication(null)} className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-colors ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                        <XMarkIcon className="w-5 h-5"/>
                    </button>
                    
                    {/* --- LEFT SIDE: Candidate Info --- */}
                    <div className="flex flex-col items-center md:w-1/3 shrink-0 w-full mb-6 md:mb-0 pt-2">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] overflow-hidden mb-4 shrink-0 bg-slate-100 dark:bg-slate-800">
                            {pic ? (
                                <img src={pic} alt={selectedApplication.applicantName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-4xl font-black text-white uppercase">{selectedApplication.applicantName?.charAt(0) || "U"}</div>
                            )}
                        </div>
                        
                        <h2 className="text-2xl font-black mb-6 text-center leading-tight w-full">{selectedApplication.applicantName}</h2>
                        
                        <div className="flex flex-col gap-4 text-xs font-bold text-slate-500 w-full items-center text-center cursor-default select-none">
                            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 w-full">
                                <div className="flex items-center gap-1.5">
                                    <MapPinIcon className="w-4 h-4 text-slate-500 shrink-0" />
                                    <span className={!modalApplicant.sitio ? 'opacity-50 italic' : ''}>{modalApplicant.sitio || "Location not set"}</span>
                                </div>
                                {modalApplicant.email && (
                                    <div className="flex items-center gap-1.5" title="Email">
                                        <EnvelopeIcon className="w-4 h-4 text-slate-500 shrink-0" />
                                        <span className="text-slate-500 truncate max-w-[150px]">{modalApplicant.email}</span>
                                    </div>
                                )}
                            </div>

                            {/* Category Badge */}
                            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 w-full">
                                {appliedCategory ? (
                                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1.5 ${theme.badge}`}>
                                        <TagIcon className="w-3.5 h-3.5" />
                                        {JOB_CATEGORIES.find(c => c.id === appliedCategory)?.label || appliedCategory}
                                    </span>
                                ) : (
                                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1.5 opacity-50`}>
                                        <TagIcon className="w-3.5 h-3.5" />
                                        Uncategorized
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- RIGHT SIDE: Candidate Details --- */}
                    <div className="w-full md:w-2/3 flex flex-col h-full max-h-[55vh] md:max-h-[70vh]">
                        
                        {/* HEADER: Leveled Applied For Badge & Switch Button */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 shrink-0">
                            {/* Applied for Badge (Matching switch button size/style) */}
                            <div className={`flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border truncate flex items-center gap-2 ${darkMode ? 'bg-white/5 border-white/10 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                <span className="opacity-50 shrink-0">Applied for:</span>
                                <span className="truncate font-black">{modalJob?.title || "Unknown Job"}</span>
                            </div>

                            {/* Switch Button */}
                            <button 
                                onClick={() => setModalSubTab(prev => prev === "details" ? "resume" : "details")}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {modalSubTab === "details" ? (
                                    <><DocumentIcon className="w-4 h-4" /><span>View Resume</span></>
                                ) : (
                                    <><UserCircleIcon className="w-4 h-4" /><span>Profile Details</span></>
                                )}
                            </button>
                        </div>

                        {/* Scrollable Container */}
                        <div className="flex-1 overflow-y-auto hide-scrollbar space-y-4 pr-2 -mr-2 pb-2">
                            {modalSubTab === "details" ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className={`p-5 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">About Candidate</p>
                                        <p className="text-sm opacity-90 leading-relaxed whitespace-pre-wrap font-medium">{modalApplicant.aboutMe || modalApplicant.bio || "No bio provided."}</p>
                                    </div>
                                    
                                    <div className={`p-5 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">Educational Background</p>
                                        {typeof modalApplicant.education === 'object' && modalApplicant.education !== null ? (
                                            <div className="space-y-2">
                                                <p className="text-sm opacity-90"><span className="opacity-50 text-[10px] uppercase font-bold tracking-widest mr-2">Primary:</span>{modalApplicant.education.primary || "-"}</p>
                                                <p className="text-sm opacity-90"><span className="opacity-50 text-[10px] uppercase font-bold tracking-widest mr-2">Secondary:</span>{modalApplicant.education.secondary || "-"}</p>
                                                <p className="text-sm opacity-90"><span className="opacity-50 text-[10px] uppercase font-bold tracking-widest mr-2">College:</span>{modalApplicant.education.college || "-"}</p>
                                            </div>
                                        ) : (
                                            <p className={`text-sm leading-relaxed whitespace-pre-wrap font-medium ${modalApplicant.education ? 'opacity-90' : 'opacity-50 italic'}`}>
                                                {modalApplicant.education || "No educational background provided."}
                                            </p>
                                        )}
                                    </div>

                                    <div className={`p-5 rounded-xl flex-1 ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">Work Experience</p>
                                        {Array.isArray(modalApplicant.experience) || Array.isArray(modalApplicant.workExperience) ? (
                                            <ul className="space-y-2 pl-4 list-disc marker:text-blue-500">
                                                {(modalApplicant.experience || modalApplicant.workExperience).filter(e=>e.trim()!=='').length > 0 
                                                    ? (modalApplicant.experience || modalApplicant.workExperience).filter(e=>e.trim()!=='').map((exp, idx) => (
                                                        <li key={idx} className="text-sm opacity-90 font-medium pl-1">{exp}</li>
                                                    ))
                                                    : <p className="text-sm opacity-50 italic -ml-4">No work experience provided.</p>
                                                }
                                            </ul>
                                        ) : (
                                            <p className={`text-sm leading-relaxed whitespace-pre-wrap font-medium ${modalApplicant.workExperience || modalApplicant.experience ? 'opacity-90' : 'opacity-50 italic'}`}>
                                                {modalApplicant.workExperience || modalApplicant.experience || "No work experience provided."}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className={`p-5 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2"><PhotoIcon className="w-4 h-4"/> Resume Image</p>
                                        {modalApplicant.resumeImageUrl ? (
                                            <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm group bg-black/5">
                                                <img src={modalApplicant.resumeImageUrl} alt="Resume" className="w-full h-full object-contain cursor-pointer" onClick={() => setLightboxUrl(modalApplicant.resumeImageUrl)} />
                                                <div className="absolute top-2 right-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl text-white text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                    Click to Expand
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center opacity-50 ${darkMode ? 'border-white/20' : 'border-slate-300'}`}>
                                                <PhotoIcon className="w-6 h-6 mb-1" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">No Image Uploaded</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={`p-5 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2"><DocumentIcon className="w-4 h-4"/> Resume Document</p>
                                        {isHired ? (
                                            modalApplicant.resumeFileUrl ? (
                                                <a 
                                                    href={modalApplicant.resumeFileUrl} 
                                                    download={modalApplicant.resumeFileName || "Applicant_Resume"}
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className={`w-full p-4 rounded-xl flex items-center gap-4 border transition-all group ${darkMode ? 'bg-slate-800 border-white/10 hover:bg-slate-700 text-white' : 'bg-white border-blue-200 hover:border-blue-400 hover:shadow-lg text-slate-800'}`}
                                                >
                                                    <div className={`p-3 rounded-lg transition-colors ${darkMode ? 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/40' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                                        <ArrowDownTrayIcon className="w-6 h-6"/>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-sm group-hover:text-blue-500 transition-colors truncate">
                                                            {modalApplicant.resumeFileName || "Download Resume File"}
                                                        </p>
                                                        <p className="text-[10px] uppercase font-bold opacity-50 tracking-widest mt-0.5">Click to view or save</p>
                                                    </div>
                                                </a>
                                            ) : (
                                                <div className={`w-full p-4 rounded-xl flex flex-col items-center justify-center gap-1 border-2 border-dashed opacity-50 ${darkMode ? 'border-white/20' : 'border-slate-300'}`}>
                                                    <p className="font-bold text-[10px] uppercase tracking-widest">No File Uploaded</p>
                                                </div>
                                            )
                                        ) : (
                                            <div className={`w-full p-6 flex flex-col items-center justify-center text-center rounded-xl border-2 border-dashed opacity-60 ${darkMode ? 'border-white/20 text-white' : 'border-slate-300 text-slate-600'}`}>
                                                <LockClosedIcon className="w-6 h-6 mb-2" />
                                                <p className="font-bold text-[10px] uppercase tracking-widest">Resume Document Locked</p>
                                                <p className="text-[10px] font-medium mt-1 max-w-[200px]">You can only download the resume document once you accept this application.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                       {/* --- ACTIONS (Centered Centering Fix for Mobile) --- */}
                        <div className="w-full flex flex-col sm:flex-row gap-2 pt-2 shrink-0 mt-2">
                            <button onClick={() => { 
                                setSelectedApplication(null); 
                                handleStartChatFromExternal({ id: selectedApplication.applicantId, name: selectedApplication.applicantName, profilePic: pic || null }); 
                            }} className={`w-full sm:flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg ${theme.solid}`}>
                                Message Candidate
                            </button>
                            
                            {selectedApplication.status === 'pending' && (
                                <div className="flex gap-2 w-full sm:flex-[2]">
                                    <button onClick={() => handleUpdateApplicationStatus(selectedApplication.id, 'accepted')} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg bg-green-500 hover:bg-green-400 text-white`}>
                                        Accept
                                    </button>
                                    <button onClick={() => handleUpdateApplicationStatus(selectedApplication.id, 'rejected')} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg bg-red-500 hover:bg-red-400 text-white`}>
                                        Reject
                                    </button>
                                </div>
                            )}
                            
                            {selectedApplication.status === 'accepted' && (
                                <div className="w-full sm:flex-[2] flex items-center justify-center py-4 rounded-xl font-black text-xs uppercase tracking-widest bg-green-500/10 text-green-500 border border-green-500/20 shadow-sm text-center">
                                    <CheckCircleIcon className="w-5 h-5 mr-2 shrink-0" /> 
                                    <span>Application Accepted</span>
                                </div>
                            )}
                            {selectedApplication.status === 'rejected' && (
                                <div className="w-full sm:flex-[2] flex items-center justify-center py-4 rounded-xl font-black text-xs uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 shadow-sm text-center">
                                    <XMarkIcon className="w-5 h-5 mr-2 shrink-0" /> 
                                    <span>Application Rejected</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
          );
      })()}

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