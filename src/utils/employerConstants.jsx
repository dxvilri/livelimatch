import { BriefcaseIcon, ClockIcon, CalendarDaysIcon, BoltIcon } from "@heroicons/react/24/outline";

export const PUROK_LIST = [
  "Sagur", "Ampungan", "Centro 1", "Centro 2", "Centro 3", "Bypass Road", "Boundary"
];

export const JOB_CATEGORIES = [
    { id: "EDUCATION", label: "Education", examples: "Teachers, Tutors, Principals" },
    { id: "AGRICULTURE", label: "Agriculture", examples: "Corn/Rice Farmers, Livestock" },
    { id: "AUTOMOTIVE", label: "Automotive", examples: "Mechanics, Mechanical Engineering" },
    { id: "CARPENTRY", label: "Carpentry", examples: "Carpenters, Furniture Makers" },
    { id: "HOUSEHOLD", label: "Household Service", examples: "Maids, Caregivers, Nanny" }
];

export const ADMIN_EMAIL = "admin@livelimatch.com";

export const JOB_TYPES = [
  { id: "Full-time", icon: <BriefcaseIcon className="w-5 h-5"/>, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { id: "Part-time", icon: <ClockIcon className="w-5 h-5"/>, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { id: "Contract", icon: <CalendarDaysIcon className="w-5 h-5"/>, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { id: "One-time", icon: <BoltIcon className="w-5 h-5"/>, color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" }
];

export const BOT_FAQ = [
    { id: 1, question: "How do I verify my account?", answer: "To verify your account, please upload a valid Business Permit, Certificate of Residency, Proof of Billing with Address or Government ID in your Profile settings. Admins review this daily." },
    { id: 2, question: "How to post a job?", answer: "You can post a new job by going to the 'Listings' tab and clicking 'Post New Job' button." },
    { id: 3, question: "How to delete a job?", answer: "To delete a job, click the Trash icon next to the item in your Listings tab. This action cannot be undone." },
    { id: 4, question: "Where can I see applicants?", answer: "Go to the 'Applicants' tab to see who applied. You can view their profile, then Accept or Reject them." },
    { id: 5, question: "How to chat with applicants?", answer: "You can chat with applicants once you accept their application, or by clicking the 'Message' button on their profile in the Discover tab." },
];