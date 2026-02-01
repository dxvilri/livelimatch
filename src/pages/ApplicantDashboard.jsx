import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config"; 
import { 
  collection, query, where, onSnapshot, 
  addDoc, serverTimestamp, setDoc, doc, updateDoc, increment, deleteDoc, getDoc, getDocs, getCountFromServer, writeBatch
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { 
  BriefcaseIcon, ArrowLeftOnRectangleIcon, XMarkIcon, 
  Bars3BottomRightIcon, MapPinIcon, SunIcon, MoonIcon, 
  ChevronLeftIcon, ChevronRightIcon, ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon, PaperAirplaneIcon, MinusIcon, EyeIcon,
  TrashIcon, CheckCircleIcon, CameraIcon, PencilSquareIcon, 
  PlusIcon, UsersIcon, ClockIcon, UserIcon, AcademicCapIcon,
  CalendarDaysIcon, BoltIcon,
  EllipsisHorizontalIcon, PaperClipIcon, ArrowUturnLeftIcon, 
  PhotoIcon, DocumentIcon, ArrowsPointingOutIcon, UserCircleIcon,
  EnvelopeIcon, PhoneIcon, SparklesIcon, FunnelIcon,
  ChartBarIcon, SignalIcon, UserPlusIcon, PresentationChartLineIcon,
  TrendingUpIcon, BuildingOfficeIcon, ChevronDownIcon,
  ChatBubbleOvalLeftEllipsisIcon, PhoneIcon as PhoneSolidIcon, VideoCameraIcon,
  HeartIcon, BookmarkIcon, XCircleIcon
} from "@heroicons/react/24/outline";

// --- STATIC DATA ---
const PUROK_LIST = [
  "Sagur", "Ampungan", "Centro 1", "Centro 2", "Centro 3", "Bypass Road", "Boundary"
];

const JOB_TYPES = [
  { id: "Full-time", icon: <BriefcaseIcon className="w-5 h-5"/>, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { id: "Part-time", icon: <ClockIcon className="w-5 h-5"/>, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { id: "Contract", icon: <CalendarDaysIcon className="w-5 h-5"/>, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { id: "One-time", icon: <BoltIcon className="w-5 h-5"/>, color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" }
];

export default function ApplicantDashboard() {
  const { userData } = useAuth(); 
  const [activeTab, setActiveTab] = useState("FindJobs"); 
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [loading, setLoading] = useState(false); 
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // --- MIRRORED BUBBLE LOGIC ---
  const [isBubbleVisible, setIsBubbleVisible] = useState(false); 
  const [isChatMinimized, setIsChatMinimized] = useState(false); 
  const [openBubbles, setOpenBubbles] = useState([]); 
  const [isDesktopInboxVisible, setIsDesktopInboxVisible] = useState(false); 
    
  // Mobile Bubble Specific States
  const [isBubbleExpanded, setIsBubbleExpanded] = useState(false);
  const [activeBubbleView, setActiveBubbleView] = useState('inbox');
  const [bubblePos, setBubblePos] = useState({ x: window.innerWidth - 60, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isMobile && isBubbleExpanded) { document.body.style.overflow = "hidden"; } 
    else { document.body.style.overflow = "auto"; }
    return () => { document.body.style.overflow = "auto"; };
  }, [isMobile, isBubbleExpanded]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
      
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  // --- DATA STATES ---
  const [availableJobs, setAvailableJobs] = useState([]); 
  const [myApplications, setMyApplications] = useState([]); 
  const [savedJobs, setSavedJobs] = useState([]); 
  
  const [jobSearch, setJobSearch] = useState("");
  const [jobLocationFilter, setJobLocationFilter] = useState(""); 
  const [selectedJob, setSelectedJob] = useState(null); 
  const [hoveredJob, setHoveredJob] = useState(null); 
  const hoverTimerRef = useRef(null); 

  // -- APP DETAILS MODAL STATE --
  const [viewingApplication, setViewingApplication] = useState(null); 
  const [modalJobDetails, setModalJobDetails] = useState(null); 
  const [modalLoading, setModalLoading] = useState(false);

  const [applicationSearch, setApplicationSearch] = useState("");
  
  const [profileImage, setProfileImage] = useState(null);
  const [imgScale, setImgScale] = useState(1);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const [applicantData, setApplicantData] = useState({ 
    firstName: "", lastName: "", sitio: "", title: "Job Seeker", 
    bio: "", skills: "", education: "", experience: "" 
  });

  const [activeChat, setActiveChat] = useState(null); 
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatStatus, setChatStatus] = useState({ isOnline: false, lastSeen: null });
  const [isChatOptionsOpen, setIsChatOptionsOpen] = useState(false); 
  const [conversations, setConversations] = useState([]); 
  const [chatSearch, setChatSearch] = useState(""); 
  const [replyingTo, setReplyingTo] = useState(null); 
  const [attachment, setAttachment] = useState(null); 
  const [isUploading, setIsUploading] = useState(false); 
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const chatFileRef = useRef(null); 
  const scrollRef = useRef(null);
    
  const [analyticsData, setAnalyticsData] = useState({
      totalApplicants: 0,
      totalEmployers: 0,
      sitioStats: []
  });

  // --- EFFECTS ---

  useEffect(() => {
    if (activeTab !== "Messages") setActiveChat(null);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "Messages") {
       setIsBubbleVisible(false); setIsBubbleExpanded(false); setIsDesktopInboxVisible(false);
    }
  }, [activeTab]);

  // Notification Fix: Mark as read when tab is open
  useEffect(() => {
    if (activeTab === "Applications" && myApplications.length > 0) {
        const unreadApps = myApplications.filter(app => app.isReadByApplicant === false && app.status !== 'pending');
        if (unreadApps.length > 0) {
            const markAsRead = async () => {
                const batch = writeBatch(db);
                unreadApps.forEach(app => {
                    const appRef = doc(db, "applications", app.id);
                    batch.update(appRef, { isReadByApplicant: true });
                });
                try {
                    await batch.commit();
                } catch (err) { console.error("Error marking notifications as read", err); }
            };
            markAsRead();
        }
    }
  }, [activeTab, myApplications]);

   useEffect(() => {
     if(activeTab === "FindJobs" || activeTab === "Analytics") {
        const fetchData = async () => {
            try {
                const q = query(collection(db, "jobs"), where("status", "==", "active"));
                const querySnapshot = await getDocs(q);
                const jobs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAvailableJobs(jobs);
                
                // FIXED: Changed "users" to "applicants"
                const userCountSnap = await getCountFromServer(collection(db, "applicants"));
                const employerCountSnap = await getCountFromServer(collection(db, "employers"));
                
                const stats = {};
                jobs.forEach(job => {
                    if(job.sitio) {
                        stats[job.sitio] = (stats[job.sitio] || 0) + 1;
                    }
                });
                const sortedStats = Object.entries(stats)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a,b) => b.count - a.count);

                setAnalyticsData({
                    totalApplicants: userCountSnap.data().count,
                    totalEmployers: employerCountSnap.data().count,
                    sitioStats: sortedStats
                });

            } catch (err) { console.error("Error fetching data", err); }
        };
        fetchData();
     }
   }, [activeTab]);

  useEffect(() => {
    if (!auth.currentUser) return;
    // FIXED: Changed "users" to "applicants"
    const userRef = doc(db, "applicants", auth.currentUser.uid);
    const setOnline = async () => { try { await setDoc(userRef, { isOnline: true }, { merge: true }); } catch(e) {} };
    setOnline();
    const unsubProfile = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.profilePic) setProfileImage(data.profilePic);
        if (data.imgScale) setImgScale(data.imgScale);
        setApplicantData(prev => ({
            ...prev,
            firstName: data.firstName || userData?.firstName || "",
            lastName: data.lastName || userData?.lastName || "",
            sitio: data.sitio || data.location || "", 
            title: data.title || "Job Seeker", 
            bio: data.bio || data.aboutMe || "",
            education: data.education || "",
            experience: data.workExperience || ""
        }));
      }
    });
    return () => { unsubProfile(); setDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true }).catch(console.error); };
  }, [auth.currentUser, userData]);

  const effectiveActiveChatId = (isBubbleVisible && isMobile) 
    ? (activeBubbleView !== 'inbox' ? activeBubbleView : null) 
    : activeChat?.id;

  const effectiveActiveChatUser = (isBubbleVisible && isMobile)
    ? openBubbles.find(b => b.id === activeBubbleView)
    : activeChat;

  useEffect(() => {
    if (!effectiveActiveChatId) return;
    const otherUserRef = doc(db, "employers", effectiveActiveChatId);
    const unsubStatus = onSnapshot(otherUserRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setChatStatus({ isOnline: data.isOnline || false, lastSeen: data.lastSeen || null });
        }
    });
    return () => unsubStatus();
  }, [effectiveActiveChatId]);

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const qApps = query(collection(db, "applications"), where("applicantId", "==", auth.currentUser.uid));
    const unsubApps = onSnapshot(qApps, (snap) => {
      const appsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      appsData.sort((a, b) => (b.appliedAt?.seconds || 0) - (a.appliedAt?.seconds || 0));
      setMyApplications(appsData);
    });
    
    const qSaved = query(collection(db, "saved_jobs"), where("userId", "==", auth.currentUser.uid));
    const unsubSaved = onSnapshot(qSaved, (snap) => {
         const savedData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
         setSavedJobs(savedData);
    });

    const qConvos = query(collection(db, "conversations"), where("participants", "array-contains", auth.currentUser.uid));
    const unsubConvos = onSnapshot(qConvos, async (snap) => {
      const convosPromises = snap.docs.map(async (d) => {
        const data = d.data();
        const otherId = data.participants.find(p => p !== auth.currentUser.uid);
        let finalProfilePic = data.profilePics?.[otherId] || null;
        if (otherId) {
            try {
                const empSnap = await getDoc(doc(db, "employers", otherId));
                if (empSnap.exists()) {
                    const empData = empSnap.data();
                    if (empData.profilePic) finalProfilePic = empData.profilePic;
                }
            } catch (err) { }
        }
        return { id: d.id, ...data, profilePics: { ...data.profilePics, [otherId]: finalProfilePic } };
      });
      const convosData = await Promise.all(convosPromises);
      convosData.sort((a, b) => (b.lastTimestamp?.seconds || 0) - (a.lastTimestamp?.seconds || 0));
      setConversations(convosData);
    });
    return () => { unsubApps(); unsubSaved(); unsubConvos(); };
  }, [auth.currentUser]);

  useEffect(() => {
    if (!effectiveActiveChatId || !auth.currentUser) return;
    const chatId = [auth.currentUser.uid, effectiveActiveChatId].sort().join("_");
    
    if ((!isMobile && !isChatMinimized) || (isMobile && isBubbleVisible && isBubbleExpanded)) {
       updateDoc(doc(db, "conversations", chatId), { [`unread_${auth.currentUser.uid}`]: 0 }).catch(() => {});
    }

    const qChat = query(collection(db, "messages"), where("chatId", "==", chatId));
    const unsubChat = onSnapshot(qChat, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubChat();
  }, [effectiveActiveChatId, isChatMinimized, isBubbleVisible, isBubbleExpanded]); 

  // --- HANDLERS ---
  const handleJobMouseEnter = (job) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => { setHoveredJob(job); }, 3000);
  };
  const handleJobMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredJob(null);
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
      const arr = dataurl.split(','); const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]); let n = bstr.length; const u8arr = new Uint8Array(n);
      while(n--) u8arr[n] = bstr.charCodeAt(n);
      return new Blob([u8arr], {type:mime});
    } catch (e) { return null; }
  };
  const saveProfileImage = async () => {
    if (!auth.currentUser || !profileImage) return;
    setLoading(true);
    try {
      const storage = getStorage(auth.app);
      // FIXED: Changed path from 'applicant_profile/' to 'profile_pics/'
      const storageRef = ref(storage, `profile_pics/${auth.currentUser.uid}`);
      
      const blob = dataURLtoBlob(profileImage);
      if (!blob) throw new Error("Failed to process image data.");
      
      const uploadTask = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(uploadTask.ref);
      
      // FIXED: Changed "users" to "applicants"
      await setDoc(doc(db, "applicants", auth.currentUser.uid), {
        profilePic: downloadURL, 
        imgScale: imgScale, 
        uid: auth.currentUser.uid, 
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setIsEditingImage(false);
      alert("Profile picture updated!");
    } catch (err) { 
      console.error(err);
      alert(`Error: ${err.message}`); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
        // FIXED: Changed "users" to "applicants"
        await setDoc(doc(db, "applicants", auth.currentUser.uid), {
            title: applicantData.title, aboutMe: applicantData.bio,
            education: applicantData.education, workExperience: applicantData.experience,
            updatedAt: serverTimestamp()
        }, { merge: true });
        setIsEditingProfile(false);
    } catch (err) { alert("Error saving profile: " + err.message); } 
    finally { setLoading(false); }
  };

  const handleViewApplicationDetails = async (app) => {
      setModalLoading(true);
      setViewingApplication(app);
      setModalJobDetails(null);
      try {
          if (app.jobId) {
              const jobSnap = await getDoc(doc(db, "jobs", app.jobId));
              if (jobSnap.exists()) {
                  setModalJobDetails(jobSnap.data());
              }
          }
      } catch (err) { console.error("Error fetching job details", err); } 
      finally { setModalLoading(false); }
  };

  const handleApplyToJob = async (job) => {
      if(!window.confirm(`Apply to ${job.title} at ${job.employerName}?`)) return;
      setLoading(true);
      try {
          await addDoc(collection(db, "applications"), {
              jobId: job.id,
              jobTitle: job.title,
              employerId: job.employerId,
              employerName: job.employerName,
              employerLogo: job.employerLogo || "", 
              applicantId: auth.currentUser.uid,
              applicantName: `${applicantData.firstName} ${applicantData.lastName}`,
              applicantProfilePic: profileImage || "",
              status: 'pending',
              appliedAt: serverTimestamp(),
              isViewed: false,
              isReadByApplicant: true 
          });
          alert("Application Sent!");
          setSelectedJob(null);
      } catch(err) { alert("Error applying: " + err.message); }
      finally { setLoading(false); }
  };

  const handleWithdrawApplication = async (appId) => {
      if(!window.confirm("Are you sure you want to withdraw this application?")) return;
      setLoading(true);
      try {
          await deleteDoc(doc(db, "applications", appId));
          setViewingApplication(null);
      } catch (err) { alert("Error withdrawing: " + err.message); }
      finally { setLoading(false); }
  };

  const handleToggleSaveJob = async (job) => {
      const existing = savedJobs.find(s => s.jobId === job.id);
      try {
          if(existing) {
              await deleteDoc(doc(db, "saved_jobs", existing.id));
          } else {
              await addDoc(collection(db, "saved_jobs"), {
                  userId: auth.currentUser.uid,
                  jobId: job.id,
                  jobData: job, 
                  savedAt: serverTimestamp()
              });
          }
      } catch(err) { console.error(err); }
  };

  const handleFileSelect = (e) => { if (e.target.files[0]) setAttachment(e.target.files[0]); };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !effectiveActiveChatId) return;
    const chatId = [auth.currentUser.uid, effectiveActiveChatId].sort().join("_");
    const myDisplayName = `${applicantData.firstName} ${applicantData.lastName}`.trim() || "Applicant";
    let fileUrl = null, fileType = null, fileName = null;
    setIsUploading(true);
    try {
      if (attachment) {
        const storage = getStorage(auth.app);
        const storageRef = ref(storage, `chat_attachments/${chatId}/${Date.now()}_${attachment.name}`);
        const uploadTask = await uploadBytes(storageRef, attachment);
        fileUrl = await getDownloadURL(uploadTask.ref);
        fileName = attachment.name;
        if (attachment.type.startsWith('image/')) fileType = 'image';
        else if (attachment.type.startsWith('video/')) fileType = 'video';
        else fileType = 'file';
      }
      await addDoc(collection(db, "messages"), {
        chatId, text: newMessage, senderId: auth.currentUser.uid, receiverId: effectiveActiveChatId, createdAt: serverTimestamp(), 
        fileUrl: fileUrl || null, fileType: fileType || 'text', fileName: fileName || null,
        replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, senderName: replyingTo.senderId === auth.currentUser.uid ? "You" : effectiveActiveChatUser.name, type: replyingTo.fileType || 'text' } : null
      });
      await setDoc(doc(db, "conversations", chatId), {
        chatId, lastMessage: fileType && fileType !== 'text' ? `Sent a ${fileType}` : newMessage, lastTimestamp: serverTimestamp(),
        participants: [auth.currentUser.uid, effectiveActiveChatId], [`unread_${effectiveActiveChatId}`]: increment(1),
        names: { [auth.currentUser.uid]: myDisplayName, [effectiveActiveChatId]: effectiveActiveChatUser.name },
        profilePics: { [auth.currentUser.uid]: profileImage || null, [effectiveActiveChatId]: effectiveActiveChatUser.profilePic || null }
      }, { merge: true });
      setNewMessage(""); setAttachment(null); setReplyingTo(null); if (chatFileRef.current) chatFileRef.current.value = "";
    } catch (err) { alert("Failed to send message."); } finally { setIsUploading(false); }
  };

  // --- MOBILE BUBBLE HANDLERS ---
  const handleTouchStart = (e) => { setIsDragging(true); const touch = e.touches[0]; dragOffset.current = { x: touch.clientX - bubblePos.x, y: touch.clientY - bubblePos.y }; };
  const handleTouchMove = (e) => { if (!isDragging) return; const touch = e.touches[0]; const bubbleSize = 56; let newX = touch.clientX - dragOffset.current.x; let newY = touch.clientY - dragOffset.current.y; newY = Math.max(80, Math.min(newY, window.innerHeight - 150)); newX = Math.max(0, Math.min(newX, window.innerWidth - bubbleSize)); setBubblePos({ x: newX, y: newY }); };
  const handleTouchEnd = () => { setIsDragging(false); const bubbleSize = 56; if (bubblePos.x < window.innerWidth / 2) { setBubblePos(prev => ({ ...prev, x: 0 })); } else { setBubblePos(prev => ({ ...prev, x: window.innerWidth - bubbleSize })); } };

  const handleMinimizeToBubble = () => {
    if (!activeChat) return;
    setIsBubbleVisible(true); setIsChatMinimized(true); setIsChatOptionsOpen(false); setActiveBubbleView(activeChat.id); 
    if (activeChat && !openBubbles.find(b => b.id === activeChat.id)) { setOpenBubbles(prev => [...prev, activeChat]); }
    setActiveChat(null); setActiveTab("FindJobs"); 
  };
  const handleStartChatFromExternal = (userObj) => { setActiveChat(userObj); setIsChatMinimized(false); setActiveTab("Messages"); setIsBubbleVisible(false); setIsBubbleExpanded(false); setIsDesktopInboxVisible(false); };
  const handleCloseChat = () => { if (activeChat) { setOpenBubbles(prev => prev.filter(b => b.id !== activeChat.id)); } setActiveChat(null); setIsChatOptionsOpen(false); if (openBubbles.length <= 1) setIsBubbleVisible(false); };
  const handleCloseBubble = (chatId) => { const newBubbles = openBubbles.filter(b => b.id !== chatId); setOpenBubbles(newBubbles); if(activeBubbleView === chatId) { if (newBubbles.length === 0) { setIsBubbleVisible(false); setIsBubbleExpanded(false); setActiveBubbleView('inbox'); } else { setActiveBubbleView('inbox'); } } };
  
  const handleViewProfile = () => { setIsChatOptionsOpen(false); alert(`Viewing profile for ${activeChat.name} (Feature coming soon)`); };
  const formatTime = (ts) => { if (!ts) return "Just now"; const date = ts?.toDate ? ts.toDate() : new Date(); return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
  const formatDateTime = (ts) => { if (!ts) return "Just now"; const date = ts?.toDate ? ts.toDate() : new Date(); return date.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const formatLastSeen = (ts) => { if (!ts) return "Offline"; const date = ts.toDate(); const now = new Date(); const diffInMinutes = Math.floor((now - date) / 60000); if(diffInMinutes < 1) return "just now"; if(diffInMinutes < 60) return `${diffInMinutes}m ago`; if(diffInMinutes < 1440) return `${Math.floor(diffInMinutes/60)}h ago`; return "days ago"; };
  const displayName = `${applicantData.firstName} ${applicantData.lastName}`.trim() || "Applicant";

  const filteredJobs = availableJobs.filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(jobSearch.toLowerCase()) || (job.employerName && job.employerName.toLowerCase().includes(jobSearch.toLowerCase()));
      const matchesLoc = jobLocationFilter ? job.sitio === jobLocationFilter : true;
      return matchesSearch && matchesLoc;
  });

  const filteredChats = conversations.filter(c => {
      const otherId = c.participants.find(p => p !== auth.currentUser.uid);
      const name = c.names[otherId] || "User";
      return name.toLowerCase().includes(chatSearch.toLowerCase());
  });

  const filteredApplications = myApplications.filter(app => app.jobTitle.toLowerCase().includes(applicationSearch.toLowerCase()) || (app.employerName && app.employerName.toLowerCase().includes(applicationSearch.toLowerCase())));
  const pendingApplications = filteredApplications.filter(app => app.status === 'pending');
  const acceptedApplications = filteredApplications.filter(app => app.status === 'accepted');
  const rejectedApplications = filteredApplications.filter(app => app.status === 'rejected');

  const hasNewMessages = conversations.some(c => (c[`unread_${auth.currentUser?.uid}`] || 0) > 0);
  const hasUnreadUpdates = myApplications.some(app => app.isReadByApplicant === false && app.status !== 'pending');

  const ProfilePicComponent = ({ sizeClasses = "w-12 h-12", isCollapsed = false }) => (
    <div className={`relative group shrink-0 ${sizeClasses} rounded-2xl overflow-hidden shadow-lg border select-none ${darkMode ? 'border-white/10 bg-slate-800' : 'border-slate-200 bg-slate-100'}`}>
      {profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover transition-transform duration-300" style={{ transform: `scale(${imgScale})` }} /> : <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-black text-lg">{applicantData.firstName ? applicantData.firstName.charAt(0) : "A"}</div>}
      {!isCollapsed && <button onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"><CameraIcon className="w-5 h-5 text-white" /></button>}
    </div>
  );

  const MessageAvatar = ({ isMe }) => (
    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 shadow-sm border border-black/5 dark:border-white/10 bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black uppercase">
        {isMe ? (
            profileImage ? <img src={profileImage} alt="Me" className="w-full h-full object-cover" /> : applicantData.firstName?.charAt(0) || "M"
        ) : (
            effectiveActiveChatUser?.profilePic ? <img src={effectiveActiveChatUser.profilePic} alt={effectiveActiveChatUser.name} className="w-full h-full object-cover" /> : effectiveActiveChatUser?.name?.charAt(0) || "U"
        )}
    </div>
  );

  const getJobStyle = (type) => { const found = JOB_TYPES.find(j => j.id === type); if (found) return found; return { icon: <BoltIcon className="w-6 h-6"/>, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' }; };

return (
    <div className={`min-h-screen transition-colors duration-500 font-sans pb-24 md:pb-0 select-none cursor-default ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      {/* LIGHTBOX */}
      {lightboxUrl && (
          <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setLightboxUrl(null)}>
              <img src={lightboxUrl} alt="Full view" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
              <button onClick={() => setLightboxUrl(null)} className="absolute top-5 right-5 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"><XMarkIcon className="w-6 h-6"/></button>
          </div>
      )}

      {/* IMAGE EDITOR */}
      {isEditingImage && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className={`max-w-md w-full p-10 rounded-[3rem] border animate-in zoom-in duration-300 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-300'}`}>
            <h3 className="text-xl font-black mb-8 uppercase tracking-widest text-center cursor-default select-none">Set Profile Picture</h3>
            <div className="w-56 h-56 mx-auto rounded-full overflow-hidden border-4 border-blue-500 shadow-2xl relative mb-10 select-none"><img src={profileImage} className="w-full h-full object-cover" style={{ transform: `scale(${imgScale})` }} alt="Crop preview" /></div>
            <div className="space-y-8">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-default select-none"><span>Adjust Zoom</span><span className="text-blue-500">{Math.round(imgScale * 100)}%</span></div>
              <input type="range" min="1" max="4" step="0.01" value={imgScale} onChange={(e) => setImgScale(parseFloat(e.target.value))} className="w-full h-2 bg-blue-500/10 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              <div className="flex gap-4"><button onClick={() => { setIsEditingImage(false); }} className="flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-500/20 text-red-500 hover:bg-red-500/5 transition-all active:scale-95">Cancel</button><button onClick={saveProfileImage} className="flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all active:scale-95">{loading ? 'Saving...' : 'Set Picture'}</button></div>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR DRAWER */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md animate-in fade-in" onClick={() => setIsMenuOpen(false)} />
          <div className={`absolute right-0 top-0 h-full w-80 shadow-2xl p-6 flex flex-col animate-in slide-in-from-right duration-300 ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
            <button onClick={() => setIsMenuOpen(false)} className={`self-end p-2 rounded-xl mb-6 ${darkMode ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-900'}`}><XMarkIcon className="w-6 h-6" /></button>
            <div onClick={() => { setActiveTab("Profile"); setIsMenuOpen(false); }} className={`cursor-pointer rounded-[2rem] p-5 border mb-8 transition-all hover:scale-[1.02] active:scale-95 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-300 shadow-md'}`}>
              <div className="flex items-center gap-4"><div className="pointer-events-none rounded-full overflow-hidden"><ProfilePicComponent sizeClasses="w-14 h-14" isCollapsed={true} /></div><div className="overflow-hidden"><p className="font-black text-sm truncate">{displayName}</p><p className="text-blue-500 text-[9px] font-black uppercase tracking-widest">See Resume</p></div></div>
            </div>
            <nav className="flex-1 space-y-2">
              <NavItem icon={<PresentationChartLineIcon className="w-5 h-5"/>} label="Analytics" onClick={() => { setActiveTab("Analytics"); setIsMenuOpen(false); }} darkMode={darkMode} />
              <NavItem icon={<PencilSquareIcon className="w-5 h-5" />} label="Edit Resume" onClick={() => { setActiveTab("Profile"); setIsEditingProfile(true); setIsMenuOpen(false); }} darkMode={darkMode} />
              <NavItem icon={<ChatBubbleLeftRightIcon className="w-5 h-5" />} label="Help & Support" onClick={() => alert("Support Center coming soon!")} darkMode={darkMode} />
              <button onClick={() => setDarkMode(!darkMode)} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-500 font-black text-[10px] uppercase tracking-widest active:scale-95 border ${darkMode ? 'bg-slate-800 border-white/10 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'}`}>
                <div className="flex items-center gap-4"><div className={`p-1 rounded-full ${darkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>{darkMode ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}</div><span>{darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span></div>
                <div className={`w-10 h-6 rounded-full relative transition-colors ${darkMode ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${darkMode ? 'left-5' : 'left-1'}`}></div></div>
              </button>
            </nav>
            <button onClick={() => signOut(auth)} className="mt-auto flex items-center gap-4 w-full p-5 bg-red-500/10 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-500/20 active:scale-95 transition-transform"><ArrowLeftOnRectangleIcon className="w-5 h-5" /> Logout</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className={`px-6 py-4 sticky top-0 z-40 flex justify-between items-center border-b transition-colors duration-500 select-none ${darkMode ? 'bg-slate-950 border-white/5' : 'bg-white border-slate-300 shadow-sm'}`}>
        <h1 className="text-lg font-black tracking-tighter cursor-default relative z-20">LIVELI<span className="text-blue-500">MATCH</span></h1>
        <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2 z-10 h-full">
            <button onClick={() => setActiveTab("FindJobs")} className={`relative px-4 py-2 transition-all duration-200 group ${activeTab === "FindJobs" ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}><span className="text-xs font-black uppercase tracking-widest">Find Jobs</span>{activeTab === "FindJobs" && <span className="absolute bottom-[-18px] left-0 w-full h-0.5 bg-blue-600 rounded-full"></span>}</button>
            <button onClick={() => setActiveTab("Saved")} className={`relative px-4 py-2 transition-all duration-200 group ${activeTab === "Saved" ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}><span className="text-xs font-black uppercase tracking-widest">Saved Jobs</span>{activeTab === "Saved" && <span className="absolute bottom-[-18px] left-0 w-full h-0.5 bg-blue-600 rounded-full"></span>}</button>
            <button onClick={() => setActiveTab("Applications")} className={`relative px-4 py-2 transition-all duration-200 group ${activeTab === "Applications" ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}><div className="flex items-center gap-2"><span className="text-xs font-black uppercase tracking-widest">Applications</span>{hasUnreadUpdates && <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>}</div>{activeTab === "Applications" && <span className="absolute bottom-[-18px] left-0 w-full h-0.5 bg-blue-600 rounded-full"></span>}</button>
            <button onClick={() => setActiveTab("Messages")} className={`relative px-4 py-2 transition-all duration-200 group ${activeTab === "Messages" ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}><div className="flex items-center gap-2"><span className="text-xs font-black uppercase tracking-widest">Messages</span>{hasNewMessages && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}</div>{activeTab === "Messages" && <span className="absolute bottom-[-18px] left-0 w-full h-0.5 bg-blue-600 rounded-full"></span>}</button>
        </div>
        <div className="flex items-center gap-4 relative z-20">
            <button onClick={() => setActiveTab("Profile")} className="transition-transform active:scale-95 rounded-full overflow-hidden" title="View Profile"><div className="pointer-events-none"><ProfilePicComponent sizeClasses="w-10 h-10" isCollapsed={true} /></div></button>
            <button onClick={() => setIsMenuOpen(true)} className={`p-1 transition-colors active:scale-95 ${darkMode ? 'text-white hover:text-slate-300' : 'text-slate-900 hover:text-slate-600'}`}><Bars3BottomRightIcon className="w-8 h-8" /></button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="transition-all duration-500 p-6 md:p-12 max-w-7xl mx-auto">
        
        {/* PROFILE TAB */}
        {activeTab === "Profile" && (
            <div className="animate-in fade-in duration-700 space-y-6">
                <div className="mb-4">
                    <h2 className={`text-3xl font-black tracking-tight cursor-default select-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>My Resume</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 cursor-default select-none">Manage your professional details</p>
                </div>
                <div className={`relative p-8 md:p-10 rounded-[2.5rem] border overflow-hidden ${darkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-300 shadow-lg'}`}>
                    <div className="absolute top-8 right-8 z-20">
                        <button onClick={(e) => { e.stopPropagation(); if(isEditingProfile) handleSaveProfile(); else setIsEditingProfile(true); }} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 ${isEditingProfile ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/20'}`}>{isEditingProfile ? <>{loading ? 'Saving...' : 'Save Changes'}</> : <><PencilSquareIcon className="w-4 h-4" /> Edit Resume</>}</button>
                    </div>
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="w-32 h-32 shrink-0 rounded-[2rem] border-2 border-dashed border-slate-500/20 p-2 select-none"><ProfilePicComponent sizeClasses="w-full h-full" isCollapsed={!isEditingProfile} /></div>
                        <div className="space-y-4 w-full pt-2">
                            <div>
                                <h2 className="text-3xl font-black tracking-tight cursor-default mb-2">{displayName}</h2>
                                {isEditingProfile ? <input type="text" value={applicantData.title} onChange={(e) => setApplicantData({...applicantData, title: e.target.value})} className={`bg-transparent border-b-2 outline-none font-bold text-sm uppercase tracking-wider w-full md:w-1/2 select-text ${darkMode ? 'border-white/20 text-blue-400' : 'border-slate-400 text-blue-600'}`} placeholder="Job Title (e.g. Carpenter)" /> : <p className="text-blue-500 font-bold text-sm uppercase tracking-wider cursor-default">{applicantData.title || "Job Seeker"}</p>}
                            </div>
                            <div className="flex flex-wrap gap-6 text-xs font-bold text-slate-500 cursor-default select-none mt-4">
                                <div className="flex items-center gap-2"><MapPinIcon className="w-4 h-4" /><span className={!applicantData.sitio ? 'opacity-50 italic' : ''}>{applicantData.sitio || "Sitio not set"}</span></div>
                                <div className="flex items-center gap-2"><span className="text-slate-500">{userData?.email}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className={`col-span-1 lg:col-span-2 p-8 rounded-[2.5rem] border ${darkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-300 shadow-md'}`}>
                        <div className="flex items-center gap-3 mb-4"><UserIcon className="w-5 h-5 text-blue-500" /><h3 className={`font-black uppercase tracking-widest text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>About Me</h3></div>
                        {isEditingProfile ? <textarea value={applicantData.bio} onChange={(e) => setApplicantData({...applicantData, bio: e.target.value})} placeholder="Introduce yourself to employers..." className={`w-full h-32 p-4 rounded-xl text-sm bg-transparent border resize-none outline-none select-text ${darkMode ? 'border-white/20 text-slate-300' : 'border-slate-300 text-slate-600'}`} /> : <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{applicantData.bio || "No information added yet."}</p>}
                    </div>
                    <div className={`p-8 rounded-[2.5rem] border ${darkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-300 shadow-md'}`}>
                        <div className="flex items-center gap-3 mb-4"><BriefcaseIcon className="w-5 h-5 text-amber-500" /><h3 className={`font-black uppercase tracking-widest text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>Work Experience</h3></div>
                        {isEditingProfile ? <textarea value={applicantData.experience} onChange={(e) => setApplicantData({...applicantData, experience: e.target.value})} placeholder="List your relevant work experience..." className={`w-full h-32 p-4 rounded-xl text-sm bg-transparent border resize-none outline-none select-text ${darkMode ? 'border-white/20 text-slate-300' : 'border-slate-300 text-slate-600'}`} /> : <p className={`text-sm leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{applicantData.experience || "No experience listed."}</p>}
                    </div>
                    <div className={`p-8 rounded-[2.5rem] border ${darkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-300 shadow-md'}`}>
                        <div className="flex items-center gap-3 mb-4"><AcademicCapIcon className="w-5 h-5 text-purple-500" /><h3 className={`font-black uppercase tracking-widest text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>Education</h3></div>
                        {isEditingProfile ? <textarea value={applicantData.education} onChange={(e) => setApplicantData({...applicantData, education: e.target.value})} placeholder="List your education background..." className={`w-full h-32 p-4 rounded-xl text-sm bg-transparent border resize-none outline-none select-text ${darkMode ? 'border-white/20 text-slate-300' : 'border-slate-300 text-slate-600'}`} /> : <p className={`text-sm leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{applicantData.education || "No education listed."}</p>}
                    </div>
                </div>
            </div>
        )}

        {/* FIND JOBS TAB */}
        {activeTab === "FindJobs" && (
            <div className="animate-in fade-in duration-700">
                <div className="space-y-6 mb-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="w-full">
                            <h2 className={`text-3xl font-black tracking-tight select-none cursor-default ${darkMode ? 'text-white' : 'text-slate-900'}`}>Find Jobs</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 select-none cursor-default">Discover opportunities near you</p>
                            
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mt-8">
                                <div className="group relative p-5 rounded-[1.5rem] bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setActiveTab("FindJobs")}>
                                    <div className="absolute right-0 top-0 opacity-20 transform translate-x-2 -translate-y-2"><BriefcaseIcon className="w-16 h-16"/></div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Available Jobs</h4>
                                    <p className="text-3xl font-black">{availableJobs.length}</p>
                                </div>
                                <div className="group relative p-5 rounded-[1.5rem] bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setActiveTab("Saved")}>
                                    <div className="absolute right-0 top-0 opacity-20 transform translate-x-2 -translate-y-2"><BookmarkIcon className="w-16 h-16"/></div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Saved Jobs</h4>
                                    <p className="text-3xl font-black">{savedJobs.length}</p>
                                </div>
                                <div className="group relative p-5 rounded-[1.5rem] bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setActiveTab("Applications")}>
                                    <div className="absolute right-0 top-0 opacity-20 transform translate-x-2 -translate-y-2"><PaperAirplaneIcon className="w-16 h-16"/></div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Applications</h4>
                                    <p className="text-3xl font-black">{myApplications.length}</p>
                                </div>
                                <div className="group relative p-5 rounded-[1.5rem] bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setActiveTab("Messages")}>
                                    <div className="absolute right-0 top-0 opacity-20 transform translate-x-2 -translate-y-2"><ChatBubbleLeftRightIcon className="w-16 h-16"/></div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Unread Messages</h4>
                                    <p className="text-3xl font-black">{conversations.reduce((acc, curr) => acc + (curr[`unread_${auth.currentUser.uid}`] || 0), 0)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className={`flex items-center p-1.5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-300'} shadow-sm max-w-2xl`}>
                        <div className="relative flex-1 min-w-[150px]">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Search job title or employer..." value={jobSearch} onChange={(e) => setJobSearch(e.target.value)} className="w-full bg-transparent pl-9 pr-4 py-2.5 outline-none font-bold text-xs" />
                        </div>
                        <div className={`w-px h-6 mx-2 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                        <div className="relative min-w-[140px] md:min-w-[160px]">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10"><FunnelIcon className="w-4 h-4 text-blue-500" /></div>
                            <select value={jobLocationFilter} onChange={(e) => setJobLocationFilter(e.target.value)} className={`w-full bg-transparent pl-9 pr-8 py-2.5 outline-none font-bold text-xs appearance-none cursor-pointer transition-colors relative z-0 ${darkMode ? 'text-white hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'} rounded-xl`}>
                                <option value="" className={darkMode ? 'bg-slate-900' : 'bg-white'}>All Locations</option>
                                {PUROK_LIST.map(p => <option key={p} value={p} className={darkMode ? 'bg-slate-900' : 'bg-white'}>{p}</option>)}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><div className={`w-5 h-5 rounded-md flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}><ChevronRightIcon className="w-3 h-3 rotate-90 opacity-70"/></div></div>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                    {filteredJobs.length > 0 ? filteredJobs.map(job => {
                        const style = getJobStyle(job.type);
                        const isSaved = savedJobs.some(s => s.jobId === job.id);
                        return (
                            <div key={job.id} onClick={() => setSelectedJob(job)} onMouseEnter={() => handleJobMouseEnter(job)} onMouseLeave={handleJobMouseLeave} className={`group relative p-5 rounded-[2rem] border flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer ${darkMode ? 'bg-slate-900 border-white/5 hover:border-blue-500/30' : 'bg-white border-slate-300 hover:border-blue-400 shadow-md'}`}>
                                <div className="absolute top-4 right-4 z-20">
                                    <button onClick={(e) => { e.stopPropagation(); handleToggleSaveJob(job); }} className={`p-2 rounded-full transition-colors ${isSaved ? 'text-blue-500 bg-blue-500/10' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>{isSaved ? <BookmarkIcon className="w-5 h-5 fill-current"/> : <BookmarkIcon className="w-5 h-5"/>}</button>
                                </div>
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-200 overflow-hidden shrink-0">
                                        {job.employerLogo ? <img src={job.employerLogo} alt="Logo" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-black bg-blue-500 text-white">{job.employerName?.[0]}</div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-black text-lg leading-tight truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1 truncate">{job.employerName}</p>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${style.bg} ${style.border} ${style.color}`}>{style.icon}{job.type}</span>
                                    <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}><MapPinIcon className="w-3 h-3"/> {job.sitio}</span>
                                </div>
                                
                                <div className="mt-auto pt-4 border-t border-dashed border-slate-500/20 flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Salary</p>
                                        <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}><span className="font-black text-lg leading-none">₱</span> {job.salary}</p>
                                    </div>
                                    <button className="px-4 py-2 rounded-xl bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-500/20 group-hover:bg-blue-500 transition-colors">Apply Now</button>
                                </div>
                            </div>
                        )
                    }) : (
                        <div className="col-span-full text-center py-20"><SparklesIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" /><p className="opacity-50 font-black uppercase text-xs tracking-[0.3em] select-none cursor-default">No jobs found matching filters</p></div>
                    )}
                </div>
            </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "Analytics" && (
            <div className="animate-in fade-in duration-700 space-y-8">
                <div className="mb-4">
                   <h2 className={`text-3xl font-black tracking-tight cursor-default select-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>Analytics</h2>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 cursor-default select-none">Market insights and job trends</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className={`p-8 rounded-[2.5rem] border relative overflow-hidden ${darkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-300 shadow-lg'}`}>
                       <div className="absolute right-0 top-0 opacity-5 p-4 transform rotate-12"><UserPlusIcon className="w-32 h-32"/></div>
                       <div className="relative z-10">
                           <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl inline-block mb-4"><UserPlusIcon className="w-8 h-8"/></div>
                           <h3 className="text-4xl font-black mb-1">{analyticsData.totalApplicants}</h3>
                           <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Applicants Registered</p>
                       </div>
                   </div>
                    <div className={`p-8 rounded-[2.5rem] border relative overflow-hidden ${darkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-300 shadow-lg'}`}>
                       <div className="absolute right-0 top-0 opacity-5 p-4 transform rotate-12"><BuildingOfficeIcon className="w-32 h-32"/></div>
                       <div className="relative z-10">
                           <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl inline-block mb-4"><BriefcaseIcon className="w-8 h-8"/></div>
                           <h3 className="text-4xl font-black mb-1">{analyticsData.totalEmployers}</h3>
                           <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Employers Using Platform</p>
                       </div>
                   </div>
               </div>
               <div className={`p-8 rounded-[2.5rem] border ${darkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-300 shadow-lg'}`}>
                   <div className="flex items-center gap-3 mb-8"><ChartBarIcon className="w-6 h-6 text-green-500" /><h3 className="font-black text-lg uppercase tracking-wider">Sitios with Highest Job Opportunities</h3></div>
                   <div className="space-y-4">
                       {analyticsData.sitioStats.length > 0 ? analyticsData.sitioStats.map((item, index) => (
                           <div key={item.name} className="relative">
                               <div className="flex justify-between items-end mb-1 text-xs font-bold opacity-80"><span>{item.name}</span><span>{item.count} Jobs</span></div>
                               <div className={`w-full h-4 rounded-full overflow-hidden ${darkMode ? 'bg-white/5' : 'bg-slate-100'}`}><div style={{ width: `${(item.count / analyticsData.sitioStats[0].count) * 100}%` }} className={`h-full rounded-full ${index === 0 ? 'bg-green-500' : index === 1 ? 'bg-blue-500' : 'bg-slate-400'}`}></div></div>
                           </div>
                       )) : (<div className="text-center py-10 opacity-50 font-black text-xs uppercase tracking-widest">No job data available yet</div>)}
                   </div>
               </div>
            </div>
        )}

        {/* SAVED JOBS */}
        {activeTab === "Saved" && (
          <div className="animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
              <div><h2 className={`text-3xl font-black tracking-tight select-none cursor-default ${darkMode ? 'text-white' : 'text-slate-900'}`}>Saved Jobs</h2><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 select-none cursor-default">Bookmarked opportunities</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {savedJobs.length > 0 ? savedJobs.map(item => {
                const job = item.jobData;
                const style = getJobStyle(job.type);
                return (
                  <div key={item.id} className={`group relative p-4 md:p-6 rounded-[2rem] border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden ${darkMode ? 'bg-slate-900 border-white/5 hover:border-blue-500/30' : 'bg-white border-slate-300 hover:border-blue-400 shadow-md'}`}>
                      <div className="relative z-10 flex flex-col h-full">
                          <div className="flex justify-between items-start mb-4">
                               <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${style.bg} ${style.border}`}><span className={`${style.color}`}>{style.icon}</span><span className={`text-[9px] font-black uppercase tracking-widest ${style.color}`}>{job.type}</span></div>
                               <button onClick={() => handleToggleSaveJob(job)} className="text-blue-500 bg-blue-500/10 p-2 rounded-full"><BookmarkIcon className="w-5 h-5 fill-current"/></button>
                          </div>
                          <div className="mb-4">
                              <h3 className={`text-lg md:text-xl font-black leading-tight mb-2 line-clamp-2 select-none cursor-default ${darkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>
                              <p className="text-xs font-bold opacity-60 uppercase">{job.employerName}</p>
                          </div>
                          <div className="mt-auto flex gap-4 pt-4 border-t border-dashed border-slate-500/20">
                               <button onClick={() => setSelectedJob(job)} className={`flex-1 justify-center flex p-3 rounded-xl transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest ${darkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>View Details</button>
                               <button onClick={() => handleApplyToJob(job)} className="flex-1 justify-center flex p-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 shadow-lg">Apply</button>
                          </div>
                      </div>
                  </div>
                );
              }) : (<div className="col-span-full text-center py-20"><p className="opacity-50 font-black uppercase text-xs tracking-[0.3em] select-none cursor-default">No saved jobs</p></div>)}
            </div>
          </div>
        )}

        {/* APPLICATIONS TAB (MIRRORING EMPLOYER APPLICANTS TAB) */}
        {activeTab === "Applications" && (
          <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div><h2 className={`text-3xl font-black tracking-tight select-none cursor-default ${darkMode ? 'text-white' : 'text-slate-900'}`}>My Applications</h2><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 select-none cursor-default">Review and manage status</p></div>
                <div className={`flex items-center p-1.5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-300'} shadow-sm w-full md:w-96`}>
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Search applications..." value={applicationSearch} onChange={(e) => setApplicationSearch(e.target.value)} className="w-full bg-transparent pl-9 pr-4 py-2.5 outline-none font-bold text-xs" />
                    </div>
                </div>
            </div>
            
            {/* PENDING SECTION */}
            <section className="space-y-6">
                <div className="flex items-center gap-3"><ClockIcon className="w-5 h-5 text-amber-500" /><h3 className="font-black text-sm uppercase tracking-[0.2em] text-amber-500 select-none cursor-default">Pending Review ({pendingApplications.length})</h3><div className="flex-1 h-px bg-amber-500/10"></div></div>
                <div className="space-y-4">
                    {pendingApplications.length > 0 ? pendingApplications.map(app => (
                        <ApplicationCard 
                            key={app.id} 
                            app={app} 
                            darkMode={darkMode} 
                            onWithdraw={() => handleWithdrawApplication(app.id)} 
                            onView={() => handleViewApplicationDetails(app)}
                        />
                    )) : (<div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none cursor-default">No pending applications</p></div>)}
                </div>
            </section>

            {/* ACCEPTED SECTION */}
            <section className="space-y-6">
                <div className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-blue-500" /><h3 className="font-black text-sm uppercase tracking-[0.2em] text-blue-500 select-none cursor-default">Accepted Applications ({acceptedApplications.length})</h3><div className="flex-1 h-px bg-blue-500/10"></div></div>
                <div className="space-y-4">
                    {acceptedApplications.length > 0 ? acceptedApplications.map(app => (
                        <ApplicationCard 
                            key={app.id} 
                            app={app} 
                            darkMode={darkMode} 
                            isAccepted={true}
                            onChat={() => handleStartChatFromExternal({ id: app.employerId, name: app.employerName || "Employer", profilePic: null })} 
                            onView={() => handleViewApplicationDetails(app)}
                            unreadCount={conversations.find(c => c.chatId.includes(app.employerId))?.[`unread_${auth.currentUser.uid}`] || 0}
                        />
                    )) : (<div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none cursor-default">No accepted applications</p></div>)}
                </div>
            </section>

            {/* REJECTED SECTION */}
            <section className="space-y-6">
                <div className="flex items-center gap-3"><XMarkIcon className="w-5 h-5 text-red-500" /><h3 className="font-black text-sm uppercase tracking-[0.2em] text-red-500 select-none cursor-default">Rejected Applications ({rejectedApplications.length})</h3><div className="flex-1 h-px bg-red-500/10"></div></div>
                <div className="space-y-4">
                    {rejectedApplications.length > 0 ? rejectedApplications.map(app => (
                        <ApplicationCard 
                            key={app.id} 
                            app={app} 
                            darkMode={darkMode} 
                            isRejected={true}
                            onWithdraw={() => handleWithdrawApplication(app.id)} 
                            onView={() => handleViewApplicationDetails(app)}
                        />
                    )) : (<div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none cursor-default">No rejected applications</p></div>)}
                </div>
            </section>
          </div>
        )}

        {/* MESSAGES TAB */}
        {activeTab === "Messages" && (
            <div className="animate-in fade-in duration-700 h-[calc(100vh-100px)] md:h-[calc(100vh-2rem)] flex flex-col pb-2">
            {!isMobile && (
                 <div className="mb-6"><h2 className={`text-3xl font-black tracking-tight select-none cursor-default ${darkMode ? 'text-white' : 'text-slate-900'}`}>Messages</h2><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 select-none cursor-default">Chat with employers</p></div>
            )}
            <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0 relative">
                {/* Chat List Column */}
                <div className={`${isMobile && activeChat ? 'hidden' : 'flex'} w-full md:w-72 rounded-[2.5rem] border md:flex flex-col overflow-hidden ${darkMode ? 'bg-slate-900 border-white/5' : 'bg-slate-50 border-slate-300'}`}>
                    <div className="p-5 pb-2 shrink-0">
                         {isMobile && <h2 className={`text-2xl font-black mb-4 px-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Chats</h2>}
                        <div className={`flex items-center p-1.5 rounded-2xl border ${darkMode ? 'bg-slate-800 border-transparent focus-within:border-blue-500/50' : 'bg-white border-slate-200 focus-within:border-blue-300'}`}>
                            <div className="relative flex-1">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input placeholder="Search..." value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} className="w-full bg-transparent pl-9 pr-4 py-1.5 outline-none font-bold text-xs" />
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 hide-scrollbar">
                        {filteredChats.map(c => {
                            const otherId = c.participants.find(p => p !== auth.currentUser.uid);
                            const name = c.names?.[otherId] || "User";
                            const otherPic = c.profilePics?.[otherId];
                            const unread = c[`unread_${auth.currentUser.uid}`] || 0;
                            const isActive = activeChat?.id === otherId;
                            return (
                                <button key={c.chatId} onClick={() => setActiveChat({ id: otherId, name, profilePic: otherPic })} className={`w-full p-4 rounded-[1.5rem] flex items-center gap-4 transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : darkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-200 text-slate-600'}`}>
                                    <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-black shrink-0 overflow-hidden ${!isActive ? (darkMode ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600') : 'bg-white/20 text-white'}`}>{otherPic ? <img src={otherPic} alt={name} className="w-full h-full object-cover" /> : name.charAt(0)}</div>
                                    <div className="flex-1 text-left overflow-hidden"><div className="flex justify-between items-center mb-1"><span className={`font-black text-sm truncate ${isActive ? 'text-white' : darkMode ? 'text-white' : 'text-slate-900'}`}>{name}</span>{unread > 0 && <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm border border-white/20"></span>}</div><div className="flex justify-between items-center"><span className={`text-xs truncate max-w-[85%] font-medium ${isActive ? 'text-blue-100' : 'opacity-60'}`}>{c.lastMessage}</span><span className={`text-[9px] font-bold ${isActive ? 'text-blue-100' : 'opacity-40'}`}>{formatTime(c.lastTimestamp)}</span></div></div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Chat View Column */}
                <div className={`${isMobile && !activeChat ? 'hidden' : 'flex'} ${isMobile ? 'fixed inset-0 z-[60] rounded-none' : 'flex-1 rounded-[2.5rem] relative'} border flex flex-col overflow-hidden ${darkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-300'}`}>
                    {activeChat ? (
                        <>
                           {/* Chat Header */}
                            <div className={`p-4 md:p-6 flex items-center justify-between border-b shrink-0 backdrop-blur-md z-10 ${darkMode?'bg-slate-900/80 border-white/5':'bg-white/80 border-slate-200'}`}>
                                 <div className="flex items-center gap-3 md:gap-4">
                                     <button onClick={()=>setActiveChat(null)} className="md:hidden p-2 -ml-2 rounded-full hover:bg-white/10"><ChevronLeftIcon className="w-6 h-6"/></button>
                                     <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-black text-lg md:text-xl shadow-lg">{activeChat.profilePic ? <img src={activeChat.profilePic} alt={activeChat.name} className="w-full h-full object-cover" /> : activeChat.name.charAt(0)}</div>
                                     <div><h3 className={`font-black text-base md:text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>{activeChat.name}</h3><div className="flex items-center gap-1.5">{chatStatus.isOnline ? (<><span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span><p className="text-[10px] font-bold uppercase tracking-widest text-green-500">Active Now</p></>) : (<p className="text-[10px] font-bold uppercase tracking-widest opacity-50">{chatStatus.lastSeen ? `Last seen ${formatLastSeen(chatStatus.lastSeen)}` : 'Offline'}</p>)}</div></div>
                                 </div>
                                 <div className="relative">
                                    <button onClick={() => setIsChatOptionsOpen(!isChatOptionsOpen)} className={`p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'} ${isChatOptionsOpen ? 'bg-blue-600/10 text-blue-500' : ''}`}><EllipsisHorizontalIcon className="w-6 h-6 opacity-50"/></button>
                                    {isChatOptionsOpen && (<div className={`absolute right-0 top-14 w-60 rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200 z-50 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}><div className="p-2 space-y-1"><button onClick={handleMinimizeToBubble} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-bold text-xs uppercase tracking-wider transition-colors ${darkMode ? 'hover:bg-white/5 text-blue-400' : 'hover:bg-blue-50 text-blue-500'}`}><ChevronDownIcon className="w-4 h-4" /> Minimize to Bubble</button><div className={`h-px my-1 ${darkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div><button onClick={handleCloseChat} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-bold text-xs uppercase tracking-wider transition-colors ${darkMode ? 'hover:bg-white/5 text-red-400' : 'hover:bg-red-50 text-red-500'}`}><XMarkIcon className="w-4 h-4" /> Close Chat</button></div></div>)}
                                 </div>
                            </div>
                            
                            {/* Chat Messages */}
                            <div className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-6 hide-scrollbar ${darkMode ? 'bg-slate-900/50' : 'bg-white'}`} onClick={() => setIsChatOptionsOpen(false)}>
                                {messages.map((msg, i) => {
                                    const isMe = msg.senderId === auth.currentUser.uid;
                                    const isSystem = msg.type === 'system';
                                    const isMedia = msg.fileType === 'image' || msg.fileType === 'video';
                                    const hasText = msg.text && msg.text.trim().length > 0;
                                    if(isSystem) return <div key={msg.id} className="text-center text-[10px] font-bold uppercase tracking-widest opacity-30 my-4">{msg.text}</div>;
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                                            {msg.replyTo && (<div className={`mb-1 px-4 py-2 rounded-2xl text-xs opacity-60 flex items-center gap-2 max-w-xs ${isMe ? 'bg-blue-600/20 text-blue-200 rounded-br-none mr-2' : 'bg-slate-500/20 text-slate-400 rounded-bl-none ml-2'}`}><ArrowUturnLeftIcon className="w-3 h-3"/><span className="truncate">{msg.replyTo.type === 'image' ? 'Image' : msg.replyTo.type === 'video' ? 'Video' : msg.replyTo.text}</span></div>)}
                                            <div className={`flex items-end gap-3 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <MessageAvatar isMe={isMe} />
                                                <div className="relative group/bubble flex flex-col gap-1">
                                                    {msg.fileUrl && (
                                                        <div className={`overflow-hidden rounded-2xl ${isMedia ? 'bg-transparent' : (isMe ? 'bg-blue-600' : darkMode ? 'bg-slate-800' : 'bg-slate-100 text-slate-900 border border-slate-200')}`}>
                                                            {msg.fileType === 'image' && <img src={msg.fileUrl} alt="attachment" className="max-w-full max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity rounded-2xl" onClick={() => setLightboxUrl(msg.fileUrl)} />}
                                                            {msg.fileType === 'video' && <video src={msg.fileUrl} controls className="max-w-full max-h-60 rounded-2xl" />}
                                                            {msg.fileType === 'file' && <a href={msg.fileUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-3 ${!isMe && 'bg-black/5'} rounded-xl hover:bg-black/10 transition-colors`}><DocumentIcon className="w-6 h-6"/><span className="underline font-bold truncate">{msg.fileName || "Download File"}</span></a>}
                                                        </div>
                                                    )}
                                                    {hasText && (
                                                        <div className={`p-4 rounded-[1.5rem] shadow-sm text-sm overflow-hidden ${isMe ? 'bg-blue-600 text-white rounded-br-none' : darkMode ? 'bg-slate-800 text-white rounded-bl-none' : 'bg-slate-100 text-slate-900 rounded-bl-none'}`}>
                                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                                        </div>
                                                    )}
                                                    <button onClick={() => setReplyingTo({ id: msg.id, text: msg.text, senderId: msg.senderId, fileType: msg.fileType })} className={`absolute top-1/2 -translate-y-1/2 p-2 rounded-full opacity-0 group-hover/bubble:opacity-100 transition-all ${isMe ? '-left-10 hover:bg-white/10 text-slate-400' : '-right-10 hover:bg-white/10 text-slate-400'}`}><ArrowUturnLeftIcon className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                            <p className={`text-[9px] font-bold mt-1.5 opacity-30 select-none ${isMe ? 'text-right mr-12' : 'text-left ml-12'}`}>{formatTime(msg.createdAt)}</p>
                                        </div>
                                    )
                                })}
                                <div ref={scrollRef}/>
                            </div>
                            
                            {/* Chat Input */}
                            <div className={`p-4 border-t shrink-0 z-20 pb-8 md:pb-4 ${darkMode?'bg-slate-900 border-white/5':'bg-white border-slate-300'}`}>
                                {replyingTo && (<div className={`mb-3 flex items-center justify-between p-3 rounded-2xl text-xs font-bold border-l-4 border-blue-500 animate-in slide-in-from-bottom-2 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}><div className="flex flex-col"><span className="text-blue-500 uppercase tracking-widest text-[9px] mb-1">Replying to {replyingTo.senderId === auth.currentUser.uid ? "Yourself" : activeChat.name}</span><span className="opacity-70 truncate max-w-xs">{replyingTo.fileType ? `[${replyingTo.fileType}]` : replyingTo.text}</span></div><button onClick={() => setReplyingTo(null)} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-colors"><XMarkIcon className="w-4 h-4"/></button></div>)}
                                {attachment && (<div className="mb-3 relative inline-block animate-in zoom-in duration-200"><div className="p-2 pr-8 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">{attachment.type.startsWith('image/') ? <PhotoIcon className="w-5 h-5 text-blue-500"/> : <DocumentIcon className="w-5 h-5 text-blue-500"/>}<span className="text-xs font-bold text-blue-500 truncate max-w-[200px]">{attachment.name}</span></div><button onClick={() => {setAttachment(null); chatFileRef.current.value = "";}} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600"><XMarkIcon className="w-3 h-3"/></button></div>)}
                                <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                                    <input type="file" ref={chatFileRef} onChange={handleFileSelect} className="hidden" />
                                    <button type="button" onClick={() => chatFileRef.current.click()} className={`p-4 rounded-2xl transition-all active:scale-95 ${darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'}`}><PaperClipIcon className="w-5 h-5"/></button>
                                    <div className={`flex-1 rounded-2xl flex items-center px-4 py-3.5 border transition-all ${darkMode ? 'bg-slate-800 border-transparent focus-within:border-blue-500' : 'bg-slate-100 border-transparent focus-within:bg-white focus-within:border-blue-300 shadow-inner'}`}><textarea value={newMessage} onChange={e=>setNewMessage(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }} placeholder="Type a message..." className="w-full bg-transparent outline-none text-sm font-medium resize-none max-h-24 hide-scrollbar" rows={1} /></div>
                                    <button type="submit" disabled={(!newMessage.trim() && !attachment) || isUploading} className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-blue-500/20 flex items-center justify-center">{isUploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <PaperAirplaneIcon className="w-5 h-5 -ml-0.5 mt-0.5"/>}</button>
                                </form>
                            </div>
                        </>
                    ) : (<div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 p-10 select-none"><div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}><ChatBubbleLeftRightIcon className="w-16 h-16 opacity-20"/></div><h3 className="text-2xl font-black mb-2">Select a Conversation</h3></div>)}
                </div>
            </div>
            </div>
        )}
      </main>

      {/* MODALS */}
      {selectedJob && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in" onClick={() => setSelectedJob(null)}>
            <div className={`max-w-2xl w-full p-6 sm:p-10 rounded-[3rem] border shadow-2xl overflow-y-auto max-h-[90vh] hide-scrollbar animate-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-300'}`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-3xl font-black uppercase tracking-tight leading-none">{selectedJob.title}</h3>
                        <p className="text-blue-500 font-bold uppercase tracking-widest text-xs mt-2">{selectedJob.employerName}</p>
                    </div>
                    <button onClick={() => setSelectedJob(null)} className={`p-2 rounded-full ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'}`}><XMarkIcon className="w-6 h-6"/></button>
                </div>
                <div className="space-y-6 mb-8">
                     <div className="flex gap-3 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}><MapPinIcon className="w-4 h-4 text-blue-500"/> {selectedJob.sitio || "No Location"}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}><span className="text-green-500 font-black text-lg leading-none">₱</span> {selectedJob.salary}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}><ClockIcon className="w-4 h-4 text-amber-500"/> {selectedJob.type}</span>
                    </div>
                    <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                        <h4 className="text-xs font-black uppercase tracking-widest opacity-50 mb-3">Description</h4>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedJob.description}</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setSelectedJob(null)} className="flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] border border-red-500/30 text-red-500 hover:bg-red-500/10 active:scale-95 transition-transform">Close</button>
                    <button onClick={() => handleApplyToJob(selectedJob)} className="flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">{loading ? 'Applying...' : 'Submit Application'}</button>
                </div>
            </div>
        </div>
      )}

      {/* MIRRORED VIEW DETAILS MODAL */}
      {viewingApplication && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in" onClick={() => setViewingApplication(null)}>
            <div className={`max-w-2xl w-full p-6 sm:p-10 rounded-[3rem] border shadow-2xl overflow-y-auto max-h-[90vh] hide-scrollbar animate-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-300'}`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-3xl font-black uppercase tracking-tight leading-none">{viewingApplication.jobTitle}</h3>
                        <p className="text-blue-500 font-bold uppercase tracking-widest text-xs mt-2">{viewingApplication.employerName}</p>
                    </div>
                    <button onClick={() => setViewingApplication(null)} className={`p-2 rounded-full ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'}`}><XMarkIcon className="w-6 h-6"/></button>
                </div>

                {modalLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Loading Job Details...</p>
                    </div>
                ) : (
                  <>
                    <div className="space-y-6 mb-8">
                        <div className="flex gap-3 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}><MapPinIcon className="w-4 h-4 text-blue-500"/> {modalJobDetails?.sitio || "Location"}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}><span className="text-purple-500 font-black text-lg leading-none">₱</span> {modalJobDetails?.salary || "Salary"}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}><ClockIcon className="w-4 h-4 text-amber-500"/> Applied {formatDateTime(viewingApplication.appliedAt)}</span>
                        </div>
                        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                            <h4 className="text-xs font-black uppercase tracking-widest opacity-50 mb-3">Application Status</h4>
                            <div className="flex items-center gap-2 mb-4">
                                <span className={`w-3 h-3 rounded-full ${viewingApplication.status === 'accepted' ? 'bg-green-500' : viewingApplication.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                                <span className="text-sm font-bold uppercase">{viewingApplication.status}</span>
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-widest opacity-50 mb-3">Job Description</h4>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{modalJobDetails?.description || "Description not available."}</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => handleWithdrawApplication(viewingApplication.id)} className="flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] border border-red-500/30 text-red-500 hover:bg-red-500/10 active:scale-95 transition-transform">{viewingApplication.status === 'rejected' ? 'Remove Application' : 'Withdraw Application'}</button>
                        {viewingApplication.status === 'accepted' ? (
                            <button onClick={() => { handleStartChatFromExternal({ id: viewingApplication.employerId, name: viewingApplication.employerName, profilePic: null }); setViewingApplication(null); }} className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-[10px] bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">Message Employer</button>
                        ) : (
                            <button disabled className="flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] bg-slate-500/10 text-slate-500 cursor-not-allowed opacity-50">{viewingApplication.status === 'rejected' ? 'Application Rejected' : 'Pending Review'}</button>
                        )}
                    </div>
                  </>
                )}
            </div>
        </div>
      )}

      {/* MOBILE BUBBLE RENDER */}
      {isBubbleVisible && (
        isMobile ? (
           <>
             {!isBubbleExpanded && (
                <div style={{ top: bubblePos.y, left: bubblePos.x }} className="fixed z-[201] touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                   <div className="relative">
                       <button onClick={(e) => { if (!isDragging) setIsBubbleExpanded(true); }} className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-90 border-2 overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-500'}`}>
                          {activeBubbleView !== 'inbox' && effectiveActiveChatUser ? (
                             effectiveActiveChatUser.profilePic ? <img src={effectiveActiveChatUser.profilePic} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">{effectiveActiveChatUser.name.charAt(0)}</div>
                          ) : ( <ChatBubbleOvalLeftEllipsisIcon className={`w-7 h-7 ${darkMode ? 'text-white' : 'text-blue-600'}`} /> )}
                       </button>
                       {hasNewMessages && activeBubbleView === 'inbox' && (<span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-bounce">!</span>)}
                   </div>
                </div>
             )}
             
             {isBubbleExpanded && (
                <div className="fixed inset-0 z-[1000] flex flex-col bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="pt-12 px-4 pb-4 flex items-center gap-4 overflow-x-auto hide-scrollbar pointer-events-auto">
                        {openBubbles.map((chat) => (
                           <div key={chat.id} className="relative group flex flex-col items-center gap-1 shrink-0">
                                <button onClick={() => setActiveBubbleView(chat.id)} className={`w-14 h-14 rounded-full overflow-hidden shadow-lg transition-all border-2 ${activeBubbleView === chat.id ? 'border-blue-500 scale-110' : 'border-transparent opacity-60'}`}>
                                    {chat.profilePic ? <img src={chat.profilePic} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">{chat.name.charAt(0)}</div>}
                                </button>
                                {activeBubbleView === chat.id && (<button onClick={(e) => { e.stopPropagation(); handleCloseBubble(chat.id); }} className="absolute -top-1 -right-1 bg-slate-500 text-white rounded-full p-0.5 shadow-md animate-in zoom-in"><XMarkIcon className="w-3 h-3"/></button>)}
                           </div>
                        ))}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                            <button onClick={() => setActiveBubbleView('inbox')} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all border-2 ${activeBubbleView === 'inbox' ? 'border-blue-500 scale-110' : 'border-white dark:border-slate-700 opacity-60'} ${darkMode ? 'bg-slate-800' : 'bg-white'}`}><ChatBubbleOvalLeftEllipsisIcon className="w-7 h-7 text-blue-500" /></button>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-end relative" onClick={() => setIsBubbleExpanded(false)}>
                        <div className={`w-full h-[80vh] rounded-t-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 border-t ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`} onClick={(e) => e.stopPropagation()}>
                            {activeBubbleView === 'inbox' && (
                                <div className="flex flex-col h-full">
                                    <div className={`p-5 border-b flex justify-between items-center ${darkMode ? 'border-white/5 bg-slate-900' : 'border-slate-100 bg-white'}`}>
                                        <h3 className={`font-black text-2xl ${darkMode ? 'text-white' : 'text-slate-900'}`}>Chats</h3>
                                        <button onClick={() => setIsBubbleExpanded(false)} className="p-2 bg-slate-100 dark:bg-white/10 rounded-full"><ChevronDownIcon className="w-5 h-5 opacity-50"/></button> 
                                    </div>
                                    <div className="px-5 py-2">
                                        <div className={`flex items-center p-1.5 rounded-2xl border transition-all ${darkMode ? 'bg-slate-800 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                            <MagnifyingGlassIcon className="w-4 h-4 ml-2 text-slate-400" />
                                            <input value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search chats..." className="bg-transparent border-none outline-none text-xs p-2 w-full font-bold" />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 hide-scrollbar">
                                            {filteredChats.map(c => {
                                                const otherId = c.participants.find(p => p !== auth.currentUser.uid);
                                                const name = c.names?.[otherId] || "User";
                                                const otherPic = c.profilePics?.[otherId];
                                                return (
                                                    <button key={c.chatId} onClick={() => { const userObj = { id: otherId, name, profilePic: otherPic }; if(!openBubbles.find(b => b.id === userObj.id)) { setOpenBubbles(prev => [userObj, ...prev]); } setActiveBubbleView(otherId); }} className={`w-full p-3 rounded-2xl flex items-center gap-4 mb-1 transition-colors ${darkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                                                        <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 relative">
                                                            {otherPic ? <img src={otherPic} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center h-full font-bold">{name.charAt(0)}</div>}
                                                        </div>
                                                        <div className="flex-1 text-left overflow-hidden">
                                                            <div className="flex justify-between items-center"><span className="font-black text-sm truncate">{name}</span><span className="text-[10px] opacity-40">{formatTime(c.lastTimestamp)}</span></div>
                                                            <p className="text-xs truncate opacity-60">{c.lastMessage}</p>
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                    </div>
                                </div>
                            )}

                            {activeBubbleView !== 'inbox' && effectiveActiveChatUser && (
                                <>
                                    <div className={`p-4 flex items-center justify-between border-b shrink-0 ${darkMode ? 'border-white/5 bg-slate-900' : 'border-slate-100 bg-white'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200">
                                                    {effectiveActiveChatUser.profilePic ? <img src={effectiveActiveChatUser.profilePic} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full font-bold">{effectiveActiveChatUser.name.charAt(0)}</span>}
                                                </div>
                                                <div>
                                                    <h3 className={`font-black text-base leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>{effectiveActiveChatUser.name}</h3>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        {chatStatus.isOnline ? <span className="w-2 h-2 rounded-full bg-green-500"></span> : null}
                                                        <p className="text-[10px] font-bold opacity-60 uppercase">{chatStatus.isOnline ? 'Active Now' : 'Offline'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-4 text-blue-500">
                                                <button className="active:scale-90"><PhoneSolidIcon className="w-6 h-6"/></button>
                                                <button onClick={() => setIsBubbleExpanded(false)}><ChevronDownIcon className="w-6 h-6"/></button>
                                            </div>
                                    </div>

                                    <div className={`flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                                            {/* Mobile Bubble Chat Messages */}
                                            {messages.map((msg) => {
                                                const isMe = msg.senderId === auth.currentUser.uid;
                                                const isSystem = msg.type === 'system';
                                                const isMedia = msg.fileType === 'image' || msg.fileType === 'video';
                                                const hasText = msg.text && msg.text.trim().length > 0;
                                                if(isSystem) return <div key={msg.id} className="text-center text-[10px] font-bold uppercase tracking-widest opacity-30 my-4">{msg.text}</div>;
                                                return (
                                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                                                        {msg.replyTo && (<div className={`mb-1 px-4 py-2 rounded-2xl text-xs opacity-60 flex items-center gap-2 max-w-xs ${isMe ? 'bg-blue-600/20 text-blue-200 rounded-br-none mr-2' : 'bg-slate-500/20 text-slate-400 rounded-bl-none ml-2'}`}><ArrowUturnLeftIcon className="w-3 h-3"/><span className="truncate">{msg.replyTo.type === 'image' ? 'Image' : msg.replyTo.type === 'video' ? 'Video' : msg.replyTo.text}</span></div>)}
                                                        <div className={`flex items-end gap-3 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                            <MessageAvatar isMe={isMe} />
                                                            <div className="relative group/bubble flex flex-col gap-1">
                                                                {msg.fileUrl && (
                                                                    <div className={`overflow-hidden rounded-2xl ${isMedia ? 'bg-transparent' : (isMe ? 'bg-blue-600' : darkMode ? 'bg-slate-800' : 'bg-slate-100 text-slate-900 border border-slate-200')}`}>
                                                                        {msg.fileType === 'image' && <img src={msg.fileUrl} alt="attachment" className="max-w-full max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity rounded-2xl" onClick={() => setLightboxUrl(msg.fileUrl)} />}
                                                                        {msg.fileType === 'video' && <video src={msg.fileUrl} controls className="max-w-full max-h-60 rounded-2xl" />}
                                                                        {msg.fileType === 'file' && <a href={msg.fileUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-3 ${!isMe && 'bg-black/5'} rounded-xl hover:bg-black/10 transition-colors`}><DocumentIcon className="w-6 h-6"/><span className="underline font-bold truncate">{msg.fileName || "Download File"}</span></a>}
                                                                    </div>
                                                                )}
                                                                {hasText && (
                                                                    <div className={`p-4 rounded-[1.5rem] shadow-sm text-sm overflow-hidden ${isMe ? 'bg-blue-600 text-white rounded-br-none' : darkMode ? 'bg-slate-800 text-white rounded-bl-none' : 'bg-slate-100 text-slate-900 rounded-bl-none'}`}>
                                                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                                                    </div>
                                                                )}
                                                                <button onClick={() => setReplyingTo({ id: msg.id, text: msg.text, senderId: msg.senderId, fileType: msg.fileType })} className={`absolute top-1/2 -translate-y-1/2 p-2 rounded-full opacity-0 group-hover/bubble:opacity-100 transition-all ${isMe ? '-left-10 hover:bg-white/10 text-slate-400' : '-right-10 hover:bg-white/10 text-slate-400'}`}><ArrowUturnLeftIcon className="w-4 h-4"/></button>
                                                            </div>
                                                        </div>
                                                        <p className={`text-[9px] font-bold mt-1.5 opacity-30 select-none ${isMe ? 'text-right mr-12' : 'text-left ml-12'}`}>{formatTime(msg.createdAt)}</p>
                                                    </div>
                                                )
                                            })}
                                            <div ref={scrollRef}/>
                                    </div>
                                    <div className={`p-3 border-t shrink-0 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                                            {/* Mobile Bubble Input */}
                                            {replyingTo && (<div className={`mb-3 flex items-center justify-between p-3 rounded-2xl text-xs font-bold border-l-4 border-blue-500 animate-in slide-in-from-bottom-2 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}><div className="flex flex-col"><span className="text-blue-500 uppercase tracking-widest text-[9px] mb-1">Replying to {replyingTo.senderId === auth.currentUser.uid ? "Yourself" : effectiveActiveChatUser.name}</span><span className="opacity-70 truncate max-w-xs">{replyingTo.fileType ? `[${replyingTo.fileType}]` : replyingTo.text}</span></div><button onClick={() => setReplyingTo(null)} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-colors"><XMarkIcon className="w-4 h-4"/></button></div>)}
                                            {attachment && (<div className="mb-3 relative inline-block animate-in zoom-in duration-200"><div className="p-2 pr-8 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">{attachment.type.startsWith('image/') ? <PhotoIcon className="w-5 h-5 text-blue-500"/> : <DocumentIcon className="w-5 h-5 text-blue-500"/>}<span className="text-xs font-bold text-blue-500 truncate max-w-[200px]">{attachment.name}</span></div><button onClick={() => {setAttachment(null); chatFileRef.current.value = "";}} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600"><XMarkIcon className="w-3 h-3"/></button></div>)}
                                             <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                                                <input type="file" ref={chatFileRef} onChange={handleFileSelect} className="hidden" />
                                                <button type="button" onClick={() => chatFileRef.current.click()} className={`p-2 rounded-xl transition-all active:scale-95 ${darkMode ? 'bg-white/5 hover:bg-white/10 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}><PaperClipIcon className="w-5 h-5"/></button>
                                                <div className={`flex-1 rounded-2xl flex items-center px-4 py-2 border transition-all ${darkMode ? 'bg-slate-800 border-transparent focus-within:border-blue-500' : 'bg-slate-100 border-transparent focus-within:bg-white focus-within:border-blue-300 shadow-inner'}`}><input value={newMessage} onChange={e=>setNewMessage(e.target.value)} placeholder="Message..." className="w-full bg-transparent outline-none text-sm font-medium" /></div>
                                                <button type="submit" disabled={(!newMessage.trim() && !attachment) || isUploading} className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed">{isUploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <PaperAirplaneIcon className="w-5 h-5"/>}</button>
                                             </form>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
             )}
           </>
        ) : (
          // DESKTOP VIEW BUBBLES
           <div className="fixed z-[200] bottom-6 right-4 md:right-6 flex flex-col-reverse items-end gap-3 pointer-events-none">
             <div className="pointer-events-auto">
                 <button onClick={() => { setIsDesktopInboxVisible(!isDesktopInboxVisible); setActiveChat(null); }} className={`group relative w-12 h-12 md:w-14 md:h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-90 border-2 ${darkMode ? 'bg-blue-600 border-slate-800' : 'bg-blue-600 border-white'}`}>
                     <ChatBubbleLeftRightIcon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                     {hasNewMessages && (<span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-bounce">!</span>)}
                 </button>
             </div>
             {openBubbles.map((chat) => (
                 <div key={chat.id} className="pointer-events-auto relative group flex items-center gap-3">
                     <span className="absolute right-full mr-3 px-3 py-1.5 rounded-xl bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">{chat.name}</span>
                     <div className="relative">
                         <button onClick={() => { setActiveChat(chat); setIsChatMinimized(false); setIsDesktopInboxVisible(false); }} className="w-12 h-12 md:w-14 md:h-14 rounded-full shadow-2xl overflow-hidden border-2 border-white dark:border-slate-800 transition-all hover:scale-110 active:scale-95">
                             {chat.profilePic ? (<img src={chat.profilePic} alt="" className="w-full h-full object-cover" />) : (<div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">{chat.name.charAt(0)}</div>)}
                         </button>
                         <button onClick={(e) => { e.stopPropagation(); setOpenBubbles(prev => prev.filter(b => b.id !== chat.id)); if (openBubbles.length <= 1) setIsBubbleVisible(false); }} className="absolute -top-1 -left-1 w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white dark:border-slate-800"><XMarkIcon className="w-3 h-3 text-slate-600 dark:text-slate-300" /></button>
                     </div>
                 </div>
             ))}
             {/* Desktop Inbox Window */}
             {isDesktopInboxVisible && !activeChat && (
                <div className="fixed z-[210] pointer-events-auto bottom-6 right-24 animate-in slide-in-from-right-4 duration-300">
                    <div className={`w-[320px] h-[450px] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-300'}`}>
                         <div className={`p-5 border-b flex justify-between items-center ${darkMode ? 'bg-slate-900 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
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
                                return (
                                    <button key={c.chatId} onClick={() => { const userObj = { id: otherId, name, profilePic: otherPic }; if(!openBubbles.find(b => b.id === userObj.id)) { setOpenBubbles(prev => [userObj, ...prev]); } setActiveChat(userObj); setIsDesktopInboxVisible(false); }} className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-colors ${darkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                                        <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                                            {otherPic ? <img src={otherPic} className="w-full h-full object-cover"/> : <span className="font-bold">{name.charAt(0)}</span>}
                                        </div>
                                        <div className="flex-1 text-left overflow-hidden">
                                            <div className="flex justify-between items-center"><span className="font-black text-sm truncate">{name}</span><span className="text-[9px] opacity-40">{formatTime(c.lastTimestamp)}</span></div>
                                            <p className="text-[11px] truncate opacity-60">{c.lastMessage}</p>
                                        </div>
                                    </button>
                                )
                            })}
                         </div>
                    </div>
                </div>
             )}
             {/* Desktop Chat Card */}
             {!isChatMinimized && activeChat && (
                <div className={`fixed z-[210] pointer-events-auto bottom-6 right-24`}>
                    <div className={`w-[380px] h-[500px] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border animate-in slide-in-from-right-4 duration-300 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-300'}`}>
                        <div className={`p-4 flex justify-between items-center border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0`}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-white/20 overflow-hidden border border-white/20">
                                    {activeChat.profilePic ? <img src={activeChat.profilePic} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full font-black">{activeChat.name.charAt(0)}</span>}
                                </div>
                                <div>
                                    <span className="font-black text-xs uppercase block">{activeChat.name}</span>
                                    <span className="text-[9px] opacity-90 font-bold block">{chatStatus.isOnline ? 'Active Now' : 'Offline'}</span>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => setIsChatMinimized(true)} className="p-1.5 hover:bg-white/20 rounded-lg"><ChevronDownIcon className="w-4 h-4"/></button>
                                <button onClick={handleCloseChat} className="p-1.5 hover:bg-white/20 rounded-lg"><XMarkIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                        <div className={`flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                            {/* Reuse Desktop Message Mapping Logic Here */}
                            {messages.map((msg, i) => {
                                const isMe = msg.senderId === auth.currentUser.uid;
                                const isSystem = msg.type === 'system';
                                const isMedia = msg.fileType === 'image' || msg.fileType === 'video';
                                const hasText = msg.text && msg.text.trim().length > 0;
                                if(isSystem) return <div key={msg.id} className="text-center text-[10px] font-bold uppercase tracking-widest opacity-30 my-4">{msg.text}</div>;
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                                            {msg.replyTo && (<div className={`mb-1 px-3 py-1.5 rounded-xl text-[10px] opacity-60 flex items-center gap-2 max-w-[250px] ${isMe ? 'bg-blue-600/20 text-blue-200' : 'bg-slate-500/20 text-slate-400'}`}><ArrowUturnLeftIcon className="w-3 h-3"/><span className="truncate">{msg.replyTo.type === 'image' ? 'Image' : msg.replyTo.text}</span></div>)}
                                            <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <MessageAvatar isMe={isMe} />
                                                <div className="relative group/bubble flex flex-col gap-1">
                                                    {msg.fileUrl && (
                                                        <div className={`overflow-hidden rounded-2xl ${isMedia ? 'bg-transparent' : (isMe ? 'bg-blue-600' : darkMode ? 'bg-slate-800' : 'bg-white')}`}>
                                                            {msg.fileType === 'image' && <img src={msg.fileUrl} alt="attachment" className="max-w-full max-h-40 object-cover rounded-2xl cursor-pointer hover:opacity-90" onClick={() => setLightboxUrl(msg.fileUrl)} />}
                                                            {msg.fileType === 'video' && <video src={msg.fileUrl} controls className="max-w-full max-h-40 rounded-2xl" />}
                                                            {msg.fileType === 'file' && <div className="p-3 text-[11px] font-bold underline truncate flex items-center gap-2"><DocumentIcon className="w-4 h-4"/>{msg.fileName}</div>}
                                                        </div>
                                                    )}
                                                    {hasText && (
                                                        <div className={`px-3 py-2.5 rounded-2xl text-[12.5px] shadow-sm leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-br-none' : darkMode ? 'bg-slate-800 text-white rounded-bl-none' : 'bg-white text-slate-900 rounded-bl-none'}`}>
                                                            <p className="whitespace-pre-wrap">{msg.text}</p>
                                                        </div>
                                                    )}
                                                    <button onClick={() => setReplyingTo({ id: msg.id, text: msg.text, senderId: msg.senderId, fileType: msg.fileType })} className={`absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover/bubble:opacity-100 transition-all ${isMe ? '-left-8 hover:bg-black/5' : '-right-8 hover:bg-black/5'} text-slate-400`}><ArrowUturnLeftIcon className="w-3.5 h-3.5"/></button>
                                                </div>
                                            </div>
                                            <p className={`text-[8px] font-black mt-1 opacity-30 ${isMe ? 'text-right mr-10' : 'text-left ml-10'}`}>{formatTime(msg.createdAt)}</p>
                                    </div>
                                );
                            })}
                            <div ref={scrollRef}/>
                        </div>
                        <div className={`p-3 border-t shrink-0 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                            {replyingTo && (<div className="mb-2 flex justify-between items-center p-2.5 bg-blue-500/10 rounded-xl border-l-4 border-blue-500 text-[10px] font-bold"><div className="flex flex-col"><span className="text-blue-500 uppercase">Replying to {replyingTo.senderId === auth.currentUser.uid ? 'You' : activeChat.name}</span><span className="truncate max-w-[200px] opacity-70">{replyingTo.text}</span></div><button onClick={() => setReplyingTo(null)}><XMarkIcon className="w-4 h-4 text-blue-500"/></button></div>)}
                            {attachment && (<div className="mb-2 px-3 py-2 bg-blue-500/10 rounded-xl flex justify-between items-center text-[10px] font-bold"><span className="text-blue-500 truncate max-w-[200px]">{attachment.name}</span><button onClick={() => setAttachment(null)}><XMarkIcon className="w-4 h-4 text-blue-500"/></button></div>)}
                            <form onSubmit={handleSendMessage} className={`flex gap-2 items-center`}>
                                <input type="file" ref={chatFileRef} onChange={handleFileSelect} className="hidden" />
                                <button type="button" onClick={() => chatFileRef.current.click()} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><PaperClipIcon className="w-5 h-5"/></button>
                                <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Aa" className={`flex-1 px-4 py-2 text-sm outline-none rounded-full ${darkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900'}`} />
                                <button type="submit" disabled={(!newMessage.trim() && !attachment) || isUploading} className="p-2 text-blue-600 disabled:opacity-30 active:scale-90 transition-transform">{isUploading ? <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> : <PaperAirplaneIcon className="w-6 h-6" />}</button>
                            </form>
                        </div>
                    </div>
                </div>
             )}
           </div>
        )
      )}

      {/* MOBILE BOTTOM NAV */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t px-6 py-3 flex justify-around items-center z-[80] transition-transform duration-300 ${isMobile && activeTab === "Messages" && activeChat ? 'translate-y-full' : 'translate-y-0'} ${darkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200'}`}>
        <MobileNavItem icon={<SparklesIcon className="w-6 h-6" />} active={activeTab === "FindJobs"} onClick={() => setActiveTab("FindJobs")} />
        <MobileNavItem icon={<BookmarkIcon className="w-6 h-6" />} active={activeTab === "Saved"} onClick={() => setActiveTab("Saved")} />
        <MobileNavItem icon={<div className="relative"><PaperAirplaneIcon className="w-6 h-6" />{hasUnreadUpdates && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white animate-pulse"></span>}</div>} active={activeTab === "Applications"} onClick={() => setActiveTab("Applications")} />
        <MobileNavItem icon={<div className="relative"><ChatBubbleLeftRightIcon className="w-6 h-6" />{hasNewMessages && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}</div>} active={activeTab === "Messages"} onClick={() => setActiveTab("Messages")} />
      </nav>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function ApplicationCard({ app, darkMode, onWithdraw, onView, onChat, unreadCount, isAccepted, isRejected }) {
    const borderColorClass = isAccepted ? 'border-l-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : isRejected ? 'border-l-red-500 opacity-80' : 'border-l-amber-500';
    const iconBgClass = isAccepted ? 'bg-blue-500/10' : isRejected ? 'bg-red-500/10' : 'bg-amber-500/10';
    const iconContent = isAccepted ? '🤝' : isRejected ? '❌' : '📄';

    return (
      <div className={`p-4 md:p-8 rounded-[2.5rem] border-l-8 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 transition-all relative overflow-hidden group hover:shadow-lg ${darkMode ? 'bg-slate-900 border-y-white/5 border-r-white/5' : 'bg-white border-y-slate-200 border-r-slate-200 shadow-md'} ${borderColorClass}`}>
        <div className="flex items-start gap-4 md:gap-5">
          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-[1.2rem] flex items-center justify-center text-xl md:text-2xl shadow-inner select-none overflow-hidden shrink-0 ${iconBgClass}`}>
               {app.employerLogo ? (
                   <img src={app.employerLogo} alt={app.employerName} className="w-full h-full object-cover"/>
               ) : (
                   <span>{iconContent}</span>
               )}
          </div>
          <div>
              <div className="flex items-center gap-2">
                  <h4 className={`font-black text-base md:text-lg leading-none select-none cursor-default ${darkMode ? 'text-white' : 'text-slate-900'}`}>{app.jobTitle}</h4>
              </div>
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 md:mt-2 select-none cursor-default truncate max-w-[200px]">{app.employerName}</p>
              {isRejected && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-2">Application Rejected</p>}
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
          <button onClick={onView} className={`flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-3 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${darkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><EyeIcon className="w-4 h-4" /> View</button>
           
          {isAccepted && (
              <button onClick={onChat} className="flex-1 md:flex-none justify-center flex bg-blue-600 text-white p-3 rounded-2xl shadow-lg relative hover:bg-blue-500 transition-colors active:scale-95">
                  <ChatBubbleLeftRightIcon className="w-5 h-5" />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[7px] font-bold">{unreadCount}</span>}
              </button>
          )}

          <div className={`w-px h-6 mx-1 ${darkMode ? 'bg-white/10' : 'bg-slate-300'}`}></div>
          <button title={isRejected ? "Remove Application" : "Withdraw Application"} onClick={(e) => { e.stopPropagation(); onWithdraw(); }} className={`flex-none p-3 rounded-2xl transition-all active:scale-95 group-hover:opacity-100 opacity-60 ${darkMode ? 'text-slate-500 hover:text-red-500 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}><TrashIcon className="w-5 h-5" /></button>
        </div>
      </div>
    );
}

function NavItem({ icon, label, active, onClick, darkMode, collapsed }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center transition-all duration-500 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 ${active ? 'bg-blue-600 text-white shadow-lg' : darkMode ? 'text-slate-500 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'} ${collapsed ? 'justify-center py-4 px-0' : 'justify-start py-4 px-5 gap-4'}`}>
      <span className="shrink-0">{icon}</span><span className={`transition-all duration-500 overflow-hidden ${collapsed ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'}`}>{label}</span>
    </button>
  );
}

function MobileNavItem({ icon, active, onClick }) {
  return (
    <button onClick={onClick} className={`p-4 rounded-2xl transition-all active:scale-95 ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}>{icon}</button>
  );
}