import { BriefcaseIcon, ClockIcon, CalendarDaysIcon, BoltIcon } from "@heroicons/react/24/outline";

export const PUROK_LIST = [
  "Sagur", "Ampungan", "Centro 1", "Centro 2", "Centro 3", "Bypass Road", "Boundary"
];

export const JOB_CATEGORIES = [
    { id: "EDUCATION", label: "Education", examples: "Teachers, Tutors, Principals" },
    { id: "AGRICULTURE", label: "Agriculture", examples: "Corn/Rice Farmers, Livestock" },
    { id: "AUTOMOTIVE", label: "Automotive", examples: "Mechanics, Mechanical Engineering" },
    { id: "CARPENTRY", label: "Carpentry", examples: "Carpenters, Furniture Makers" },
    { id: "HOUSEHOLD", label: "Household Service", examples: "Maids, Caregivers, Nanny" },
    { id: "CUSTOMER_SERVICE", label: "Customer Service", examples: "Cashiers, Saleslady, Baggers" }
];

export const ADMIN_EMAIL = "admin@livelimatch.com";

export const JOB_TYPES = [
  { id: "Full-time", icon: <BriefcaseIcon className="w-5 h-5"/>, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { id: "Part-time", icon: <ClockIcon className="w-5 h-5"/>, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { id: "Contract", icon: <CalendarDaysIcon className="w-5 h-5"/>, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { id: "One-time", icon: <BoltIcon className="w-5 h-5"/>, color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" }
];

export const BOT_FAQ = [
    { 
        id: 2, 
        keywords: ["post", "create", "new job", "hiring", "add job"], 
        question: "How to post a job?", 
        answer: "Go to the 'Listings' tab and click the 'Post New Job' button. Fill out the requirements and capacity limits." 
    },
    { 
        id: 3, 
        keywords: ["delete", "remove", "trash", "cancel job"], 
        question: "How to delete a job?", 
        answer: "To delete a job, click the Trash icon next to the item in your 'Listings' tab. Note: This action cannot be undone." 
    },
    { 
        id: 4, 
        keywords: ["applicants", "who applied", "candidates", "review"], 
        question: "Where can I see applicants?", 
        answer: "Go to the 'Applicants' tab to see who applied to your listings. You can view their profiles, then Accept or Reject them." 
    },
    { 
        id: 5, 
        keywords: ["chat", "message", "contact", "talk", "inbox"], 
        question: "How to chat with applicants?", 
        answer: "You can chat with an applicant AFTER you Accept their application, or by clicking the 'Message' button on their profile in the Discover tab." 
    }
];

export const getBotAutoReply = (userInput, faqList) => {
    if (!userInput) return null;
    const lowerInput = userInput.toLowerCase().trim();

    // 1. Check for conversational greetings/thanks first
    const greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "bot"];
    const thanks = ["thank you", "thanks", "salamat", "ok", "okay", "alright"];

    if (greetings.includes(lowerInput)) {
        return "🤖 Hello! I am the LiveliMatch Support Bot. How can I help you today? You can ask me about verifications, posting jobs, or managing applicants.";
    }
    if (thanks.includes(lowerInput)) {
        return "🤖 You're very welcome! Let me know if you need help with anything else.";
    }

    // 2. Check against FAQ keywords
    const matchedFAQs = faqList.filter(faq => 
        faq.keywords?.some(keyword => lowerInput.includes(keyword))
    );

    if (matchedFAQs.length > 0) {
        return matchedFAQs.map(faq => `🤖 **${faq.question}**\n${faq.answer}`).join("\n\n");
    }
    
    return null; 
};