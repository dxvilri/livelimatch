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
    { id: 1, question: "How do I verify my account?", answer: "To verify, you may send one of the following valid proofs and wait until an Admin verifies it: Certificate of Residency, Latest Billing Address, or Valid IDs with current address " },
    { id: 2, question: "How to apply for a job?", answer: "Go to 'Find Jobs', click a job card to view details, then click the 'Apply Now' button." },
    { id: 3, question: "Can I withdraw an application?", answer: "Yes. Go to the 'Applications' tab, find the job, and click the Trash/Withdraw icon." },
    { id: 4, question: "How to chat with employers?", answer: "You can only message an employer once they accept your application, or if they message you first." },
    { id: 5, question: "How to save a job?", answer: "Click the Bookmark icon on any job card to save it for later in the 'Saved' tab." },
];