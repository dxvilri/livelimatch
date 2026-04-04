import { BriefcaseIcon, ClockIcon, CalendarDaysIcon, BoltIcon } from "@heroicons/react/24/outline";

export const PUROK_LIST = [
  "Sagur", "Ampungan", "Centro 1", "Centro 2", "Centro 3", "Bypass Road", "Boundary"
];

export const JOB_CATEGORIES = [
    { id: "EDUCATION", label: "Education", examples: "Teachers, Tutors, Principals" },
    { id: "AGRICULTURE", label: "Agriculture", examples: "Corn/Rice Farmers, Livestock" },
    { id: "AUTOMOTIVE", label: "Automotive", examples: "Auto Mechanic, Motorcycle Mechanic" },
    { id: "CARPENTRY", label: "Carpentry", examples: "Carpenters, Furniture Makers" },
    { id: "HOUSEHOLD", label: "Household Service", examples: "Maids, Caregivers, Nanny" },
    { id: "CUSTOMER_SERVICE", label: "Customer Service", examples: "Cashiers, Saleslady, Baggers" }
];

export const JOB_TYPES = [
  { id: "Full-time", icon: <BriefcaseIcon className="w-5 h-5"/>, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { id: "Part-time", icon: <ClockIcon className="w-5 h-5"/>, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { id: "Contract", icon: <CalendarDaysIcon className="w-5 h-5"/>, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { id: "One-time", icon: <BoltIcon className="w-5 h-5"/>, color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" }
];

export const BOT_FAQ = [
    { 
        id: 2, 
        keywords: ["apply", "application", "send resume", "hire me", "how to apply"], 
        question: "How to apply for a job?", 
        answer: "Go to the 'Find Jobs' tab, click on any job card to view its full details, and then click the blue 'Apply Now' button at the bottom." 
    },
    { 
        id: 3, 
        keywords: ["withdraw", "cancel", "delete", "remove", "mistake"], 
        question: "Can I withdraw an application?", 
        answer: "Yes. Go to the 'Applications' tab, click on your pending application, and click the 'Withdraw Application' button. This frees up the slot for others." 
    },
    { 
        id: 4, 
        keywords: ["chat", "message", "contact", "talk", "inbox", "employer"], 
        question: "How to chat with employers?", 
        answer: "To prevent spam, you can only message an employer ONCE they accept your application, or if the employer initiates the chat with you first." 
    },
    { 
        id: 5, 
        keywords: ["save", "bookmark", "later", "favorite"], 
        question: "How to save a job?", 
        answer: "Click the Bookmark icon on any job card. You can view all your saved jobs later in the 'Saved' tab." 
    }
];

export const getBotAutoReply = (userInput, faqList) => {
    if (!userInput) return null;
    const lowerInput = userInput.toLowerCase().trim();

    // 1. Check for conversational greetings/thanks first
    const greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "bot"];
    const thanks = ["thank you", "thanks", "salamat", "ok", "okay", "alright"];

    if (greetings.includes(lowerInput)) {
        return "🤖 Hello! I am the LiveliMatch Support Bot. How can I help you today? You can ask me about verifications, applying for jobs, or messaging employers.";
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