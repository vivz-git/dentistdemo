import type { Clinic, FAQ, Service, StaffUser } from "@/lib/domain/types";

/**
 * SmileCare Dental Clinic is a fictional clinic. Every name, number and
 * address in the demo is synthetic.
 */
export const DEMO_CLINIC_ID = "clinic_smilecare";

export const demoClinic: Clinic = {
  id: DEMO_CLINIC_ID,
  name: "SmileCare Dental Clinic",
  tagline: "Family and cosmetic dentistry",
  address: "2nd Floor, Lakeview Arcade, 14th Main Road, HSR Layout Sector 5",
  city: "Bengaluru 560102",
  phone: "+91 80 4718 2290",
  whatsapp: "+91 97410 38826",
  email: "frontdesk@smilecare-demo.in",
  website: "smilecare-demo.in",
  timezone: "Asia/Kolkata",
  currency: "INR",
  locale: "en-IN",
  mapsUrl: "https://maps.example.com/smilecare-demo",
  parking: "Free parking for cars and two-wheelers in the Lakeview Arcade basement. Take the lift to the 2nd floor.",
  paymentMethods: ["UPI", "Debit and credit cards", "Cash", "No-cost EMI on treatments above ₹20,000 through our finance partner"],
  emergencyInstructions: "If you have facial swelling, difficulty breathing or swallowing, or bleeding that won't stop, please go to the nearest hospital emergency department.",
  escalationInstructions: "The front desk replies here between 9:30 am and 7:30 pm, Monday to Saturday, usually within 15 minutes.",
  booking: {
    consultationMinutes: 30,
    bufferMinutes: 0,
    minNoticeHours: 3,
    maxDaysAhead: 14,
    slotsToOffer: 3,
    reminder24h: true,
    reminder2h: true,
    noReplyNudgeHours: 24,
    blackoutDates: [],
    hours: [
      { day: 0, open: true, start: "10:00", end: "13:00" },
      { day: 1, open: true, start: "09:30", end: "19:30", breakStart: "13:30", breakEnd: "14:30" },
      { day: 2, open: true, start: "09:30", end: "19:30", breakStart: "13:30", breakEnd: "14:30" },
      { day: 3, open: true, start: "09:30", end: "19:30", breakStart: "13:30", breakEnd: "14:30" },
      { day: 4, open: true, start: "09:30", end: "19:30", breakStart: "13:30", breakEnd: "14:30" },
      { day: 5, open: true, start: "09:30", end: "19:30", breakStart: "13:30", breakEnd: "14:30" },
      { day: 6, open: true, start: "09:30", end: "17:00", breakStart: "13:30", breakEnd: "14:00" },
    ],
  },
};

const svc = (s: Omit<Service, "clinicId" | "active">): Service => ({ ...s, clinicId: DEMO_CLINIC_ID, active: true });

export const demoServices: Service[] = [
  svc({
    id: "svc_implants",
    name: "Dental implants",
    keywords: ["implant", "implants", "missing tooth", "missing teeth", "lost a tooth", "lost tooth", "replace tooth", "tooth replacement"],
    consultationType: "Implant consultation",
    consultationFee: 500,
    estimatedCaseValue: 42000,
    description: "Replacement of missing teeth with implants, assessed at an implant consultation with a CBCT review if needed.",
  }),
  svc({
    id: "svc_aligners",
    name: "Clear aligners",
    keywords: ["aligner", "aligners", "invisalign", "invisible braces", "clear braces", "crooked", "gap", "straighten"],
    consultationType: "Aligner assessment",
    consultationFee: 500,
    estimatedCaseValue: 95000,
    description: "Removable clear aligners for straightening teeth. Suitability is decided at an aligner assessment.",
  }),
  svc({
    id: "svc_braces",
    name: "Braces",
    keywords: ["braces", "brace", "orthodontic", "orthodontist", "metal braces", "ceramic braces"],
    consultationType: "Orthodontic consultation",
    consultationFee: 500,
    estimatedCaseValue: 55000,
    description: "Fixed metal and ceramic braces for children and adults.",
  }),
  svc({
    id: "svc_rct",
    name: "Root canal treatment",
    keywords: ["root canal", "rct", "nerve treatment"],
    consultationType: "Dental consultation",
    consultationFee: 400,
    estimatedCaseValue: 9000,
    description: "Root canal treatment, planned after an examination and X-ray at a dental consultation.",
  }),
  svc({
    id: "svc_whitening",
    name: "Teeth whitening",
    keywords: ["whitening", "whiten", "white teeth", "yellow teeth", "stains", "bleaching"],
    consultationType: "Whitening consultation",
    consultationFee: 300,
    estimatedCaseValue: 14000,
    description: "In-clinic and take-home whitening, after a check that whitening is suitable.",
  }),
  svc({
    id: "svc_veneers",
    name: "Veneers and smile makeover",
    keywords: ["veneer", "veneers", "smile makeover", "smile design", "cosmetic"],
    consultationType: "Smile design consultation",
    estimatedCaseValue: 60000,
    description: "Cosmetic veneers and smile design. Planned at a smile design consultation.",
  }),
  svc({
    id: "svc_checkup",
    name: "Check-up and cleaning",
    keywords: ["check up", "checkup", "check-up", "cleaning", "scaling", "polishing", "routine"],
    consultationType: "Check-up and cleaning visit",
    consultationFee: 400,
    estimatedCaseValue: 2500,
    description: "Routine examination, scaling and polishing.",
  }),
  svc({
    id: "svc_wisdom",
    name: "Wisdom tooth consultation",
    keywords: ["wisdom", "wisdom tooth", "third molar"],
    consultationType: "Wisdom tooth consultation",
    consultationFee: 400,
    estimatedCaseValue: 7000,
    description: "Assessment of wisdom teeth with an X-ray.",
  }),
  svc({
    id: "svc_kids",
    name: "Children's dentistry",
    keywords: ["child", "children", "kid", "kids", "son", "daughter", "baby teeth", "pediatric", "paediatric"],
    consultationType: "Children's dental check-up",
    consultationFee: 400,
    estimatedCaseValue: 3000,
    description: "Gentle check-ups and treatment for children.",
  }),
];

