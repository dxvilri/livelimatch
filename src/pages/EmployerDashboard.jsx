import { useState, useEffect, useRef, cloneElement } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext"; 
import { signOut } from "firebase/auth";
import { auth, db, storage } from "../firebase/config"; 
import { createPortal } from "react-dom";
import { 
  collection, query, where, onSnapshot, orderBy,
  addDoc, serverTimestamp, setDoc, doc, updateDoc, deleteDoc, getDoc, getDocs, increment, arrayUnion
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { useChat } from "../hooks/useChat"; 

import { 
  BriefcaseIcon, XMarkIcon, ArrowLeftOnRectangleIcon,
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
  CpuChipIcon, TagIcon, StarIcon as StarIconOutline,
  Cog8ToothIcon, HomeIcon, UserGroupIcon, WrenchScrewdriverIcon, BookmarkIcon, Bars3BottomRightIcon,
  EllipsisVerticalIcon, ArrowDownTrayIcon, BuildingStorefrontIcon
} from "@heroicons/react/24/outline";

import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

import DiscoverTab from "../components/dashboard/employer/DiscoverTab";
import ListingsTab from "../components/dashboard/employer/ListingsTab";
import ApplicantsTab from "../components/dashboard/employer/ApplicantsTab";
import MessagesTab from "../components/dashboard/employer/MessagesTab";
import ProfileTab from "../components/dashboard/employer/ProfileTab";
import RatingsTab from "../components/dashboard/employer/RatingsTab";
import SupportTab from "../components/dashboard/employer/SupportTab";
import RateApplicantModal from "../components/dashboard/employer/RateApplicantModal";
import MessageBubble from "../components/MessageBubble";

// Import General Tabs
import TrainingsTab from "../components/dashboard/applicant/TrainingsTab";
import LiveliMarketTab from "../components/dashboard/applicant/LiveliMarketTab";

import { PUROK_LIST, JOB_CATEGORIES, ADMIN_EMAIL, JOB_TYPES, BOT_FAQ } from "../utils/employerConstants";

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

const glassPanel = (darkMode) => `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;
const glassNavBtn = (darkMode) => `relative p-3 rounded-xl transition-all duration-300 ease-out group ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-blue-500'}`;
const activeGlassNavBtn = (darkMode) => `relative p-3 rounded-xl transition-all duration-300 ease-out scale-110 -translate-y-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`;

export default function EmployerDashboard() {
  const navigate = useNavigate();
  const { userData } = useAuth(); 
  const { showToast } = useToast(); 
  const [activeTab, setActiveTab] = useState("Discover"); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [loading, setLoading] = useState(false); 
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: "", message: "", onConfirm: null, isDestructive: false, confirmText: "Confirm" });
  
  const requestConfirm = (title, message, onConfirm, isDestructive = false, confirmText = "Confirm") => {
      setConfirmDialog({ isOpen: true, title, message, onConfirm, isDestructive, confirmText });
  };
  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

  const togglePinMessage = async (msgId, currentPinnedStatus) => {
      try { await updateDoc(doc(db, "messages", msgId), { isPinned: !currentPinnedStatus }); } 
      catch (err) { console.error("Failed to pin message", err); }
  };

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

  const [isDesktopInboxVisible, setIsDesktopInboxVisible] = useState(false); 
  const [bubblePos, setBubblePos] = useState({ x: window.innerWidth - 80, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
    
  const chat = useChat(auth.currentUser, isMobile);
  const { 
    conversations, activeChat, openChat, closeChat, sendMessage, messages, setActiveChat,
    openBubbles, setOpenBubbles, isBubbleVisible, setIsBubbleVisible,
    isChatMinimized, setIsChatMinimized, isBubbleExpanded, setIsBubbleExpanded,
    activeBubbleView, setActiveBubbleView, scrollRef, unsendMessage
  } = chat;

  const [newMessage, setNewMessage] = useState("");
  const [isChatOptionsOpen, setIsChatOptionsOpen] = useState(false); 
  const [chatSearch, setChatSearch] = useState(""); 
  const [bubbleSearch, setBubbleSearch] = useState("");
  const [replyingTo, setReplyingTo] = useState(null); 
  const [attachment, setAttachment] = useState(null); 
  const [isUploading, setIsUploading] = useState(false); 
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null); 
  const [menuPosition, setMenuPosition] = useState('top'); 
  const chatFileRef = useRef(null); 
  const bubbleFileRef = useRef(null);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
    
  const [programs, setPrograms] = useState([]); 
  const [myPostedJobs, setMyPostedJobs] = useState([]); 
  const [receivedApplications, setReceivedApplications] = useState([]); 
  const [searchTerm, setSearchTerm] = useState("");

  const [isRatingApplicantModalOpen, setIsRatingApplicantModalOpen] = useState(false);
  const [selectedApplicantToRate, setSelectedApplicantToRate] = useState(null);
      
  const [discoverTalents, setDiscoverTalents] = useState([]);
  const [talentSearch, setTalentSearch] = useState("");
  const [talentSitioFilter, setTalentSitioFilter] = useState(""); 
  const [talentCategoryFilter, setTalentCategoryFilter] = useState(""); 
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false); 
  const [isSitioDropdownOpen, setIsSitioDropdownOpen] = useState(false); 
  const [selectedTalent, setSelectedTalent] = useState(null); 

  const [applicantSearch, setApplicantSearch] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null); 
  const [modalApplicant, setModalApplicant] = useState(null); 
  const [modalJob, setModalJob] = useState(null); 
  const [modalLoading, setModalLoading] = useState(false);

  const [applicantReviews, setApplicantReviews] = useState([]);
  const [applicantAverageRating, setApplicantAverageRating] = useState(0);

  const [modalSubTab, setModalSubTab] = useState("details"); 
  
  useEffect(() => {
      if (selectedTalent || selectedApplication) setModalSubTab("details");
  }, [selectedTalent, selectedApplication]);
  
  useEffect(() => {
      const targetId = selectedTalent?.id || selectedApplication?.applicantId;
      if (targetId) {
          const fetchReviews = async () => {
              try {
                  const qReviews = query(collection(db, "reviews"), where("targetId", "==", targetId));
                  const revSnap = await getDocs(qReviews);
                  let revs = revSnap.docs.map(d => ({id: d.id, ...d.data()}));
                  revs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                  setApplicantReviews(revs);
                  if(revs.length > 0) {
                      const total = revs.reduce((acc, curr) => acc + (parseFloat(curr.rating) || 0), 0);
                      setApplicantAverageRating((total / revs.length).toFixed(1));
                  } else {
                      setApplicantAverageRating(0);
                  }
              } catch(err) {}
          };
          fetchReviews();
      } else {
          setApplicantReviews([]);
          setApplicantAverageRating(0);
      }
  }, [selectedTalent, selectedApplication]);

  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false); 
  const [isJobCategoryDropdownOpen, setIsJobCategoryDropdownOpen] = useState(false); 
  const [jobForm, setJobForm] = useState({ title: "", sitio: "", salary: "", type: "Full-time", description: "", category: "", capacity: "" });
  
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
    const isModalActive = selectedApplication !== null || selectedTalent !== null || isJobModalOpen || isEditingImage || lightboxUrl !== null || isBubbleExpanded || confirmDialog.isOpen;
    if (isModalActive) document.body.style.overflow = "hidden"; 
    else document.body.style.overflow = "auto";    
    return () => { document.body.style.overflow = "auto"; };
  }, [selectedApplication, selectedTalent, isJobModalOpen, isEditingImage, lightboxUrl, isBubbleExpanded, confirmDialog.isOpen]);

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
    localStorage.setItem("theme", darkMode ? "dark" : "light");
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

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
        const q = query(collection(db, "applicants"));
        const unsub = onSnapshot(q, (querySnapshot) => {
            const talents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const validTalents = talents.filter(t => t.firstName || t.lastName);
            setDiscoverTalents(validTalents);
        });
        return () => unsub();
     }
     if(activeTab === "Ratings") {
         const fetchReviews = () => {
             const q = query(collection(db, "reviews"), where("targetId", "==", auth.currentUser.uid));
             const unsub = onSnapshot(q, (snap) => {
                 let revs = snap.docs.map(d => ({id: d.id, ...d.data()}));
                 revs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                 setReviews(revs);
                 if(revs.length > 0) {
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

    const qPrograms = query(collection(db, "livelihood_programs"), orderBy("createdAt", "desc"));
    const unsubPrograms = onSnapshot(qPrograms, (snap) => {
       setPrograms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubJobs(); unsubApps(); unsubPrograms(); };
  }, [auth.currentUser]);

  const handleImmediateHire = (talent) => {
      requestConfirm("Immediate Hire", `Hire ${talent.firstName}? They will automatically appear in your Applicants tab as Accepted.`, async () => {
          setLoading(true);
          try {
              await addDoc(collection(db, "applications"), {
                  jobId: myPostedJobs.length > 0 ? myPostedJobs[0].id : "direct_hire",
                  jobTitle: myPostedJobs.length > 0 ? myPostedJobs[0].title : "Direct Hire",
                  employerId: auth.currentUser.uid,
                  employerName: `${employerData.firstName} ${employerData.lastName}`.trim() || "Employer",
                  employerLogo: profileImage || "",
                  applicantId: talent.id,
                  applicantName: `${talent.firstName} ${talent.lastName}`.trim(),
                  applicantProfilePic: getAvatarUrl(talent) || talent.profilePic || "",
                  status: 'accepted',
                  appliedAt: serverTimestamp(),
                  isViewed: true,
                  isReadByApplicant: false,
                  isRatedByEmployer: false
              });
              showToast(`${talent.firstName} has been successfully hired!`, "success");
          } catch (err) {
              showToast("Error processing hire: " + err.message, "error");
          } finally {
              setLoading(false);
          }
      }, false, "Confirm Hire");
  };

  const handleStartChatFromExternal = (userObj) => {
    if (!isVerified) return showToast("Your account must be verified to send messages.", "error"); 
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
        } catch (err) { showToast("Failed to send file.", "error"); } finally { setIsUploading(false); }
    }
  };

  const handleSupportFileSelect = (e) => { if (e.target.files[0]) setSupportAttachment(e.target.files[0]); };

  const handleSendFAQ = async (faq) => {
      const userMsg = { sender: 'user', text: faq.question, timestamp: new Date() };
      const botMsg = { sender: 'admin', text: `🤖 ${faq.answer}`, timestamp: new Date() };
      try {
          if (activeSupportTicket) {
               if(activeSupportTicket.status === 'closed') { return showToast("This ticket is closed. Please start a new one.", "error"); }
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
          return showToast(`Please wait ${remaining} more minute(s) before opening a new support request.`, "error");
      }
      setIsSupportUploading(true);
      try {
          let imageUrl = null;
          if (supportAttachment) {
             const storageRef = ref(storage, `support_attachments/${auth.currentUser.uid}/${Date.now()}_${supportAttachment.name}`);
             const uploadTask = await uploadBytes(storageRef, supportAttachment);
             imageUrl = await getDownloadURL(uploadTask.ref);
          }
          
          const userMsgObj = { sender: 'user', text: ticketMessage, imageUrl: imageUrl || null, timestamp: new Date() };
          const messagesToSave = [userMsgObj];
          const botReplyText = getBotAutoReply(ticketMessage, BOT_FAQ);
          
          if (botReplyText) {
              messagesToSave.push({
                  sender: 'admin', 
                  text: botReplyText, 
                  timestamp: new Date()
              });
          }

          if (activeSupportTicket) {
              await updateDoc(doc(db, "support_tickets", activeSupportTicket.id), { 
                  messages: arrayUnion(...messagesToSave), 
                  lastUpdated: serverTimestamp(), 
                  status: 'open' 
              });
          } else {
              const ticketIdString = Math.floor(1000 + Math.random() * 9000).toString();
              const newTicketRef = await addDoc(collection(db, "support_tickets"), { 
                  ticketId: ticketIdString, 
                  user: displayName, 
                  userId: auth.currentUser.uid, 
                  type: 'Employer', 
                  status: 'open', 
                  lastUpdated: serverTimestamp(), 
                  messages: messagesToSave 
              });
              setLastTicketCreatedAt(now);
              const newTicketSnap = await getDoc(newTicketRef);
              setActiveSupportTicket({ id: newTicketRef.id, ...newTicketSnap.data() });
          }
          setTicketMessage(""); setSupportAttachment(null); if(supportFileRef.current) supportFileRef.current.value = ""; 
      } catch (err) {} finally { setIsSupportUploading(false); }
  };
  
  const handleCloseSupportTicket = async (ticketId) => {
      requestConfirm("Close Ticket", "Are you sure you want to close this support request?", async () => {
          try {
              await updateDoc(doc(db, "support_tickets", ticketId), { status: 'closed', lastUpdated: serverTimestamp() });
              setActiveSupportTicket(null); setIsSupportOpen(false);
              showToast("Ticket closed successfully.", "success");
          } catch (err) { showToast("Failed to close ticket.", "error"); }
      }, false, "Close Ticket");
  };

  const handleDeleteTicket = async (ticketId) => {
    requestConfirm("Delete Ticket", "Delete this conversation permanently?", async () => {
        try {
            await deleteDoc(doc(db, "support_tickets", ticketId));
            if(activeSupportTicket?.id === ticketId) { setActiveSupportTicket(null); setIsSupportOpen(false); }
            showToast("Ticket deleted.", "success");
        } catch(err) { showToast("Failed to delete ticket.", "error"); }
    }, true, "Delete");
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
        let updatedProfilePicUrl = profileImage; 

        if (isEditingImage && fileInputRef.current?.files[0]) {
            const file = fileInputRef.current.files[0];
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
        showToast("Profile successfully updated!", "success");
    } catch (err) { 
        showToast("Error saving profile: " + err.message, "error"); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleOpenJobModal = (job = null) => {
    if (!isVerified) return showToast("Your account is pending verification. You cannot post jobs yet.", "error");
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
    if (!jobForm.title || !jobForm.salary) return showToast("Title and Salary are required.", "error");
    if (!jobForm.category) return showToast("Category is required.", "error");
    setLoading(true);
    try {
      const jobData = {
        ...jobForm, 
        capacity: Number(jobForm.capacity) || 0, 
        employerId: auth.currentUser.uid, 
        employerName: `${employerData.firstName} ${employerData.lastName}`, 
        employerLogo: profileImage || "", 
        updatedAt: serverTimestamp(), 
        status: "active"
      };
      if (editingJobId) {
          await updateDoc(doc(db, "jobs", editingJobId), jobData);
      } else {
          jobData.applicationCount = 0; 
          await addDoc(collection(db, "jobs"), { ...jobData, createdAt: serverTimestamp() });
      }
      setIsJobModalOpen(false); setActiveTab("Listings");
      showToast(editingJobId ? "Job successfully updated." : "Job successfully posted!", "success");
    } catch (err) { showToast("Error saving job: " + err.message, "error"); } 
    finally { setLoading(false); }
  };

  const handleDeleteJob = async (jobId) => {
    requestConfirm("Delete Listing", "Are you sure? This will permanently hide the job from applicants.", async () => {
        try { 
            await deleteDoc(doc(db, "jobs", jobId)); 
            showToast("Job deleted.", "success");
        } catch (err) { showToast("Error deleting job: " + err.message, "error"); }
    }, true, "Delete");
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
    } catch (err) { showToast("Could not load details.", "error"); } finally { setModalLoading(false); }
  };

  const handleUpdateApplicationStatus = async (appId, newStatus) => {
    const isReject = newStatus === 'rejected';
    requestConfirm(`${isReject ? 'Reject' : 'Accept'} Application`, `Are you sure you want to mark this applicant as ${newStatus}?`, async () => {
        setLoading(true);
        try {
          await updateDoc(doc(db, "applications", appId), { status: newStatus, isReadByApplicant: false });
          
          if (newStatus === 'rejected') {
              const appDoc = await getDoc(doc(db, "applications", appId));
              if (appDoc.exists() && appDoc.data().jobId) {
                  await updateDoc(doc(db, "jobs", appDoc.data().jobId), { applicationCount: increment(-1) });
              }
          }

          if (selectedApplication?.id === appId) setSelectedApplication(prev => ({ ...prev, status: newStatus }));
          showToast(`Applicant marked as ${newStatus}`, "success");
        } catch (err) { showToast("Error updating status: " + err.message, "error"); } finally { setLoading(false); }
    }, isReject, isReject ? 'Reject' : 'Accept');
  };

  const handleDeleteApplication = async (appId) => {
    requestConfirm("Delete Application", "Are you sure you want to permanently delete this application record?", async () => {
        setLoading(true);
        try { 
            const appDoc = await getDoc(doc(db, "applications", appId));
            if (appDoc.exists() && appDoc.data().jobId && appDoc.data().status !== 'rejected' && appDoc.data().status !== 'withdrawn') {
                await updateDoc(doc(db, "jobs", appDoc.data().jobId), { applicationCount: increment(-1) });
            }
            await deleteDoc(doc(db, "applications", appId)); 
            if (selectedApplication?.id === appId) setSelectedApplication(null); 
            showToast("Application deleted.", "success");
        } catch (err) { showToast("Error deleting: " + err.message, "error"); } finally { setLoading(false); }
    }, true, "Delete");
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
        showToast("Applicant rated successfully!", "success"); setIsRatingApplicantModalOpen(false);
    } catch (error) { showToast("Failed to submit rating.", "error"); } finally { setLoading(false); }
  };
  
  const handleTouchStart = (e) => { setIsDragging(true); const touch = e.touches[0]; dragOffset.current = { x: touch.clientX - bubblePos.x, y: touch.clientY - bubblePos.y }; };
  const handleTouchMove = (e) => { if (!isDragging) return; const touch = e.touches[0]; const bubbleSize = 56; let newX = touch.clientX - dragOffset.current.x; let newY = touch.clientY - dragOffset.current.y; newY = Math.max(0, Math.min(newY, window.innerHeight - 80)); newX = Math.max(0, Math.min(newX, window.innerWidth - bubbleSize)); setBubblePos({ x: newX, y: newY }); };
  const handleTouchEnd = () => { setIsDragging(false); const trashX = window.innerWidth / 2; const trashY = window.innerHeight - 80; const dist = Math.hypot((bubblePos.x + 28) - trashX, (bubblePos.y + 28) - trashY); if (dist < 60) { setIsBubbleVisible(false); setOpenBubbles([]); return; } if (bubblePos.x < window.innerWidth / 2) setBubblePos(prev => ({ ...prev, x: 0 })); else setBubblePos(prev => ({ ...prev, x: window.innerWidth - 56 })); };

  const handleLogout = async () => { 
      await signOut(auth); 
      navigate("/"); 
  };

  const displayName = `${employerData.firstName} ${employerData.lastName}`.trim() || "Employer";
  const newAppCount = receivedApplications.filter(a => a.status === 'pending' && !a.isViewed).length;
  const totalNotifications = newAppCount;
  
  const unreadMsgCount = conversations.reduce((acc, curr) => {
    const otherId = curr.participants?.find(p => p !== auth.currentUser?.uid);
    if (!otherId || (adminUser && otherId === adminUser.id)) return acc;
    return acc + (curr[`unread_${auth.currentUser?.uid}`] || 0);
  }, 0);

  const getJobStyle = (type) => { const found = JOB_TYPES.find(j => j.id === type); if (found) return found; return { icon: <BoltIcon className="w-6 h-6"/>, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' }; };
  
  const getLocalCatIcon = (id) => {
      const map = { 'EDUCATION': AcademicCapIcon, 'AGRICULTURE': SunIcon, 'AUTOMOTIVE': Cog8ToothIcon, 'CARPENTRY': WrenchScrewdriverIcon, 'HOUSEHOLD': HomeIcon, 'CUSTOMER_SERVICE': UserGroupIcon };
      return map[id] || TagIcon;
  };

  const getModalTheme = (categoryId, isDark) => {
      const darkColors = {
          'EDUCATION': { text: 'text-blue-400', cardBg: 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 backdrop-blur-xl', innerPanel: 'bg-slate-800/60 border border-blue-500/10', tabActive: 'bg-blue-500 text-white shadow-md shadow-blue-500/20', tabIdle: 'text-slate-400 hover:text-blue-300 hover:bg-blue-500/10', solid: 'bg-blue-500 text-white hover:bg-blue-600', badge: 'bg-blue-500/10 border border-blue-500/30 text-blue-400', saveActive: 'bg-blue-500 border-blue-500 text-white', saveIdle: 'bg-slate-800 border-transparent text-slate-400 hover:bg-blue-500/10 hover:text-blue-400', appliedBtn: 'bg-blue-500/10 text-blue-400 border-blue-500/30 opacity-60' },
          'AGRICULTURE': { text: 'text-green-400', cardBg: 'bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20 backdrop-blur-xl', innerPanel: 'bg-slate-800/60 border border-green-500/10', tabActive: 'bg-green-500 text-white shadow-md shadow-green-500/20', tabIdle: 'text-slate-400 hover:text-green-300 hover:bg-green-500/10', solid: 'bg-green-500 text-white hover:bg-green-600', badge: 'bg-green-500/10 border border-green-500/30 text-green-400', saveActive: 'bg-green-500 border-green-500 text-white', saveIdle: 'bg-slate-800 border-transparent text-slate-400 hover:bg-green-500/10 hover:text-green-400', appliedBtn: 'bg-green-500/10 text-green-400 border-green-500/30 opacity-60' },
          'AUTOMOTIVE': { text: 'text-slate-300', cardBg: 'bg-gradient-to-br from-slate-500/20 to-slate-500/5 border border-slate-500/20 backdrop-blur-xl', innerPanel: 'bg-slate-800/60 border border-slate-500/10', tabActive: 'bg-slate-500 text-white shadow-md shadow-slate-500/20', tabIdle: 'text-slate-400 hover:text-slate-300 hover:bg-slate-500/10', solid: 'bg-slate-500 text-white hover:bg-slate-600', badge: 'bg-slate-500/10 border border-slate-500/30 text-slate-300', saveActive: 'bg-slate-500 border-slate-500 text-white', saveIdle: 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-500/10 hover:text-slate-300', appliedBtn: 'bg-slate-500/10 text-slate-300 border-slate-500/30 opacity-60' },
          'CARPENTRY': { text: 'text-yellow-400', cardBg: 'bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/20 backdrop-blur-xl', innerPanel: 'bg-slate-800/60 border border-yellow-500/10', tabActive: 'bg-yellow-500 text-slate-900 shadow-md shadow-yellow-500/20', tabIdle: 'text-slate-400 hover:text-yellow-300 hover:bg-yellow-500/10', solid: 'bg-yellow-500 text-slate-900 hover:bg-yellow-600', badge: 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400', saveActive: 'bg-yellow-500 border-yellow-500 text-slate-900', saveIdle: 'bg-slate-800 border-transparent text-slate-400 hover:bg-yellow-500/10 hover:text-yellow-400', appliedBtn: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 opacity-60' },
          'HOUSEHOLD': { text: 'text-pink-400', cardBg: 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 border border-pink-500/20 backdrop-blur-xl', innerPanel: 'bg-slate-800/60 border border-pink-500/10', tabActive: 'bg-pink-500 text-white shadow-md shadow-pink-500/20', tabIdle: 'text-slate-400 hover:text-pink-300 hover:bg-pink-500/10', solid: 'bg-pink-500 text-white hover:bg-pink-600', badge: 'bg-pink-500/10 border border-pink-500/30 text-pink-400', saveActive: 'bg-pink-500 border-pink-500 text-white', saveIdle: 'bg-slate-800 border-transparent text-slate-400 hover:bg-pink-500/10 hover:text-pink-400', appliedBtn: 'bg-pink-500/10 text-pink-400 border-pink-500/30 opacity-60' },
          'CUSTOMER_SERVICE': { text: 'text-purple-400', cardBg: 'bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 backdrop-blur-xl', innerPanel: 'bg-slate-800/60 border border-purple-500/10', tabActive: 'bg-purple-500 text-white shadow-md shadow-purple-500/20', tabIdle: 'text-slate-400 hover:text-purple-300 hover:bg-purple-500/10', solid: 'bg-purple-500 text-white hover:bg-purple-600', badge: 'bg-purple-500/10 border border-purple-500/30 text-purple-400', saveActive: 'bg-purple-500 border-purple-500 text-white', saveIdle: 'bg-slate-800 border-transparent text-slate-400 hover:bg-purple-500/10 hover:text-purple-400', appliedBtn: 'bg-purple-500/10 text-purple-400 border-purple-500/30 opacity-60' },
      };
      const fallbackDark = darkColors['AUTOMOTIVE'];

      if (isDark) {
          const cat = darkColors[categoryId] || fallbackDark;
          return {
              modalBg: cat.cardBg,
              textPrimary: 'text-white',
              textSecondary: 'text-slate-400',
              innerPanel: cat.innerPanel,
              tabContainer: 'bg-slate-900/50 p-1.5 rounded-2xl border border-white/10',
              tabActive: cat.tabActive,
              tabIdle: `relative overflow-hidden hover:-translate-y-0.5 hover:shadow-sm ${cat.tabIdle}`,
              solid: cat.solid,
              badge: cat.badge,
              saveActive: cat.saveActive,
              saveIdle: cat.saveIdle,
              appliedBtn: cat.appliedBtn,
              closeBtn: 'bg-white/5 hover:bg-red-500/20 text-white hover:text-red-400 border border-white/10',
              iconColor: cat.text,
              divider: 'border-white/10'
          };
      } else {
          return {
              modalBg: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] ring-1 ring-inset ring-white/40',
              textPrimary: 'text-white drop-shadow-sm',
              textSecondary: 'text-blue-100',
              innerPanel: 'bg-white/10 border border-white/20 shadow-inner',
              tabContainer: 'bg-black/20 p-1.5 rounded-2xl shadow-inner border border-white/10',
              tabActive: 'bg-white text-blue-700 shadow-md',
              tabIdle: 'text-blue-100 hover:text-white hover:bg-white/10 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg',
              solid: 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg active:scale-95',
              badge: 'bg-black/20 border border-white/20 text-white backdrop-blur-md',
              saveActive: 'bg-white border-white text-blue-600 shadow-md',
              saveIdle: 'bg-transparent border-white/30 text-white/70 hover:bg-white/20 hover:text-white',
              appliedBtn: 'bg-white/20 text-white border border-white/30 opacity-80',
              closeBtn: 'bg-black/20 hover:bg-red-500/80 text-white border border-white/10 shadow-sm',
              iconColor: 'text-white',
              divider: 'border-white/20'
          };
      }
  };

return (
    <div className={`relative min-h-screen transition-colors duration-500 font-sans pb-24 md:pb-0 select-none cursor-default overflow-x-hidden ${darkMode ? 'bg-slate-950 text-white' : 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 text-blue-900'}`}>
        
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

      {/* --- HEADER MATCHING APPLICANT DASHBOARD --- */}
      <header className={`fixed top-0 left-0 right-0 z-40 h-20 px-6 flex items-center justify-between transition-all duration-300 backdrop-blur-xl border-b ${darkMode ? 'bg-slate-900/80 border-white/5' : 'bg-white/50 border-blue-200/50'} ${(isFullScreenPage) ? '-translate-y-full' : 'translate-y-0'} ${!isVerified && !isFullScreenPage ? 'top-10' : 'top-0'}`}>
            <div className="flex items-center gap-3">
                 <h1 className={`font-black text-xl sm:text-2xl tracking-tighter shrink-0 cursor-pointer ${darkMode ? 'text-white' : 'text-blue-900'}`}>
                    LIVELI<span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>MATCH</span>
                 </h1>
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
                    <button onClick={() => isVerified && setIsNotifOpen(!isNotifOpen)} className={`relative p-2 rounded-full transition-all active:scale-95 ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-white/40 text-blue-900/60'} ${!isVerified && 'opacity-50 cursor-not-allowed'}`}>
                        <BellIcon className="w-6 h-6" />
                        {isVerified && totalNotifications > 0 && <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}
                    </button>
                    {isNotifOpen && isVerified && (
                        <div className={`fixed top-24 left-1/2 -translate-x-1/2 w-[90vw] md:absolute md:translate-x-0 md:top-12 md:right-0 md:w-80 md:left-auto rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200 z-[100] ${darkMode ? 'bg-slate-800 border-white/10' : 'bg-white/90 border-white/60 backdrop-blur-xl'}`}>
                             <div className={`p-3 border-b font-black text-xs uppercase tracking-widest opacity-50 ${darkMode ? 'border-white/10' : 'border-slate-200 text-slate-500'}`}>Notifications</div>
                             <div className="p-2 space-y-1">
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
                  
                <button onClick={() => setIsSidebarOpen(true)} className={`p-2 rounded-xl transition-colors ${darkMode ? 'text-white hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}><Bars3BottomRightIcon className="w-7 h-7" /></button>
            </div>
      </header>

      <aside className={`fixed top-0 right-0 h-full w-64 z-[100] rounded-l-3xl flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${glassPanel(darkMode)} ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "translate-x-full"}`}>
        <div className="h-24 flex items-center justify-center relative mt-8 cursor-pointer" onClick={() => { setActiveTab("Profile"); setIsSidebarOpen(false); }}>
            <div className={`flex items-center gap-3 p-2 pr-4 rounded-2xl transition-colors group ${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`}>
            <div className="w-12 h-12 rounded-2xl overflow-hidden">
                {profileImage ? ( <img src={profileImage} className="w-full h-full object-cover" /> ) : ( <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold">E</div> )}
            </div>

            <div>
                <h1 className={`font-black text-sm tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{displayName}</h1>
                <p className={`text-[10px] opacity-60 font-bold uppercase ${darkMode ? 'group-hover:text-blue-400' : 'group-hover:text-blue-600'}`}>View Profile</p>
            </div>
            </div>

            <button onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }} className={`absolute top-0 right-4 p-2 opacity-50 hover:opacity-100 ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                <XMarkIcon className="w-6 h-6" />
            </button>
        </div>

        <nav className="flex-1 px-4 space-y-3 py-4 overflow-y-auto no-scrollbar">
            <button onClick={() => { isVerified && setActiveTab("Ratings"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${activeTab === 'Ratings' ? (darkMode ? 'text-blue-400 bg-slate-800/50 shadow-sm border border-white/10' : 'text-blue-600 bg-white shadow-sm border border-slate-200') : (darkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50')}`}>
            <StarIconOutline className="w-6 h-6" />
            <span className="font-bold text-xs uppercase tracking-widest">Ratings</span>
            </button>

            <button onClick={() => { setActiveTab("LiveliMarket"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${activeTab === 'LiveliMarket' ? (darkMode ? 'text-blue-400 bg-slate-800/50 shadow-sm border border-white/10' : 'text-blue-600 bg-white shadow-sm border border-slate-200') : (darkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50')}`}>
            <BuildingStorefrontIcon className="w-6 h-6" />
            <span className="font-bold text-xs uppercase tracking-widest">LiveliMarket</span>
            </button>

            <button onClick={() => { setActiveTab("Trainings"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${activeTab === 'Trainings' ? (darkMode ? 'text-blue-400 bg-slate-800/50 shadow-sm border border-white/10' : 'text-blue-600 bg-white shadow-sm border border-slate-200') : (darkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50')}`}>
            <AcademicCapIcon className="w-6 h-6" />
            <span className="font-bold text-xs uppercase tracking-widest">Trainings</span>
            </button>

            <button onClick={() => { setActiveTab("Support"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${activeTab === 'Support' ? (darkMode ? 'text-blue-400 bg-slate-800/50 shadow-sm border border-white/10' : 'text-blue-600 bg-white shadow-sm border border-slate-200') : (darkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50')}`}>
            <QuestionMarkCircleIcon className="w-6 h-6" />
            <span className="font-bold text-xs uppercase tracking-widest">Support</span>
            </button>
        </nav>

        <div className="p-4 space-y-3">
            <button onClick={() => setDarkMode(!darkMode)} className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-colors ${darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
            {darkMode ? <SunIcon className="w-6 h-6 text-amber-400" /> : <MoonIcon className="w-6 h-6 text-slate-600" />}
            <span className="text-xs font-bold">Switch Theme</span>
            </button>

            <button onClick={handleLogout} className={`w-full p-3 rounded-2xl flex items-center gap-3 text-red-500 transition-colors ${darkMode ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}>
            <ArrowLeftOnRectangleIcon className="w-6 h-6" />
            <span className="text-xs font-bold">Logout</span>
            </button>
        </div>
      </aside>

      <main className={`relative z-10 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${(isFullScreenPage) ? 'p-0 pt-0' : 'p-4 lg:p-8 pt-24 lg:pt-28'}`}>
        
        {/* --- SUBHEADER MATCHING APPLICANT DASHBOARD --- */}
        {!(isFullScreenPage) && (
        <header className={`mb-6 lg:mb-8 flex items-center justify-between p-4 md:p-5 rounded-[2rem] transition-all duration-300 relative overflow-hidden ${darkMode ? 'bg-slate-900 border border-white/10 shadow-sm' : 'bg-white/60 border border-white/60 shadow-xl backdrop-blur-xl'}`}>
            <div className="flex items-center gap-4 relative z-10">
                <div className={`p-3 rounded-2xl hidden md:flex items-center justify-center shadow-sm ${darkMode ? 'bg-blue-400/10 text-blue-400 border border-blue-400/20' : 'bg-white border border-slate-200 text-blue-600'}`}>
                    {activeTab === "Discover" && <SparklesIcon className="w-6 h-6"/>}
                    {activeTab === "Listings" && <BriefcaseIcon className="w-6 h-6"/>}
                    {activeTab === "Applicants" && <UsersIcon className="w-6 h-6"/>}
                    {activeTab === "Messages" && <ChatBubbleLeftRightIcon className="w-6 h-6"/>}
                    {activeTab === "Profile" && <UserCircleIcon className="w-6 h-6"/>}
                    {activeTab === "Ratings" && <StarIconOutline className="w-6 h-6"/>}
                    {activeTab === "Support" && <QuestionMarkCircleIcon className="w-6 h-6"/>}
                    {activeTab === "LiveliMarket" && <BuildingStorefrontIcon className="w-6 h-6"/>}
                    {activeTab === "Trainings" && <AcademicCapIcon className="w-6 h-6"/>}
                </div>
                <div>
                    <h2 className={`text-xl lg:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-blue-900'}`}>
                      {activeTab === "Profile" ? "Profile" : 
                       activeTab === "Support" ? "Help & Support" : 
                       activeTab === "LiveliMarket" ? "LiveliMarket" :
                       activeTab === "Trainings" ? "Trainings & Seminars" :
                       activeTab}
                    </h2>
                    <p className={`text-[10px] font-bold uppercase tracking-widest opacity-60 ${darkMode ? 'text-slate-400' : 'text-blue-800'}`}>Employer Workspace</p>
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
                setActiveTab={setActiveTab}
                getAvatarUrl={getAvatarUrl}
                onImmediateHire={handleImmediateHire}
                employerData={employerData} 
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
                chatStatus={activeChat ? formatLastSeen(conversations.find(c => c.chatId?.includes(activeChat.id))?.lastTimestamp) : null}
                conversations={conversations}
                openChat={openChat}
                closeChat={closeChat}
                sendMessage={sendMessage}
                unsendMessage={chat.unsendMessage}
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
                scrollRef={scrollRef}
                formatTime={formatTime}
                getAvatarUrl={getAvatarUrl}
                isChatOptionsOpen={isChatOptionsOpen}
                setIsChatOptionsOpen={setIsChatOptionsOpen}
            />
        )}

        {isVerified && activeTab === "Trainings" && (
            <TrainingsTab darkMode={darkMode} programs={programs} />
        )}

        {isVerified && activeTab === "LiveliMarket" && (
            <LiveliMarketTab 
                darkMode={darkMode} 
                onChatClick={() => {
                    setActiveTab("Messages");
                }} 
            />
        )}
        
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t px-6 py-3 flex justify-around items-center z-[80] transition-transform duration-300 backdrop-blur-xl ${(isFullScreenPage) ? 'translate-y-full' : 'translate-y-0'} ${darkMode ? 'bg-slate-900/80 border-white/10' : 'bg-white/60 border-white/60'}`}>
        <button onClick={() => setActiveTab("Discover")}><SparklesIcon className={`w-6 h-6 ${activeTab === 'Discover' ? 'text-blue-600' : (darkMode ? 'text-slate-500' : 'text-blue-900/60')}`} /></button>
        <button onClick={() => setActiveTab("Listings")}><BriefcaseIcon className={`w-6 h-6 ${activeTab === 'Listings' ? 'text-blue-600' : (darkMode ? 'text-slate-500' : 'text-blue-900/60')}`} /></button>
       <button onClick={() => setActiveTab("Applicants")}>
            <div className="relative"><UsersIcon className={`w-6 h-6 ${activeTab === 'Applicants' ? 'text-blue-600' : (darkMode ? 'text-slate-500' : 'text-blue-900/60')}`} />{newAppCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}</div>
        </button>
        <button onClick={() => setActiveTab("Messages")}>
            <div className="relative"><ChatBubbleLeftRightIcon className={`w-6 h-6 ${activeTab === 'Messages' ? 'text-blue-600' : (darkMode ? 'text-slate-500' : 'text-blue-900/60')}`} />{unreadMsgCount > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[16px] text-center border-none">{unreadMsgCount}</span>}</div>
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
          GLOBAL CONFIRMATION MODAL
          ========================================================= */}
      {confirmDialog.isOpen && (
          <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 ${darkMode ? 'bg-slate-950/80' : 'bg-slate-900/60'}`} onClick={closeConfirm}>
              <div onClick={e => e.stopPropagation()} className={`w-full max-w-sm p-6 md:p-8 rounded-[2.5rem] shadow-2xl border animate-in zoom-in-95 duration-300 flex flex-col items-center text-center ${darkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-white/60 text-slate-900'}`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${confirmDialog.isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {confirmDialog.isDestructive ? <TrashIcon className="w-8 h-8"/> : <CheckCircleIcon className="w-8 h-8"/>}
                  </div>
                  <h3 className="text-xl font-black mb-2 tracking-tight">{confirmDialog.title}</h3>
                  <p className={`text-sm font-medium mb-8 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{confirmDialog.message}</p>
                  <div className="flex gap-3 w-full">
                      <button onClick={closeConfirm} className={`flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 ${darkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>Cancel</button>
                      <button onClick={() => { confirmDialog.onConfirm(); closeConfirm(); }} className={`flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg text-white ${confirmDialog.isDestructive ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}>{confirmDialog.confirmText}</button>
                  </div>
              </div>
          </div>
      )}

     {/* =========================================================
          JOB CREATION / EDITING MODAL 
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
                  <div className={`absolute -right-10 -bottom-10 opacity-[0.08] pointer-events-none rotate-12 transition-transform duration-500 ${darkMode ? 'text-white' : 'text-blue-600'}`}>
                      <BriefcaseIcon className="w-64 h-64" />
                  </div>

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
          const theme = getModalTheme(selectedTalent.category, darkMode);
          const pic = getAvatarUrl(selectedTalent) || selectedTalent.profilePic;
          const CatIcon = getLocalCatIcon(selectedTalent.category);
          
          const isHired = receivedApplications.some(app => app.applicantId === selectedTalent.id && app.status === 'accepted');

          return (
            <div className={`fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md animate-in fade-in ${darkMode ? 'bg-slate-950/80' : 'bg-slate-900/60'}`} onClick={() => setSelectedTalent(null)}>
                <div 
                   onClick={(e) => e.stopPropagation()}
                   className={`relative w-[92vw] sm:w-full max-w-md md:max-w-4xl p-5 sm:p-8 rounded-[2.5rem] animate-in zoom-in-95 duration-300 flex flex-col md:flex-row h-[90vh] max-h-[900px] md:h-[80vh] overflow-hidden ${theme.modalBg}`}
                >
                    <div className={`absolute -right-12 -bottom-12 md:-right-16 md:-bottom-16 opacity-[0.08] rotate-12 pointer-events-none z-0 ${theme.iconColor}`}>
                        <CatIcon className="w-80 h-80 md:w-[28rem] md:h-[28rem]" />
                    </div>

                    <button onClick={() => setSelectedTalent(null)} className={`absolute top-4 right-4 z-20 p-2.5 rounded-full transition-all hover:rotate-90 ${theme.closeBtn}`}>
                        <XMarkIcon className="w-5 h-5"/>
                    </button>
                    
                    <div className="flex flex-col items-center md:w-1/3 shrink-0 w-full mb-4 md:mb-0 pt-2 z-10 relative">
                        <div className="w-20 h-20 sm:w-36 sm:h-36 rounded-[2rem] overflow-hidden mb-4 sm:mb-5 shrink-0 shadow-xl cursor-pointer hover:opacity-90 hover:scale-105 transition-all duration-300 ring-4 ring-black/10">
                            {pic ? (
                                <img src={pic} alt={selectedTalent.firstName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-black/20 flex items-center justify-center text-4xl sm:text-5xl font-black text-white uppercase backdrop-blur-md">{selectedTalent.firstName?.charAt(0) || "U"}</div>
                            )}
                        </div>
                        
                        <h2 className={`text-2xl sm:text-3xl font-black mb-3 text-center leading-tight w-full ${theme.textPrimary}`}>{selectedTalent.firstName} {selectedTalent.lastName}</h2>
                        
                        <div className={`flex flex-col gap-4 text-xs font-bold w-full items-center text-center cursor-default select-none ${theme.textSecondary}`}>
                            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 w-full">
                                <div className="flex items-center gap-1.5">
                                    <MapPinIcon className={`w-4 h-4 shrink-0 ${theme.iconColor}`} />
                                    <span className={!selectedTalent.sitio ? 'opacity-50 italic' : ''}>{selectedTalent.sitio || "Location not set"}</span>
                                </div>
                                {selectedTalent.email && (
                                    <div className="flex items-center gap-1.5" title="Email">
                                        <EnvelopeIcon className={`w-4 h-4 shrink-0 ${theme.iconColor}`} />
                                        <span className="truncate max-w-[150px]">{selectedTalent.email}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 w-full">
                                {selectedTalent.category ? (
                                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${theme.badge}`}>
                                        <TagIcon className="w-3.5 h-3.5" />
                                        {JOB_CATEGORIES.find(c => c.id === selectedTalent.category)?.label || selectedTalent.category}
                                    </span>
                                ) : (
                                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 opacity-50 ${theme.textPrimary}`}>
                                        <TagIcon className="w-3.5 h-3.5" />
                                        Uncategorized
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-2/3 flex flex-col flex-1 min-h-0 overflow-hidden mt-4 md:mt-0 relative z-10 md:ml-8">
                        
                        <div className={`flex flex-wrap gap-2 p-1.5 shrink-0 ${theme.tabContainer}`}>
                            <button 
                                onClick={() => setModalSubTab("details")}
                                className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${modalSubTab === "details" ? theme.tabActive : theme.tabIdle}`}
                            >
                                <span className="relative z-10">Profile Details</span>
                            </button>
                            <button 
                                onClick={() => setModalSubTab("resume")}
                                className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${modalSubTab === "resume" ? theme.tabActive : theme.tabIdle}`}
                            >
                                <span className="relative z-10">View Resume</span>
                            </button>
                            <button 
                                onClick={() => setModalSubTab("reputation")}
                                className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${modalSubTab === "reputation" ? theme.tabActive : theme.tabIdle}`}
                            >
                                <span className="relative z-10">Reviews</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden relative mt-4 w-full">
                            <div 
                                className="flex w-[300%] h-full transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                                style={{ transform: modalSubTab === "details" ? 'translateX(0)' : modalSubTab === "resume" ? 'translateX(-33.333333%)' : 'translateX(-66.666667%)' }}
                            >
                                {/* Slide 1: Profile Details */}
                                <div className="w-1/3 h-full overflow-y-auto px-1 hide-scrollbar">
                                    <div className="space-y-4 pb-2">
                                        <div className={`p-6 rounded-[2rem] ${theme.innerPanel}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest opacity-60 mb-3 ${theme.textSecondary}`}>About Candidate</p>
                                            <p className={`text-sm opacity-90 leading-relaxed whitespace-pre-wrap font-medium ${theme.textPrimary}`}>{selectedTalent.aboutMe || selectedTalent.bio || "No bio provided."}</p>
                                        </div>
                                        
                                        <div className={`p-6 rounded-[2rem] ${theme.innerPanel}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest opacity-60 mb-3 ${theme.textSecondary}`}>Educational Background</p>
                                            {typeof selectedTalent.education === 'object' && selectedTalent.education !== null ? (
                                                <div className="space-y-2">
                                                    <p className={`text-sm opacity-90 ${theme.textPrimary}`}><span className="opacity-50 text-[10px] uppercase font-bold tracking-widest mr-2">Primary:</span>{selectedTalent.education.primary || "-"}</p>
                                                    <p className={`text-sm opacity-90 ${theme.textPrimary}`}><span className="opacity-50 text-[10px] uppercase font-bold tracking-widest mr-2">Secondary:</span>{selectedTalent.education.secondary || "-"}</p>
                                                    <p className={`text-sm opacity-90 ${theme.textPrimary}`}><span className="opacity-50 text-[10px] uppercase font-bold tracking-widest mr-2">College:</span>{selectedTalent.education.college || "-"}</p>
                                                </div>
                                            ) : (
                                                <p className={`text-sm leading-relaxed whitespace-pre-wrap font-medium ${selectedTalent.education ? 'opacity-90' : 'opacity-50 italic'} ${theme.textPrimary}`}>
                                                    {selectedTalent.education || "No educational background provided."}
                                                </p>
                                            )}
                                        </div>

                                        <div className={`p-6 rounded-[2rem] flex-1 ${theme.innerPanel}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest opacity-60 mb-3 ${theme.textSecondary}`}>Work Experience</p>
                                            {Array.isArray(selectedTalent.experience) || Array.isArray(selectedTalent.workExperience) ? (
                                                <ul className="space-y-2 pl-4 list-disc marker:text-blue-500">
                                                    {(selectedTalent.experience || selectedTalent.workExperience).filter(e=>e.trim()!=='').length > 0 
                                                        ? (selectedTalent.experience || selectedTalent.workExperience).filter(e=>e.trim()!=='').map((exp, idx) => (
                                                            <li key={idx} className={`text-sm opacity-90 font-medium pl-1 ${theme.textPrimary}`}>{exp}</li>
                                                        ))
                                                        : <p className={`text-sm opacity-50 italic -ml-4 ${theme.textPrimary}`}>No work experience provided.</p>
                                                    }
                                                </ul>
                                            ) : (
                                                <p className={`text-sm leading-relaxed whitespace-pre-wrap font-medium ${selectedTalent.workExperience || selectedTalent.experience ? 'opacity-90' : 'opacity-50 italic'} ${theme.textPrimary}`}>
                                                    {selectedTalent.workExperience || selectedTalent.experience || "No work experience provided."}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Slide 2: Resume */}
                                <div className="w-1/3 h-full overflow-y-auto px-1 hide-scrollbar">
                                    <div className="space-y-4 pb-2">
                                        <div className={`p-6 rounded-[2rem] ${theme.innerPanel}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest opacity-60 mb-3 flex items-center gap-2 ${theme.textSecondary}`}><PhotoIcon className="w-4 h-4"/> Resume Image</p>
                                            {selectedTalent.resumeImageUrl ? (
                                                <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm group bg-black/20">
                                                    <img src={selectedTalent.resumeImageUrl} alt="Resume" className="w-full h-full object-contain cursor-pointer" onClick={() => setLightboxUrl(selectedTalent.resumeImageUrl)} />
                                                    <div className="absolute top-2 right-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl text-white text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                        Click to Expand
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={`w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center opacity-50 ${theme.divider} ${theme.textPrimary}`}>
                                                    <PhotoIcon className="w-6 h-6 mb-1" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">No Image Uploaded</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className={`p-6 rounded-[2rem] ${theme.innerPanel}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest opacity-60 mb-3 flex items-center gap-2 ${theme.textSecondary}`}><DocumentIcon className="w-4 h-4"/> Resume Document</p>
                                            {isHired ? (
                                                selectedTalent.resumeFileUrl ? (
                                                    <a 
                                                        href={selectedTalent.resumeFileUrl} 
                                                        download={selectedTalent.resumeFileName || "Applicant_Resume"}
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className={`w-full p-4 rounded-xl flex items-center gap-4 border transition-all group bg-black/20 hover:bg-black/30 border-white/10 text-white shadow-inner`}
                                                    >
                                                        <div className={`p-3 rounded-lg transition-colors bg-white/10 text-white group-hover:bg-white/20`}>
                                                            <ArrowDownTrayIcon className="w-6 h-6"/>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-black text-sm transition-colors truncate drop-shadow-md">
                                                                {selectedTalent.resumeFileName || "Download Resume File"}
                                                            </p>
                                                            <p className="text-[10px] uppercase font-bold opacity-70 tracking-widest mt-0.5">Click to view or save</p>
                                                        </div>
                                                    </a>
                                                ) : (
                                                    <div className={`w-full p-4 rounded-xl flex flex-col items-center justify-center gap-1 border-2 border-dashed opacity-50 ${theme.divider} ${theme.textPrimary}`}>
                                                        <p className="font-bold text-[10px] uppercase tracking-widest">No File Uploaded</p>
                                                    </div>
                                                )
                                            ) : (
                                                <div className={`w-full p-6 flex flex-col items-center justify-center text-center rounded-[1.5rem] border-2 border-dashed opacity-60 ${theme.divider} ${theme.textPrimary}`}>
                                                    <LockClosedIcon className="w-6 h-6 mb-2" />
                                                    <p className="font-bold text-[10px] uppercase tracking-widest">Resume Document Locked</p>
                                                    <p className="text-[10px] font-medium mt-1 max-w-[200px]">You can only download the resume document once you hire this candidate.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Slide 3: Reputation */}
                                <div className="w-1/3 h-full overflow-y-auto px-1 hide-scrollbar">
                                    <div className="space-y-4 pb-2">
                                        <div className={`p-8 rounded-[2rem] flex flex-col items-center justify-center text-center ${theme.innerPanel}`}>
                                            <h3 className="text-6xl font-black text-amber-400 mb-3 drop-shadow-md">{applicantAverageRating}</h3>
                                            <div className="flex gap-1.5 mb-3 text-amber-400 drop-shadow-sm">
                                                {[1,2,3,4,5].map(star => (
                                                    <span key={star}>{star <= Math.round(applicantAverageRating) ? <StarIconSolid className="w-7 h-7"/> : <StarIconOutline className="w-7 h-7 opacity-40"/>}</span>
                                                ))}
                                            </div>
                                            <p className={`text-[10px] font-black uppercase tracking-widest opacity-60 ${theme.textSecondary}`}>Based on {applicantReviews.length} Reviews</p>
                                        </div>

                                        <div className="space-y-4 mt-2">
                                            {applicantReviews.length === 0 ? (
                                                <p className={`text-center text-sm font-bold py-8 opacity-60 ${theme.textPrimary}`}>No reviews yet.</p>
                                            ) : (
                                                applicantReviews.map((review, idx) => (
                                                    <div key={idx} className={`p-5 rounded-[2rem] ${theme.innerPanel}`}>
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-200 shrink-0">
                                                                    {review.reviewerPic ? <img src={review.reviewerPic} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full text-[8px] text-slate-800 font-bold">{review.reviewerName?.charAt(0) || "U"}</span>}
                                                                </div>
                                                                <span className={`text-[10px] font-bold opacity-80 ${theme.textPrimary}`}>{review.reviewerName || "Employer"}</span>
                                                            </div>
                                                            <div className="flex gap-0.5 text-amber-400">
                                                                {[1,2,3,4,5].map(star => (
                                                                    <span key={star}>{star <= review.rating ? <StarIconSolid className="w-3.5 h-3.5"/> : <StarIconOutline className="w-3.5 h-3.5 opacity-40"/>}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <p className={`text-sm font-medium leading-relaxed opacity-90 ${theme.textPrimary}`}>"{review.comment}"</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={`w-full flex gap-3 pt-4 shrink-0 border-t z-10 mt-2 ${theme.divider}`}>
                            <button onClick={() => { 
                                setSelectedTalent(null); 
                                handleStartChatFromExternal({ id: selectedTalent.id, name: `${selectedTalent.firstName} ${selectedTalent.lastName}`, profilePic: pic || null }); 
                            }} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 hover:-translate-y-1 transition-transform duration-300 shadow-lg ${theme.solid}`}>
                                Message Candidate
                            </button>
                            
                            <button onClick={() => handleImmediateHire(selectedTalent)} disabled={isHired} title="Immediate Hire" className={`flex-none p-4 rounded-2xl transition-all duration-300 border hover:-translate-y-1 ${isHired ? theme.saveActive : theme.saveIdle}`}>
                                <BoltIcon className={`w-7 h-7 ${isHired ? 'fill-current' : ''}`}/>
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
          const appliedCategory = modalApplicant.category || modalJob?.category || 'AUTOMOTIVE';
          const theme = getModalTheme(appliedCategory, darkMode);
          const pic = getAvatarUrl(modalApplicant) || modalApplicant.profilePic || selectedApplication.applicantProfilePic;
          const CatIcon = getLocalCatIcon(appliedCategory);
          const isHired = selectedApplication.status === 'accepted';

          return (
            <div className={`fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md animate-in fade-in ${darkMode ? 'bg-slate-950/80' : 'bg-slate-900/60'}`} onClick={() => setSelectedApplication(null)}>
                <div 
                   onClick={(e) => e.stopPropagation()}
                   className={`relative w-[92vw] sm:w-full max-w-md md:max-w-4xl p-5 sm:p-8 rounded-[2.5rem] animate-in zoom-in-95 duration-300 flex flex-col md:flex-row h-[90vh] max-h-[900px] md:h-[80vh] overflow-hidden ${theme.modalBg}`}
                >
                    <div className={`absolute -right-12 -bottom-12 md:-right-16 md:-bottom-16 opacity-[0.08] rotate-12 pointer-events-none z-0 ${theme.iconColor}`}>
                        <CatIcon className="w-80 h-80 md:w-[28rem] md:h-[28rem]" />
                    </div>

                    <button onClick={() => setSelectedApplication(null)} className={`absolute top-4 right-4 z-20 p-2.5 rounded-full transition-all hover:rotate-90 ${theme.closeBtn}`}>
                        <XMarkIcon className="w-5 h-5"/>
                    </button>
                    
                    <div className="flex flex-col items-center md:w-1/3 shrink-0 w-full mb-4 md:mb-0 pt-2 z-10 relative">
                        <div className="w-20 h-20 sm:w-36 sm:h-36 rounded-[2rem] overflow-hidden mb-4 sm:mb-5 shrink-0 shadow-xl cursor-pointer hover:opacity-90 hover:scale-105 transition-all duration-300 ring-4 ring-black/10">
                            {pic ? (
                                <img src={pic} alt={selectedApplication.applicantName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-black/20 flex items-center justify-center text-4xl sm:text-5xl font-black text-white uppercase backdrop-blur-md">{selectedApplication.applicantName?.charAt(0) || "U"}</div>
                            )}
                        </div>
                        
                        <h2 className={`text-2xl sm:text-3xl font-black mb-3 text-center leading-tight w-full ${theme.textPrimary}`}>{selectedApplication.applicantName}</h2>
                        
                        <div className={`flex flex-col gap-4 text-xs font-bold w-full items-center text-center cursor-default select-none ${theme.textSecondary}`}>
                            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 w-full">
                                <div className="flex items-center gap-1.5">
                                    <MapPinIcon className={`w-4 h-4 shrink-0 ${theme.iconColor}`} />
                                    <span className={!modalApplicant.sitio ? 'opacity-50 italic' : ''}>{modalApplicant.sitio || "Location not set"}</span>
                                </div>
                                {modalApplicant.email && (
                                    <div className="flex items-center gap-1.5" title="Email">
                                        <EnvelopeIcon className={`w-4 h-4 shrink-0 ${theme.iconColor}`} />
                                        <span className="truncate max-w-[150px]">{modalApplicant.email}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 w-full">
                                {appliedCategory ? (
                                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${theme.badge}`}>
                                        <TagIcon className="w-3.5 h-3.5" />
                                        {JOB_CATEGORIES.find(c => c.id === appliedCategory)?.label || appliedCategory}
                                    </span>
                                ) : (
                                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 opacity-50 ${theme.textPrimary}`}>
                                        <TagIcon className="w-3.5 h-3.5" />
                                        Uncategorized
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-2/3 flex flex-col flex-1 min-h-0 overflow-hidden mt-4 md:mt-0 relative z-10 md:ml-8">
                        
                        <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 shrink-0`}>
                            <div className={`flex-1 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border truncate flex items-center gap-2 ${theme.innerPanel}`}>
                                <span className={`opacity-60 shrink-0 ${theme.textSecondary}`}>Applied for:</span>
                                <span className={`truncate font-black ${theme.textPrimary}`}>{modalJob?.title || "Unknown Job"}</span>
                            </div>

                            <div className={`flex gap-1 p-1.5 rounded-2xl w-full sm:w-auto ${theme.tabContainer}`}>
                                <button 
                                    onClick={() => setModalSubTab("details")}
                                    className={`flex-1 sm:flex-none px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${modalSubTab === "details" ? theme.tabActive : theme.tabIdle}`}
                                >
                                    <span className="relative z-10 hidden sm:inline">Profile</span>
                                    <span className="relative z-10 sm:hidden">Profile</span>
                                </button>
                                <button 
                                    onClick={() => setModalSubTab("resume")}
                                    className={`flex-1 sm:flex-none px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${modalSubTab === "resume" ? theme.tabActive : theme.tabIdle}`}
                                >
                                    <span className="relative z-10">Resume</span>
                                </button>
                                <button 
                                    onClick={() => setModalSubTab("reputation")}
                                    className={`flex-1 sm:flex-none px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${modalSubTab === "reputation" ? theme.tabActive : theme.tabIdle}`}
                                >
                                    <span className="relative z-10">Reviews</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative mt-2 w-full">
                            <div 
                                className="flex w-[300%] h-full transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                                style={{ transform: modalSubTab === "details" ? 'translateX(0)' : modalSubTab === "resume" ? 'translateX(-33.333333%)' : 'translateX(-66.666667%)' }}
                            >
                                {/* Slide 1: Profile Details */}
                                <div className="w-1/3 h-full overflow-y-auto px-1 hide-scrollbar">
                                    <div className="space-y-4 pb-2">
                                        <div className={`p-6 rounded-[2rem] ${theme.innerPanel}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest opacity-60 mb-3 ${theme.textSecondary}`}>About Candidate</p>
                                            <p className={`text-sm opacity-90 leading-relaxed whitespace-pre-wrap font-medium ${theme.textPrimary}`}>{modalApplicant.aboutMe || modalApplicant.bio || "No bio provided."}</p>
                                        </div>
                                        
                                        <div className={`p-6 rounded-[2rem] ${theme.innerPanel}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest opacity-60 mb-3 ${theme.textSecondary}`}>Educational Background</p>
                                            {typeof modalApplicant.education === 'object' && modalApplicant.education !== null ? (
                                                <div className="space-y-2">
                                                    <p className={`text-sm opacity-90 ${theme.textPrimary}`}><span className="opacity-50 text-[10px] uppercase font-bold tracking-widest mr-2">Primary:</span>{modalApplicant.education.primary || "-"}</p>
                                                    <p className={`text-sm opacity-90 ${theme.textPrimary}`}><span className="opacity-50 text-[10px] uppercase font-bold tracking-widest mr-2">Secondary:</span>{modalApplicant.education.secondary || "-"}</p>
                                                    <p className={`text-sm opacity-90 ${theme.textPrimary}`}><span className="opacity-50 text-[10px] uppercase font-bold tracking-widest mr-2">College:</span>{modalApplicant.education.college || "-"}</p>
                                                </div>
                                            ) : (
                                                <p className={`text-sm leading-relaxed whitespace-pre-wrap font-medium ${modalApplicant.education ? 'opacity-90' : 'opacity-50 italic'} ${theme.textPrimary}`}>
                                                    {modalApplicant.education || "No educational background provided."}
                                                </p>
                                            )}
                                        </div>

                                        <div className={`p-6 rounded-[2rem] flex-1 ${theme.innerPanel}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest opacity-60 mb-3 ${theme.textSecondary}`}>Work Experience</p>
                                            {Array.isArray(modalApplicant.experience) || Array.isArray(modalApplicant.workExperience) ? (
                                                <ul className="space-y-2 pl-4 list-disc marker:text-blue-500">
                                                    {(modalApplicant.experience || modalApplicant.workExperience).filter(e=>e.trim()!=='').length > 0 
                                                        ? (modalApplicant.experience || modalApplicant.workExperience).filter(e=>e.trim()!=='').map((exp, idx) => (
                                                            <li key={idx} className={`text-sm opacity-90 font-medium pl-1 ${theme.textPrimary}`}>{exp}</li>
                                                        ))
                                                        : <p className={`text-sm opacity-50 italic -ml-4 ${theme.textPrimary}`}>No work experience provided.</p>
                                                    }
                                                </ul>
                                            ) : (
                                                <p className={`text-sm leading-relaxed whitespace-pre-wrap font-medium ${modalApplicant.workExperience || modalApplicant.experience ? 'opacity-90' : 'opacity-50 italic'} ${theme.textPrimary}`}>
                                                    {modalApplicant.workExperience || modalApplicant.experience || "No work experience provided."}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Slide 2: Resume */}
                                <div className="w-1/3 h-full overflow-y-auto px-1 hide-scrollbar">
                                    <div className="space-y-4 pb-2">
                                        <div className={`p-6 rounded-[2rem] ${theme.innerPanel}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest opacity-60 mb-3 flex items-center gap-2 ${theme.textSecondary}`}><PhotoIcon className="w-4 h-4"/> Resume Image</p>
                                            {modalApplicant.resumeImageUrl ? (
                                                <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm group bg-black/20">
                                                    <img src={modalApplicant.resumeImageUrl} alt="Resume" className="w-full h-full object-contain cursor-pointer" onClick={() => setLightboxUrl(modalApplicant.resumeImageUrl)} />
                                                    <div className="absolute top-2 right-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl text-white text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                        Click to Expand
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={`w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center opacity-50 ${theme.divider} ${theme.textPrimary}`}>
                                                    <PhotoIcon className="w-6 h-6 mb-1" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">No Image Uploaded</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className={`p-6 rounded-[2rem] ${theme.innerPanel}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest opacity-60 mb-3 flex items-center gap-2 ${theme.textSecondary}`}><DocumentIcon className="w-4 h-4"/> Resume Document</p>
                                            {isHired ? (
                                                modalApplicant.resumeFileUrl ? (
                                                    <a 
                                                        href={modalApplicant.resumeFileUrl} 
                                                        download={modalApplicant.resumeFileName || "Applicant_Resume"}
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className={`w-full p-4 rounded-xl flex items-center gap-4 border transition-all group bg-black/20 hover:bg-black/30 border-white/10 text-white shadow-inner`}
                                                    >
                                                        <div className={`p-3 rounded-lg transition-colors bg-white/10 text-white group-hover:bg-white/20`}>
                                                            <ArrowDownTrayIcon className="w-6 h-6"/>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-black text-sm transition-colors truncate drop-shadow-md">
                                                                {modalApplicant.resumeFileName || "Download Resume File"}
                                                            </p>
                                                            <p className="text-[10px] uppercase font-bold opacity-70 tracking-widest mt-0.5">Click to view or save</p>
                                                        </div>
                                                    </a>
                                                ) : (
                                                    <div className={`w-full p-4 rounded-xl flex flex-col items-center justify-center gap-1 border-2 border-dashed opacity-50 ${theme.divider} ${theme.textPrimary}`}>
                                                        <p className="font-bold text-[10px] uppercase tracking-widest">No File Uploaded</p>
                                                    </div>
                                                )
                                            ) : (
                                                <div className={`w-full p-6 flex flex-col items-center justify-center text-center rounded-[1.5rem] border-2 border-dashed opacity-60 ${theme.divider} ${theme.textPrimary}`}>
                                                    <LockClosedIcon className="w-6 h-6 mb-2" />
                                                    <p className="font-bold text-[10px] uppercase tracking-widest">Resume Document Locked</p>
                                                    <p className="text-[10px] font-medium mt-1 max-w-[200px]">You can only download the resume document once you accept this application.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Slide 3: Reputation */}
                                <div className="w-1/3 h-full overflow-y-auto px-1 hide-scrollbar">
                                    <div className="space-y-4 pb-2">
                                        <div className={`p-8 rounded-[2rem] flex flex-col items-center justify-center text-center ${theme.innerPanel}`}>
                                            <h3 className="text-6xl font-black text-amber-400 mb-3 drop-shadow-md">{applicantAverageRating}</h3>
                                            <div className="flex gap-1.5 mb-3 text-amber-400 drop-shadow-sm">
                                                {[1,2,3,4,5].map(star => (
                                                    <span key={star}>{star <= Math.round(applicantAverageRating) ? <StarIconSolid className="w-7 h-7"/> : <StarIconOutline className="w-7 h-7 opacity-40"/>}</span>
                                                ))}
                                            </div>
                                            <p className={`text-[10px] font-black uppercase tracking-widest opacity-60 ${theme.textSecondary}`}>Based on {applicantReviews.length} Reviews</p>
                                        </div>

                                        <div className="space-y-4 mt-2">
                                            {applicantReviews.length === 0 ? (
                                                <p className={`text-center text-sm font-bold py-8 opacity-60 ${theme.textPrimary}`}>No reviews yet.</p>
                                            ) : (
                                                applicantReviews.map((review, idx) => (
                                                    <div key={idx} className={`p-5 rounded-[2rem] ${theme.innerPanel}`}>
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-200 shrink-0">
                                                                    {review.reviewerPic ? <img src={review.reviewerPic} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full text-[8px] text-slate-800 font-bold">{review.reviewerName?.charAt(0) || "U"}</span>}
                                                                </div>
                                                                <span className={`text-[10px] font-bold opacity-80 ${theme.textPrimary}`}>{review.reviewerName || "Employer"}</span>
                                                            </div>
                                                            <div className="flex gap-0.5 text-amber-400">
                                                                {[1,2,3,4,5].map(star => (
                                                                    <span key={star}>{star <= review.rating ? <StarIconSolid className="w-3.5 h-3.5"/> : <StarIconOutline className="w-3.5 h-3.5 opacity-40"/>}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <p className={`text-sm font-medium leading-relaxed opacity-90 ${theme.textPrimary}`}>"{review.comment}"</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={`w-full flex flex-col sm:flex-row gap-2 pt-4 shrink-0 border-t z-10 mt-2 ${theme.divider}`}>
                            <button onClick={() => { 
                                setSelectedApplication(null); 
                                handleStartChatFromExternal({ id: selectedApplication.applicantId, name: selectedApplication.applicantName, profilePic: pic || null }); 
                            }} className={`w-full sm:flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform duration-300 hover:-translate-y-1 shadow-lg ${theme.solid}`}>
                                Message
                            </button>
                            
                            {selectedApplication.status === 'pending' && (
                                <div className="flex gap-2 w-full sm:flex-[2]">
                                    <button onClick={() => handleUpdateApplicationStatus(selectedApplication.id, 'accepted')} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform duration-300 hover:-translate-y-1 shadow-lg bg-green-500 hover:bg-green-600 text-white`}>
                                        Accept
                                    </button>
                                    <button onClick={() => handleUpdateApplicationStatus(selectedApplication.id, 'rejected')} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform duration-300 hover:-translate-y-1 shadow-lg bg-red-500 hover:bg-red-600 text-white`}>
                                        Reject
                                    </button>
                                </div>
                            )}
                            
                            {selectedApplication.status === 'accepted' && (
                                <div className="w-full sm:flex-[2] flex items-center justify-center py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-green-500/10 text-green-500 border border-green-500/20 shadow-sm text-center backdrop-blur-sm">
                                    <CheckCircleIcon className="w-5 h-5 mr-2 shrink-0" /> 
                                    <span>Application Accepted</span>
                                </div>
                            )}
                            {selectedApplication.status === 'rejected' && (
                                <div className="w-full sm:flex-[2] flex items-center justify-center py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 shadow-sm text-center backdrop-blur-sm">
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
                            <button onClick={(e) => { if (!isDragging) { setIsBubbleExpanded(true); if(effectiveActiveChatUser) { openChat(effectiveActiveChatUser); markConversationAsRead(effectiveActiveChatUser.id); } } }} className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-90 overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-white/80 border border-white/60 backdrop-blur-md'}`}>
                                {activeBubbleView !== 'inbox' && effectiveActiveChatUser ? ((getAvatarUrl(effectiveActiveChatUser) || effectiveActiveChatUser.profilePic) ? <img src={getAvatarUrl(effectiveActiveChatUser) || effectiveActiveChatUser.profilePic} className="w-full h-full object-cover" alt="pfp" /> : <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">{effectiveActiveChatUser.name.charAt(0)}</div>) : <ChatBubbleOvalLeftEllipsisIcon className={`w-7 h-7 ${darkMode ? 'text-white' : 'text-blue-600'}`} />}
                            </button>
                            {(() => { const activeUnread = activeBubbleView !== 'inbox' && effectiveActiveChatUser ? (conversations.find(c => c.chatId?.includes(effectiveActiveChatUser.id))?.[`unread_${auth.currentUser.uid}`] || 0) : conversations.reduce((acc, curr) => acc + (curr[`unread_${auth.currentUser?.uid}`] || 0), 0); return activeUnread > 0 ? <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm pointer-events-none z-10 animate-in zoom-in border-none">{activeUnread}</span> : null; })()}
                        </div>
                    </div>
                )}
                {isDragging && <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] w-16 h-16 rounded-full flex items-center justify-center border-4 animate-in zoom-in backdrop-blur-md ${darkMode ? 'border-slate-500/30 bg-slate-800/40' : 'border-blue-400/30 bg-white/40'}`}><XMarkIcon className={`w-8 h-8 ${darkMode ? 'text-slate-400' : 'text-blue-600'}`} /></div>}
                {isBubbleExpanded && (
                    <div className={`fixed inset-0 z-[1000] flex flex-col backdrop-blur-sm animate-in fade-in duration-200 ${darkMode ? 'bg-black/60' : 'bg-slate-900/40'}`}>
                        <div className="pt-12 px-4 pb-4 flex items-center gap-4 overflow-x-auto hide-scrollbar pointer-events-auto">
                            {openBubbles.map((chat) => {
                                const unread = chat[`unread_${auth.currentUser.uid}`] || 0;
                                const chatPic = chat.profilePic || conversations.find(c => c.chatId?.includes(chat.id))?.profilePics?.[chat.id];
                                return (
                                    <div key={chat.id} className="relative group flex flex-col items-center gap-1 shrink-0">
                                        <button onClick={() => { setActiveBubbleView(chat.id); openChat(chat); markConversationAsRead(chat.id); }} className={`w-14 h-14 rounded-full overflow-hidden shadow-lg transition-all border-2 ${darkMode ? 'border-white/10' : 'border-white/60'} ${activeBubbleView === chat.id ? 'scale-110 shadow-blue-500/50' : 'opacity-80'}`}>
                                            {chatPic ? <img src={chatPic} className="w-full h-full object-cover" alt="pfp" /> : <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">{chat.name.charAt(0)}</div>}
                                        </button>
                                        {unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full shadow-sm z-20 border-none">{unread}</span>}
                                        {activeBubbleView === chat.id && (<button onClick={(e) => { e.stopPropagation(); const newBubbles = openBubbles.filter(b => b.id !== chat.id); setOpenBubbles(newBubbles); if(activeBubbleView === chat.id) { setActiveBubbleView(newBubbles.length ? newBubbles[0].id : 'inbox'); } }} className={`absolute -top-1 -right-1 text-white rounded-full p-0.5 shadow-md animate-in zoom-in border-none ${darkMode ? 'bg-slate-500' : 'bg-slate-600'}`}><XMarkIcon className="w-3 h-3"/></button>)}
                                    </div>
                                );
                            })}
                            <div className="flex flex-col items-center gap-1 shrink-0">
                                <button onClick={() => setActiveBubbleView('inbox')} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all backdrop-blur-md border ${darkMode ? 'bg-slate-800/80 border-white/10' : 'bg-white/60 border-white/60'} ${activeBubbleView === 'inbox' ? 'scale-110 shadow-blue-500/30' : 'opacity-80'}`}><ChatBubbleOvalLeftEllipsisIcon className={`w-7 h-7 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} /></button>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col justify-end relative" onClick={() => setIsBubbleExpanded(false)}>
                            <div className={`w-full h-[80vh] rounded-t-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 backdrop-blur-xl border ${darkMode ? 'bg-slate-900/90 border-white/10 text-white' : 'bg-white/80 border-white/60 text-blue-900'}`} onClick={(e) => e.stopPropagation()}>
                                {activeBubbleView === 'inbox' ? (
                                    <div className="flex flex-col h-full">
                                        <div className={`p-5 flex justify-between items-center border-b ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white/50 border-white/60'}`}>
                                            <h3 className={`font-black text-2xl ${darkMode ? 'text-white' : 'text-blue-900'}`}>Chats</h3>
                                            <button onClick={() => setIsBubbleExpanded(false)} className={`p-2 shadow-sm rounded-full ${darkMode ? 'bg-white/10 text-white' : 'bg-white/60 text-blue-600'}`}><ChevronDownIcon className="w-5 h-5"/></button> 
                                        </div>
                                        <div className={`px-5 py-3 border-b ${darkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white/30 border-white/60'}`}><div className={`flex items-center p-2 rounded-xl border shadow-inner ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white/60 border-white/60'}`}><MagnifyingGlassIcon className={`w-4 h-4 ml-2 ${darkMode ? 'text-slate-400' : 'text-blue-400'}`} /><input value={bubbleSearch} onChange={(e) => setBubbleSearch(e.target.value)} placeholder="Search..." className={`bg-transparent border-none outline-none text-xs p-1.5 w-full font-bold ${darkMode ? 'text-white placeholder-slate-500' : 'text-blue-900 placeholder-blue-300'}`} /></div></div>
                                        <div className={`flex-1 overflow-y-auto p-2 hide-scrollbar ${darkMode ? 'bg-slate-900/30' : 'bg-white/30'}`}>
                                            {bubbleFilteredChats.map(c => {
                                                const otherId = c.participants.find(p => p !== auth.currentUser.uid);
                                                if (!otherId) return null;
                                                const name = c.names?.[otherId] || "User";
                                                const otherPic = c.profilePics?.[otherId];
                                                const unread = c[`unread_${auth.currentUser.uid}`] || 0;
                                                return (
                                                    <button key={c.chatId} onClick={() => { const userObj = { id: otherId, name, profilePic: otherPic }; if(!openBubbles.find(b => b.id === userObj.id)) { setOpenBubbles(prev => [userObj, ...prev]); } openChat(userObj); setActiveBubbleView(otherId); markConversationAsRead(otherId); }} className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-colors ${darkMode ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-white/50 text-blue-900'}`}>
                                                        <div className={`w-11 h-11 rounded-full overflow-hidden shrink-0 shadow-inner border flex items-center justify-center ${darkMode ? 'bg-slate-800 border-white/10 text-blue-400' : 'bg-white/60 border-white/60 text-blue-600'}`}>{otherPic ? <img src={otherPic} className="w-full h-full object-cover" alt="other-pfp" /> : <span className="font-bold">{name.charAt(0)}</span>}</div>
                                                        <div className="flex-1 text-left overflow-hidden">
                                                            <div className="flex justify-between items-center"><span className="font-black text-sm truncate">{name}</span><span className={`text-[9px] font-bold opacity-60 ${darkMode ? 'text-slate-400' : 'text-blue-600'}`}>{formatTime(c.lastTimestamp)}</span></div>
                                                            <div className="flex justify-between items-center"><p className="text-[11px] truncate font-medium opacity-70">{c.lastMessage}</p>{unread > 0 && <span className="min-w-[14px] h-[14px] flex items-center justify-center bg-blue-500 text-white text-[9px] rounded-full px-1 font-bold">{unread}</span>}</div>
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    effectiveActiveChatUser && (
                                        <>
                                            <div className={`p-4 flex justify-between items-center shrink-0 border-b ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white/50 border-white/60'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full overflow-hidden shadow-inner ${darkMode ? 'bg-slate-800 text-blue-400' : 'bg-white/60 text-blue-600'}`}>{(getAvatarUrl(effectiveActiveChatUser) || effectiveActiveChatUser.profilePic) ? <img src={getAvatarUrl(effectiveActiveChatUser) || effectiveActiveChatUser.profilePic} className="w-full h-full object-cover" alt="header-pfp" /> : <span className="flex items-center justify-center h-full font-bold">{effectiveActiveChatUser.name.charAt(0)}</span>}</div>
                                                    <div>
                                                        <h3 className={`font-black text-base leading-none ${darkMode ? 'text-white' : 'text-blue-900'}`}>{effectiveActiveChatUser.name}</h3>
                                                        <p className={`text-[10px] font-bold opacity-70 uppercase flex items-center gap-1 mt-0.5 ${darkMode ? 'text-slate-400' : 'text-blue-600'}`}>
                                                            {(() => {
                                                                const status = formatLastSeen(conversations.find(c => c.chatId?.includes(effectiveActiveChatUser.id))?.lastTimestamp);
                                                                return <><span className={`w-2 h-2 rounded-full ${status.isOnline ? 'bg-green-500' : 'bg-slate-400'}`}></span> {status.text}</>;
                                                            })()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`flex gap-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}><button onClick={() => setIsBubbleExpanded(false)}><ChevronDownIcon className="w-6 h-6"/></button></div>
                                            </div>
                                            
                                            <div className={`flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar ${darkMode ? 'bg-slate-900/30' : 'bg-white/30'}`} onClick={() => setActiveMenuId(null)}>
                                                {messages.map((msg, index) => {
                                                    const isMe = msg.senderId === auth.currentUser.uid;
                                                    const myPic = profileImage || applicantData?.profilePic || null;
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

                                                    return (
                                                        <MessageBubble
                                                            key={msg.id}
                                                            msg={msg}
                                                            isMe={isMe}
                                                            isMobile={true}
                                                            darkMode={darkMode}
                                                            myPic={myPic}
                                                            otherPic={otherPic}
                                                            senderName={effectiveActiveChatUser?.name}
                                                            statusText={statusText}
                                                            formatTime={formatTime}
                                                            setLightboxUrl={setLightboxUrl}
                                                            setReplyingTo={setReplyingTo}
                                                            togglePinMessage={togglePinMessage}
                                                            unsendMessage={unsendMessage}
                                                            activeMenuId={activeMenuId}
                                                            setActiveMenuId={setActiveMenuId}
                                                            menuPosition={menuPosition}
                                                            setMenuPosition={setMenuPosition}
                                                        />
                                                    );
                                                })}
                                                <div ref={scrollRef}/>
                                            </div>
                                            
                                            <div className={`p-3 shrink-0 border-t ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white/50 border-white/60'}`} onClick={() => setActiveMenuId(null)}>
                                               {replyingTo && (
                                                <div className={`mb-2 flex justify-between items-center p-2.5 rounded-xl border-l-4 border-blue-500 text-[10px] font-bold ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                                    <div className="flex flex-col">
                                                        <span className="text-blue-500 uppercase">Replying to {replyingTo.senderId === auth.currentUser.uid ? 'You' : (effectiveActiveChatUser?.name || activeChat?.name || 'User')}</span>
                                                        <span className={`truncate max-w-[200px] font-medium ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                                                            {replyingTo.isUnsent ? "Message unsent" : (replyingTo.fileType ? `[${replyingTo.fileType}]` : replyingTo.text)}
                                                        </span>
                                                    </div>
                                                    <button onClick={() => setReplyingTo(null)}><XMarkIcon className="w-4 h-4 text-slate-400 hover:text-red-500"/></button>
                                                </div>
                                            )}
                                                <form onSubmit={handleSendMessageWrapper} className="flex gap-2 items-center">
                                                    <input type="file" ref={bubbleFileRef} onChange={handleFileSelect} className="hidden" />
                                                    <button type="button" onClick={() => bubbleFileRef.current.click()} className={`p-2 rounded-xl shadow-sm border ${darkMode ? 'text-blue-400 bg-slate-800/50 hover:bg-slate-800 border-white/10' : 'text-blue-600 bg-white/40 hover:bg-white/60 border-white/60'}`}><PaperClipIcon className="w-5 h-5"/></button>
                                                    <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Aa" className={`flex-1 px-4 py-2.5 text-sm outline-none rounded-full shadow-inner font-medium border ${darkMode ? 'bg-slate-900/50 border-white/10 text-white placeholder-slate-500' : 'bg-white/60 border-white/60 text-blue-900 placeholder-blue-900/40'}`} />
                                                    <button type="submit" disabled={(!newMessage.trim() && !attachment) || isUploading} className="p-2 text-white bg-blue-600 rounded-full shadow-md disabled:opacity-50 active:scale-90 transition-transform">{isUploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <PaperAirplaneIcon className="w-5 h-5" />}</button>
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
                    <button onClick={() => { setIsDesktopInboxVisible(!isDesktopInboxVisible); setActiveChat(null); }} className="group relative w-12 h-12 md:w-14 md:h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-90 overflow-hidden bg-blue-600 border-2 border-white">
                        <ChatBubbleLeftRightIcon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    </button>
                    {conversations.reduce((acc, curr) => acc + (curr[`unread_${auth.currentUser?.uid}`] || 0), 0) > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm pointer-events-none z-20 animate-bounce border-none">{conversations.reduce((acc, curr) => acc + (curr[`unread_${auth.currentUser?.uid}`] || 0), 0)}</span>}
                </div>
                {openBubbles.map((chat) => {
                    const unread = chat[`unread_${auth.currentUser?.uid}`] || 0;
                    const chatPic = chat.profilePic || conversations.find(c => c.chatId?.includes(chat.id))?.profilePics?.[chat.id];
                    return (
                    <div key={chat.id} className="pointer-events-auto relative group flex items-center gap-3">
                        <span className={`absolute right-full mr-3 px-3 py-1.5 rounded-xl backdrop-blur-md border text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl ${darkMode ? 'bg-slate-800/80 border-white/10 text-white' : 'bg-white/80 border-white/60 text-blue-900'}`}>{chat.name}</span>
                        <div className="relative">
                            <button onClick={() => { openChat(chat); setIsChatMinimized(false); setIsDesktopInboxVisible(false); markConversationAsRead(chat.id); }} className={`w-12 h-12 md:w-14 md:h-14 rounded-full shadow-xl border-2 overflow-hidden transition-all hover:scale-110 active:scale-95 ${darkMode ? 'border-white/10 bg-slate-800' : 'border-white/60 bg-white/60'}`}>
                                {chatPic ? (<img src={chatPic} alt="pfp" className="w-full h-full object-cover" />) : (<div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-black text-lg">{chat.name.charAt(0)}</div>)}
                            </button>
                            {unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm z-20 animate-bounce border-none">{unread}</span>}
                            <button onClick={(e) => { e.stopPropagation(); setOpenBubbles(prev => prev.filter(b => b.id !== chat.id)); if (openBubbles.length <= 1) setIsBubbleVisible(false); }} className={`absolute -top-1 -left-1 w-5 h-5 backdrop-blur-md border rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm ${darkMode ? 'bg-slate-800/80 border-white/10 text-white' : 'bg-white/80 border-white/60 text-slate-500'}`}><XMarkIcon className="w-3 h-3" /></button>
                        </div>
                    </div>
                )})}
                {isDesktopInboxVisible && !activeChat && (
                    <div className="fixed z-[210] pointer-events-auto bottom-6 right-24 animate-in slide-in-from-right-4 duration-300">
                        <div className={`w-[320px] h-[450px] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl border ${darkMode ? 'bg-slate-900/90 border-white/10' : 'bg-white/80 border-white/60'}`}>
                            <div className={`p-5 flex justify-between items-center border-b ${darkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white/50 border-white/60'}`}>
                                <h3 className={`font-black text-lg ${darkMode ? 'text-white' : 'text-blue-900'}`}>Chats</h3>
                                <button onClick={() => setIsDesktopInboxVisible(false)} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-white/60 text-blue-600'}`}><XMarkIcon className="w-5 h-5"/></button>
                            </div>
                            <div className={`p-3 pb-0 ${darkMode ? 'bg-slate-900/30' : 'bg-white/30'}`}>
                                <div className={`flex items-center p-1.5 rounded-xl border shadow-inner ${darkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white/60 border-white/60'}`}>
                                    <MagnifyingGlassIcon className={`w-4 h-4 ml-2 ${darkMode ? 'text-slate-400' : 'text-blue-400'}`} />
                                    <input value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search..." className={`bg-transparent border-none outline-none text-[11px] p-1.5 w-full font-bold ${darkMode ? 'text-white placeholder-slate-500' : 'text-blue-900 placeholder-blue-300'}`} />
                                </div>
                            </div>
                            <div className={`flex-1 overflow-y-auto p-2 hide-scrollbar ${darkMode ? 'bg-slate-900/30' : 'bg-white/30'}`}>
                                {filteredChats.map(c => {
                                    const otherId = c.participants?.find(p => p !== auth.currentUser?.uid);
                                    if (!otherId) return null;
                                    const name = c.names?.[otherId] || "User";
                                    const otherPic = c.profilePics?.[otherId];
                                    const unread = c[`unread_${auth.currentUser.uid}`] || 0;
                                    return (
                                        <button key={c.chatId} onClick={() => { const userObj = { id: otherId, name, profilePic: otherPic }; openChat(userObj); setIsDesktopInboxVisible(false); markConversationAsRead(otherId); }} className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-colors ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-white/60 text-blue-900'}`}>
                                            <div className={`w-11 h-11 rounded-full overflow-hidden shrink-0 shadow-inner border flex items-center justify-center ${darkMode ? 'bg-slate-800 border-white/10 text-blue-400' : 'bg-white/60 border-white/60 text-blue-600'}`}>{otherPic ? <img src={otherPic} className="w-full h-full object-cover" alt="pfp" /> : <span className="font-bold">{name.charAt(0)}</span>}</div>
                                            <div className="flex-1 text-left overflow-hidden">
                                                <div className="flex justify-between items-center"><span className="font-black text-sm truncate">{name}</span><span className={`text-[9px] font-bold opacity-60 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{formatTime(c.lastTimestamp)}</span></div>
                                                <div className="flex justify-between items-center"><p className="text-[11px] truncate font-medium opacity-70">{c.lastMessage}</p>{unread > 0 && <span className="min-w-[14px] h-[14px] flex items-center justify-center bg-blue-500 text-white text-[9px] rounded-full px-1 font-bold">{unread}</span>}</div>
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
                        <div className={`w-[320px] h-[450px] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300 backdrop-blur-xl border ${darkMode ? 'bg-slate-900/90 border-white/10' : 'bg-white/80 border-white/60'}`}>
                            
                            {/* Desktop Chat Header */}
                            <div className={`p-4 flex justify-between items-center border-b shrink-0 shadow-sm ${darkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white/60 border-white/60'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full shadow-inner overflow-hidden border ${darkMode ? 'bg-slate-800 border-white/10 text-blue-400' : 'bg-white/60 border-white/60 text-blue-600'}`}>{(getAvatarUrl(activeChat) || activeChat.profilePic) ? <img src={getAvatarUrl(activeChat) || activeChat.profilePic} className="w-full h-full object-cover" alt="pfp"/> : <span className="flex items-center justify-center h-full font-black">{activeChat.name.charAt(0)}</span>}</div>
                                    <div>
                                        <span className={`font-black text-xs uppercase block ${darkMode ? 'text-white' : 'text-blue-900'}`}>{activeChat.name}</span>
                                        <span className={`text-[9px] opacity-80 font-bold flex items-center gap-1 mt-0.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                            {(() => {
                                                const status = formatLastSeen(conversations.find(c => c.chatId?.includes(activeChat.id))?.lastTimestamp);
                                                return <><span className={`w-1.5 h-1.5 rounded-full ${status.isOnline ? 'bg-green-500' : 'bg-slate-400'}`}></span> {status.text}</>;
                                            })()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1"><button onClick={() => { setIsChatMinimized(true); setIsBubbleVisible(true); setOpenBubbles(prev => [...prev, activeChat].filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i)); setActiveBubbleView(activeChat.id); closeChat(); }} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-white/60 text-blue-600'}`}><ChevronDownIcon className="w-4 h-4"/></button><button onClick={closeChat} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-white/60 text-blue-600'}`}><XMarkIcon className="w-4 h-4"/></button></div>
                            </div>
                            
                            {/* Desktop Chat Messages */}
                            <div className={`flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar ${darkMode ? 'bg-slate-900/30' : 'bg-white/30'}`} onClick={() => setActiveMenuId(null)}>
                                {messages.map((msg, index) => {
                                    const isMe = msg.senderId === auth.currentUser.uid;
                                    const myPic = profileImage || applicantData?.profilePic || null;
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

                                    return (
                                        <MessageBubble
                                            key={msg.id}
                                            msg={msg}
                                            isMe={isMe}
                                            isMobile={false}
                                            darkMode={darkMode}
                                            myPic={myPic}
                                            otherPic={otherPic}
                                            senderName={activeChat?.name}
                                            statusText={statusText}
                                            formatTime={formatTime}
                                            setLightboxUrl={setLightboxUrl}
                                            setReplyingTo={setReplyingTo}
                                            togglePinMessage={togglePinMessage}
                                            unsendMessage={unsendMessage}
                                            activeMenuId={activeMenuId}
                                            setActiveMenuId={setActiveMenuId}
                                            menuPosition={menuPosition}
                                            setMenuPosition={setMenuPosition}
                                        />
                                    );
                                })}
                                <div ref={scrollRef}/>
                            </div>
                            
                            {/* Desktop Chat Input */}
                            <div className={`p-3 shrink-0 border-t ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white/50 border-white/60'}`} onClick={() => setActiveMenuId(null)}>
                                {replyingTo && (
                                <div className={`mb-2 flex justify-between items-center p-2.5 rounded-xl border-l-4 border-blue-500 text-[10px] font-bold ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                    <div className="flex flex-col">
                                        <span className="text-blue-500 uppercase">Replying to {replyingTo.senderId === auth.currentUser.uid ? 'You' : (effectiveActiveChatUser?.name || activeChat?.name || 'User')}</span>
                                        <span className={`truncate max-w-[200px] font-medium ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                                            {replyingTo.isUnsent ? "Message unsent" : (replyingTo.fileType ? `[${replyingTo.fileType}]` : replyingTo.text)}
                                        </span>
                                    </div>
                                    <button onClick={() => setReplyingTo(null)}><XMarkIcon className="w-4 h-4 text-slate-400 hover:text-red-500"/></button>
                                </div>
                            )}
                                <form onSubmit={handleSendMessageWrapper} className="flex gap-2 items-center">
                                    <input type="file" ref={chatFileRef} onChange={handleFileSelect} className="hidden" />
                                    <button type="button" onClick={() => chatFileRef.current.click()} className={`p-2 rounded-xl shadow-sm border ${darkMode ? 'text-blue-400 bg-slate-800/50 hover:bg-slate-800 border-white/10' : 'text-blue-600 bg-white/40 hover:bg-white/60 border-white/60'}`}><PaperClipIcon className="w-5 h-5"/></button>
                                    <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Aa" className={`flex-1 px-4 py-2.5 text-sm outline-none rounded-full shadow-inner font-medium border ${darkMode ? 'bg-slate-900/50 border-white/10 text-white placeholder-slate-500' : 'bg-white/60 border-white/60 text-blue-900 placeholder-blue-900/40'}`} />
                                    <button type="submit" disabled={(!newMessage.trim() && !attachment) || isUploading} className="p-2 text-white bg-blue-600 rounded-full shadow-md disabled:opacity-50 active:scale-90 transition-transform">{isUploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <PaperAirplaneIcon className="w-5 h-5" />}</button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        ))}

        {/* GLOBAL CONFIRMATION MODAL */}
        {confirmDialog.isOpen && (
            <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 ${darkMode ? 'bg-slate-950/80' : 'bg-slate-900/60'}`} onClick={closeConfirm}>
                <div onClick={e => e.stopPropagation()} className={`w-full max-w-sm p-6 md:p-8 rounded-[2.5rem] shadow-2xl border animate-in zoom-in-95 duration-300 flex flex-col items-center text-center ${darkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-white/60 text-slate-900'}`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${confirmDialog.isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {confirmDialog.isDestructive ? <TrashIcon className="w-8 h-8"/> : <CheckCircleIcon className="w-8 h-8"/>}
                    </div>
                    <h3 className="text-xl font-black mb-2 tracking-tight">{confirmDialog.title}</h3>
                    <p className={`text-sm font-medium mb-8 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{confirmDialog.message}</p>
                    <div className="flex gap-3 w-full">
                        <button onClick={closeConfirm} className={`flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 ${darkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>Cancel</button>
                        <button onClick={() => { confirmDialog.onConfirm(); closeConfirm(); }} className={`flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg text-white ${confirmDialog.isDestructive ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}>{confirmDialog.confirmText}</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}