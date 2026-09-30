import type { LeadSource } from "@/lib/domain/types";

/** Synthetic prospects used by "Simulate new enquiry". */
export const SIMULATED_PROSPECTS: { name: string; source: LeadSource; enquiry: string }[] = [
  { name: "Ishaan Bhatia", source: "website", enquiry: "Hi, I have a missing tooth on the upper left side. Do you do implants? I'd like to book a consultation." },
  { name: "Nivedita Rao", source: "instagram", enquiry: "Saw your post on clear aligners. I have slightly crowded lower teeth. How do I get started?" },
  { name: "Aditi Menon", source: "google", enquiry: "Looking for teeth whitening before my sister's wedding next month." },
  { name: "Rohit Kamath", source: "whatsapp", enquiry: "Need a check-up and cleaning, it's been two years." },
  { name: "Sana Merchant", source: "website", enquiry: "Want braces consultation for my son, he is 12." },
  { name: "Kabir Anand", source: "directory", enquiry: "Interested in veneers for my front teeth. Can I book a consultation?" },
  { name: "Tejaswini Gowda", source: "google", enquiry: "Hi, my wisdom tooth is coming out. Want to get it checked." },
  { name: "Arnav Chopra", source: "website", enquiry: "Looking for dental implants for my mother. Do you have Saturday appointments?" },
];

/** Suggested patient replies for driving the demo conversation. */
export const PATIENT_QUICK_REPLIES = [
  "Evenings work best for me",
  "Saturday morning if possible",
  "Is there parking near the clinic?",
  "How much does the consultation cost?",
  "Do you have EMI options?",
  "Option 1",
  "Is my bleeding gum serious? What should I take?",
  "Can I speak to someone at the clinic?",
  "STOP",
];