const faq = (f: Omit<FAQ, "clinicId" | "active">): FAQ => ({ ...f, clinicId: DEMO_CLINIC_ID, active: true });

export const demoFaqs: FAQ[] = [
  faq({
    id: "faq_hours",
    question: "What are your opening hours?",
    answer: "We're open Monday to Friday 9:30 am to 7:30 pm (closed 1:30 to 2:30 pm for lunch), Saturday 9:30 am to 5 pm and Sunday 10 am to 1 pm.",
    keywords: ["timing", "timings", "hours", "open", "opening", "close", "closing", "sunday", "working hours"],
  }),
  faq({
    id: "faq_location",
    question: "Where is the clinic?",
    answer: "We're on the 2nd floor of Lakeview Arcade, 14th Main Road, HSR Layout Sector 5, Bengaluru. It's a two-minute walk from the Sector 5 bus stop.",
    keywords: ["where", "address", "location", "located", "directions", "how to reach", "map"],
  }),
  faq({
    id: "faq_parking",
    question: "Is there parking?",
    answer: "Yes. There's free parking for cars and two-wheelers in the Lakeview Arcade basement, and a lift to the 2nd floor.",
    keywords: ["parking", "park", "car", "bike", "two wheeler", "two-wheeler"],
  }),
  faq({
    id: "faq_payment",
    question: "What payment methods do you accept?",
    answer: "We accept UPI, debit and credit cards, and cash. For treatments above ₹20,000 we offer no-cost EMI through our finance partner, subject to their approval.",
    keywords: ["payment", "pay", "upi", "card", "cash", "emi", "instalment", "installment", "finance"],
  }),
  faq({
    id: "faq_insurance",
    question: "Do you accept dental insurance?",
    answer: "We don't offer cashless insurance, but we provide itemised invoices and treatment notes you can submit to your insurer for reimbursement.",
    keywords: ["insurance", "insurer", "claim", "cashless", "mediclaim", "reimburse"],
  }),
  faq({
    id: "faq_first_visit",
    question: "What happens at the first consultation?",
    answer: "The dentist examines your teeth, takes X-rays if needed, and explains your options and costs before anything is started. It usually takes about 30 minutes.",
    keywords: ["first visit", "what happens", "consultation include", "how long", "procedure for consultation", "what to expect"],
  }),
  faq({
    id: "faq_bring",
    question: "What should I bring?",
    answer: "Please bring any previous X-rays or dental reports, a list of medicines you take, and arrive 10 minutes early to fill in a short form.",
    keywords: ["bring", "documents", "reports", "x-ray", "xray", "carry"],
  }),
  faq({
    id: "faq_languages",
    question: "Which languages do you speak?",
    answer: "Our team speaks English, Hindi, Kannada, Tamil and Malayalam.",
    keywords: ["language", "hindi", "kannada", "tamil", "malayalam", "telugu", "speak"],
  }),
  faq({
    id: "faq_reschedule",
    question: "Can I reschedule or cancel?",
    answer: "Yes. Just reply here or call us at least 3 hours before your appointment and we'll move it for you. There's no cancellation charge for consultations.",
    keywords: ["reschedule", "cancel", "change my appointment", "postpone", "move my appointment"],
  }),
  faq({
    id: "faq_sterilisation",
    question: "How do you keep instruments clean?",
    answer: "All instruments are sterilised in a Class B autoclave and single-use items are never reused.",
    keywords: ["sterile", "sterilise", "sterilize", "hygiene", "clean instruments", "safe"],
  }),
];

export const demoStaff: StaffUser[] = [
  { id: "usr_meera", clinicId: DEMO_CLINIC_ID, name: "Dr. Meera Raghavan", role: "owner", email: "meera@smilecare-demo.in", initials: "MR" },
  { id: "usr_priya", clinicId: DEMO_CLINIC_ID, name: "Priya Nair", role: "manager", email: "priya@smilecare-demo.in", initials: "PN" },
  { id: "usr_farhan", clinicId: DEMO_CLINIC_ID, name: "Farhan Sheikh", role: "front_desk", email: "farhan@smilecare-demo.in", initials: "FS" },
  { id: "usr_kavya", clinicId: DEMO_CLINIC_ID, name: "Kavya Reddy", role: "front_desk", email: "kavya@smilecare-demo.in", initials: "KR" },
];

/** The signed-in demo user. */
export const DEMO_USER_ID = "usr_priya";
