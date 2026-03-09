import React, { useState, useRef, useEffect } from 'react';

const BACKEND_URL = "http://localhost:3001";
const RASA_URL    = "http://localhost:5005";

// ----------------------------------------------------------------
// 1. FETCH PROFILE FROM YOUR EXPRESS/SQLITE BACKEND
// ----------------------------------------------------------------
async function fetchUserProfile(userId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/profile/${userId}`);
    const data = await response.json();

    if (!data.success) {
      console.error("Profile fetch failed:", data.message);
      return null;
    }

    return data.profile; // returns the raw DB row
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
}

// ----------------------------------------------------------------
// 2. MAP DB COLUMNS → RASA SLOT NAMES
// DB column         → Rasa slot
// age               → user_age
// gender            → user_gender
// caste             → user_caste
// city              → user_city
// state             → user_state
// occupation        → user_occupation
// income_range      → user_income
// education_level   → user_education
// marital_status    → user_marital_status
// disability        → user_disability
// ration_card_type  → user_ration_card
// land_ownership    → user_land_ownership
// ----------------------------------------------------------------
function mapProfileToSlots(profile) {
  return [
    { name: "user_age",            value: profile.age?.toString()       || null },
    { name: "user_gender",         value: profile.gender                || null },
    { name: "user_caste",          value: profile.caste                 || null },
    { name: "user_city",           value: profile.city                  || null },
    { name: "user_state",          value: profile.state                 || null },
    { name: "user_occupation",     value: profile.occupation            || null },
    { name: "user_income",         value: profile.income_range          || null },
    { name: "user_education",      value: profile.education_level       || null },
    { name: "user_marital_status", value: profile.marital_status        || null },
    { name: "user_disability",     value: profile.disability            || null },
    { name: "user_ration_card",    value: profile.ration_card_type      || null },
    { name: "user_land_ownership", value: profile.land_ownership        || null },
  ].filter(slot => slot.value !== null && slot.value !== ""); // skip empty
}

// ----------------------------------------------------------------
// 3. PUSH SLOTS TO RASA TRACKER
// ----------------------------------------------------------------
async function pushSlotsToRasa(conversationId, slots) {
  try {
    const events = slots.map(slot => ({
      event: "slot",
      name:  slot.name,
      value: slot.value
    }));

    const response = await fetch(
      `${RASA_URL}/conversations/${conversationId}/tracker/events`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(events)
      }
    );

    if (!response.ok) {
      console.error("Failed to push slots to Rasa:", response.statusText);
      return false;
    }

    console.log(`✅ Pushed ${slots.length} profile slots to Rasa`);
    return true;

  } catch (error) {
    console.error("Error pushing slots to Rasa:", error);
    return false;
  }
}

// ----------------------------------------------------------------
// 4. SEND MESSAGE TO RASA VIA YOUR BACKEND /api/chat
// ----------------------------------------------------------------
async function sendMessageToRasa(conversationId, message, language = "en") {
  try {
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender:   conversationId,
        message:  message,
        metadata: { language }
      })
    });

    const data = await response.json();

    if (!data.success) {
      console.error("Chat error:", data.message);
      return null;
    }

    return data.messages; // array of Rasa responses

  } catch (error) {
    console.error("Error sending message:", error);
    return null;
  }
}

// ----------------------------------------------------------------
// 5. MAIN FUNCTION — call this on button click
// ----------------------------------------------------------------
export async function handleGetSchemesByProfile({
  userId,           // from your auth state e.g. user.id
  conversationId,   // your Rasa sender ID e.g. user.id or session ID
  language = "en",  // current language slot value
  onResponse,       // callback to display Rasa responses in your chat UI
  onError,          // callback to show error message
  onLoading,        // callback to show/hide loading spinner
}) {

  try {
    onLoading?.(true);

    // STEP 1: Fetch profile from your SQLite backend
    const profile = await fetchUserProfile(userId);

    if (!profile) {
      onError?.("Please complete your profile first before requesting schemes.");
      onLoading?.(false);
      return;
    }

    // STEP 2: Check if profile has at least some data
    const slots = mapProfileToSlots(profile);
    if (slots.length === 0) {
      onError?.("Your profile is empty. Please fill in your details first.");
      onLoading?.(false);
      return;
    }

    console.log("📋 Profile loaded:", profile);
    console.log("🎰 Slots to set:", slots);

    // STEP 3: Push profile slots to Rasa tracker
    const slotsSet = await pushSlotsToRasa(conversationId, slots);
    if (!slotsSet) {
      onError?.("Could not connect to chatbot. Please try again.");
      onLoading?.(false);
      return;
    }

    // STEP 4: Send the trigger message
    const responses = await sendMessageToRasa(
      conversationId,
      "give schemes based on my profile",
      language
    );

    if (!responses) {
      onError?.("Chatbot did not respond. Please try again.");
      onLoading?.(false);
      return;
    }

    // STEP 5: Pass responses back to your chat UI
    onResponse?.(responses);

  } catch (error) {
    console.error("handleGetSchemesByProfile error:", error);
    onError?.("Something went wrong. Please try again.");
  } finally {
    onLoading?.(false);
  }
}

// ----------------------------------------------------------------
// 6. USAGE EXAMPLE in your React component
// ----------------------------------------------------------------

/*
import { handleGetSchemesByProfile } from './profileSchemes';

function ChatComponent() {
  const { user } = useAuth();           // your auth context
  const [loading, setLoading] = useState(false);
  const conversationId = user?.id?.toString() || "anonymous";

  const onProfileSchemesClick = () => {
    handleGetSchemesByProfile({
      userId:         user.id,
      conversationId: conversationId,
      language:       currentLanguage,   // e.g. "en", "ta", "hi"
      onResponse: (messages) => {
        // add messages to your chat UI
        messages.forEach(msg => addMessageToChat(msg));
      },
      onError: (msg) => {
        addMessageToChat({ text: msg, type: "error" });
      },
      onLoading: (isLoading) => {
        setLoading(isLoading);
      }
    });
  };

  return (
    <button
      onClick={onProfileSchemesClick}
      disabled={loading}
      className="profile-schemes-btn"
    >
      {loading ? "Finding schemes..." : "🎯 Give schemes based on my profile"}
    </button>
  );
}
*/
// profileSchemes helpers are defined below as inline functions
// --- TRANSLATION DICTIONARY ---
const translations = {
  en: {
    greeting: "Namaste! 🙏 I am GovMithra. How can I help you today?",
    typing: "Typing...",
    placeholder: "Type your query here...",
    send: "Send",
    categories: "All Services",
    login: "Login",
    signup: "Sign Up",
    logout: "Logout",
    welcome: "Welcome back",
    newUser: "New to GovMithra?",
    email: "Email Address",
    password: "Password",
    name: "Full Name",
    confirmPassword: "Confirm Password",
    alreadyHaveAccount: "Already have an account?",
    completeProfile: "Complete Your Profile",
    profileDesc: "Help us suggest the best schemes for you",
    viewProfile: "View Profile",
    editProfile: "Edit Profile",
    saveChanges: "Save Changes",
    cancel: "Cancel",
    myProfile: "My Profile",
    accountInfo: "Account Information",
    personalDetails: "Personal Details",
    age: "Age",
    gender: "Gender",
    male: "Male",
    female: "Female",
    other: "Other",
    caste: "Caste Category",
    general: "General",
    obc: "OBC",
    sc: "SC",
    st: "ST",
    city: "City",
    state: "State",
    occupation: "Occupation",
    student: "Student",
    employed: "Employed",
    selfEmployed: "Self-Employed",
    unemployed: "Unemployed",
    retired: "Retired",
    incomeRange: "Annual Income Range",
    below2lakh: "Below ₹2 Lakh",
    lakh25: "₹2-5 Lakh",
    lakh510: "₹5-10 Lakh",
    above10lakh: "Above ₹10 Lakh",
    educationLevel: "Education Level",
    belowHigh: "Below High School",
    highSchool: "High School",
    graduate: "Graduate",
    postGraduate: "Post Graduate",
    maritalStatus: "Marital Status",
    single: "Single",
    married: "Married",
    divorced: "Divorced",
    widowed: "Widowed",
    disability: "Disability Status",
    none: "None",
    physical: "Physical",
    visual: "Visual",
    hearing: "Hearing",
    mental: "Mental",
    rationCard: "Ration Card Type",
    noCard: "No Card",
    apl: "APL (Above Poverty Line)",
    bpl: "BPL (Below Poverty Line)",
    antyodaya: "Antyodaya",
    landOwnership: "Land Ownership",
    noLand: "No Land",
    marginal: "Marginal Farmer (<1 hectare)",
    small: "Small Farmer (1-2 hectares)",
    medium: "Medium Farmer (2-4 hectares)",
    large: "Large Farmer (>4 hectares)",
    saveProfile: "Save Profile",
    skipProfile: "Skip for Now",
    backToChat: "Back to Chat",
    selectLanguage: "Select Language",
    categories_list: {
      education: "Education",
      certificates: "Certificates",
      exams: "Exams",
      passports: "Passports",
      agriculture: "Agriculture",
      business: "Business",
      electricity: "Electricity",
      health: "Health",
      housing: "Housing",
      jobs: "Jobs",
      justice: "Justice",
      local: "Local Services",
      lpg: "LPG Services",
      banking: "Banking",
      pension: "Pension",
      tax: "Money & Tax",
      science: "Science & IT",
      sports: "Sports",
      transport: "Transport",
      tourism: "Travel & Tourism",
      water: "Water",
      youth: "Youth Services",
      bus: "MTC Bus Search"
    },
    queries: {
      education: "Scholarships for higher education",
      certificates: "Apply for Birth/Death certificate",
      exams: "Gate exam 2026",
      passports: "Passport renewal documents",
      agriculture: "Crop Schemes",
      business: "MSME registration process",
      electricity: "New electricity connection",
      health: "Give me health schemes",
      housing: "PM Awas Yojana application",
      jobs: "Latest government job openings",
      justice: "Legal aid services",
      local: "Local municipality contacts",
      lpg: "Apply for new LPG connection",
      banking: "Bank related Schemes",
      pension: "Old age pension eligibility",
      tax: "Income tax filing guide",
      science: "Digital India initiatives",
      sports: "Sports scholarships",
      transport: "Driving license procedure",
      tourism: "Tourist places in India",
      water: "Apply for water connection",
      youth: "Skill development programs",
      bus: "Bus from Tambaram to Adyar"
    },
    // UI labels
    save: "☆ Save",
    saved: "⭐ Saved",
    whatsapp: "Share Via Whatsapp",
    copy: "📋 Copy",
    copied: "✅ Copied!",
    explainSimply: "🧠 Explain Simply",
    hideExplanation: "🧠 Hide Explanation",
    simpleExplanation: "🧠 Simple Explanation",
    compare: "🔄 Compare",
    inCompare: "✅ In Compare",
    compareNow: "Compare Now",
    compareTitle: "Comparing 3 Schemes",
    clearClose: "Clear & Close",
    done: "Done",
    savedSchemes: "⭐ Saved",
    savedHeader: "⭐ Saved Schemes",
    clearAll: "🗑️ Clear All",
    noSavedSchemes: "{t.noSavedSchemes}",
    removeScheme: "Remove",
    share: "📤 Share",
    downloadPdf: "Download PDF",
    compareMax: "You can compare up to 3 schemes. Remove one first.",
    followupLabel: "{t.followupLabel}",
        loading: {
      caption1: "Bridging the gap between Citizens and Government...",
      caption2: "Finding the fastest MTC routes for you...",
      caption3: "Simplifying Governance, one query at a time...",
      caption4: "Your digital companion for a smarter India...",
      caption5: "Empowering you with instant scheme access...",
      initialized: "INITIALIZED"
    }
  },
  ta: {
    greeting: "வணக்கம்! 🙏 நான் கவ்மித்ரா. இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
    typing: "தட்டச்சு செய்கிறது...",
    placeholder: "உங்கள் கேள்வியைத் தட்டச்சு செய்க...",
    send: "அனுப்பு",
    categories: "அனைத்து சேவைகள்",
    login: "உள்நுழைய",
    signup: "பதிவு செய்க",
    logout: "வெளியேறு",
    welcome: "மீண்டும் வரவேற்கிறோம்",
    newUser: "கவ்மித்ராவில் புதியவரா?",
    email: "மின்னஞ்சல் முகவரி",
    password: "கடவுச்சொல்",
    name: "முழு பெயர்",
    confirmPassword: "கடவுச்சொல்லை உறுதிப்படுத்தவும்",
    alreadyHaveAccount: "ஏற்கனவே கணக்கு உள்ளதா?",
    completeProfile: "உங்கள் சுயவிவரத்தை நிரப்புங்கள்",
    profileDesc: "சிறந்த திட்டங்களை பரிந்துரைக்க எங்களுக்கு உதவுங்கள்",
    viewProfile: "சுயவிவரத்தைப் பார்க்க",
    editProfile: "சுயவிவரத்தைத் திருத்து",
    saveChanges: "மாற்றங்களைச் சேமி",
    cancel: "ரத்து செய்",
    myProfile: "எனது சுயவிவரம்",
    accountInfo: "கணக்கு தகவல்",
    personalDetails: "தனிப்பட்ட விவரங்கள்",
    age: "வயது",
    gender: "பாலினம்",
    male: "ஆண்",
    female: "பெண்",
    other: "மற்றவை",
    caste: "சாதி வகை",
    general: "பொது",
    obc: "OBC",
    sc: "SC",
    st: "ST",
    city: "நகரம்",
    state: "மாநிலம்",
    occupation: "தொழில்",
    student: "மாணவர்",
    employed: "வேலையில் உள்ளவர்",
    selfEmployed: "சுயதொழில்",
    unemployed: "வேலையில்லாதவர்",
    retired: "ஓய்வு பெற்றவர்",
    incomeRange: "ஆண்டு வருமான வரம்பு",
    below2lakh: "₹2 லட்சத்திற்கு கீழ்",
    lakh25: "₹2-5 லட்சம்",
    lakh510: "₹5-10 லட்சம்",
    above10lakh: "₹10 லட்சத்திற்கு மேல்",
    educationLevel: "கல்வி நிலை",
    belowHigh: "உயர்நிலைக்கு கீழ்",
    highSchool: "உயர்நிலை",
    graduate: "பட்டதாரி",
    postGraduate: "முதுகலை",
    maritalStatus: "திருமண நிலை",
    single: "திருமணமாகாதவர்",
    married: "திருமணமானவர்",
    divorced: "விவாகரத்து",
    widowed: "விதவை",
    disability: "ஊனமுற்ற நிலை",
    none: "இல்லை",
    physical: "உடல்",
    visual: "பார்வை",
    hearing: "செவித்திறன்",
    mental: "மனநல",
    rationCard: "ரேஷன் அட்டை வகை",
    noCard: "அட்டை இல்லை",
    apl: "APL",
    bpl: "BPL",
    antyodaya: "அந்தியோதயா",
    landOwnership: "நில உடைமை",
    noLand: "நிலம் இல்லை",
    marginal: "குறு விவசாயி",
    small: "சிறு விவசாயி",
    medium: "நடுத்தர விவசாயி",
    large: "பெரிய விவசாயி",
    saveProfile: "சுயவிவரத்தைச் சேமி",
    skipProfile: "இப்போதைக்கு தவிர்க்கவும்",
    backToChat: "அரட்டைக்குத் திரும்பு",
    selectLanguage: "மொழியைத் தேர்ந்தெடு",
    categories_list: {
      education: "கல்வி",
      certificates: "சான்றிதழ்கள்",
      exams: "தேர்வுகள்",
      passports: "பாஸ்போர்ட்",
      agriculture: "விவசாயம்",
      business: "வணிகம்",
      electricity: "மின்சாரம்",
      health: "சுகாதாரம்",
      housing: "வீட்டுவசதி",
      jobs: "வேலைகள்",
      justice: "நீதி",
      local: "உள்ளூர் சேவைகள்",
      lpg: "LPG சேவைகள்",
      banking: "வங்கி",
      pension: "ஓய்வூதியம்",
      tax: "பணம் & வரி",
      science: "அறிவியல் & IT",
      sports: "விளையாட்டு",
      transport: "போக்குவரத்து",
      tourism: "சுற்றுலா",
      water: "தண்ணீர்",
      youth: "இளைஞர் சேவைகள்",
      bus: "MTC பேருந்து"
    },
    queries: {
      education: "உயர்கல்விக்கான உதவித்தொகை",
      certificates: "பிறப்பு/இறப்பு சான்றிதழ்",
      exams: "கேட் தேர்வு 2026",
      passports: "பாஸ்போர்ட் புதுப்பித்தல் ஆவணங்கள்",
      agriculture: "பயிர் காப்பீட்டு திட்டங்கள்",
      business: "MSME பதிவு செயல்முறை",
      electricity: "புதிய மின் இணைப்பு",
      health: "சுகாதாரத் திட்டங்களைக் கொடு",
      housing: "PM ஆவாஸ் யோஜனா விண்ணப்பம்",
      jobs: "சமீபத்திய அரசு வேலைகள்",
      justice: "சட்ட உதவி சேவைகள்",
      local: "நகராட்சி தொடர்புகள்",
      lpg: "புதிய எரிவாயு இணைப்பு",
      banking: "வங்கி தொடர்பான திட்டங்கள்",
      pension: "முதியோர் ஓய்வூதிய தகுதி",
      tax: "வருமான வரி தாக்கல்",
      science: "டிஜிட்டல் இந்தியா முயற்சிகள்",
      sports: "விளையாட்டு உதவித்தொகை",
      transport: "ஓட்டுநர் உரிமம் நடைமுறை",
      tourism: "சுற்றுலா இடங்கள்",
      water: "தண்ணீர் இணைப்பு விண்ணப்பம்",
      youth: "திறன் மேம்பாட்டு திட்டங்கள்",
      bus: "தாம்பரம் முதல் அடையாறு பேருந்து"
    },
    // UI labels
    save: "☆ சேமி",
    saved: "⭐ சேமிக்கப்பட்டது",
    whatsapp: "📤 வாட்சாப்",
    copy: "📋 நகலெடு",
    copied: "✅ நகலெடுக்கப்பட்டது!",
    explainSimply: "🧠 எளிதாக விளக்கு",
    hideExplanation: "🧠 விளக்கத்தை மறை",
    simpleExplanation: "🧠 எளிய விளக்கம்",
    compare: "🔄 ஒப்பிடு",
    inCompare: "✅ ஒப்பீட்டில் உள்ளது",
    compareNow: "இப்போது ஒப்பிடு ▶",
    compareTitle: "🔄 திட்ட ஒப்பீடு",
    clearClose: "அழி & மூடு",
    done: "முடிந்தது",
    savedSchemes: "⭐ சேமிக்கப்பட்டவை",
    savedHeader: "⭐ சேமிக்கப்பட்ட திட்டங்கள்",
    clearAll: "🗑️ அனைத்தும் அழி",
    noSavedSchemes: "இன்னும் சேமிக்கப்பட்ட திட்டங்கள் இல்லை. ⭐ ஐ கிளிக் செய்து சேமிக்கவும்!",
    removeScheme: "நீக்கு",
    share: "📤 பகிர்",
    downloadPdf: "📥 PDF பதிவிறக்கு",
    compareMax: "அதிகபட்சம் 3 திட்டங்களை ஒப்பிடலாம். முதலில் ஒன்றை நீக்கவும்.",
    followupLabel: "நீங்கள் கேட்கலாம்:",
        loading: {
      caption1: "மக்களுக்கும் அரசுக்கும் இடைவெளியைக் குறைக்கிறது...",
      caption2: "வேகமான வழிகளைக் கண்டறிகிறது...",
      caption3: "ஆட்சியை எளிமைப்படுத்துகிறது...",
      caption4: "ஸ்மார்ட் இந்தியாவிற்கான டிஜிட்டல் துணை...",
      caption5: "திட்ட அணுகலுடன் உங்களை மேம்படுத்துகிறது...",
      initialized: "துவங்கப்பட்டது"
    }
  },
  hi: {
    greeting: "नमस्ते! 🙏 मैं गोवमित्र हूं। आज मैं आपकी क्या सहायता कर सकता हूं?",
    typing: "टाइप कर रहा है...",
    placeholder: "अपना प्रश्न यहाँ लिखें...",
    send: "भेजें",
    categories: "सभी सेवाएँ",
    login: "लॉगिन करें",
    signup: "साइन अप करें",
    logout: "लॉगआउट",
    welcome: "वापसी पर स्वागत है",
    newUser: "गोवमित्र में नए हैं?",
    email: "ईमेल पता",
    password: "पासवर्ड",
    name: "पूरा नाम",
    confirmPassword: "पासवर्ड की पुष्टि करें",
    alreadyHaveAccount: "पहले से खाता है?",
    completeProfile: "अपनी प्रोफ़ाइल पूर्ण करें",
    profileDesc: "हमें आपके लिए सर्वोत्तम योजनाएं सुझाने में मदद करें",
    viewProfile: "प्रोफ़ाइल देखें",
    editProfile: "प्रोफ़ाइल संपादित करें",
    saveChanges: "परिवर्तन सहेजें",
    cancel: "रद्द करें",
    myProfile: "मेरी प्रोफ़ाइल",
    accountInfo: "खाता जानकारी",
    personalDetails: "व्यक्तिगत विवरण",
    age: "आयु",
    gender: "लिंग",
    male: "पुरुष",
    female: "महिला",
    other: "अन्य",
    caste: "जाति श्रेणी",
    general: "सामान्य",
    obc: "OBC",
    sc: "SC",
    st: "ST",
    city: "शहर",
    state: "राज्य",
    occupation: "व्यवसाय",
    student: "छात्र",
    employed: "नियोजित",
    selfEmployed: "स्व-नियोजित",
    unemployed: "बेरोजगार",
    retired: "सेवानिवृत्त",
    incomeRange: "वार्षिक आय सीमा",
    below2lakh: "₹2 लाख से कम",
    lakh25: "₹2-5 लाख",
    lakh510: "₹5-10 लाख",
    above10lakh: "₹10 लाख से अधिक",
    educationLevel: "शिक्षा स्तर",
    belowHigh: "हाई स्कूल से नीचे",
    highSchool: "हाई स्कूल",
    graduate: "स्नातक",
    postGraduate: "स्नातकोत्तर",
    maritalStatus: "वैवाहिक स्थिति",
    single: "अविवाहित",
    married: "विवाहित",
    divorced: "तलाकशुदा",
    widowed: "विधवा/विधुर",
    disability: "विकलांगता स्थिति",
    none: "कोई नहीं",
    physical: "शारीरिक",
    visual: "दृष्टि",
    hearing: "श्रवण",
    mental: "मानसिक",
    rationCard: "राशन कार्ड प्रकार",
    noCard: "कोई कार्ड नहीं",
    apl: "APL",
    bpl: "BPL",
    antyodaya: "अंत्योदय",
    landOwnership: "भूमि स्वामित्व",
    noLand: "कोई भूमि नहीं",
    marginal: "सीमांत किसान",
    small: "लघु किसान",
    medium: "मध्यम किसान",
    large: "बड़े किसान",
    saveProfile: "प्रोफ़ाइल सहेजें",
    skipProfile: "अभी के लिए छोड़ें",
    backToChat: "चैट पर वापस जाएं",
    selectLanguage: "भाषा चुनें",
    categories_list: {
      education: "शिक्षा",
      certificates: "प्रमाण पत्र",
      exams: "परीक्षा",
      passports: "पासपोर्ट",
      agriculture: "कृषि",
      business: "व्यवसाय",
      electricity: "बिजली",
      health: "स्वास्थ्य",
      housing: "आवास",
      jobs: "नौकरियां",
      justice: "न्याय",
      local: "स्थानीय सेवाएँ",
      lpg: "एलपीजी सेवाएँ",
      banking: "बैंकिंग",
      pension: "पेंशन",
      tax: "पैसा और कर",
      science: "विज्ञान और आईटी",
      sports: "खेल",
      transport: "परिवहन",
      tourism: "पर्यटन",
      water: "पानी",
      youth: "युवा सेवाएँ",
      bus: "बस खोजें"
    },
    queries: {
      education: "उच्च शिक्षा के लिए छात्रवृत्ति",
      certificates: "जन्म/मृत्यु प्रमाण पत्र के लिए आवेदन",
      exams: "गेट परीक्षा 2026",
      passports: "पासपोर्ट नवीनीकरण दस्तावेज",
      agriculture: "फसल बीमा योजनाएं",
      business: "एमएसएमई पंजीकरण प्रक्रिया",
      electricity: "नया बिजली कनेक्शन",
      health: "मुझे स्वास्थ्य संबंधी योजनाएँ बताइए",
      housing: "पीएम आवास योजना आवेदन",
      jobs: "नवीनतम सरकारी रिक्तियां",
      justice: "कानूनी सहायता सेवाएँ",
      local: "स्थानीय नगर पालिका संपर्क",
      lpg: "नए एलपीजी कनेक्शन के लिए आवेदन",
      banking: "मुझे बैंकिंग योजनाएँ बताइए",
      pension: "वृद्धावस्था पेंशन पात्रता",
      tax: "आयकर फाइलिंग गाइड",
      science: "डिजिटल इंडिया पहल",
      sports: "खेल छात्रवृत्ति",
      transport: "ड्राइविंग लाइसेंस प्रक्रिया",
      tourism: "भारत में पर्यटन स्थल",
      water: "पानी के कनेक्शन के लिए आवेदन",
      youth: "कौशल विकास कार्यक्रम",
      bus: "तांबरम से अडयार तक बस"
    },
    // UI labels
    save: "☆ सेव करें",
    saved: "⭐ सेव हुआ",
    whatsapp: "📤 व्हाट्सएप",
    copy: "📋 कॉपी करें",
    copied: "✅ कॉपी हो गया!",
    explainSimply: "🧠 सरल भाषा में समझाएं",
    hideExplanation: "🧠 विवरण छुपाएं",
    simpleExplanation: "🧠 सरल विवरण",
    compare: "🔄 तुलना करें",
    inCompare: "✅ तुलना में जोड़ा",
    compareNow: "अभी तुलना करें ▶",
    compareTitle: "🔄 योजना तुलना",
    clearClose: "साफ करें & बंद करें",
    done: "हो गया",
    savedSchemes: "⭐ सेव किए गए",
    savedHeader: "⭐ सेव की गई योजनाएं",
    clearAll: "🗑️ सब हटाएं",
    noSavedSchemes: "अभी तक कोई योजना सेव नहीं है। किसी भी योजना कार्ड पर ⭐ क्लिक करें!",
    removeScheme: "हटाएं",
    share: "📤 शेयर",
    downloadPdf: "📥 PDF डाउनलोड करें",
    compareMax: "आप अधिकतम 3 योजनाओं की तुलना कर सकते हैं। पहले एक हटाएं।",
    followupLabel: "आप यह भी पूछ सकते हैं:",
        loading: {
      caption1: "नागरिकों और सरकार के बीच की दूरी कम करना...",
      caption2: "सबसे तेज़ बस मार्ग ढूँढना...",
      caption3: "शासन को सरल बनाना...",
      caption4: "स्मार्ट इंडिया के लिए डिजिटल साथी...",
      caption5: "तत्काल सेवा तक पहुँच...",
      initialized: "प्रारंभ किया गया"
    }
  },
  te: {
    greeting: "నమస్కారం! 🙏 నేను గవ్‌మిత్ర. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?",
    typing: "టైప్ చేస్తోంది...",
    placeholder: "మీ ప్రశ్నను ఇక్కడ టైప్ చేయండి...",
    send: "పంపండి",
    categories: "అన్ని సేవలు",
    login: "లాగిన్",
    signup: "సైన్ అప్",
    logout: "లాగౌట్",
    welcome: "తిరిగి స్వాగతం",
    newUser: "గవ్‌మిత్రలో కొత్తవారా?",
    email: "ఇమెయిల్ చిరునామా",
    password: "పాస్‌వర్డ్",
    name: "పూర్తి పేరు",
    confirmPassword: "పాస్‌వర్డ్‌ను నిర్ధారించండి",
    alreadyHaveAccount: "ఇప్పటికే ఖాతా ఉందా?",
    completeProfile: "మీ ప్రొఫైల్‌ను పూర్తి చేయండి",
    profileDesc: "మీకు ఉత్తమ పథకాలను సూచించడంలో మాకు సహాయపడండి",
    viewProfile: "ప్రొఫైల్ చూడండి",
    editProfile: "ప్రొఫైల్ సవరించండి",
    saveChanges: "మార్పులను సేవ్ చేయండి",
    cancel: "రద్దు చేయండి",
    myProfile: "నా ప్రొఫైల్",
    accountInfo: "ఖాతా సమాచారం",
    personalDetails: "వ్యక్తిగత వివరాలు",
    age: "వయస్సు",
    gender: "లింగం",
    male: "పురుషుడు",
    female: "స్త్రీ",
    other: "ఇతర",
    caste: "కుల వర్గం",
    general: "సాధారణ",
    obc: "OBC",
    sc: "SC",
    st: "ST",
    city: "నగరం",
    state: "రాష్ట్రం",
    occupation: "వృత్తి",
    student: "విద్యార్థి",
    employed: "ఉద్యోగంలో",
    selfEmployed: "స్వయం ఉద్యోగి",
    unemployed: "నిరుద్యోగి",
    retired: "పదవీ విరమణ",
    incomeRange: "వార్షిక ఆదాయ పరిధి",
    below2lakh: "₹2 లక్షల కంటే తక్కువ",
    lakh25: "₹2-5 లక్షలు",
    lakh510: "₹5-10 లక్షలు",
    above10lakh: "₹10 లక్షల కంటే ఎక్కువ",
    educationLevel: "విద్యా స్థాయి",
    belowHigh: "హైస్కూల్ కంటే తక్కువ",
    highSchool: "హైస్కూల్",
    graduate: "గ్రాడ్యుయేట్",
    postGraduate: "పోస్ట్ గ్రాడ్యుయేట్",
    maritalStatus: "వైవాహిక స్థితి",
    single: "అవివాహితుడు",
    married: "వివాహితుడు",
    divorced: "విడాకులు",
    widowed: "వితంతువు",
    disability: "వైకల్య స్థితి",
    none: "ఏదీ లేదు",
    physical: "శారీరక",
    visual: "దృష్టి",
    hearing: "వినికిడి",
    mental: "మానసిక",
    rationCard: "రేషన్ కార్డు రకం",
    noCard: "కార్డు లేదు",
    apl: "APL",
    bpl: "BPL",
    antyodaya: "అంత్యోదయ",
    landOwnership: "భూ యాజమాన్యం",
    noLand: "భూమి లేదు",
    marginal: "చిన్న రైతు",
    small: "చిన్న రైతు",
    medium: "మధ్యతరగతి రైతు",
    large: "పెద్ద రైతు",
    saveProfile: "ప్రొఫైల్ సేవ్ చేయండి",
    skipProfile: "ఇప్పుడు దాటవేయండి",
    backToChat: "చాట్‌కు తిరిగి వెళ్ళండి",
    selectLanguage: "భాషను ఎంచుకోండి",
    categories_list: {
      education: "విద్య",
      certificates: "ధృవీకరణ పత్రాలు",
      exams: "పరీక్షలు",
      passports: "పాస్‌పోర్ట్",
      agriculture: "వ్యవసాయం",
      business: "వ్యాపారం",
      electricity: "విద్యుత్",
      health: "ఆరోగ్యం",
      housing: "గృహనిర్మాణం",
      jobs: "ఉద్యోగాలు",
      justice: "న్యాయం",
      local: "స్థానిక సేవలు",
      lpg: "LPG సేవలు",
      banking: "బ్యాంకింగ్",
      pension: "పెన్షన్",
      tax: "డబ్బు & పన్ను",
      science: "సైన్స్ & IT",
      sports: "క్రీడలు",
      transport: "రవాణా",
      tourism: "పర్యాటకం",
      water: "నీరు",
      youth: "యువజన సేవలు",
      bus: "బస్ శోధన"
    },
    queries: {
      education: "ఉన్నత విద్య కోసం స్కాలర్‌షిప్‌లు",
      certificates: "జననం/మరణ ధృవీకరణ పత్రం కోసం దరఖాస్తు",
      exams: "గేట్ పరీక్ష 2026",
      passports: "పాస్‌పోర్ట్ పునరుద్ధరణ పత్రాలు",
      agriculture: "పంట బీమా పథకాలు",
      business: "MSME నమోదు ప్రక్రియ",
      electricity: "కొత్త విద్యుత్ కనెక్షన్",
      health: "ఆరోగ్య పథకాలు",
      housing: "PM ఆవాస్ యోజనా దరఖాస్తు",
      jobs: "తాజా ప్రభుత్వ ఉద్యోగ అవకాశాలు",
      justice: "న్యాయ సహాయ సేవలు",
      local: "స్థానిక మునిసిపాలిటీ పరిచయాలు",
      lpg: "కొత్త LPG కనెక్షన్ కోసం దరఖాస్తు",
      banking: "బ్యాంకు సంబంధిత పథకాలు",
      pension: "వృద్ధాప్య పెన్షన్ అర్హత",
      tax: "ఆదాయపు పన్ను దాఖలు గైడ్",
      science: "డిజిటల్ ఇండియా కార్యక్రమాలు",
      sports: "క్రీడా స్కాలర్‌షిప్‌లు",
      transport: "డ్రైవింగ్ లైసెన్స్ విధానం",
      tourism: "భారతదేశంలో పర్యాటక ప్రదేశాలు",
      water: "నీటి కనెక్షన్ కోసం దరఖాస్తు",
      youth: "నైపుణ్య అభివృద్ధి కార్యక్రమాలు",
      bus: "తాంబరం నుండి అడయార్ బస్"
    },
    // UI labels
    save: "☆ సేవ్ చేయి",
    saved: "⭐ సేవ్ అయింది",
    whatsapp: "📤 వాట్సాప్",
    copy: "📋 కాపీ చేయి",
    copied: "✅ కాపీ అయింది!",
    explainSimply: "🧠 సరళంగా వివరించు",
    hideExplanation: "🧠 వివరణ దాచు",
    simpleExplanation: "🧠 సరళ వివరణ",
    compare: "🔄 పోల్చు",
    inCompare: "✅ పోలికలో ఉంది",
    compareNow: "ఇప్పుడు పోల్చు ▶",
    compareTitle: "🔄 పథకాల పోలిక",
    clearClose: "తొలగించు & మూసు",
    done: "పూర్తయింది",
    savedSchemes: "⭐ సేవ్ చేసినవి",
    savedHeader: "⭐ సేవ్ చేసిన పథకాలు",
    clearAll: "🗑️ అన్నీ తొలగించు",
    noSavedSchemes: "ఇంకా సేవ్ చేసిన పథకాలు లేవు. ⭐ క్లిక్ చేసి సేవ్ చేయండి!",
    removeScheme: "తొలగించు",
    share: "📤 షేర్",
    downloadPdf: "📥 PDF డౌన్‌లోడ్",
    compareMax: "మీరు గరిష్టంగా 3 పథకాలను పోల్చవచ్చు. ముందు ఒకటి తీసివేయండి.",
    followupLabel: "మీరు ఇవి కూడా అడగవచ్చు:",
        loading: {
      caption1: "పౌరులు మరియు ప్రభుత్వం మధ్య అంతరాన్ని తగ్గిస్తోంది...",
      caption2: "వేగవంతమైన మార్గాలను కనుగొంటోంది...",
      caption3: "పరిపాలనను సులభతరం చేస్తోంది...",
      caption4: "స్మార్ట్ ఇండియా కోసం డిజిటల్ సహచరుడు...",
      caption5: "తక్షణ పథక ప్రాప్యతతో మిమ్మల్ని శక్తివంతం చేస్తోంది...",
      initialized: "ప్రారంభించబడింది"
    }
  },
  ml: {
    greeting: "നമസ്കാരം! 🙏 ഞാൻ ഗവ്‌മിത്രയാണ്. ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?",
    typing: "ടൈപ്പ് ചെയ്യുന്നു...",
    placeholder: "നിങ്ങളുടെ ചോദ്യം ഇവിടെ ടൈപ്പ് ചെയ്യുക...",
    send: "അയയ്ക്കുക",
    categories: "എല്ലാ സേവനങ്ങളും",
    login: "ലോഗിൻ",
    signup: "സൈൻ അപ്പ്",
    logout: "ലോഗൗട്ട്",
    welcome: "തിരിച്ചു വരവ് സ്വാഗതം",
    newUser: "ഗവ്‌മിത്രയിൽ പുതിയതാണോ?",
    email: "ഇമെയിൽ വിലാസം",
    password: "പാസ്‌വേഡ്",
    name: "മുഴുവൻ പേര്",
    confirmPassword: "പാസ്‌വേഡ് സ്ഥിരീകരിക്കുക",
    alreadyHaveAccount: "ഇതിനകം അക്കൗണ്ട് ഉണ്ടോ?",
    completeProfile: "നിങ്ങളുടെ പ്രൊഫൈൽ പൂർത്തിയാക്കുക",
    profileDesc: "മികച്ച പദ്ധതികൾ നിർദ്ദേശിക്കാൻ ഞങ്ങളെ സഹായിക്കുക",
    viewProfile: "പ്രൊഫൈൽ കാണുക",
    editProfile: "പ്രൊഫൈൽ എഡിറ്റ് ചെയ്യുക",
    saveChanges: "മാറ്റങ്ങൾ സേവ് ചെയ്യുക",
    cancel: "റദ്ദാക്കുക",
    myProfile: "എന്റെ പ്രൊഫൈൽ",
    accountInfo: "അക്കൗണ്ട് വിവരങ്ങൾ",
    personalDetails: "വ്യക്തിഗത വിശദാംശങ്ങൾ",
    age: "പ്രായം",
    gender: "ലിംഗം",
    male: "പുരുഷൻ",
    female: "സ്ത്രീ",
    other: "മറ്റുള്ളവ",
    caste: "ജാതി വിഭാഗം",
    general: "ജനറൽ",
    obc: "OBC",
    sc: "SC",
    st: "ST",
    city: "നഗരം",
    state: "സംസ്ഥാനം",
    occupation: "തൊഴിൽ",
    student: "വിദ്യാർത്ഥി",
    employed: "ജോലിയിൽ",
    selfEmployed: "സ്വയം തൊഴിൽ",
    unemployed: "തൊഴിൽരഹിതം",
    retired: "വിരമിച്ചവർ",
    incomeRange: "വാർഷിക വരുമാന പരിധി",
    below2lakh: "₹2 ലക്ഷത്തിൽ താഴെ",
    lakh25: "₹2-5 ലക്ഷം",
    lakh510: "₹5-10 ലക്ഷം",
    above10lakh: "₹10 ലക്ഷത്തിൽ കൂടുതൽ",
    educationLevel: "വിദ്യാഭ്യാസ നിലവാരം",
    belowHigh: "ഹൈസ്കൂളിന് താഴെ",
    highSchool: "ഹൈസ്കൂൾ",
    graduate: "ബിരുദം",
    postGraduate: "ബിരുദാനന്തര",
    maritalStatus: "വൈവാഹിക നില",
    single: "അവിവാഹിതൻ",
    married: "വിവാഹിതൻ",
    divorced: "വിവാഹമോചനം",
    widowed: "വിധവ",
    disability: "വൈകല്യ നില",
    none: "ഒന്നുമില്ല",
    physical: "ശാരീരികം",
    visual: "കാഴ്ച",
    hearing: "കേൾവി",
    mental: "മാനസികം",
    rationCard: "റേഷൻ കാർഡ് തരം",
    noCard: "കാർഡില്ല",
    apl: "APL",
    bpl: "BPL",
    antyodaya: "അന്ത്യോദയ",
    landOwnership: "ഭൂമി ഉടമസ്ഥത",
    noLand: "ഭൂമി ഇല്ല",
    marginal: "ചെറു കർഷകൻ",
    small: "ചെറിയ കർഷകൻ",
    medium: "ഇടത്തരം കർഷകൻ",
    large: "വലിയ കർഷകൻ",
    saveProfile: "പ്രൊഫൈൽ സേവ് ചെയ്യുക",
    skipProfile: "ഇപ്പോൾ ഒഴിവാക്കുക",
    backToChat: "ചാറ്റിലേക്ക് മടങ്ങുക",
    selectLanguage: "ഭാഷ തിരഞ്ഞെടുക്കുക",
    categories_list: {
      education: "വിദ്യാഭ്യാസം",
      certificates: "സർട്ടിഫിക്കറ്റുകൾ",
      exams: "പരീക്ഷകൾ",
      passports: "പാസ്‌പോർട്ട്",
      agriculture: "കൃഷി",
      business: "ബിസിനസ്",
      electricity: "വൈദ്യുതി",
      health: "ആരോഗ്യം",
      housing: "ഭവന നിർമ്മാണം",
      jobs: "ജോലികൾ",
      justice: "നീതി",
      local: "പ്രാദേശിക സേവനങ്ങൾ",
      lpg: "LPG സേവനങ്ങൾ",
      banking: "ബാങ്കിംഗ്",
      pension: "പെൻഷൻ",
      tax: "പണവും നികുതിയും",
      science: "സയൻസും ITയും",
      sports: "കായികം",
      transport: "ഗതാഗതം",
      tourism: "ടൂറിസം",
      water: "വെള്ളം",
      youth: "യുവജന സേവനങ്ങൾ",
      bus: "ബസ് തിരയൽ"
    },
    queries: {
      education: "ഉന്നത വിദ്യാഭ്യാസത്തിന് സ്കോളർഷിപ്പുകൾ",
      certificates: "ജനന/മരണ സർട്ടിഫിക്കറ്റിനായി അപേക്ഷിക്കുക",
      exams: "2026 ലെ ഗേറ്റ് പരീക്ഷ |",
      passports: "പാസ്‌പോർട്ട് പുതുക്കൽ രേഖകൾ",
      agriculture: "വിള ഇൻഷുറൻസ് പദ്ധതികൾ",
      business: "MSME രജിസ്ട്രേഷൻ പ്രക്രിയ",
      electricity: "പുതിയ വൈദ്യുതി കണക്ഷൻ",
      health: "ആരോഗ്യ പദ്ധതികൾ നൽകുക",
      housing: "PM ആവാസ് യോജന അപേക്ഷ",
      jobs: "ഏറ്റവും പുതിയ സർക്കാർ ജോലി അവസരങ്ങൾ",
      justice: "നിയമസഹായ സേവനങ്ങൾ",
      local: "പ്രാദേശിക മുനിസിപ്പാലിറ്റി കോൺടാക്റ്റുകൾ",
      lpg: "പുതിയ LPG കണക്ഷനായി അപേക്ഷിക്കുക",
      banking: "ബാങ്കിംഗ് പദ്ധതികൾ നൽകുക",
      pension: "വയോജന പെൻഷൻ യോഗ്യത",
      tax: "ആദായനികുതി ഫയലിംഗ് ഗൈഡ്",
      science: "ഡിജിറ്റൽ ഇന്ത്യ സംരംഭങ്ങൾ",
      sports: "കായിക സ്കോളർഷിപ്പുകൾ",
      transport: "ഡ്രൈവിംഗ് ലൈസൻസ് നടപടിക്രമം",
      tourism: "ഇന്ത്യയിലെ ടൂറിസ്റ്റ് സ്ഥലങ്ങൾ",
      water: "ജല കണക്ഷനായി അപേക്ഷിക്കുക",
      youth: "വൈദഗ്ധ്യ വികസന പരിപാടികൾ",
      bus: "താംബരം മുതൽ അടയാർ വരെ ബസ്"
    },
    // UI labels
    save: "☆ സേവ് ചെയ്യുക",
    saved: "⭐ സേവ് ചെയ്തു",
    whatsapp: "📤 വാട്സ്ആപ്പ്",
    copy: "📋 പകർത്തുക",
    copied: "✅ പകർത്തി!",
    explainSimply: "🧠 ലളിതമായി വിശദീകരിക്കുക",
    hideExplanation: "🧠 വിശദീകരണം മറയ്ക്കുക",
    simpleExplanation: "🧠 ലളിത വിശദീകരണം",
    compare: "🔄 താരതമ്യം ചെയ്യുക",
    inCompare: "✅ താരതമ്യത്തിൽ ഉണ്ട്",
    compareNow: "ഇപ്പോൾ താരതമ്യം ▶",
    compareTitle: "🔄 പദ്ധതി താരതമ്യം",
    clearClose: "മായ്ക്കുക & അടയ്ക്കുക",
    done: "പൂർത്തിയായി",
    savedSchemes: "⭐ സേവ് ചെയ്തവ",
    savedHeader: "⭐ സേവ് ചെയ്ത പദ്ധതികൾ",
    clearAll: "🗑️ എല്ലാം മായ്ക്കുക",
    noSavedSchemes: "ഇതുവരെ ഒന്നും സേവ് ചെയ്തിട്ടില്ല. ⭐ ക്ലിക്ക് ചെയ്ത് സേവ് ചെയ്യൂ!",
    removeScheme: "നീക്കം ചെയ്യുക",
    share: "📤 ഷെയർ",
    downloadPdf: "📥 PDF ഡൗൺലോഡ്",
    compareMax: "പരമാവധി 3 പദ്ധതികൾ താരതമ്യം ചെയ്യാം. ആദ്യം ഒന്ന് നീക്കം ചെയ്യുക.",
    followupLabel: "നിങ്ങൾ ഇതും ചോദിക്കാം:",
        loading: {
      caption1: "പൗരന്മാരും സർക്കാരും തമ്മിലുള്ള അന്തരം കുറയ്ക്കുന്നു...",
      caption2: "വേഗമേറിയ മാർഗ്ഗങ്ങൾ കണ്ടെത്തുന്നു...",
      caption3: "ഭരണം ലളിതമാക്കുന്നു...",
      caption4: "സ്മാർട്ട് ഇന്ത്യയ്ക്കുള്ള ഡിജിറ്റൽ സഹചാരി...",
      caption5: "തൽക്ഷണ പദ്ധതി ലഭ്യതയോടെ നിങ്ങളെ ശക്തമാക്കുന്നു...",
      initialized: "ആരംഭിച്ചു"
    }
  },
  kn: {
    greeting: "ನಮಸ್ಕಾರ! 🙏 ನಾನು ಗವ್‌ಮಿತ್ರ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
    typing: "ಟೈಪ್ ಮಾಡುತ್ತಿದೆ...",
    placeholder: "ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ...",
    send: "ಕಳುಹಿಸಿ",
    categories: "ಎಲ್ಲಾ ಸೇವೆಗಳು",
    login: "ಲಾಗಿನ್",
    signup: "ಸೈನ್ ಅಪ್",
    logout: "ಲಾಗೌಟ್",
    welcome: "ಮರಳಿ ಸ್ವಾಗತ",
    newUser: "ಗವ್‌ಮಿತ್ರಕ್ಕೆ ಹೊಸಬರೇ?",
    email: "ಇಮೇಲ್ ವಿಳಾಸ",
    password: "ಪಾಸ್‌ವರ್ಡ್",
    name: "ಪೂರ್ಣ ಹೆಸರು",
    confirmPassword: "ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ",
    alreadyHaveAccount: "ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ?",
    completeProfile: "ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ",
    profileDesc: "ಉತ್ತಮ ಯೋಜನೆಗಳನ್ನು ಸೂಚಿಸಲು ನಮಗೆ ಸಹಾಯ ಮಾಡಿ",
    viewProfile: "ಪ್ರೊಫೈಲ್ ವೀಕ್ಷಿಸಿ",
    editProfile: "ಪ್ರೊಫೈಲ್ ಸಂಪಾದಿಸಿ",
    saveChanges: "ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ",
    cancel: "ರದ್ದುಮಾಡಿ",
    myProfile: "ನನ್ನ ಪ್ರೊಫೈಲ್",
    accountInfo: "ಖಾತೆಯ ಮಾಹಿತಿ",
    personalDetails: "ವೈಯಕ್ತಿಕ ವಿವರಗಳು",
    age: "ವಯಸ್ಸು",
    gender: "ಲಿಂಗ",
    male: "ಪುರುಷ",
    female: "ಮಹಿಳೆ",
    other: "ಇತರೆ",
    caste: "ಜಾತಿ ವರ್ಗ",
    general: "ಸಾಮಾನ್ಯ",
    obc: "OBC",
    sc: "SC",
    st: "ST",
    city: "ನಗರ",
    state: "ರಾಜ್ಯ",
    occupation: "ಉದ್ಯೋಗ",
    student: "ವಿದ್ಯಾರ್ಥಿ",
    employed: "ಉದ್ಯೋಗಿ",
    selfEmployed: "ಸ್ವಯಂ ಉದ್ಯೋಗ",
    unemployed: "ನಿರುದ್ಯೋಗಿ",
    retired: "ನಿವೃತ್ತ",
    incomeRange: "ವಾರ್ಷಿಕ ಆದಾಯ ವ್ಯಾಪ್ತಿ",
    below2lakh: "₹2 ಲಕ್ಷಕ್ಕಿಂತ ಕಡಿಮೆ",
    lakh25: "₹2-5 ಲಕ್ಷ",
    lakh510: "₹5-10 ಲಕ್ಷ",
    above10lakh: "₹10 ಲಕ್ಷಕ್ಕಿಂತ ಹೆಚ್ಚು",
    educationLevel: "ಶಿಕ್ಷಣ ಮಟ್ಟ",
    belowHigh: "ಹೈಸ್ಕೂಲ್‌ಗಿಂತ ಕಡಿಮೆ",
    highSchool: "ಹೈಸ್ಕೂಲ್",
    graduate: "ಪದವೀಧರ",
    postGraduate: "ಸ್ನಾತಕೋತ್ತರ",
    maritalStatus: "ವೈವಾಹಿಕ ಸ್ಥಿತಿ",
    single: "ಅವಿವಾಹಿತ",
    married: "ವಿವಾಹಿತ",
    divorced: "ವಿಚ್ಛೇದಿತ",
    widowed: "ವಿಧವೆ",
    disability: "ವಿಕಲಾಂಗತೆಯ ಸ್ಥಿತಿ",
    none: "ಯಾವುದೂ ಇಲ್ಲ",
    physical: "ದೈಹಿಕ",
    visual: "ದೃಷ್ಟಿ",
    hearing: "ಶ್ರವಣ",
    mental: "ಮಾನಸಿಕ",
    rationCard: "ರೇಷನ್ ಕಾರ್ಡ್ ಪ್ರಕಾರ",
    noCard: "ಕಾರ್ಡ್ ಇಲ್ಲ",
    apl: "APL",
    bpl: "BPL",
    antyodaya: "ಅಂತ್ಯೋದಯ",
    landOwnership: "ಭೂ ಮಾಲೀಕತ್ವ",
    noLand: "ಭೂಮಿ ಇಲ್ಲ",
    marginal: "ಕನಿಷ್ಠ ರೈತ",
    small: "ಸಣ್ಣ ರೈತ",
    medium: "ಮಧ್ಯಮ ರೈತ",
    large: "ದೊಡ್ಡ ರೈತ",
    saveProfile: "ಪ್ರೊಫೈಲ್ ಉಳಿಸಿ",
    skipProfile: "ಈಗ ಬಿಟ್ಟುಬಿಡಿ",
    backToChat: "ಚಾಟ್‌ಗೆ ಹಿಂತಿರುಗಿ",
    selectLanguage: "ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ",
    categories_list: {
      education: "ಶಿಕ್ಷಣ",
      certificates: "ಪ್ರಮಾಣಪತ್ರಗಳು",
      exams: "ಪರೀಕ್ಷೆಗಳು",
      passports: "ಪಾಸ್‌ಪೋರ್ಟ್",
      agriculture: "ಕೃಷಿ",
      business: "ವ್ಯಾಪಾರ",
      electricity: "ವಿದ್ಯುತ್",
      health: "ಆರೋಗ್ಯ",
      housing: "ವಸತಿ",
      jobs: "ಉದ್ಯೋಗಗಳು",
      justice: "ನ್ಯಾಯ",
      local: "ಸ್ಥಳೀಯ ಸೇವೆಗಳು",
      lpg: "LPG ಸೇವೆಗಳು",
      banking: "ಬ್ಯಾಂಕಿಂಗ್",
      pension: "ಪಿಂಚಣಿ",
      tax: "ಹಣ ಮತ್ತು ತೆರಿಗೆ",
      science: "ವಿಜ್ಞಾನ & IT",
      sports: "ಕ್ರೀಡೆ",
      transport: "ಸಾರಿಗೆ",
      tourism: "ಪ್ರವಾಸೋದ್ಯಮ",
      water: "ನೀರು",
      youth: "ಯುವ ಸೇವೆಗಳು",
      bus: "ಬಸ್ ಹುಡುಕಾಟ"
    },
    queries: {
      education: "ಉನ್ನತ ಶಿಕ್ಷಣಕ್ಕಾಗಿ ವಿದ್ಯಾರ್ಥಿವೇತನಗಳು",
      certificates: "ಜನನ/ಮರಣ ಪ್ರಮಾಣಪತ್ರಕ್ಕಾಗಿ ಅರ್ಜಿ",
      exams: "ಗೇಟ್ ಪರೀಕ್ಷೆ 2026",
      passports: "ಪಾಸ್‌ಪೋರ್ಟ್ ನವೀಕರಣ ದಾಖಲೆಗಳು",
      agriculture: "ಬೆಳೆ ವಿಮಾ ಯೋಜನೆಗಳು",
      business: "MSME ನೋಂದಣಿ ಪ್ರಕ್ರಿಯೆ",
      electricity: "ಹೊಸ ವಿದ್ಯುತ್ ಸಂಪರ್ಕ",
      health: "ಆರೋಗ್ಯ ಯೋಜನೆಗಳನ್ನು ನೀಡಿ",
      housing: "PM ಆವಾಸ್ ಯೋಜನಾ ಅರ್ಜಿ",
      jobs: "ಇತ್ತೀಚಿನ ಸರ್ಕಾರಿ ಉದ್ಯೋಗಾವಕಾಶಗಳು",
      justice: "ಕಾನೂನು ಸಹಾಯ ಸೇವೆಗಳು",
      local: "ಸ್ಥಳೀಯ ಪುರಸಭೆ ಸಂಪರ್ಕಗಳು",
      lpg: "ಹೊಸ LPG ಸಂಪರ್ಕಕ್ಕಾಗಿ ಅರ್ಜಿ",
      banking: "ಬ್ಯಾಂಕಿಂಗ್ ಯೋಜನೆಗಳನ್ನು ನೀಡಿ",
      pension: "ವೃದ್ಧಾಪ್ಯ ಪಿಂಚಣಿ ಅರ್ಹತೆ",
      tax: "ಆದಾಯ ತೆರಿಗೆ ಸಲ್ಲಿಕೆ ಮಾರ್ಗದರ್ಶಿ",
      science: "ಡಿಜಿಟಲ್ ಇಂಡಿಯಾ ಉಪಕ್ರಮಗಳು",
      sports: "ಕ್ರೀಡಾ ವಿದ್ಯಾರ್ಥಿವೇತನಗಳು",
      transport: "ಚಾಲನಾ ಪರವಾನಗಿ ವಿಧಾನ",
      tourism: "ಭಾರತದಲ್ಲಿ ಪ್ರವಾಸಿ ಸ್ಥಳಗಳು",
      water: "ನೀರಿನ ಸಂಪರ್ಕಕ್ಕಾಗಿ ಅರ್ಜಿ",
      youth: "ಕೌಶಲ್ಯ ಅಭಿವೃದ್ಧಿ ಕಾರ್ಯಕ್ರಮಗಳು",
      bus: "ತಾಂಬರಂ ನಿಂದ ಅಡಯಾರ್ ಬಸ್"
    },
    // UI labels
    save: "☆ ಉಳಿಸಿ",
    saved: "⭐ ಉಳಿಸಲಾಗಿದೆ",
    whatsapp: "📤 ವಾಟ್ಸಾಪ್",
    copy: "📋 ನಕಲಿಸಿ",
    copied: "✅ ನಕಲಿಸಲಾಗಿದೆ!",
    explainSimply: "🧠 ಸರಳವಾಗಿ ವಿವರಿಸಿ",
    hideExplanation: "🧠 ವಿವರಣೆ ಮರೆಮಾಡಿ",
    simpleExplanation: "🧠 ಸರಳ ವಿವರಣೆ",
    compare: "🔄 ಹೋಲಿಕೆ",
    inCompare: "✅ ಹೋಲಿಕೆಯಲ್ಲಿದೆ",
    compareNow: "ಈಗ ಹೋಲಿಸಿ ▶",
    compareTitle: "🔄 ಯೋಜನೆ ಹೋಲಿಕೆ",
    clearClose: "ತೆರವು & ಮುಚ್ಚಿ",
    done: "ಮುಗಿದಿದೆ",
    savedSchemes: "⭐ ಉಳಿಸಿದವು",
    savedHeader: "⭐ ಉಳಿಸಿದ ಯೋಜನೆಗಳು",
    clearAll: "🗑️ ಎಲ್ಲ ತೆರವು",
    noSavedSchemes: "ಇನ್ನೂ ಯಾವ ಯೋಜನೆಯೂ ಉಳಿಸಿಲ್ಲ. ⭐ ಕ್ಲಿಕ್ ಮಾಡಿ ಉಳಿಸಿ!",
    removeScheme: "ತೆಗೆದುಹಾಕಿ",
    share: "📤 ಶೇರ್",
    downloadPdf: "📥 PDF ಡೌನ್‌ಲೋಡ್",
    compareMax: "ಗರಿಷ್ಠ 3 ಯೋಜನೆಗಳನ್ನು ಹೋಲಿಸಬಹುದು. ಮೊದಲು ಒಂದನ್ನು ತೆಗೆದುಹಾಕಿ.",
    followupLabel: "ನೀವು ಇದನ್ನೂ ಕೇಳಬಹುದು:",
        loading: {
      caption1: "ನಾಗರಿಕರು ಮತ್ತು ಸರ್ಕಾರದ ನಡುವಿನ ಅಂತರವನ್ನು ಕಡಿಮೆ ಮಾಡುತ್ತಿದೆ...",
      caption2: "ವೇಗವಾದ ಮಾರ್ಗಗಳನ್ನು ಹುಡುಕುತ್ತಿದೆ...",
      caption3: "ಆಡಳಿತವನ್ನು ಸರಳೀಕರಿಸುತ್ತಿದೆ...",
      caption4: "ಸ್ಮಾರ್ಟ್ ಇಂಡಿಯಾಕ್ಕಾಗಿ ಡಿಜಿಟಲ್ ಸಹಚರ...",
      caption5: "ತ್ವರಿತ ಯೋಜನಾ ಪ್ರವೇಶದೊಂದಿಗೆ ನಿಮ್ಮನ್ನು ಸಶಕ್ತಗೊಳಿಸುತ್ತಿದೆ...",
      initialized: "ಪ್ರಾರಂಭಿಸಲಾಗಿದೆ"
    }
  },
  bn: {
    greeting: "নমস্কার! 🙏 আমি গভমিত্র। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?",
    typing: "টাইপ করছে...",
    placeholder: "আপনার প্রশ্ন এখানে টাইপ করুন...",
    send: "পাঠান",
    categories: "সব সেবা",
    login: "লগইন",
    signup: "সাইন আপ",
    logout: "লগআউট",
    welcome: "ফিরে আসার জন্য স্বাগতম",
    newUser: "গভমিত্রে নতুন?",
    email: "ইমেইল ঠিকানা",
    password: "পাসওয়ার্ড",
    name: "পুরো নাম",
    confirmPassword: "পাসওয়ার্ড নিশ্চিত করুন",
    alreadyHaveAccount: "ইতিমধ্যে অ্যাকাউন্ট আছে?",
    completeProfile: "আপনার প্রোফাইল সম্পূর্ণ করুন",
    profileDesc: "আপনার জন্য সেরা প্রকল্প সুপারিশ করতে সাহায্য করুন",
    viewProfile: "প্রোফাইল দেখুন",
    editProfile: "প্রোফাইল সম্পাদনা করুন",
    saveChanges: "পরিবর্তন সংরক্ষণ করুন",
    cancel: "বাতিল করুন",
    myProfile: "আমার প্রোফাইল",
    accountInfo: "অ্যাকাউন্ট তথ্য",
    personalDetails: "ব্যক্তিগত বিবরণ",
    age: "বয়স",
    gender: "লিঙ্গ",
    male: "পুরুষ",
    female: "মহিলা",
    other: "অন্যান্য",
    caste: "জাতি বিভাগ",
    general: "সাধারণ",
    obc: "OBC",
    sc: "SC",
    st: "ST",
    city: "শহর",
    state: "রাজ্য",
    occupation: "পেশা",
    student: "ছাত্র",
    employed: "চাকরিজীবী",
    selfEmployed: "স্ব-কর্মসংস্থান",
    unemployed: "বেকার",
    retired: "অবসরপ্রাপ্ত",
    incomeRange: "বার্ষিক আয় সীমা",
    below2lakh: "₹২ লাখের নিচে",
    lakh25: "₹২-৫ লাখ",
    lakh510: "₹৫-১০ লাখ",
    above10lakh: "₹১০ লাখের উপরে",
    educationLevel: "শিক্ষার স্তর",
    belowHigh: "হাই স্কুলের নিচে",
    highSchool: "হাই স্কুল",
    graduate: "স্নাতক",
    postGraduate: "স্নাতকোত্তর",
    maritalStatus: "বৈবাহিক অবস্থা",
    single: "অবিবাহিত",
    married: "বিবাহিত",
    divorced: "তালাকপ্রাপ্ত",
    widowed: "বিধবা",
    disability: "প্রতিবন্ধকতার অবস্থা",
    none: "কোনোটি নয়",
    physical: "শারীরিক",
    visual: "দৃষ্টি",
    hearing: "শ্রবণ",
    mental: "মানসিক",
    rationCard: "রেশন কার্ডের ধরন",
    noCard: "কোনো কার্ড নেই",
    apl: "APL",
    bpl: "BPL",
    antyodaya: "অন্ত্যোদয়",
    landOwnership: "জমির মালিকানা",
    noLand: "জমি নেই",
    marginal: "প্রান্তিক কৃষক",
    small: "ছোট কৃষক",
    medium: "মাঝারি কৃষক",
    large: "বড় কৃষক",
    saveProfile: "প্রোফাইল সংরক্ষণ করুন",
    skipProfile: "এখনের জন্য এড়িয়ে যান",
    backToChat: "চ্যাটে ফিরে যান",
    selectLanguage: "ভাষা নির্বাচন করুন",
    categories_list: {
      education: "শিক্ষা", certificates: "সার্টিফিকেট", exams: "পরীক্ষা",
      passports: "পাসপোর্ট", agriculture: "কৃষি", business: "ব্যবসা",
      electricity: "বিদ্যুৎ", health: "স্বাস্থ্য", housing: "আবাসন",
      jobs: "চাকরি", justice: "বিচার", local: "স্থানীয় সেবা",
      lpg: "LPG সেবা", banking: "ব্যাংকিং", pension: "পেনশন",
      tax: "অর্থ ও কর", science: "বিজ্ঞান ও IT", sports: "খেলাধুলা",
      transport: "পরিবহন", tourism: "পর্যটন", water: "পানি",
      youth: "যুব সেবা", bus: "বাস অনুসন্ধান"
    },
    queries: {
      education: "উচ্চশিক্ষার জন্য বৃত্তি", certificates: "জন্ম/মৃত্যু সার্টিফিকেটের আবেদন",
      exams: "গেট পরীক্ষা ২০২৬", passports: "পাসপোর্ট নবায়ন নথি",
      agriculture: "ফসল বীমা প্রকল্প", business: "MSME নিবন্ধন প্রক্রিয়া",
      electricity: "নতুন বিদ্যুৎ সংযোগ", health: "স্বাস্থ্য প্রকল্প",
      housing: "PM আবাস যোজনা আবেদন", jobs: "সর্বশেষ সরকারি চাকরি",
      justice: "আইনি সহায়তা সেবা", local: "স্থানীয় পৌরসভা যোগাযোগ",
      lpg: "নতুন LPG সংযোগের আবেদন", banking: "ব্যাংকিং প্রকল্প",
      pension: "বৃদ্ধ বয়স পেনশন যোগ্যতা", tax: "আয়কর দাখিলের গাইড",
      science: "ডিজিটাল ইন্ডিয়া উদ্যোগ", sports: "ক্রীড়া বৃত্তি",
      transport: "ড্রাইভিং লাইসেন্স পদ্ধতি", tourism: "ভারতের পর্যটন স্থান",
      water: "পানির সংযোগের আবেদন", youth: "দক্ষতা উন্নয়ন কর্মসূচি",
      bus: "তাম্বরম থেকে অ্যাডায়ার বাস"
    },
    // UI labels
    save: "☆ সেভ করুন",
    saved: "⭐ সেভ হয়েছে",
    whatsapp: "📤 হোয়াটসঅ্যাপ",
    copy: "📋 কপি করুন",
    copied: "✅ কপি হয়েছে!",
    explainSimply: "🧠 সহজ ভাষায় বুঝান",
    hideExplanation: "🧠 ব্যাখ্যা লুকান",
    simpleExplanation: "🧠 সহজ ব্যাখ্যা",
    compare: "🔄 তুলনা করুন",
    inCompare: "✅ তুলনায় যোগ হয়েছে",
    compareNow: "এখন তুলনা করুন ▶",
    compareTitle: "🔄 প্রকল্প তুলনা",
    clearClose: "মুছুন & বন্ধ করুন",
    done: "সম্পন্ন",
    savedSchemes: "⭐ সেভ করা",
    savedHeader: "⭐ সেভ করা প্রকল্প",
    clearAll: "🗑️ সব মুছুন",
    noSavedSchemes: "এখনো কোনো প্রকল্প সেভ করা হয়নি। ⭐ ক্লিক করে সেভ করুন!",
    removeScheme: "সরান",
    share: "📤 শেয়ার",
    downloadPdf: "📥 PDF ডাউনলোড",
    compareMax: "সর্বোচ্চ ৩টি প্রকল্প তুলনা করা যাবে। আগে একটি সরান।",
    followupLabel: "আপনি এটিও জিজ্ঞেস করতে পারেন:",
        loading: {
      caption1: "নাগরিক ও সরকারের মধ্যে ব্যবধান কমাচ্ছে...",
      caption2: "দ্রুততম MTC পথ খুঁজে পাচ্ছে...",
      caption3: "শাসন সহজ করছে, একটি প্রশ্ন একসময়...",
      caption4: "স্মার্ট ভারতের জন্য আপনার ডিজিটাল সঙ্গী...",
      caption5: "তাৎক্ষণিক প্রকল্প অ্যাক্সেস দিয়ে ক্ষমতায়ন...",
      initialized: "শুরু হয়েছে"
    }
  },
  mr: {
    greeting: "नमस्कार! 🙏 मी गोवमित्र आहे. आज मी तुम्हाला कशी मदत करू शकतो?",
    typing: "टाइप करत आहे...",
    placeholder: "तुमचा प्रश्न येथे टाइप करा...",
    send: "पाठवा",
    categories: "सर्व सेवा",
    login: "लॉगिन",
    signup: "साइन अप",
    logout: "लॉगआउट",
    welcome: "परत स्वागत",
    newUser: "गोवमित्रवर नवीन?",
    email: "ईमेल पत्ता",
    password: "पासवर्ड",
    name: "पूर्ण नाव",
    confirmPassword: "पासवर्ड पुष्टी करा",
    alreadyHaveAccount: "आधीच खाते आहे?",
    completeProfile: "तुमची प्रोफाइल पूर्ण करा",
    profileDesc: "तुमच्यासाठी सर्वोत्तम योजना सुचवण्यास मदत करा",
    viewProfile: "प्रोफाइल पहा",
    editProfile: "प्रोफाइल संपादित करा",
    saveChanges: "बदल जतन करा",
    cancel: "रद्द करा",
    myProfile: "माझी प्रोफाइल",
    accountInfo: "खाते माहिती",
    personalDetails: "वैयक्तिक तपशील",
    age: "वय",
    gender: "लिंग",
    male: "पुरुष",
    female: "महिला",
    other: "इतर",
    caste: "जात श्रेणी",
    general: "सामान्य",
    obc: "OBC",
    sc: "SC",
    st: "ST",
    city: "शहर",
    state: "राज्य",
    occupation: "व्यवसाय",
    student: "विद्यार्थी",
    employed: "नोकरदार",
    selfEmployed: "स्वयंरोजगार",
    unemployed: "बेरोजगार",
    retired: "निवृत्त",
    incomeRange: "वार्षिक उत्पन्न मर्यादा",
    below2lakh: "₹2 लाखाखाली",
    lakh25: "₹2-5 लाख",
    lakh510: "₹5-10 लाख",
    above10lakh: "₹10 लाखावर",
    educationLevel: "शिक्षण पातळी",
    belowHigh: "हायस्कूलखाली",
    highSchool: "हायस्कूल",
    graduate: "पदवीधर",
    postGraduate: "पदव्युत्तर",
    maritalStatus: "वैवाहिक स्थिती",
    single: "अविवाहित",
    married: "विवाहित",
    divorced: "घटस्फोटित",
    widowed: "विधवा",
    disability: "अपंगत्व स्थिती",
    none: "काहीही नाही",
    physical: "शारीरिक",
    visual: "दृष्टी",
    hearing: "श्रवण",
    mental: "मानसिक",
    rationCard: "रेशन कार्ड प्रकार",
    noCard: "कार्ड नाही",
    apl: "APL",
    bpl: "BPL",
    antyodaya: "अंत्योदय",
    landOwnership: "जमीन मालकी",
    noLand: "जमीन नाही",
    marginal: "अल्पभूधारक शेतकरी",
    small: "लहान शेतकरी",
    medium: "मध्यम शेतकरी",
    large: "मोठे शेतकरी",
    saveProfile: "प्रोफाइल जतन करा",
    skipProfile: "आत्तासाठी वगळा",
    backToChat: "चॅटवर परत जा",
    selectLanguage: "भाषा निवडा",
    categories_list: {
      education: "शिक्षण", certificates: "प्रमाणपत्रे", exams: "परीक्षा",
      passports: "पासपोर्ट", agriculture: "शेती", business: "व्यवसाय",
      electricity: "वीज", health: "आरोग्य", housing: "घरकुल",
      jobs: "नोकऱ्या", justice: "न्याय", local: "स्थानिक सेवा",
      lpg: "LPG सेवा", banking: "बँकिंग", pension: "निवृत्तीवेतन",
      tax: "पैसे आणि कर", science: "विज्ञान आणि IT", sports: "क्रीडा",
      transport: "वाहतूक", tourism: "पर्यटन", water: "पाणी",
      youth: "युवा सेवा", bus: "बस शोध"
    },
    queries: {
      education: "उच्च शिक्षणासाठी शिष्यवृत्ती", certificates: "जन्म/मृत्यू प्रमाणपत्रासाठी अर्ज",
      exams: "गेट परीक्षा २०२६ 2026", passports: "पासपोर्ट नूतनीकरण कागदपत्रे",
      agriculture: "पीक विमा योजना", business: "MSME नोंदणी प्रक्रिया",
      electricity: "नवीन वीज जोडणी", health: "आरोग्य योजना",
      housing: "PM आवास योजना अर्ज", jobs: "नवीनतम सरकारी नोकऱ्या",
      justice: "कायदेशीर सहाय्य सेवा", local: "स्थानिक महापालिका संपर्क",
      lpg: "नवीन LPG जोडणीसाठी अर्ज", banking: "बँकिंग योजना",
      pension: "वृद्धापकाळ निवृत्तीवेतन पात्रता", tax: "आयकर भरण्याचे मार्गदर्शन",
      science: "डिजिटल इंडिया उपक्रम", sports: "क्रीडा शिष्यवृत्ती",
      transport: "वाहन परवाना प्रक्रिया", tourism: "भारतातील पर्यटन स्थळे",
      water: "पाणी जोडणीसाठी अर्ज", youth: "कौशल्य विकास कार्यक्रम",
      bus: "तांबरम ते अडयार बस"
    },
    // UI labels
    save: "☆ जतन करा",
    saved: "⭐ जतन केले",
    whatsapp: "📤 व्हाट्सअप",
    copy: "📋 कॉपी करा",
    copied: "✅ कॉपी झाले!",
    explainSimply: "🧠 सोप्या भाषेत सांगा",
    hideExplanation: "🧠 स्पष्टीकरण लपवा",
    simpleExplanation: "🧠 सोपे स्पष्टीकरण",
    compare: "🔄 तुलना करा",
    inCompare: "✅ तुलनेत आहे",
    compareNow: "आता तुलना करा ▶",
    compareTitle: "🔄 योजना तुलना",
    clearClose: "साफ करा & बंद करा",
    done: "झाले",
    savedSchemes: "⭐ जतन केलेले",
    savedHeader: "⭐ जतन केलेल्या योजना",
    clearAll: "🗑️ सगळे काढा",
    noSavedSchemes: "अजून कोणतीही योजना जतन केलेली नाही. ⭐ क्लिक करून जतन करा!",
    removeScheme: "काढा",
    share: "📤 शेअर",
    downloadPdf: "📥 PDF डाउनलोड",
    compareMax: "जास्तीत जास्त 3 योजनांची तुलना करता येते. आधी एक काढा.",
    followupLabel: "तुम्ही हेही विचारू शकता:",
        loading: {
      caption1: "नागरिक आणि सरकार यांच्यातील दरी कमी करत आहे...",
      caption2: "सर्वात जलद MTC मार्ग शोधत आहे...",
      caption3: "शासन सुलभ करत आहे...",
      caption4: "स्मार्ट भारतासाठी डिजिटल साथीदार...",
      caption5: "तात्काळ योजना प्रवेशासह सशक्त करत आहे...",
      initialized: "सुरू केले"
    }
  },
  gu: {
    greeting: "નમસ્કાર! 🙏 હું ગવમિત્ર છું. આજે હું તમારી કેવી રીતે મદદ કરી શકું?",
    typing: "ટાઇપ કરી રહ્યું છે...",
    placeholder: "તમારો પ્રશ્ન અહીં ટાઇપ કરો...",
    send: "મોકલો",
    categories: "બધી સેવાઓ",
    login: "લૉગઇન",
    signup: "સાઇન અપ",
    logout: "લૉગઆઉટ",
    welcome: "પાછા સ્વાગત છે",
    newUser: "ગવમિત્ર પર નવા?",
    email: "ઇમેઇલ સરનામું",
    password: "પાસવર્ડ",
    name: "પૂરું નામ",
    confirmPassword: "પાસવર્ડ પુષ્ટિ કરો",
    alreadyHaveAccount: "પહેલેથી ખાતું છે?",
    completeProfile: "તમારી પ્રોફાઇલ પૂર્ણ કરો",
    profileDesc: "તમારા માટે શ્રેષ્ઠ યોજનાઓ સૂચવવામાં મદદ કરો",
    viewProfile: "પ્રોફાઇલ જુઓ",
    editProfile: "પ્રોફાઇલ સંપાદિત કરો",
    saveChanges: "ફેરફારો સાચવો",
    cancel: "રદ કરો",
    myProfile: "મારી પ્રોફાઇલ",
    accountInfo: "ખાતાની માહિતી",
    personalDetails: "વ્યક્તિગત વિગતો",
    age: "ઉંમર",
    gender: "લિંગ",
    male: "પુરુષ",
    female: "સ્ત્રી",
    other: "અન્ય",
    caste: "જાતિ શ્રેણી",
    general: "સામાન્ય",
    obc: "OBC",
    sc: "SC",
    st: "ST",
    city: "શહેર",
    state: "રાજ્ય",
    occupation: "વ્યવસાય",
    student: "વિદ્યાર્થી",
    employed: "નોકરીદાર",
    selfEmployed: "સ્વ-રોજગાર",
    unemployed: "બેરોજગાર",
    retired: "નિવૃત્ત",
    incomeRange: "વાર્ષિક આવક શ્રેણી",
    below2lakh: "₹2 લાખ કરતાં ઓછી",
    lakh25: "₹2-5 લાખ",
    lakh510: "₹5-10 લાખ",
    above10lakh: "₹10 લાખ કરતાં વધુ",
    educationLevel: "શિક્ષણ સ્તર",
    belowHigh: "હાઇ સ્કૂલ કરતાં ઓછું",
    highSchool: "હાઇ સ્કૂલ",
    graduate: "સ્નાતક",
    postGraduate: "અનુ-સ્નાતક",
    maritalStatus: "વૈવાહિક સ્થિતિ",
    single: "અપરિણીત",
    married: "પરિણીત",
    divorced: "છૂટાછેડા",
    widowed: "વિધવા",
    disability: "અપંગતા સ્થિતિ",
    none: "કોઈ નહીં",
    physical: "શારીરિક",
    visual: "દ્રષ્ટિ",
    hearing: "સુનાવણી",
    mental: "માનસિક",
    rationCard: "રેશન કાર્ડ પ્રકાર",
    noCard: "કોઈ કાર્ડ નહીં",
    apl: "APL",
    bpl: "BPL",
    antyodaya: "અંત્યોદય",
    landOwnership: "જમીન માલિકી",
    noLand: "જમીન નહીં",
    marginal: "સીમાંત ખેડૂત",
    small: "નાના ખેડૂત",
    medium: "મધ્યમ ખેડૂત",
    large: "મોટા ખેડૂત",
    saveProfile: "પ્રોફાઇલ સાચવો",
    skipProfile: "અત્યારે છોડો",
    backToChat: "ચૅટ પર પાછા જાઓ",
    selectLanguage: "ભાષા પસંદ કરો",
    categories_list: {
      education: "શિક્ષણ", certificates: "પ્રમાણપત્રો", exams: "પરીક્ષાઓ",
      passports: "પાસપોર્ટ", agriculture: "કૃષિ", business: "વ્યવસાય",
      electricity: "વીજળી", health: "આરોગ્ય", housing: "આવાસ",
      jobs: "નોકરીઓ", justice: "ન્યાય", local: "સ્થાનિક સેવાઓ",
      lpg: "LPG સેવાઓ", banking: "બૅન્કિંગ", pension: "પેન્શન",
      tax: "પૈસા અને કર", science: "વિજ્ઞાન અને IT", sports: "રમત",
      transport: "પરિવહન", tourism: "પ્રવાસ", water: "પાણી",
      youth: "યુવા સેવાઓ", bus: "બસ શોધ"
    },
    queries: {
      education: "ઉચ્ચ શિક્ષણ માટે શિષ્યવૃત્તિ", certificates: "જન્મ/મૃત્યુ પ્રમાણપત્ર",
      exams: "ગેટ પરીક્ષા 2026", passports: "પાસપોર્ટ નવીકરણ",
      agriculture: "પાક વીમા યોજનાઓ", business: "MSME નોંધણી",
      electricity: "નવું વીજ જોડાણ", health: "આરોગ્ય યોજનાઓ",
      housing: "PM આવાસ યોજના", jobs: "સરકારી નોકરીઓ",
      justice: "કાનૂની સહાય", local: "સ્થાનિક મ્યુનિસિપાલિટી",
      lpg: "નવું LPG જોડાણ", banking: "બેંકિંગ યોજનાઓ",
      pension: "વૃદ્ધ વ્યક્તિ પેન્શન", tax: "આવકવેરો",
      science: "ડિજિટલ ઇન્ડિયા", sports: "રમત શિષ્યવૃત્તિ",
      transport: "ડ્રાઇવિંગ લાઇસન્સ", tourism: "ભારતના પ્રવાસ સ્થળો",
      water: "પાણી જોડાણ", youth: "કૌશલ્ય વિકાસ",
      bus: "તાંબરમ થી અડ્યયાર બસ"
    },
    // UI labels
    save: "☆ સાચવો",
    saved: "⭐ સાચવ્યું",
    whatsapp: "📤 વ્હોટ્સએપ",
    copy: "📋 કૉપિ કરો",
    copied: "✅ કૉપિ થઈ ગઈ!",
    explainSimply: "🧠 સરળ ભાષામાં સમજાવો",
    hideExplanation: "🧠 સ્પષ્ટીકરણ છુપાવો",
    simpleExplanation: "🧠 સરળ સ્પષ્ટીકરણ",
    compare: "🔄 સરખામણી",
    inCompare: "✅ સરખામણીમાં છે",
    compareNow: "હવે સરખામણી ▶",
    compareTitle: "🔄 યોજના સરખામણી",
    clearClose: "સાફ & બંધ",
    done: "થઈ ગયું",
    savedSchemes: "⭐ સાચવ્યા",
    savedHeader: "⭐ સાચવેલી યોજનાઓ",
    clearAll: "🗑️ બધુ સાફ",
    noSavedSchemes: "હજી કોઈ યોજના સાચવી નથી. ⭐ ક્લિક કરી સાચવો!",
    removeScheme: "દૂર કરો",
    share: "📤 શેર",
    downloadPdf: "📥 PDF ડાઉનલોડ",
    compareMax: "વધુમાં વધુ 3 યોજનાઓ સરખાવી શકાય. પહેલા એક દૂર કરો.",
    followupLabel: "તમે આ પણ પૂછી શકો:",
        loading: {
      caption1: "નાગરિક અને સરકાર વચ્ચેનો ભેદ ઘટાડી રહ્યું છે...",
      caption2: "સૌથી ઝડપી MTC માર્ગ શોધી રહ્યું છે...",
      caption3: "શાસન સરળ બનાવી રહ્યું છે...",
      caption4: "સ્માર્ટ ઇન્ડિયા માટે ડિજિટલ સહાયક...",
      caption5: "તત્કાળ યોજના ઍક્સેસ સાથે સશક્ત...",
      initialized: "શરૂ કરવામાં આવ્યું"
    }
  },
  pa: {
    greeting: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! 🙏 ਮੈਂ ਗੋਵਮਿਤਰਾ ਹਾਂ। ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?",
    typing: "ਟਾਈਪ ਕਰ ਰਿਹਾ ਹੈ...",
    placeholder: "ਆਪਣਾ ਸਵਾਲ ਇੱਥੇ ਟਾਈਪ ਕਰੋ...",
    send: "ਭੇਜੋ",
    categories: "ਸਾਰੀਆਂ ਸੇਵਾਵਾਂ",
    login: "ਲੌਗਇਨ",
    signup: "ਸਾਈਨ ਅੱਪ",
    logout: "ਲੌਗਆਉਟ",
    welcome: "ਵਾਪਸ ਜੀ ਆਇਆਂ",
    newUser: "ਗੋਵਮਿਤਰਾ ਵਿੱਚ ਨਵੇਂ?",
    email: "ਈਮੇਲ ਪਤਾ",
    password: "ਪਾਸਵਰਡ",
    name: "ਪੂਰਾ ਨਾਮ",
    confirmPassword: "ਪਾਸਵਰਡ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ",
    alreadyHaveAccount: "ਪਹਿਲਾਂ ਤੋਂ ਖਾਤਾ ਹੈ?",
    completeProfile: "ਆਪਣੀ ਪ੍ਰੋਫਾਈਲ ਪੂਰੀ ਕਰੋ",
    profileDesc: "ਤੁਹਾਡੇ ਲਈ ਸਭ ਤੋਂ ਵਧੀਆ ਯੋਜਨਾਵਾਂ ਸੁਝਾਉਣ ਵਿੱਚ ਮਦਦ ਕਰੋ",
    viewProfile: "ਪ੍ਰੋਫਾਈਲ ਦੇਖੋ",
    editProfile: "ਪ੍ਰੋਫਾਈਲ ਸੰਪਾਦਿਤ ਕਰੋ",
    saveChanges: "ਬਦਲਾਅ ਸੁਰੱਖਿਅਤ ਕਰੋ",
    cancel: "ਰੱਦ ਕਰੋ",
    myProfile: "ਮੇਰੀ ਪ੍ਰੋਫਾਈਲ",
    accountInfo: "ਖਾਤਾ ਜਾਣਕਾਰੀ",
    personalDetails: "ਨਿੱਜੀ ਵੇਰਵੇ",
    age: "ਉਮਰ",
    gender: "ਲਿੰਗ",
    male: "ਮਰਦ",
    female: "ਔਰਤ",
    other: "ਹੋਰ",
    caste: "ਜਾਤੀ ਸ਼੍ਰੇਣੀ",
    general: "ਆਮ",
    obc: "OBC",
    sc: "SC",
    st: "ST",
    city: "ਸ਼ਹਿਰ",
    state: "ਰਾਜ",
    occupation: "ਕਿੱਤਾ",
    student: "ਵਿਦਿਆਰਥੀ",
    employed: "ਨੌਕਰੀਸ਼ੁਦਾ",
    selfEmployed: "ਸਵੈ-ਰੁਜ਼ਗਾਰ",
    unemployed: "ਬੇਰੁਜ਼ਗਾਰ",
    retired: "ਸੇਵਾਮੁਕਤ",
    incomeRange: "ਸਾਲਾਨਾ ਆਮਦਨ ਸੀਮਾ",
    below2lakh: "₹2 ਲੱਖ ਤੋਂ ਘੱਟ",
    lakh25: "₹2-5 ਲੱਖ",
    lakh510: "₹5-10 ਲੱਖ",
    above10lakh: "₹10 ਲੱਖ ਤੋਂ ਵੱਧ",
    educationLevel: "ਸਿੱਖਿਆ ਪੱਧਰ",
    belowHigh: "ਹਾਈ ਸਕੂਲ ਤੋਂ ਘੱਟ",
    highSchool: "ਹਾਈ ਸਕੂਲ",
    graduate: "ਗ੍ਰੈਜੂਏਟ",
    postGraduate: "ਪੋਸਟ ਗ੍ਰੈਜੂਏਟ",
    maritalStatus: "ਵਿਆਹੁਤਾ ਸਥਿਤੀ",
    single: "ਅਣਵਿਆਹਿਆ",
    married: "ਵਿਆਹਿਆ",
    divorced: "ਤਲਾਕਸ਼ੁਦਾ",
    widowed: "ਵਿਧਵਾ",
    disability: "ਅਪਾਹਜਤਾ ਸਥਿਤੀ",
    none: "ਕੋਈ ਨਹੀਂ",
    physical: "ਸਰੀਰਕ",
    visual: "ਦ੍ਰਿਸ਼ਟੀ",
    hearing: "ਸੁਣਨ",
    mental: "ਮਾਨਸਿਕ",
    rationCard: "ਰਾਸ਼ਨ ਕਾਰਡ ਕਿਸਮ",
    noCard: "ਕੋਈ ਕਾਰਡ ਨਹੀਂ",
    apl: "APL",
    bpl: "BPL",
    antyodaya: "ਅੰਤਯੋਦਯ",
    landOwnership: "ਜ਼ਮੀਨ ਮਾਲਕੀ",
    noLand: "ਕੋਈ ਜ਼ਮੀਨ ਨਹੀਂ",
    marginal: "ਸੀਮਾਂਤ ਕਿਸਾਨ",
    small: "ਛੋਟਾ ਕਿਸਾਨ",
    medium: "ਦਰਮਿਆਨਾ ਕਿਸਾਨ",
    large: "ਵੱਡਾ ਕਿਸਾਨ",
    saveProfile: "ਪ੍ਰੋਫਾਈਲ ਸੁਰੱਖਿਅਤ ਕਰੋ",
    skipProfile: "ਹੁਣੇ ਛੱਡੋ",
    backToChat: "ਚੈਟ ਤੇ ਵਾਪਸ ਜਾਓ",
    selectLanguage: "ਭਾਸ਼ਾ ਚੁਣੋ",
    categories_list: {
      education: "ਸਿੱਖਿਆ", certificates: "ਸਰਟੀਫਿਕੇਟ", exams: "ਪ੍ਰੀਖਿਆਵਾਂ",
      passports: "ਪਾਸਪੋਰਟ", agriculture: "ਖੇਤੀਬਾੜੀ", business: "ਕਾਰੋਬਾਰ",
      electricity: "ਬਿਜਲੀ", health: "ਸਿਹਤ", housing: "ਰਿਹਾਇਸ਼",
      jobs: "ਨੌਕਰੀਆਂ", justice: "ਨਿਆਂ", local: "ਸਥਾਨਕ ਸੇਵਾਵਾਂ",
      lpg: "LPG ਸੇਵਾਵਾਂ", banking: "ਬੈਂਕਿੰਗ", pension: "ਪੈਨਸ਼ਨ",
      tax: "ਪੈਸੇ ਅਤੇ ਟੈਕਸ", science: "ਵਿਗਿਆਨ ਅਤੇ IT", sports: "ਖੇਡਾਂ",
      transport: "ਆਵਾਜਾਈ", tourism: "ਸੈਰ-ਸਪਾਟਾ", water: "ਪਾਣੀ",
      youth: "ਯੁਵਾ ਸੇਵਾਵਾਂ", bus: "ਬੱਸ ਖੋਜ"
    },
    queries: {
      education: "ਉੱਚ ਸਿੱਖਿਆ ਲਈ ਵਜ਼ੀਫ਼ੇ", certificates: "ਜਨਮ/ਮੌਤ ਸਰਟੀਫਿਕੇਟ",
      exams: "ਗੇਟ ਪ੍ਰੀਖਿਆ 2026", passports: "ਪਾਸਪੋਰਟ ਨਵੀਨੀਕਰਨ",
      agriculture: "ਫਸਲ ਬੀਮਾ ਯੋਜਨਾਵਾਂ", business: "MSME ਰਜਿਸਟ੍ਰੇਸ਼ਨ",
      electricity: "ਨਵਾਂ ਬਿਜਲੀ ਕੁਨੈਕਸ਼ਨ", health: "ਸਿਹਤ ਯੋਜਨਾਵਾਂ",
      housing: "PM ਆਵਾਸ ਯੋਜਨਾ", jobs: "ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ",
      justice: "ਕਾਨੂੰਨੀ ਸਹਾਇਤਾ", local: "ਸਥਾਨਕ ਨਗਰਪਾਲਿਕਾ",
      lpg: "ਨਵਾਂ LPG ਕੁਨੈਕਸ਼ਨ", banking: "ਬੈਂਕਿੰਗ ਯੋਜਨਾਵਾਂ",
      pension: "ਬੁਢਾਪਾ ਪੈਨਸ਼ਨ", tax: "ਆਮਦਨ ਕਰ",
      science: "ਡਿਜੀਟਲ ਇੰਡੀਆ", sports: "ਖੇਡ ਵਜ਼ੀਫ਼ਾ",
      transport: "ਡ੍ਰਾਈਵਿੰਗ ਲਾਇਸੈਂਸ", tourism: "ਭਾਰਤ ਦੇ ਸੈਰ-ਸਪਾਟਾ ਸਥਾਨ",
      water: "ਪਾਣੀ ਕੁਨੈਕਸ਼ਨ", youth: "ਹੁਨਰ ਵਿਕਾਸ ਪ੍ਰੋਗਰਾਮ",
      bus: "ਤਾਂਬਰਮ ਤੋਂ ਅਡਯਾਰ ਬੱਸ"
    },
    // UI labels
    save: "☆ ਸੇਵ ਕਰੋ",
    saved: "⭐ ਸੇਵ ਹੋਇਆ",
    whatsapp: "📤 ਵਟਸਐਪ",
    copy: "📋 ਕਾਪੀ ਕਰੋ",
    copied: "✅ ਕਾਪੀ ਹੋ ਗਿਆ!",
    explainSimply: "🧠 ਸਰਲ ਭਾਸ਼ਾ ਵਿੱਚ ਸਮਝਾਓ",
    hideExplanation: "🧠 ਵਿਆਖਿਆ ਲੁਕਾਓ",
    simpleExplanation: "🧠 ਸਰਲ ਵਿਆਖਿਆ",
    compare: "🔄 ਤੁਲਨਾ ਕਰੋ",
    inCompare: "✅ ਤੁਲਨਾ ਵਿੱਚ ਹੈ",
    compareNow: "ਹੁਣੇ ਤੁਲਨਾ ▶",
    compareTitle: "🔄 ਯੋਜਨਾ ਤੁਲਨਾ",
    clearClose: "ਸਾਫ਼ & ਬੰਦ ਕਰੋ",
    done: "ਹੋ ਗਿਆ",
    savedSchemes: "⭐ ਸੇਵ ਕੀਤੇ",
    savedHeader: "⭐ ਸੇਵ ਕੀਤੀਆਂ ਯੋਜਨਾਵਾਂ",
    clearAll: "🗑️ ਸਭ ਹਟਾਓ",
    noSavedSchemes: "ਅਜੇ ਕੋਈ ਯੋਜਨਾ ਸੇਵ ਨਹੀਂ। ⭐ ਕਲਿੱਕ ਕਰਕੇ ਸੇਵ ਕਰੋ!",
    removeScheme: "ਹਟਾਓ",
    share: "📤 ਸ਼ੇਅਰ",
    downloadPdf: "📥 PDF ਡਾਊਨਲੋਡ",
    compareMax: "ਵੱਧ ਤੋਂ ਵੱਧ 3 ਯੋਜਨਾਵਾਂ ਦੀ ਤੁਲਨਾ ਹੋ ਸਕਦੀ ਹੈ। ਪਹਿਲਾਂ ਇੱਕ ਹਟਾਓ।",
    followupLabel: "ਤੁਸੀਂ ਇਹ ਵੀ ਪੁੱਛ ਸਕਦੇ ਹੋ:",
        loading: {
      caption1: "ਨਾਗਰਿਕਾਂ ਅਤੇ ਸਰਕਾਰ ਵਿਚਕਾਰ ਦੂਰੀ ਘਟਾ ਰਿਹਾ ਹੈ...",
      caption2: "ਸਭ ਤੋਂ ਤੇਜ਼ MTC ਰੂਟ ਲੱਭ ਰਿਹਾ ਹੈ...",
      caption3: "ਪ੍ਰਸ਼ਾਸਨ ਨੂੰ ਸਰਲ ਬਣਾ ਰਿਹਾ ਹੈ...",
      caption4: "ਸਮਾਰਟ ਇੰਡੀਆ ਲਈ ਡਿਜੀਟਲ ਸਾਥੀ...",
      caption5: "ਤੁਰੰਤ ਯੋਜਨਾ ਪਹੁੰਚ ਨਾਲ ਸਸ਼ਕਤ...",
      initialized: "ਸ਼ੁਰੂ ਕੀਤਾ ਗਿਆ"
    }
  },
  or: {
    greeting: "ନମସ୍କାର! 🙏 ମୁଁ ଗୋଭ୍‌ମିତ୍ର। ଆଜି ମୁଁ ଆପଣଙ୍କୁ କିପ୍ରକାର ସାହାଯ୍ୟ କରିପାରିବି?",
    typing: "ଟାଇପ୍ କରୁଛି...",
    placeholder: "ଆପଣଙ୍କ ପ୍ରଶ୍ନ ଏଠାରେ ଟାଇପ୍ କରନ୍ତୁ...",
    send: "ପଠାନ୍ତୁ",
    categories: "ସମସ୍ତ ସେବା",
    login: "ଲଗ୍ ଇନ୍",
    signup: "ସାଇନ୍ ଅପ୍",
    logout: "ଲଗ୍ ଆଉଟ୍",
    welcome: "ପୁଣି ସ୍ୱାଗତ",
    newUser: "ଗୋଭ୍‌ମିତ୍ରରେ ନୂଆ?",
    email: "ଇମେଲ ଠିକଣା",
    password: "ପାସୱାର୍ଡ",
    name: "ପୂର୍ଣ ନାମ",
    confirmPassword: "ପାସୱାର୍ଡ ନିଶ୍ଚିତ କରନ୍ତୁ",
    alreadyHaveAccount: "ପୂର୍ବରୁ ଆକାଉଣ୍ଟ ଅଛି?",
    completeProfile: "ଆପଣଙ୍କ ପ୍ରୋଫାଇଲ ସମ୍ପୂର୍ଣ କରନ୍ତୁ",
    profileDesc: "ଆପଣଙ୍କ ପାଇଁ ସର୍ବୋତ୍ତମ ଯୋଜନା ସୁପାରିଶ କରିବାରେ ସାହାଯ୍ୟ କରନ୍ତୁ",
    viewProfile: "ପ୍ରୋଫାଇଲ ଦେଖନ୍ତୁ",
    editProfile: "ପ୍ରୋଫାଇଲ ସଂପାଦନ କରନ୍ତୁ",
    saveChanges: "ପରିବର୍ତ୍ତନ ସଞ୍ଚୟ କରନ୍ତୁ",
    cancel: "ବାତିଲ କରନ୍ତୁ",
    myProfile: "ମୋ ପ୍ରୋଫାଇଲ",
    accountInfo: "ଆକାଉଣ୍ଟ ସୂଚନା",
    personalDetails: "ବ୍ୟକ୍ତିଗତ ବିବରଣ",
    age: "ବୟସ",
    gender: "ଲିଙ୍ଗ",
    male: "ପୁରୁଷ",
    female: "ମହିଳା",
    other: "ଅନ୍ୟ",
    caste: "ଜାତି ବର୍ଗ",
    general: "ସାଧାରଣ",
    obc: "OBC",
    sc: "SC",
    st: "ST",
    city: "ସହର",
    state: "ରାଜ୍ୟ",
    occupation: "ବୃତ୍ତି",
    student: "ଛାତ୍ର",
    employed: "ଚାକିରିଜୀବୀ",
    selfEmployed: "ସ୍ୱ-ନିଯୁକ୍ତ",
    unemployed: "ବେକାର",
    retired: "ଅବସରପ୍ରାପ୍ତ",
    incomeRange: "ବାର୍ଷିକ ଆୟ ସୀମା",
    below2lakh: "₹2 ଲକ୍ଷ ତଳୁ",
    lakh25: "₹2-5 ଲକ୍ଷ",
    lakh510: "₹5-10 ଲକ୍ଷ",
    above10lakh: "₹10 ଲକ୍ଷ ଉପର",
    educationLevel: "ଶିକ୍ଷା ସ୍ତର",
    belowHigh: "ହାଇ ସ୍କୁଲ ତଳୁ",
    highSchool: "ହାଇ ସ୍କୁଲ",
    graduate: "ସ୍ନାତକ",
    postGraduate: "ସ୍ନାତକୋତ୍ତର",
    maritalStatus: "ବୈବାହିକ ସ୍ଥିତି",
    single: "ଅବିବାହିତ",
    married: "ବିବାହିତ",
    divorced: "ବିଚ୍ଛେଦ",
    widowed: "ବିଧବା",
    disability: "ଅକ୍ଷମତା ସ୍ଥିତି",
    none: "କିଛି ନାହିଁ",
    physical: "ଶାରୀରିକ",
    visual: "ଦୃଷ୍ଟି",
    hearing: "ଶ୍ରବଣ",
    mental: "ମାନସିକ",
    rationCard: "ରେସନ କାର୍ଡ ପ୍ରକାର",
    noCard: "କୌଣସି କାର୍ଡ ନାହିଁ",
    apl: "APL",
    bpl: "BPL",
    antyodaya: "ଅନ୍ତ୍ୟୋଦୟ",
    landOwnership: "ଜମି ମାଲିକାନା",
    noLand: "ଜମି ନାହିଁ",
    marginal: "ଅଳ୍ପ ଚାଷୀ",
    small: "ଛୋଟ ଚାଷୀ",
    medium: "ମଧ୍ୟମ ଚାଷୀ",
    large: "ବଡ ଚାଷୀ",
    saveProfile: "ପ୍ରୋଫାଇଲ ସଞ୍ଚୟ କରନ୍ତୁ",
    skipProfile: "ଏବେ ଛାଡନ୍ତୁ",
    backToChat: "ଚ୍ୟାଟ୍‌କୁ ଫେରନ୍ତୁ",
    selectLanguage: "ଭାଷା ବାଛନ୍ତୁ",
    categories_list: {
      education: "ଶିକ୍ଷା", certificates: "ପ୍ରମାଣପତ୍ର", exams: "ପରୀକ୍ଷା",
      passports: "ପାସପୋର୍ଟ", agriculture: "କୃଷି", business: "ବ୍ୟବସାୟ",
      electricity: "ବିଦ୍ୟୁତ", health: "ସ୍ୱାସ୍ଥ୍ୟ", housing: "ଆବାସ",
      jobs: "ଚାକିରି", justice: "ନ୍ୟାୟ", local: "ସ୍ଥାନୀୟ ସେବା",
      lpg: "LPG ସେବା", banking: "ବ୍ୟାଙ୍କିଂ", pension: "ପେନ୍‌ଶନ",
      tax: "ଅର୍ଥ ଓ କର", science: "ବିଜ୍ଞାନ ଓ IT", sports: "ଖେଳ",
      transport: "ପରିବହନ", tourism: "ପର୍ଯ୍ୟଟନ", water: "ପାଣି",
      youth: "ଯୁବ ସେବା", bus: "ବସ ଖୋଜ"
    },
    queries: {
      education: "ଉଚ୍ଚ ଶିକ୍ଷା ପାଇଁ ବୃତ୍ତି", certificates: "ଜନ୍ମ/ମୃତ୍ୟୁ ପ୍ରମାଣପତ୍ର",
      exams: "ଗେଟ୍ ପରୀକ୍ଷା 2026", passports: "ପାସପୋର୍ଟ ନବୀକରଣ",
      agriculture: "ଫସଲ ବୀମା ଯୋଜନା", business: "MSME ନିବନ୍ଧନ",
      electricity: "ନୂଆ ବିଦ୍ୟୁତ ସଂଯୋଗ", health: "ସ୍ୱାସ୍ଥ୍ୟ ଯୋଜନା",
      housing: "PM ଆବାସ ଯୋଜନା", jobs: "ସରକାରୀ ଚାକିରି",
      justice: "ଆଇନ ସହାୟତା", local: "ସ୍ଥାନୀୟ ନଗରପାଳିକା",
      lpg: "ନୂଆ LPG ସଂଯୋଗ", banking: "ବ୍ୟାଙ୍କିଙ୍ଗ ଯୋଜନା",
      pension: "ବୃଦ୍ଧ ବୟସ ପେନ୍‌ଶନ", tax: "ଆୟକର",
      science: "ଡିଜିଟାଲ ଇଣ୍ଡିଆ", sports: "ଖେଳ ବୃତ୍ତି",
      transport: "ଡ୍ରାଇଭିଂ ଲାଇସେନ୍ସ", tourism: "ଭାରତର ପର୍ଯ୍ୟଟନ ସ୍ଥାନ",
      water: "ପାଣି ସଂଯୋଗ", youth: "କୌଶଳ ବିକାଶ",
      bus: "ତାଂବ୍ରମ୍ ଠାରୁ ଆଡ୍ୟାର ବସ"
    },
    // UI labels
    save: "☆ ସଞ୍ଚୟ କରନ୍ତୁ",
    saved: "⭐ ସଞ୍ଚୟ ହେଲା",
    whatsapp: "📤 ୱାଟ୍ସଆପ",
    copy: "📋 କପି କରନ୍ତୁ",
    copied: "✅ କପି ହେଲା!",
    explainSimply: "🧠 ସରଳ ଭାଷାରେ ବୁଝାନ୍ତୁ",
    hideExplanation: "🧠 ବ୍ୟାଖ୍ୟା ଲୁଚାନ୍ତୁ",
    simpleExplanation: "🧠 ସରଳ ବ୍ୟାଖ୍ୟା",
    compare: "🔄 ତୁଳନା",
    inCompare: "✅ ତୁଳନାରେ ଅଛି",
    compareNow: "ବର୍ତ୍ତମାନ ତୁଳନା ▶",
    compareTitle: "🔄 ଯୋଜନା ତୁଳନା",
    clearClose: "ସଫା & ବନ୍ଦ",
    done: "ସମ୍ପୂର୍ଣ",
    savedSchemes: "⭐ ସଞ୍ଚୟ",
    savedHeader: "⭐ ସଞ୍ଚୟ ଯୋଜନା",
    clearAll: "🗑️ ସବୁ ଦୂର",
    noSavedSchemes: "ଏ ପର୍ଯ୍ୟନ୍ତ କିଛି ସଞ୍ଚୟ ହୋଇ ନାହିଁ। ⭐ କ୍ଲିକ କରି ସଞ୍ଚୟ କରନ୍ତୁ!",
    removeScheme: "ହଟାନ୍ତୁ",
    share: "📤 ଶେୟାର",
    downloadPdf: "📥 PDF ଡାଉନଲୋଡ",
    compareMax: "ସର୍ବାଧିକ 3ଟି ଯୋଜନା ତୁଳନା ହୋଇପାରିବ। ପ୍ରଥମେ ଗୋଟିଏ ହଟାନ୍ତୁ।",
    followupLabel: "ଆପଣ ଏହା ମଧ୍ୟ ପଚାରି ପାରନ୍ତି:",
        loading: {
      caption1: "ନାଗରିକ ଓ ସରକାର ମଧ୍ୟରେ ଦୂରତା କମ ହେଉଛି...",
      caption2: "ସବୁଠୁ ଶୀଘ୍ର MTC ରୁଟ ଖୋଜୁଛି...",
      caption3: "ଶାସନ ସହଜ କରୁଛି...",
      caption4: "ସ୍ମାର୍ଟ ଇଣ୍ଡିଆ ପାଇଁ ଡିଜିଟାଲ ସାଥୀ...",
      caption5: "ତୁରନ୍ତ ଯୋଜନା ଉପଲବ୍ଧତାରେ ସଶକ୍ତ...",
      initialized: "ଆରମ୍ଭ ହୋଇଛି"
    }
  },
  as: {
    greeting: "নমস্কাৰ! 🙏 মই গভমিত্ৰ। আজি মই আপোনাক কেনেকৈ সহায় কৰিব পাৰো?",
    typing: "টাইপ কৰি আছে...",
    placeholder: "আপোনাৰ প্ৰশ্ন ইয়াত টাইপ কৰক...",
    send: "পঠাওক",
    categories: "সকলো সেৱা",
    login: "লগইন",
    signup: "চাইন আপ",
    logout: "লগআউট",
    welcome: "পুনৰ স্বাগতম",
    newUser: "গভমিত্ৰত নতুন?",
    email: "ইমেইল ঠিকনা",
    password: "পাছৱৰ্ড",
    name: "সম্পূৰ্ণ নাম",
    confirmPassword: "পাছৱৰ্ড নিশ্চিত কৰক",
    alreadyHaveAccount: "ইতিমধ্যে একাউণ্ট আছে?",
    completeProfile: "আপোনাৰ প্ৰফাইল সম্পূৰ্ণ কৰক",
    profileDesc: "আপোনাৰ বাবে সৰ্বোত্তম আঁচনি পৰামৰ্শ দিবলৈ সহায় কৰক",
    viewProfile: "প্ৰফাইল চাওক",
    editProfile: "প্ৰফাইল সম্পাদনা কৰক",
    saveChanges: "পৰিৱৰ্তন সংৰক্ষণ কৰক",
    cancel: "বাতিল কৰক",
    myProfile: "মোৰ প্ৰফাইল",
    accountInfo: "একাউণ্টৰ তথ্য",
    personalDetails: "ব্যক্তিগত বিৱৰণ",
    age: "বয়স",
    gender: "লিংগ",
    male: "পুৰুষ",
    female: "মহিলা",
    other: "অন্য",
    caste: "জাতি শ্ৰেণী",
    general: "সাধাৰণ",
    obc: "OBC",
    sc: "SC",
    st: "ST",
    city: "চহৰ",
    state: "ৰাজ্য",
    occupation: "পেশা",
    student: "ছাত্ৰ",
    employed: "চাকৰিজীৱী",
    selfEmployed: "স্বনিৰ্ভৰশীল",
    unemployed: "বেকাৰ",
    retired: "অৱসৰপ্ৰাপ্ত",
    incomeRange: "বাৰ্ষিক আয়ৰ পৰিসীমা",
    below2lakh: "₹2 লাখতকৈ কম",
    lakh25: "₹2-5 লাখ",
    lakh510: "₹5-10 লাখ",
    above10lakh: "₹10 লাখতকৈ বেছি",
    educationLevel: "শিক্ষাৰ স্তৰ",
    belowHigh: "হাই স্কুলতকৈ কম",
    highSchool: "হাই স্কুল",
    graduate: "স্নাতক",
    postGraduate: "স্নাতকোত্তৰ",
    maritalStatus: "বৈবাহিক অৱস্থা",
    single: "অবিবাহিত",
    married: "বিবাহিত",
    divorced: "বিবাহবিচ্ছেদ",
    widowed: "বিধৱা",
    disability: "প্ৰতিবন্ধকতাৰ অৱস্থা",
    none: "কোনোটো নাই",
    physical: "শাৰীৰিক",
    visual: "দৃষ্টি",
    hearing: "শ্ৰৱণ",
    mental: "মানসিক",
    rationCard: "ৰেচন কাৰ্ডৰ প্ৰকাৰ",
    noCard: "কোনো কাৰ্ড নাই",
    apl: "APL",
    bpl: "BPL",
    antyodaya: "অন্ত্যোদয়",
    landOwnership: "মাটিৰ গৰাকীত্ব",
    noLand: "মাটি নাই",
    marginal: "প্ৰান্তীয় কৃষক",
    small: "সৰু কৃষক",
    medium: "মধ্যমীয়া কৃষক",
    large: "ডাঙৰ কৃষক",
    saveProfile: "প্ৰফাইল সংৰক্ষণ কৰক",
    skipProfile: "এতিয়াৰ বাবে এৰক",
    backToChat: "চেটলৈ উভতক",
    selectLanguage: "ভাষা বাছনি কৰক",
    categories_list: {
      education: "শিক্ষা", certificates: "প্ৰমাণপত্ৰ", exams: "পৰীক্ষা",
      passports: "পাছপোৰ্ট", agriculture: "কৃষি", business: "ব্যৱসায়",
      electricity: "বিদ্যুৎ", health: "স্বাস্থ্য", housing: "আৱাস",
      jobs: "চাকৰি", justice: "ন্যায়", local: "স্থানীয় সেৱা",
      lpg: "LPG সেৱা", banking: "বেংকিং", pension: "পেঞ্চন",
      tax: "ধন আৰু কৰ", science: "বিজ্ঞান আৰু IT", sports: "ক্ৰীড়া",
      transport: "পৰিবহন", tourism: "পৰ্যটন", water: "পানী",
      youth: "যুৱ সেৱা", bus: "বাছ সন্ধান"
    },
    queries: {
      education: "উচ্চ শিক্ষাৰ বাবে বৃত্তি", certificates: "জন্ম/মৃত্যু প্ৰমাণপত্ৰ",
      exams: "গেট পৰীক্ষা ২০২৬", passports: "পাছপোৰ্ট নবীকৰণ",
      agriculture: "শস্য বীমা আঁচনি", business: "MSME পঞ্জীয়ন",
      electricity: "নতুন বিদ্যুৎ সংযোগ", health: "স্বাস্থ্য আঁচনি",
      housing: "PM আৱাস যোজনা", jobs: "চৰকাৰী চাকৰি",
      justice: "আইনী সহায়তা", local: "স্থানীয় পৌৰ সভা",
      lpg: "নতুন LPG সংযোগ", banking: "বেংকিং আঁচনি",
      pension: "বৃদ্ধ বয়সৰ পেঞ্চন", tax: "আয়কৰ",
      science: "ডিজিটেল ইণ্ডিয়া", sports: "ক্ৰীড়া বৃত্তি",
      transport: "ড্ৰাইভিং লাইচেন্স", tourism: "ভাৰতৰ পৰ্যটন স্থান",
      water: "পানী সংযোগ", youth: "দক্ষতা উন্নয়ন",
      bus: "তাম্বৰম পৰা আডয়াৰ বাছ"
    },
    // UI labels
    save: "☆ সংৰক্ষণ কৰক",
    saved: "⭐ সংৰক্ষিত",
    whatsapp: "📤 হোৱাটছএপ",
    copy: "📋 কপি কৰক",
    copied: "✅ কপি হ'ল!",
    explainSimply: "🧠 সহজ ভাষাত বুজাওক",
    hideExplanation: "🧠 বিৱৰণ লুকুৱাওক",
    simpleExplanation: "🧠 সহজ বিৱৰণ",
    compare: "🔄 তুলনা কৰক",
    inCompare: "✅ তুলনাত আছে",
    compareNow: "এতিয়া তুলনা ▶",
    compareTitle: "🔄 আঁচনি তুলনা",
    clearClose: "পৰিষ্কাৰ & বন্ধ কৰক",
    done: "সম্পন্ন",
    savedSchemes: "⭐ সংৰক্ষিত",
    savedHeader: "⭐ সংৰক্ষিত আঁচনিসমূহ",
    clearAll: "🗑️ সকলো মচক",
    noSavedSchemes: "এতিয়ালৈ কোনো আঁচনি সংৰক্ষণ হোৱা নাই। ⭐ ক্লিক কৰি সংৰক্ষণ কৰক!",
    removeScheme: "আঁতৰাওক",
    share: "📤 শ্বেয়াৰ",
    downloadPdf: "📥 PDF ডাউনলোড",
    compareMax: "সৰ্বোচ্চ ৩টা আঁচনি তুলনা কৰিব পাৰি। আগতে এটা আঁতৰাওক।",
    followupLabel: "আপুনি এইটোও সুধিব পাৰে:",
        loading: {
      caption1: "নাগৰিক আৰু চৰকাৰৰ মাজৰ দূৰত্ব কমাই আছে...",
      caption2: "দ্ৰুততম MTC পথ বিচাৰি আছে...",
      caption3: "শাসন সহজ কৰি আছে...",
      caption4: "স্মাৰ্ট ইণ্ডিয়াৰ বাবে ডিজিটেল সঙ্গী...",
      caption5: "তাৎক্ষণিক আঁচনি সুবিধাৰে সশক্ত...",
      initialized: "আৰম্ভ হ'ল"
    }
  },
  ur: {
    greeting: "آداب! 🙏 میں گوومترا ہوں۔ آج میں آپ کی کیسے مدد کر سکتا ہوں؟",
    typing: "ٹائپ کر رہا ہے...",
    placeholder: "اپنا سوال یہاں ٹائپ کریں...",
    send: "بھیجیں",
    categories: "تمام خدمات",
    login: "لاگ ان",
    signup: "سائن اپ",
    logout: "لاگ آؤٹ",
    welcome: "واپس خوش آمدید",
    newUser: "گوومترا پر نئے؟",
    email: "ای میل پتہ",
    password: "پاس ورڈ",
    name: "پورا نام",
    confirmPassword: "پاس ورڈ کی تصدیق کریں",
    alreadyHaveAccount: "پہلے سے اکاؤنٹ ہے؟",
    completeProfile: "اپنا پروفائل مکمل کریں",
    profileDesc: "آپ کے لیے بہترین اسکیمیں تجویز کرنے میں مدد کریں",
    viewProfile: "پروفائل دیکھیں",
    editProfile: "پروفائل تدوین کریں",
    saveChanges: "تبدیلیاں محفوظ کریں",
    cancel: "منسوخ کریں",
    myProfile: "میرا پروفائل",
    accountInfo: "اکاؤنٹ کی معلومات",
    personalDetails: "ذاتی تفصیلات",
    age: "عمر",
    gender: "جنس",
    male: "مرد",
    female: "عورت",
    other: "دیگر",
    caste: "ذات زمرہ",
    general: "عام",
    obc: "OBC",
    sc: "SC",
    st: "ST",
    city: "شہر",
    state: "ریاست",
    occupation: "پیشہ",
    student: "طالب علم",
    employed: "ملازم",
    selfEmployed: "خود روزگار",
    unemployed: "بے روزگار",
    retired: "ریٹائرڈ",
    incomeRange: "سالانہ آمدنی کی حد",
    below2lakh: "₹2 لاکھ سے کم",
    lakh25: "₹2-5 لاکھ",
    lakh510: "₹5-10 لاکھ",
    above10lakh: "₹10 لاکھ سے زیادہ",
    educationLevel: "تعلیمی سطح",
    belowHigh: "ہائی سکول سے کم",
    highSchool: "ہائی سکول",
    graduate: "گریجویٹ",
    postGraduate: "پوسٹ گریجویٹ",
    maritalStatus: "ازدواجی حیثیت",
    single: "غیر شادی شدہ",
    married: "شادی شدہ",
    divorced: "طلاق یافتہ",
    widowed: "بیوہ",
    disability: "معذوری کی حیثیت",
    none: "کوئی نہیں",
    physical: "جسمانی",
    visual: "بصری",
    hearing: "سماعت",
    mental: "ذہنی",
    rationCard: "راشن کارڈ کی قسم",
    noCard: "کوئی کارڈ نہیں",
    apl: "APL",
    bpl: "BPL",
    antyodaya: "انتیودیا",
    landOwnership: "زمین کی ملکیت",
    noLand: "کوئی زمین نہیں",
    marginal: "معمولی کسان",
    small: "چھوٹا کسان",
    medium: "درمیانہ کسان",
    large: "بڑا کسان",
    saveProfile: "پروفائل محفوظ کریں",
    skipProfile: "ابھی چھوڑیں",
    backToChat: "چیٹ پر واپس جائیں",
    selectLanguage: "زبان منتخب کریں",
    categories_list: {
      education: "تعلیم", certificates: "سرٹیفکیٹ", exams: "امتحانات",
      passports: "پاسپورٹ", agriculture: "زراعت", business: "کاروبار",
      electricity: "بجلی", health: "صحت", housing: "رہائش",
      jobs: "ملازمتیں", justice: "انصاف", local: "مقامی خدمات",
      lpg: "LPG خدمات", banking: "بینکاری", pension: "پنشن",
      tax: "پیسہ اور ٹیکس", science: "سائنس اور IT", sports: "کھیل",
      transport: "نقل و حمل", tourism: "سیاحت", water: "پانی",
      youth: "نوجوانوں کی خدمات", bus: "بس تلاش"
    },
    queries: {
      education: "اعلیٰ تعلیم کے لیے وظائف", certificates: "پیدائش/موت کا سرٹیفکیٹ",
      exams: "گیٹ امتحان 2026", passports: "پاسپورٹ تجدید",
      agriculture: "فصل بیمہ اسکیمیں", business: "MSME رجسٹریشن",
      electricity: "نیا بجلی کنکشن", health: "صحت کی اسکیمیں",
      housing: "PM آواس یوجنا", jobs: "سرکاری ملازمتیں",
      justice: "قانونی امداد", local: "مقامی میونسپلٹی",
      lpg: "نیا LPG کنکشن", banking: "بینکنگ اسکیمیں",
      pension: "بزرگ پنشن", tax: "آمدنی ٹیکس",
      science: "ڈیجیٹل انڈیا", sports: "کھیلوں کے وظائف",
      transport: "ڈرائیونگ لائسنس", tourism: "بھارت کے سیاحتی مقامات",
      water: "پانی کا کنکشن", youth: "ہنر مندی ترقی",
      bus: "تامبرم سے آڈیار بس"
    },
    // UI labels
    save: "☆ محفوظ کریں",
    saved: "⭐ محفوظ ہوگیا",
    whatsapp: "📤 واٹس ایپ",
    copy: "📋 کاپی کریں",
    copied: "✅ کاپی ہوگئی!",
    explainSimply: "🧠 آسان زبان میں سمجھائیں",
    hideExplanation: "🧠 وضاحت چھپائیں",
    simpleExplanation: "🧠 سادہ وضاحت",
    compare: "🔄 موازنہ کریں",
    inCompare: "✅ موازنے میں شامل",
    compareNow: "ابھی موازنہ ▶",
    compareTitle: "🔄 اسکیم موازنہ",
    clearClose: "صاف کریں & بند کریں",
    done: "ہوگیا",
    savedSchemes: "⭐ محفوظ شدہ",
    savedHeader: "⭐ محفوظ اسکیمیں",
    clearAll: "🗑️ سب ہٹائیں",
    noSavedSchemes: "ابھی تک کوئی اسکیم محفوظ نہیں۔ ⭐ کلک کر کے محفوظ کریں!",
    removeScheme: "ہٹائیں",
    share: "📤 شیئر",
    downloadPdf: "📥 PDF ڈاؤنلوڈ",
    compareMax: "زیادہ سے زیادہ 3 اسکیموں کا موازنہ ہوسکتا ہے۔ پہلے ایک ہٹائیں۔",
    followupLabel: "آپ یہ بھی پوچھ سکتے ہیں:",
        loading: {
      caption1: "شہریوں اور حکومت کے درمیان فاصلہ کم کر رہا ہے...",
      caption2: "تیز ترین MTC راستے تلاش کر رہا ہے...",
      caption3: "حکمرانی کو آسان بنا رہا ہے...",
      caption4: "سمارٹ انڈیا کے لیے ڈیجیٹل ساتھی...",
      caption5: "فوری اسکیم رسائی کے ساتھ بااختیار...",
      initialized: "شروع ہوا"
    }
  }
};

// --- LOADING PAGE COMPONENT ---
function LoadingPage({ progress, language = 'en' }) {
  const [captionIndex, setCaptionIndex] = useState(0);
  const t = translations[language]?.loading || translations['en'].loading;
  const captions = [t.caption1, t.caption2, t.caption3, t.caption4, t.caption5];

  useEffect(() => {
    const interval = setInterval(() => {
      setCaptionIndex((prev) => (prev + 1) % captions.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [captions.length]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ fontSize: '5rem', marginBottom: '20px', animation: 'bounce 2s infinite' }}>🤖</div>
      <h1 style={{ fontSize: '3rem', marginBottom: '10px', fontWeight: 'bold' }}>GovMithra</h1>
      <p style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '40px', textAlign: 'center', maxWidth: '600px', minHeight: '60px' }}>
        {captions[captionIndex]}
      </p>
      <div style={{ width: '300px', height: '8px', background: 'rgba(255,255,255,0.3)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'white',
          transition: 'width 0.3s ease',
          borderRadius: '10px'
        }}></div>
      </div>
      <p style={{ marginTop: '15px', fontSize: '0.9rem', opacity: 0.8 }}>{progress}% {t.initialized}</p>
    </div>
  );
}

// --- VIEW/EDIT PROFILE PAGE ---
function ProfileViewPage({ user, profile, onBack, onStartEdit, language }) {
  const t = translations[language] || translations['en'];

  const profileFields = [
    { label: t.age, value: profile?.age || 'Not provided' },
    { label: t.gender, value: profile?.gender || 'Not provided' },
    { label: t.caste, value: profile?.caste || 'Not provided' },
    { label: t.city, value: profile?.city || 'Not provided' },
    { label: t.state, value: profile?.state || 'Not provided' },
    { label: t.occupation, value: profile?.occupation || 'Not provided' },
    { label: t.incomeRange, value: profile?.income_range || 'Not provided' },
    { label: t.educationLevel, value: profile?.education_level || 'Not provided' },
    { label: t.maritalStatus, value: profile?.marital_status || 'Not provided' },
    { label: t.disability, value: profile?.disability || 'Not provided' },
    { label: t.rationCard, value: profile?.ration_card_type || 'Not provided' },
    { label: t.landOwnership, value: profile?.land_ownership || 'Not provided' }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '24px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <button
            onClick={onBack}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '2px solid #e2e8f0',
              background: 'white',
              color: '#64748b',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← {t.backToChat}
          </button>
          <button
            onClick={onStartEdit}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ✏️ {t.editProfile}
          </button>
        </div>

        {/* Profile Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            width: '100px', 
            height: '100px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            margin: '0 auto 20px'
          }}>
            👤
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', margin: '0 0 5px 0' }}>
            {user?.name}
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem' }}>{user?.email}</p>
        </div>

        {/* Account Info */}
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ 
            fontSize: '1.3rem', 
            fontWeight: 'bold', 
            color: '#1e293b',
            marginBottom: '20px',
            paddingBottom: '10px',
            borderBottom: '2px solid #e2e8f0'
          }}>
            {t.accountInfo}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '5px' }}>{t.name}</p>
              <p style={{ color: '#1e293b', fontSize: '1.1rem', fontWeight: '600' }}>{user?.name}</p>
            </div>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '5px' }}>{t.email}</p>
              <p style={{ color: '#1e293b', fontSize: '1.1rem', fontWeight: '600' }}>{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <div>
          <h2 style={{ 
            fontSize: '1.3rem', 
            fontWeight: 'bold', 
            color: '#1e293b',
            marginBottom: '20px',
            paddingBottom: '10px',
            borderBottom: '2px solid #e2e8f0'
          }}>
            {t.personalDetails}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {profileFields.map((field, idx) => (
              <div key={idx} style={{
                padding: '15px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '5px' }}>{field.label}</p>
                <p style={{ color: '#1e293b', fontSize: '1rem', fontWeight: '600', textTransform: 'capitalize' }}>
                  {field.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
// ── ADD THIS wherever you process incoming bot messages ──────────────────

function handleBotMessage(message) {

    // 1. Check for language_change signal from Rasa
    if (message.type === "language_change") {
        const lang = message.lang;

        // Save so it survives page reload
        localStorage.setItem("userLanguage", lang);

        // Reload page with ?lang=hi (or te, ta, ml, kn, en)
        const url = new URL(window.location.href);
        url.searchParams.set("lang", lang);
        window.location.href = url.toString();
        return; // stop processing this message
    }

    // ... your existing message rendering code continues below ...
}

// ── ADD THIS at the very top of your page load / init function ───────────

(function applyLanguageOnLoad() {
    const params = new URLSearchParams(window.location.search);
    // URL param wins, then localStorage, then default English
    const lang = params.get("lang")
               || localStorage.getItem("userLanguage")
               || "en";

    // Save it so Rasa slot stays in sync on first message
    localStorage.setItem("userLanguage", lang);

    // Optional: set lang attribute on <html> for font/RTL support
    document.documentElement.setAttribute("lang", lang);
})();

// --- PROFILE FORM COMPONENT (Edit Mode) ---
function ProfileForm({ user, existingProfile, onComplete, onSkip, language, isEditMode = false }) {
  const t = translations[language] || translations['en'];
  const [formData, setFormData] = useState({
    age: existingProfile?.age || '',
    gender: existingProfile?.gender || '',
    caste: existingProfile?.caste || '',
    city: existingProfile?.city || '',
    state: existingProfile?.state || '',
    occupation: existingProfile?.occupation || '',
    incomeRange: existingProfile?.income_range || '',
    educationLevel: existingProfile?.education_level || '',
    maritalStatus: existingProfile?.marital_status || '',
    disability: existingProfile?.disability || '',
    rationCardType: existingProfile?.ration_card_type || '',
    landOwnership: existingProfile?.land_ownership || ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          ...formData
        })
      });

      const data = await response.json();

      if (data.success) {
        onComplete(formData);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to save profile. Please try again.');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: '2px solid #e2e8f0',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    color: '#475569',
    fontWeight: '500',
    fontSize: '0.9rem'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '800px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>👤</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
            {isEditMode ? t.editProfile : t.completeProfile}
          </h1>
          <p style={{ color: '#64748b', marginTop: '5px' }}>
            {isEditMode ? 'Update your information' : t.profileDesc}
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c33',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={labelStyle}>{t.age}</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>{t.gender}</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">Select</option>
                <option value="male">{t.male}</option>
                <option value="female">{t.female}</option>
                <option value="other">{t.other}</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>{t.caste}</label>
              <select
                value={formData.caste}
                onChange={(e) => setFormData({ ...formData, caste: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">Select</option>
                <option value="general">{t.general}</option>
                <option value="obc">{t.obc}</option>
                <option value="sc">{t.sc}</option>
                <option value="st">{t.st}</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>{t.city}</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>{t.state}</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>{t.occupation}</label>
              <select
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">Select</option>
                <option value="student">{t.student}</option>
                <option value="employed">{t.employed}</option>
                <option value="self-employed">{t.selfEmployed}</option>
                <option value="unemployed">{t.unemployed}</option>
                <option value="retired">{t.retired}</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>{t.incomeRange}</label>
              <select
                value={formData.incomeRange}
                onChange={(e) => setFormData({ ...formData, incomeRange: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">Select</option>
                <option value="below-2">{t.below2lakh}</option>
                <option value="2-5">{t.lakh25}</option>
                <option value="5-10">{t.lakh510}</option>
                <option value="above-10">{t.above10lakh}</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>{t.educationLevel}</label>
              <select
                value={formData.educationLevel}
                onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">Select</option>
                <option value="below-high">{t.belowHigh}</option>
                <option value="high-school">{t.highSchool}</option>
                <option value="graduate">{t.graduate}</option>
                <option value="post-graduate">{t.postGraduate}</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>{t.maritalStatus}</label>
              <select
                value={formData.maritalStatus}
                onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">Select</option>
                <option value="single">{t.single}</option>
                <option value="married">{t.married}</option>
                <option value="divorced">{t.divorced}</option>
                <option value="widowed">{t.widowed}</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>{t.disability}</label>
              <select
                value={formData.disability}
                onChange={(e) => setFormData({ ...formData, disability: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">Select</option>
                <option value="none">{t.none}</option>
                <option value="physical">{t.physical}</option>
                <option value="visual">{t.visual}</option>
                <option value="hearing">{t.hearing}</option>
                <option value="mental">{t.mental}</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>{t.rationCard}</label>
              <select
                value={formData.rationCardType}
                onChange={(e) => setFormData({ ...formData, rationCardType: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">Select</option>
                <option value="no-card">{t.noCard}</option>
                <option value="apl">{t.apl}</option>
                <option value="bpl">{t.bpl}</option>
                <option value="antyodaya">{t.antyodaya}</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>{t.landOwnership}</label>
              <select
                value={formData.landOwnership}
                onChange={(e) => setFormData({ ...formData, landOwnership: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">Select</option>
                <option value="no-land">{t.noLand}</option>
                <option value="marginal">{t.marginal}</option>
                <option value="small">{t.small}</option>
                <option value="medium">{t.medium}</option>
                <option value="large">{t.large}</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {isEditMode ? t.saveChanges : t.saveProfile}
            </button>
            {!isEditMode && (
              <button
                type="button"
                onClick={onSkip}
                style={{
                  padding: '16px 30px',
                  borderRadius: '12px',
                  border: '2px solid #e2e8f0',
                  background: 'white',
                  color: '#64748b',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {t.skipProfile}
              </button>
            )}
            {isEditMode && (
              <button
                type="button"
                onClick={onSkip}
                style={{
                  padding: '16px 30px',
                  borderRadius: '12px',
                  border: '2px solid #e2e8f0',
                  background: 'white',
                  color: '#64748b',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {t.cancel}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// --- LOGIN/SIGNUP COMPONENT ---
function AuthPage({ onLogin, language, onLanguageChange }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const t = translations[language] || translations['en'];

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' },
    { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'bn', name: 'বাংলা', flag: '🇮🇳' },
    { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
    { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
    { code: 'or', name: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
    { code: 'as', name: 'অসমীয়া', flag: '🇮🇳' },
    { code: 'ur', name: 'اردو', flag: '🇮🇳' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? '/api/login' : '/api/signup';
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name
        })
      });

      const data = await response.json();

      if (data.success) {
        if (isLogin) {
          onLogin(data.user, data.hasProfile, data.profile);
        } else {
          onLogin({ id: data.userId, email: formData.email, name: formData.name }, false, null);
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        position: 'absolute',
        top: '30px',
        right: '30px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span style={{ color: 'white', fontSize: '1.2rem' }}>🌐</span>
        <select
          value={language}
          onChange={(e) => { localStorage.setItem('govmithra_lang', e.target.value); onLanguageChange(e.target.value); }}
          style={{
            padding: '10px 36px 10px 14px',
            borderRadius: '20px',
            border: '2px solid rgba(255,255,255,0.5)',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            outline: 'none',
            appearance: 'none',
            backgroundImage: "url('data:image/svg+xml,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%2212%22 height%3D%228%22 viewBox%3D%220 0 12 8%22%3E%3Cpath fill%3D%22white%22 d%3D%22M6 8L0 0h12z%22%2F%3E%3C%2Fsvg%3E')",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            minWidth: '160px'
          }}
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code} style={{ background: '#667eea', color: 'white' }}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '50px',
        maxWidth: '450px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🤖</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>GovMithra</h1>
          <p style={{ color: '#64748b', marginTop: '5px' }}>
            {isLogin ? t.welcome : t.newUser}
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c33',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '500' }}>
                {t.name}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  border: '2px solid #e2e8f0',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '500' }}>
              {t.email}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '500' }}>
              {t.password}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          {!isLogin && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '500' }}>
                {t.confirmPassword}
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  border: '2px solid #e2e8f0',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '20px'
            }}
          >
            {loading ? 'Please wait...' : (isLogin ? t.login : t.signup)}
          </button>

          <div style={{ textAlign: 'center' }}>
            <span style={{ color: '#64748b' }}>
              {isLogin ? t.newUser : t.alreadyHaveAccount}{' '}
            </span>
            <span
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              style={{ color: '#667eea', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {isLogin ? t.signup : t.login}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- MAIN APP COMPONENT ---
export default function GovMithra() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [showProfileView, setShowProfileView] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [profileSchemesLoading, setProfileSchemesLoading] = useState(false);
  const [savedSchemes, setSavedSchemes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('govmithra_saved_schemes') || '[]'); } catch { return []; }
  });
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [showSavedSchemes, setShowSavedSchemes] = useState(false);
  // ── NEW FEATURE STATES ───────────────────────────────────────────
  const [explanations, setExplanations] = useState({});
  const [followups, setFollowups] = useState({});
  const [compareList, setCompareList] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [compareResult, setCompareResult] = useState(null);
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem("govmithra_recent_searches") || "[]"); } catch { return []; }
  });
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [savedSchemesSearch, setSavedSchemesSearch] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const t = translations[selectedLanguage] || translations['en'];

  // ── COPY TO CLIPBOARD ────────────────────────────────────────────
  const copyToClipboard = (text, msgId) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    });
  };

  // ── ELIGIBILITY MATCH SCORE ─────────────────────────────────────
  const getEligibilityScore = (scheme) => {
    if (!userProfile) return null;
    let matched = 0, total = 0;

    // 1. State match
    const schemeState = String(scheme.state || '').trim();
    if (schemeState && schemeState !== 'ANY' && schemeState !== 'Central') {
      total++;
      if ((userProfile.state || '').toLowerCase() === schemeState.toLowerCase()) matched++;
    } else {
      // Central / ANY / missing state = open to all, give full credit
      total++; matched++;
    }

    // 2. Target roles match
    const roles = Array.isArray(scheme.target_roles)
      ? scheme.target_roles.join(' ')
      : String(scheme.target_roles || '');
    const roleStr = roles.toLowerCase();
    total++;
    if (!roleStr || roleStr.includes('any') || roleStr.includes('all') || roleStr.includes('citizen')) {
      matched++;
    } else {
      const occ = (userProfile.occupation || '').toLowerCase();
      const age = parseInt(userProfile.age) || 0;
      if (occ && roleStr.includes(occ)) matched++;
      else if (roleStr.includes('parent') || roleStr.includes('guardian')) matched++;
      else if (age >= 60 && roleStr.includes('senior')) matched++;
      else if (age < 30 && (roleStr.includes('youth') || roleStr.includes('student'))) matched++;
    }

    // 3. Eligible categories / caste
    const cats = String(scheme.eligible_categories || '').trim();
    total++;
    if (!cats || cats === 'ANY') {
      matched++;
    } else {
      const caste = (userProfile.caste || '').toLowerCase();
      if (cats.toLowerCase().includes(caste) || cats.toLowerCase().includes('all')) matched++;
    }

    return Math.round((matched / total) * 100);
  };

  // ── SAVE / BOOKMARK SCHEME ───────────────────────────────────────
  const saveScheme = (scheme, schemeIdx, msgIdx) => {
    const key = `${msgIdx}-${schemeIdx}`;
    const isAlreadySaved = savedSchemes.some(s => s.key === key);
    let updated;
    if (isAlreadySaved) {
      updated = savedSchemes.filter(s => s.key !== key);
    } else {
      updated = [...savedSchemes, { key, scheme, savedAt: new Date().toLocaleString() }];
    }
    setSavedSchemes(updated);
    localStorage.setItem('govmithra_saved_schemes', JSON.stringify(updated));
  };

  const isSchemeBookmarked = (msgIdx, schemeIdx) => {
    return savedSchemes.some(s => s.key === `${msgIdx}-${schemeIdx}`);
  };

  // ── SHARE ON WHATSAPP ────────────────────────────────────────────
  const shareOnWhatsApp = (scheme) => {
    const schemeName = scheme.scheme_name || scheme.name || scheme.title || 'Government Scheme';
    const link = Object.values(scheme).find(v => String(v).startsWith('http')) || '';
    const text = `🏛️ *GovMithra - Government Scheme Info*\n\n📌 *${schemeName}*\n${
      Object.entries(scheme)
        .filter(([k, v]) => !String(v).startsWith('http') && v)
        .map(([k, v]) => `• ${k.replace(/_/g, ' ')}: ${v}`)
        .join('\n')
    }${link ? `\n\n🔗 More info: ${link}` : ''}\n\n_Shared via GovMithra_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // ── DOWNLOAD CHAT AS PDF ─────────────────────────────────────────
  const downloadChatPDF = () => {
    const printContent = `
      <html>
      <head>
        <title>GovMithra Chat - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 30px; color: #1e293b; }
          h1 { color: #667eea; border-bottom: 3px solid #667eea; padding-bottom: 10px; }
          .meta { color: #64748b; font-size: 0.9rem; margin-bottom: 30px; }
          .msg { margin-bottom: 20px; padding: 14px 18px; border-radius: 12px; }
          .user { background: #ede9fe; text-align: right; border-left: 4px solid #7c3aed; }
          .bot  { background: #f1f5f9; border-left: 4px solid #667eea; }
          .label { font-weight: bold; font-size: 0.8rem; text-transform: uppercase; 
                   letter-spacing: 1px; margin-bottom: 6px; color: #475569; }
          .scheme-card { margin-top: 12px; padding: 12px; background: white; 
                         border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; }
          .scheme-card p { margin: 4px 0; }
          a { color: #667eea; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>🏛️ GovMithra Conversation</h1>
        <p class="meta">👤 User: ${user?.name || 'User'} | 🗓️ Date: ${new Date().toLocaleString()}</p>
        ${messages.map(m => `
          <div class="msg ${m.type}">
            <div class="label">${m.type === 'user' ? '👤 You' : '🤖 GovMithra'}</div>
            <div>${m.text || ''}</div>
            ${m.isResults && m.results ? m.results.map(res => `
              <div class="scheme-card">
                ${Object.entries(res).map(([k, v]) => `
                  <p><strong>${k.replace(/_/g, ' ')}:</strong> ${
                    String(v).startsWith('http') 
                      ? `<a href="${v}">${v}</a>` 
                      : v
                  }</p>
                `).join('')}
              </div>
            `).join('') : ''}
          </div>
        `).join('')}
      </body>
      </html>
    `;
    const w = window.open('', '_blank');
    w.document.write(printContent);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 500);
  };

  // ── 1. SMART SCHEME EXPLAINER (no API) ──────────────────────────
  const jargonMap = {
    'beneficiary': 'person who gets help',
    'beneficiaries': 'people who get help',
    'subsidy': 'money discount from government',
    'subsidized': 'at lower cost with government help',
    'eligible': 'allowed to apply',
    'eligibility': 'who can apply',
    'scheme': 'government program',
    'implement': 'run',
    'disburse': 'give out money',
    'disbursement': 'giving out money',
    'Below Poverty Line': 'very poor families (BPL)',
    'Above Poverty Line': 'families not in extreme poverty (APL)',
    'annum': 'year',
    'per annum': 'every year',
    'financial assistance': 'money help',
    'assistance': 'help',
    'nodal agency': 'main government office in charge',
    'portal': 'government website',
    'gazette': 'official government document',
    'notified': 'officially announced',
    'stipend': 'monthly money support',
    'remuneration': 'payment for work',
    'domicile': 'where you permanently live',
    'marginalized': 'left out or ignored groups',
    'livelihood': 'way of earning money to live',
    'empowerment': 'giving people more control over their lives',
    'sanction': 'official approval',
    'allotment': 'giving out officially',
    'grievance': 'complaint',
    'redressal': 'solving a complaint',
  };

  const explainSchemeSimply = (scheme, msgIdx, schemeIdx) => {
  const key = `${msgIdx}-${schemeIdx}`;
  if (explanations[key]) {
    setExplanations(prev => { const n = { ...prev }; delete n[key]; return n; });
    return;
  }

  const textFields = Object.entries(scheme).filter(
    ([k, v]) => v && !String(v).startsWith('http') && String(v).trim().length > 0
  );
  const linkEntry = Object.entries(scheme).find(([k, v]) => String(v).startsWith('http'));
  const link = linkEntry ? linkEntry[1] : '';

  const find = (regex) => textFields.find(([k]) => regex.test(k))?.[1] || null;

  const name    = find(/name|title|scheme|yojana|program/i);
  const benefit = find(/benefit|amount|assist|subsid|grant|money|fund|support|help|aid|pension|incentive|award/i);
  const who     = find(/eligib|who|qualif|criteria|target|applicant|age|income|caste|beneficiar/i);
  const how     = find(/how|apply|process|step|procedure|register|enrol|mode|method/i);
  const docs    = find(/doc|paper|certif|proof|id|aadhaar|aadhar|required/i);
  const dept    = find(/dept|department|ministry|office|authority|nodal/i);
  const desc    = find(/desc|detail|about|overview|objective|purpose|info/i);

  // Detect scheme category for context-specific 5th document
  const allText = textFields.map(([k, v]) => `${k} ${v}`).join(' ').toLowerCase();
  let extraDoc = 'Income Certificate (issued by Tehsildar/SDM)';
  if (/student|scholar|education|school|college|study/i.test(allText))
    extraDoc = 'Bonafide Student Certificate / School Enrollment Proof';
  else if (/farmer|agricultur|kisan|crop|land/i.test(allText))
    extraDoc = 'Land Ownership Document / Khasra-Khatauni';
  else if (/disab|handicap|divyang/i.test(allText))
    extraDoc = 'Disability Certificate (issued by CMO)';
  else if (/widow|woman|female|mahila|girl/i.test(allText))
    extraDoc = 'Marriage Certificate / Death Certificate of Spouse (if widow)';
  else if (/sc|st|obc|caste|tribal|dalit/i.test(allText))
    extraDoc = 'Caste Certificate (issued by competent authority)';
  else if (/health|medical|hospital|treatment|insurance/i.test(allText))
    extraDoc = 'Medical Certificate / Health Card';
  else if (/house|housing|awas|shelter|construction/i.test(allText))
    extraDoc = 'Site Plan / Land Possession Certificate';
  else if (/business|enterprise|msme|loan|entrepreneur/i.test(allText))
    extraDoc = 'Business Registration Certificate / Project Report';
  else if (/employ|job|skill|training|worker/i.test(allText))
    extraDoc = 'Employment Registration Card / Skill Certificate';

  const schemeName = name || textFields[0]?.[1] || 'This Scheme';

  const parts = [];

  parts.push(`📌 Scheme Name: ${schemeName}`);

  if (desc) {
    parts.push(`💡 What is it: ${desc}`);
  } else if (benefit) {
    parts.push(`💡 What is it: A government scheme that provides ${benefit} to eligible citizens.`);
  } else {
    parts.push(`💡 What is it: A government welfare scheme for eligible citizens.`);
  }

  parts.push(`💰 What you get: ${benefit || 'Financial assistance / benefits as per scheme guidelines.'}`);

  parts.push(`✅ Who can apply: ${who || 'Indian citizens who meet the eligibility criteria set by the concerned department.'}`);

  parts.push(
    `📄 Documents needed:\n` +
    `  1. Aadhaar Card (mandatory for identity proof)\n` +
    `  2. Ration Card or BPL Certificate (for income/residence proof)\n` +
    `  3. Bank Passbook – first page (for direct benefit transfer)\n` +
    `  4. Passport-size Photograph (recent, colour)\n` +
    `  5. ${docs ? docs : extraDoc}`
  );

  parts.push(
    `📝 How to apply: ${
      how ||
      `Visit your nearest Common Service Centre (CSC) or the official government portal. ` +
      `Fill the application form, attach required documents, and submit. ` +
      `You will receive an acknowledgement slip after submission.`
    }`
  );

  if (dept) parts.push(`🏢 Managed by: ${dept}`);

  parts.push(link ? `🔗 More info: ${link}` : `🏢 Visit: Your nearest Common Service Centre (CSC) or District Collectorate office.`);

  setExplanations(prev => ({ ...prev, [key]: parts.join('\n\n') }));
};

  // ── 2. FOLLOW-UP QUESTION SUGGESTIONS (no API) ──────────────────
  // Multilingual follow-up question bank — keyed by language then topic
  const allFollowupBanks = {
    en: {
      housing:     ['How to apply for PM Awas Yojana?', 'Documents needed for housing scheme?', 'Check my housing application status'],
      health:      ['How to get Ayushman Bharat card?', 'Which hospitals are covered?', 'How to add family members to health scheme?'],
      education:   ['How to apply for this scholarship?', 'What is the last date to apply?', 'What is the scholarship amount?'],
      agriculture: ['How to register for crop insurance?', 'When will I receive the benefit?', 'Helpline number for farming schemes?'],
      pension:     ['How to apply for old age pension?', 'What is the monthly pension amount?', 'Documents needed for pension?'],
      jobs:        ['How to apply for this government job?', 'What is the eligibility criteria?', 'When is the application deadline?'],
      banking:     ['How to open a zero balance account?', 'What is Jan Dhan Yojana benefit?', 'Nearest bank for this scheme?'],
      lpg:         ['How to apply for new LPG connection?', 'What is the Ujjwala Yojana subsidy?', 'Check my LPG application status'],
      business:    ['How to register my small business?', 'What loans are available for MSME?', 'How to apply for MSME certificate?'],
      water:       ['How to apply for new water connection?', 'What is the water scheme subsidy?', 'Contact number for water department?'],
      electricity: ['How to apply for new electricity connection?', 'What is the electricity subsidy?', 'How to check application status?'],
      transport:   ['How to apply for driving licence?', 'Documents needed for vehicle registration?', 'Nearest RTO office location?'],
      youth:       ['What skill development courses are available?', 'How to enrol in a skill program?', 'Is there any stipend during training?'],
      default:     ['How do I apply for this?', 'What documents do I need?', 'Who is eligible for this scheme?'],
    },
    ta: {
      housing:     ['PM Awas Yojana விண்ணப்பிப்பது எப்படி?', 'வீட்டு திட்டத்திற்கு தேவையான ஆவணங்கள்?', 'என் வீட்டு விண்ணப்ப நிலையை சரிபார்க்க'],
      health:      ['Ayushman Bharat அட்டை எப்படி பெறுவது?', 'எந்த மருத்துவமனைகள் உள்ளடங்கும்?', 'குடும்ப உறுப்பினர்களை சேர்ப்பது எப்படி?'],
      education:   ['இந்த உதவித்தொகைக்கு விண்ணப்பிக்க எப்படி?', 'விண்ணப்பிக்க கடைசி தேதி என்ன?', 'உதவித்தொகை தொகை என்ன?'],
      agriculture: ['பயிர் காப்பீட்டில் பதிவு செய்வது எப்படி?', 'பலன் எப்போது கிடைக்கும்?', 'விவசாய திட்டங்களுக்கான helpline?'],
      pension:     ['முதியோர் ஓய்வூதியத்திற்கு விண்ணப்பிக்க?', 'மாதாந்திர ஓய்வூதியம் எவ்வளவு?', 'ஓய்வூதியத்திற்கு தேவையான ஆவணங்கள்?'],
      jobs:        ['இந்த அரசு வேலைக்கு விண்ணப்பிக்க எப்படி?', 'தகுதி நிபந்தனைகள் என்ன?', 'விண்ணப்ப கடைசி தேதி எப்போது?'],
      banking:     ['ஜீரோ பேலன்ஸ் கணக்கு திறப்பது எப்படி?', 'Jan Dhan Yojana பலன் என்ன?', 'அருகில் உள்ள வங்கி எங்கே?'],
      lpg:         ['புதிய LPG இணைப்புக்கு விண்ணப்பிக்க?', 'Ujjwala Yojana மானியம் என்ன?', 'LPG விண்ணப்ப நிலை சரிபார்க்க'],
      business:    ['என் சிறு தொழிலை பதிவு செய்வது எப்படி?', 'MSME கடன் கிடைக்குமா?', 'MSME சான்றிதழ் எப்படி பெறுவது?'],
      water:       ['புதிய தண்ணீர் இணைப்புக்கு விண்ணப்பிக்க?', 'தண்ணீர் திட்ட மானியம் என்ன?', 'தண்ணீர் துறை தொடர்பு எண்?'],
      electricity: ['புதிய மின் இணைப்புக்கு விண்ணப்பிக்க?', 'மின்சார மானியம் என்ன?', 'விண்ணப்ப நிலையை எப்படி சரிபார்க்க?'],
      transport:   ['ஓட்டுநர் உரிமம் எப்படி விண்ணப்பிக்க?', 'வாகன பதிவுக்கு தேவையான ஆவணங்கள்?', 'அருகில் உள்ள RTO அலுவலகம்?'],
      youth:       ['என்ன திறன் வளர்ச்சி படிப்புகள் உள்ளன?', 'திறன் திட்டத்தில் சேருவது எப்படி?', 'பயிற்சியில் stipend கிடைக்குமா?'],
      default:     ['இதற்கு விண்ணப்பிப்பது எப்படி?', 'என்ன ஆவணங்கள் தேவை?', 'யார் இதற்கு தகுதியானவர்?'],
    },
    hi: {
      housing:     ['PM Awas Yojana के लिए कैसे आवेदन करें?', 'आवास योजना के लिए कौन से दस्तावेज चाहिए?', 'अपने आवेदन की स्थिति जांचें'],
      health:      ['Ayushman Bharat कार्ड कैसे मिलेगा?', 'कौन से अस्पताल इसमें शामिल हैं?', 'परिवार के सदस्यों को कैसे जोड़ें?'],
      education:   ['इस छात्रवृत्ति के लिए आवेदन कैसे करें?', 'आवेदन की अंतिम तिथि क्या है?', 'छात्रवृत्ति की राशि कितनी है?'],
      agriculture: ['फसल बीमा में पंजीकरण कैसे करें?', 'लाभ कब मिलेगा?', 'कृषि योजनाओं का हेल्पलाइन नंबर?'],
      pension:     ['वृद्धावस्था पेंशन के लिए आवेदन कैसे करें?', 'मासिक पेंशन राशि कितनी है?', 'पेंशन के लिए कौन से दस्तावेज चाहिए?'],
      jobs:        ['इस सरकारी नौकरी के लिए कैसे आवेदन करें?', 'पात्रता मानदंड क्या हैं?', 'आवेदन की अंतिम तिथि कब है?'],
      banking:     ['जीरो बैलेंस खाता कैसे खोलें?', 'Jan Dhan Yojana का फायदा क्या है?', 'नजदीकी बैंक कहां है?'],
      lpg:         ['नया LPG कनेक्शन कैसे लें?', 'Ujjwala Yojana सब्सिडी कितनी है?', 'LPG आवेदन की स्थिति जांचें'],
      business:    ['अपना छोटा व्यवसाय कैसे पंजीकृत करें?', 'MSME के लिए कौन से लोन उपलब्ध हैं?', 'MSME प्रमाणपत्र कैसे पाएं?'],
      water:       ['नया पानी का कनेक्शन कैसे लें?', 'पानी योजना की सब्सिडी क्या है?', 'जल विभाग का संपर्क नंबर?'],
      electricity: ['नया बिजली कनेक्शन कैसे लें?', 'बिजली सब्सिडी क्या है?', 'आवेदन की स्थिति कैसे जांचें?'],
      transport:   ['ड्राइविंग लाइसेंस के लिए कैसे आवेदन करें?', 'वाहन पंजीकरण के लिए कौन से दस्तावेज?', 'नजदीकी RTO कार्यालय कहां है?'],
      youth:       ['कौन से कौशल विकास कोर्स हैं?', 'कौशल कार्यक्रम में कैसे दाखिला लें?', 'प्रशिक्षण के दौरान वजीफा मिलेगा?'],
      default:     ['इसके लिए कैसे आवेदन करें?', 'कौन से दस्तावेज चाहिए?', 'इस योजना के लिए कौन पात्र है?'],
    },
    te: {
      housing:     ['PM Awas Yojana కి ఎలా దరఖాస్తు చేయాలి?', 'ఇంటి పథకానికి ఏ పత్రాలు కావాలి?', 'నా దరఖాస్తు స్థితి తనిఖీ చేయండి'],
      health:      ['Ayushman Bharat కార్డ్ ఎలా పొందాలి?', 'ఏ ఆసుపత్రులు చేర్చబడ్డాయి?', 'కుటుంబ సభ్యులను ఎలా చేర్చాలి?'],
      education:   ['ఈ స్కాలర్‌షిప్‌కి ఎలా దరఖాస్తు చేయాలి?', 'చివరి తేదీ ఎప్పుడు?', 'స్కాలర్‌షిప్ మొత్తం ఎంత?'],
      agriculture: ['పంట బీమాలో నమోదు ఎలా చేయాలి?', 'ప్రయోజనం ఎప్పుడు వస్తుంది?', 'వ్యవసాయ పథకాల helpline?'],
      pension:     ['వృద్ధాప్య పెన్షన్‌కి దరఖాస్తు ఎలా?', 'నెలవారీ పెన్షన్ ఎంత?', 'పెన్షన్‌కి కావలసిన పత్రాలు?'],
      jobs:        ['ఈ ప్రభుత్వ ఉద్యోగానికి ఎలా దరఖాస్తు చేయాలి?', 'అర్హత ప్రమాణాలు ఏంటి?', 'దరఖాస్తు చివరి తేదీ?'],
      banking:     ['జీరో బ్యాలెన్స్ అకౌంట్ ఎలా తెరవాలి?', 'Jan Dhan Yojana ప్రయోజనం ఏంటి?', 'దగ్గరలో బ్యాంకు ఎక్కడ?'],
      lpg:         ['కొత్త LPG కనెక్షన్‌కి ఎలా దరఖాస్తు?', 'Ujjwala Yojana సబ్సిడీ ఎంత?', 'LPG దరఖాస్తు స్థితి తనిఖీ'],
      business:    ['నా చిన్న వ్యాపారాన్ని ఎలా నమోదు చేయాలి?', 'MSME రుణాలు అందుబాటులో ఉన్నాయా?', 'MSME సర్టిఫికెట్ ఎలా పొందాలి?'],
      water:       ['కొత్త నీటి కనెక్షన్‌కి ఎలా దరఖాస్తు?', 'నీటి పథకం సబ్సిడీ ఏంటి?', 'నీటి శాఖ సంప్రదింపు నంబర్?'],
      electricity: ['కొత్త విద్యుత్ కనెక్షన్‌కి ఎలా దరఖాస్తు?', 'విద్యుత్ సబ్సిడీ ఏంటి?', 'దరఖాస్తు స్థితి ఎలా తనిఖీ చేయాలి?'],
      transport:   ['డ్రైవింగ్ లైసెన్స్‌కి ఎలా దరఖాస్తు చేయాలి?', 'వాహన నమోదుకు కావలసిన పత్రాలు?', 'దగ్గరలో RTO కార్యాలయం ఎక్కడ?'],
      youth:       ['ఏ నైపుణ్య అభివృద్ధి కోర్సులు అందుబాటులో ఉన్నాయి?', 'నైపుణ్య కార్యక్రమంలో ఎలా చేరాలి?', 'శిక్షణలో stipend ఉంటుందా?'],
      default:     ['దీనికి ఎలా దరఖాస్తు చేయాలి?', 'ఏ పత్రాలు కావాలి?', 'ఈ పథకానికి ఎవరు అర్హులు?'],
    },
    ml: {
      housing:     ['PM Awas Yojana ൽ എങ്ങനെ അപേക്ഷിക്കാം?', 'ഭവന പദ്ധതിക്ക് ആവശ്യമായ രേഖകൾ?', 'എന്റെ അപേക്ഷ സ്ഥിതി പരിശോധിക്കുക'],
      health:      ['Ayushman Bharat കാർഡ് എങ്ങനെ ലഭിക്കും?', 'ഏത് ആശുപത്രികൾ ഉൾപ്പെടുന്നു?', 'കുടുംബാംഗങ്ങളെ എങ്ങനെ ചേർക്കാം?'],
      education:   ['ഈ സ്കോളർഷിപ്പിന് എങ്ങനെ അപേക്ഷിക്കാം?', 'അവസാന തീയതി എന്ന്?', 'സ്കോളർഷിപ്പ് തുക എത്ര?'],
      agriculture: ['വിള ഇൻഷുറൻസ് രജിസ്ട്രേഷൻ എങ്ങനെ?', 'ആനുകൂല്യം എപ്പോൾ ലഭിക്കും?', 'കൃഷി പദ്ധതി helpline?'],
      pension:     ['വൃദ്ധ പെൻഷനുള്ള അപേക്ഷ?', 'പ്രതിമാസ പെൻഷൻ തുക?', 'പെൻഷന് ആവശ്യമായ രേഖകൾ?'],
      jobs:        ['ഈ ഗവൺമെൻ്റ് ജോലിക്ക് അപേക്ഷ?', 'യോഗ്യതാ മാനദണ്ഡങ്ങൾ?', 'അവസാന അപേക്ഷ തീയതി?'],
      banking:     ['സീറോ ബാലൻസ് അക്കൗണ്ട് തുറക്കാൻ?', 'Jan Dhan ആനുകൂല്യം?', 'അടുത്തുള്ള ബാങ്ക്?'],
      lpg:         ['പുതിയ LPG കണക്ഷൻ?', 'Ujjwala Yojana സബ്സിഡി?', 'LPG അപേക്ഷ നില'],
      business:    ['ബിസിനസ്സ് രജിസ്ട്രേഷൻ?', 'MSME ലോൺ?', 'MSME സർട്ടിഫിക്കറ്റ്?'],
      water:       ['പുതിയ ജല കണക്ഷൻ?', 'ജല സബ്സിഡി?', 'ജലവിഭാഗ ഫോൺ?'],
      electricity: ['പുതിയ വൈദ്യുതി കണക്ഷൻ?', 'വൈദ്യുതി സബ്സിഡി?', 'അപേക്ഷ നില?'],
      transport:   ['ഡ്രൈവിംഗ് ലൈസൻസ്?', 'വാഹന രേഖകൾ?', 'RTO ഓഫീസ്?'],
      youth:       ['ലഭ്യമായ കോഴ്സുകൾ?', 'പ്രോഗ്രാം ചേരാൻ?', 'stipend ഉണ്ടോ?'],
      default:     ['ഇതിന് അപേക്ഷ?', 'ആവശ്യമായ രേഖകൾ?', 'ആർക്ക് യോഗ്യതയുണ്ട്?'],
    },
    kn: {
      housing:     ['PM Awas Yojana ಗೆ ಅರ್ಜಿ ಹೇಗೆ?', 'ವಸತಿ ಯೋಜನೆಗೆ ಯಾವ ದಾಖಲೆಗಳು?', 'ಅರ್ಜಿ ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ'],
      health:      ['Ayushman Bharat ಕಾರ್ಡ್ ಹೇಗೆ ಪಡೆಯುವುದು?', 'ಯಾವ ಆಸ್ಪತ್ರೆಗಳು ಸೇರಿವೆ?', 'ಕುಟುಂಬ ಸದಸ್ಯರನ್ನು ಸೇರಿಸುವುದು?'],
      education:   ['ಈ ವಿದ್ಯಾರ್ಥಿ ವೇತನಕ್ಕೆ ಅರ್ಜಿ ಹೇಗೆ?', 'ಕೊನೆಯ ದಿನಾಂಕ ಯಾವಾಗ?', 'ಮೊತ್ತ ಎಷ್ಟು?'],
      agriculture: ['ಬೆಳೆ ವಿಮೆ ನೋಂದಣಿ ಹೇಗೆ?', 'ಲಾಭ ಯಾವಾಗ ಸಿಗುತ್ತದೆ?', 'ಕೃಷಿ helpline?'],
      pension:     ['ವೃದ್ಧಾಪ್ಯ ಪಿಂಚಣಿ ಅರ್ಜಿ?', 'ಮಾಸಿಕ ಪಿಂಚಣಿ ಮೊತ್ತ?', 'ಅಗತ್ಯ ದಾಖಲೆಗಳು?'],
      jobs:        ['ಸರ್ಕಾರಿ ನೌಕರಿ ಅರ್ಜಿ?', 'ಅರ್ಹತೆ ಮಾನದಂಡ?', 'ಕೊನೆಯ ದಿನಾಂಕ?'],
      banking:     ['ಶೂನ್ಯ ಬ್ಯಾಲೆನ್ಸ್ ಖಾತೆ ತೆರೆಯಲು?', 'Jan Dhan ಪ್ರಯೋಜನ?', 'ಹತ್ತಿರದ ಬ್ಯಾಂಕ್?'],
      lpg:         ['LPG ಸಂಪರ್ಕ ಅರ್ಜಿ?', 'Ujjwala ಸಬ್ಸಿಡಿ?', 'ಅರ್ಜಿ ಸ್ಥಿತಿ?'],
      business:    ['ಉದ್ಯಮ ನೋಂದಣಿ?', 'MSME ಸಾಲ?', 'MSME ಪ್ರಮಾಣಪತ್ರ?'],
      water:       ['ನೀರು ಸಂಪರ್ಕ ಅರ್ಜಿ?', 'ಸಬ್ಸಿಡಿ ಏನು?', 'ಜಲ ಇಲಾಖೆ ಸಂಪರ್ಕ?'],
      electricity: ['ವಿದ್ಯುತ್ ಸಂಪರ್ಕ ಅರ್ಜಿ?', 'ವಿದ್ಯುತ್ ಸಬ್ಸಿಡಿ?', 'ಅರ್ಜಿ ಸ್ಥಿತಿ?'],
      transport:   ['ಚಾಲನಾ ಪರವಾನಗಿ?', 'ವಾಹನ ಅಗತ್ಯ ದಾಖಲೆ?', 'RTO ಕಚೇರಿ?'],
      youth:       ['ಕೌಶಲ್ಯ ಕೋರ್ಸ್‌ಗಳು?', 'ತರಬೇತಿ ಸೇರಲು?', 'stipend ಸಿಗುತ್ತಾ?'],
      default:     ['ಅರ್ಜಿ ಹೇಗೆ?', 'ಯಾವ ದಾಖಲೆ?', 'ಯಾರು ಅರ್ಹರು?'],
    },
    bn: {
      housing:     ['PM Awas Yojana এ আবেদন করব কীভাবে?', 'আবাসন প্রকল্পে কী কী কাগজ লাগবে?', 'আবেদনের অবস্থা যাচাই করুন'],
      health:      ['Ayushman Bharat কার্ড কীভাবে পাব?', 'কোন হাসপাতাল অন্তর্ভুক্ত?', 'পরিবারের সদস্য কীভাবে যোগ করব?'],
      education:   ['এই বৃত্তির জন্য কীভাবে আবেদন করব?', 'শেষ তারিখ কবে?', 'বৃত্তির পরিমাণ কত?'],
      agriculture: ['ফসল বীমায় নিবন্ধন কীভাবে?', 'সুবিধা কবে পাব?', 'কৃষি যোজনার helpline?'],
      pension:     ['বৃদ্ধ বয়স পেনশনে আবেদন কীভাবে?', 'মাসিক পেনশন কত?', 'পেনশনের কাগজপত্র?'],
      jobs:        ['সরকারি চাকরির আবেদন কীভাবে?', 'যোগ্যতার মানদণ্ড কী?', 'আবেদনের শেষ তারিখ?'],
      banking:     ['জিরো ব্যালেন্স অ্যাকাউন্ট খুলব কীভাবে?', 'Jan Dhan সুবিধা কী?', 'কাছের ব্যাংক কোথায়?'],
      lpg:         ['নতুন LPG সংযোগ কীভাবে নেব?', 'Ujjwala ভর্তুকি কত?', 'LPG আবেদনের অবস্থা'],
      business:    ['ছোট ব্যবসা নিবন্ধন?', 'MSME ঋণ পাব কীভাবে?', 'MSME সার্টিফিকেট?'],
      water:       ['পানির সংযোগ কীভাবে নেব?', 'পানি প্রকল্পের ভর্তুকি?', 'জল বিভাগের নম্বর?'],
      electricity: ['বিদ্যুৎ সংযোগ কীভাবে?', 'বিদ্যুৎ ভর্তুকি?', 'আবেদনের অবস্থা?'],
      transport:   ['ড্রাইভিং লাইসেন্সের আবেদন?', 'যানবাহন নিবন্ধনের কাগজ?', 'নিকটতম RTO?'],
      youth:       ['দক্ষতা উন্নয়ন কোর্স কী কী?', 'কোর্সে ভর্তি কীভাবে?', 'প্রশিক্ষণে stipend?'],
      default:     ['এর জন্য আবেদন কীভাবে?', 'কী কী কাগজ দরকার?', 'কারা যোগ্য?'],
    },
    mr: { housing: ['PM Awas Yojana साठी अर्ज कसा करायचा?','आवास योजनेसाठी कोणते दस्तऐवज लागतात?','अर्जाची स्थिती तपासा'], health: ['Ayushman Bharat कार्ड कसे मिळवायचे?','कोणते रुग्णालय समाविष्ट आहे?','कुटुंब सदस्य कसे जोडायचे?'], education: ['या शिष्यवृत्तीसाठी अर्ज कसा?','अर्जाची अंतिम तारीख?','शिष्यवृत्तीची रक्कम किती?'], agriculture: ['पीक विमा नोंदणी कशी?','लाभ कधी मिळेल?','कृषी helpline?'], pension: ['वृद्धापकाळ पेन्शनसाठी अर्ज?','मासिक पेन्शन किती?','पेन्शनसाठी दस्तऐवज?'], jobs: ['सरकारी नोकरीसाठी अर्ज?','पात्रता निकष काय?','अर्जाची अंतिम तारीख?'], banking: ['शून्य शिल्लक खाते कसे उघडायचे?','Jan Dhan फायदा?','जवळील बँक?'], lpg: ['नवीन LPG जोडणी?','Ujjwala अनुदान?','LPG अर्ज स्थिती'], business: ['व्यवसाय नोंदणी?','MSME कर्ज?','MSME प्रमाणपत्र?'], water: ['पाणी जोडणी?','पाणी अनुदान?','जल विभाग संपर्क?'], electricity: ['वीज जोडणी?','वीज अनुदान?','अर्ज स्थिती?'], transport: ['वाहन परवाना?','वाहन कागदपत्रे?','RTO कार्यालय?'], youth: ['कौशल्य कोर्स?','नोंदणी कशी?','stipend मिळेल?'], default: ['अर्ज कसा करायचा?','कोणते दस्तऐवज?','कोण पात्र?'] },
    gu: { housing: ['PM Awas Yojana માટે અરજી?','દસ્તાવેજો?','અરજી સ્થિતિ'], health: ['Ayushman Bharat કાર્ડ?','હોસ્પિટલ?','સભ્ય ઉમેરો?'], education: ['શિષ્યવૃત્તિ?','છેલ્લી તારીખ?','રકમ?'], agriculture: ['પાક વીમો?','ફાયદો ક્યારે?','helpline?'], pension: ['પેન્શન?','રકમ?','દસ્તાવેજ?'], jobs: ['નોકરી?','લાયકાત?','છેલ્લી તારીખ?'], banking: ['ઝીરો બૅલેન્સ?','Jan Dhan?','બૅંક?'], lpg: ['LPG?','સબ્સિડી?','સ્થિતિ?'], business: ['નોંધણી?','MSME?','પ્રમાણપત્ર?'], water: ['જળ જોડાણ?','સબ્સિડી?','ફોન?'], electricity: ['વીજ જોડાણ?','સબ્સિડી?','સ્થિતિ?'], transport: ['લાઇસન્સ?','દસ્તાવેજ?','RTO?'], youth: ['કૌશલ્ય?','નોંધણી?','stipend?'], default: ['અરજી?','દસ્તાવેજ?','પાત્ર?'] },
    pa: { housing: ['PM Awas Yojana ਲਈ ਅਰਜ਼ੀ?','ਦਸਤਾਵੇਜ਼?','ਅਰਜ਼ੀ ਸਥਿਤੀ'], health: ['Ayushman Bharat ਕਾਰਡ?','ਹਸਪਤਾਲ?','ਮੈਂਬਰ ਜੋੜੋ?'], education: ['ਵਜ਼ੀਫ਼ਾ?','ਆਖਰੀ ਤਾਰੀਖ਼?','ਰਕਮ?'], agriculture: ['ਫ਼ਸਲ ਬੀਮਾ?','ਕਦੋਂ ਮਿਲੇਗਾ?','helpline?'], pension: ['ਪੈਨਸ਼ਨ?','ਰਕਮ?','ਦਸਤਾਵੇਜ਼?'], jobs: ['ਨੌਕਰੀ?','ਯੋਗਤਾ?','ਆਖਰੀ ਤਾਰੀਖ਼?'], banking: ['ਖ਼ਾਤਾ?','Jan Dhan?','ਬੈਂਕ?'], lpg: ['LPG?','ਸਬਸਿਡੀ?','ਸਥਿਤੀ?'], business: ['ਕਾਰੋਬਾਰ?','MSME?','ਸਰਟੀਫ਼ਿਕੇਟ?'], water: ['ਪਾਣੀ?','ਸਬਸਿਡੀ?','ਫ਼ੋਨ?'], electricity: ['ਬਿਜਲੀ?','ਸਬਸਿਡੀ?','ਸਥਿਤੀ?'], transport: ['ਲਾਇਸੈਂਸ?','ਦਸਤਾਵੇਜ਼?','RTO?'], youth: ['ਕੋਰਸ?','ਦਾਖ਼ਲਾ?','stipend?'], default: ['ਅਰਜ਼ੀ?','ਦਸਤਾਵੇਜ਼?','ਯੋਗ?'] },
    or: { housing: ['PM Awas Yojana?','ଦଲିଲ?','ଆବେଦନ ସ୍ଥିତି'], health: ['Ayushman Bharat?','ଡାକ୍ତରଖାନା?','ସଦସ୍ୟ?'], education: ['ବୃତ୍ତି?','ଶେଷ ତାରିଖ?','ପ୍ରମାଣ?'], agriculture: ['ଫସଲ ବୀମା?','ଲାଭ?','helpline?'], pension: ['ପେନ୍‌ଶନ?','ଟଙ୍କା?','ଦଲିଲ?'], jobs: ['ଚାକିରି?','ଯୋଗ୍ୟତା?','ତାରିଖ?'], banking: ['ଖାତା?','Jan Dhan?','ବ୍ୟାଙ୍କ?'], lpg: ['LPG?','ଭର୍ତୁକି?','ସ୍ଥିତି?'], business: ['ପଞ୍ଜୀକରଣ?','MSME?','ସାର୍ଟ?'], water: ['ଜଳ?','ଭର୍ତୁକି?','ଫୋନ?'], electricity: ['ବିଦ୍ୟୁତ?','ଭର୍ତୁକି?','ସ୍ଥିତି?'], transport: ['ଲାଇସେନ୍ସ?','ଦଲିଲ?','RTO?'], youth: ['ଶ୍ରମ?','ଯୋଗ?','stipend?'], default: ['ଆବେଦନ?','ଦଲିଲ?','ଯୋଗ୍ୟ?'] },
    as: { housing: ['PM Awas Yojana?','কাগজপত্ৰ?','আবেদনৰ অৱস্থা'], health: ['Ayushman Bharat?','চিকিৎসালয়?','সদস্য?'], education: ['বৃত্তি?','শেষ তাৰিখ?','পৰিমাণ?'], agriculture: ['শস্য বীমা?','সুবিধা?','helpline?'], pension: ['পেঞ্চন?','পৰিমাণ?','কাগজপত্ৰ?'], jobs: ['চাকৰি?','যোগ্যতা?','তাৰিখ?'], banking: ['একাউণ্ট?','Jan Dhan?','বেংক?'], lpg: ['LPG?','ৰাজসাহায্য?','অৱস্থা?'], business: ['পঞ্জীয়ন?','MSME?','প্ৰমাণপত্ৰ?'], water: ['পানী?','ৰাজসাহায্য?','ফোন?'], electricity: ['বিদ্যুৎ?','ৰাজসাহায্য?','অৱস্থা?'], transport: ['লাইচেন্স?','কাগজপত্ৰ?','RTO?'], youth: ['পাঠ্যক্ৰম?','নামভৰ্তি?','stipend?'], default: ['আবেদন?','কাগজপত্ৰ?','যোগ্য?'] },
    ur: { housing: ['PM Awas Yojana?','دستاویزات?','درخواست کی حیثیت'], health: ['Ayushman Bharat?','ہسپتال?','خاندان؟'], education: ['وظیفہ?','آخری تاریخ?','رقم?'], agriculture: ['فصل بیمہ?','فائدہ?','helpline?'], pension: ['پنشن?','رقم?','دستاویز?'], jobs: ['نوکری?','اہلیت?','تاریخ?'], banking: ['اکاؤنٹ?','Jan Dhan?','بینک?'], lpg: ['LPG?','سبسڈی?','حیثیت?'], business: ['رجسٹریشن?','MSME?','سرٹیفیکیٹ?'], water: ['پانی?','سبسڈی?','فون?'], electricity: ['بجلی?','سبسڈی?','حیثیت?'], transport: ['لائسنس?','دستاویز?','RTO?'], youth: ['کورس?','داخلہ?','stipend?'], default: ['درخواست?','دستاویزات?','اہل?'] },
  };

  // Pick the bank for current language, fallback to English
  const followupBank = allFollowupBanks[selectedLanguage] || allFollowupBanks['en'];

  const attachFollowups = (botText, msgIdx) => {
    if (!botText || botText.length < 20) return;
    const text = botText.toLowerCase();
    let questions;
    if (text.includes('hous') || text.includes('awas') || text.includes('pmay'))                return setFollowups(prev => ({ ...prev, [msgIdx]: followupBank.housing }));
    if (text.includes('health') || text.includes('ayushman') || text.includes('hospital'))      return setFollowups(prev => ({ ...prev, [msgIdx]: followupBank.health }));
    if (text.includes('scholar') || text.includes('education') || text.includes('student'))     return setFollowups(prev => ({ ...prev, [msgIdx]: followupBank.education }));
    if (text.includes('farm') || text.includes('crop') || text.includes('kisan'))               return setFollowups(prev => ({ ...prev, [msgIdx]: followupBank.agriculture }));
    if (text.includes('pension') || text.includes('old age') || text.includes('retired'))       return setFollowups(prev => ({ ...prev, [msgIdx]: followupBank.pension }));
    if (text.includes('job') || text.includes('employ') || text.includes('vacancy'))            return setFollowups(prev => ({ ...prev, [msgIdx]: followupBank.jobs }));
    if (text.includes('bank') || text.includes('jan dhan') || text.includes('account'))         return setFollowups(prev => ({ ...prev, [msgIdx]: followupBank.banking }));
    if (text.includes('lpg') || text.includes('gas') || text.includes('ujjwala'))               return setFollowups(prev => ({ ...prev, [msgIdx]: followupBank.lpg }));
    if (text.includes('business') || text.includes('msme') || text.includes('entrepren'))       return setFollowups(prev => ({ ...prev, [msgIdx]: followupBank.business }));
    if (text.includes('water') || text.includes('jal'))                                         return setFollowups(prev => ({ ...prev, [msgIdx]: followupBank.water }));
    if (text.includes('electric') || text.includes('power') || text.includes('saubhagya'))      return setFollowups(prev => ({ ...prev, [msgIdx]: followupBank.electricity }));
    if (text.includes('transport') || text.includes('driving') || text.includes('vehicle'))     return setFollowups(prev => ({ ...prev, [msgIdx]: followupBank.transport }));
    if (text.includes('youth') || text.includes('skill') || text.includes('training'))          return setFollowups(prev => ({ ...prev, [msgIdx]: followupBank.youth }));
    setFollowups(prev => ({ ...prev, [msgIdx]: followupBank.default }));
  };

  // ── 3. SCHEME COMPARISON (no API) ───────────────────────────────
  const toggleCompare = (scheme, label, msgIdx, schemeIdx) => {
    const key = `${msgIdx}-${schemeIdx}`;
    setCompareList(prev => {
      const exists = prev.find(s => s.key === key);
      if (exists) return prev.filter(s => s.key !== key);
      if (prev.length >= 3) {
        alert(t.compareMax);
        return prev;
      }
      return [...prev, { key, scheme, label }];
    });
  };

  const isInCompare = (msgIdx, schemeIdx) =>
    compareList.some(s => s.key === `${msgIdx}-${schemeIdx}`);

  const runComparison = () => {
    if (compareList.length < 2) return;
    const schemes = compareList.map(s => s.scheme);

    // Separate URL keys from text keys
    const allKeys = [...new Set(schemes.flatMap(s => Object.keys(s)))];
    const textKeys = allKeys.filter(k =>
      !schemes.every(s => String(s[k] || '').startsWith('http'))
    );
    const linkKeys = allKeys.filter(k =>
      schemes.some(s => String(s[k] || '').startsWith('http'))
    );

    // Priority field ordering: name/title first, benefit/amount second, eligibility third, rest alphabetically
    const priorityOrder = [
      /name|title|scheme|yojana|program/i,
      /benefit|amount|assist|grant|fund|money|pension|award/i,
      /eligib|who|criteria|target|income|caste/i,
      /how|apply|process|step/i,
      /doc|paper|certif|proof/i,
      /dept|ministry|office/i,
    ];
    const sortedKeys = [...textKeys].sort((a, b) => {
      const ai = priorityOrder.findIndex(r => r.test(a));
      const bi = priorityOrder.findIndex(r => r.test(b));
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    const headers = ['Feature', ...compareList.map(s => s.label || 'Scheme')];

    // Build rows: highlight differing cells
    const rows = sortedKeys.map(key => {
      const cells = schemes.map(s => s[key] || '—');
      const allSame = cells.every(c => c === cells[0]);
      return {
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        cells,
        isDiff: !allSame,
      };
    });

    // Build link rows separately
    const linkRows = linkKeys.map(key => ({
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      cells: schemes.map(s => s[key] || ''),
      isLink: true,
    }));

    setCompareResult({ headers, rows, linkRows });
    setShowCompare(true);
  };

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' },
    { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'bn', name: 'বাংলা', flag: '🇮🇳' },
    { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
    { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
    { code: 'or', name: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
    { code: 'as', name: 'অসমীয়া', flag: '🇮🇳' },
    { code: 'ur', name: 'اردو', flag: '🇮🇳' }
  ];

  const sidebarCategories = [
    { icon: '📜', label: t.categories_list.certificates, q: t.queries.certificates },
    { icon: '🎓', label: t.categories_list.education, q: t.queries.education },
    { icon: '🛂', label: t.categories_list.passports, q: t.queries.passports },
    { icon: '💼', label: t.categories_list.jobs, q: t.queries.jobs },
    { icon: '🚌', label: t.categories_list.bus, q: t.queries.bus },
    { icon: '💰', label: t.categories_list.tax, q: t.queries.tax },
    { icon: '🏦', label: t.categories_list.banking, q: t.queries.banking },
    { icon: '🏥', label: t.categories_list.health, q: t.queries.health },
    { icon: '🔥', label: t.categories_list.lpg, q: t.queries.lpg },
    { icon: '⚡', label: t.categories_list.electricity, q: t.queries.electricity },
    { icon: '💧', label: t.categories_list.water, q: t.queries.water },
    { icon: '🏠', label: t.categories_list.housing, q: t.queries.housing },
    { icon: '🏢', label: t.categories_list.business, q: t.queries.business },
    { icon: '⚖️', label: t.categories_list.justice, q: t.queries.justice },
    { icon: '👴', label: t.categories_list.pension, q: t.queries.pension },
    { icon: '📝', label: t.categories_list.exams, q: t.queries.exams },
    { icon: '🎾', label: t.categories_list.sports, q: t.queries.sports },
    { icon: '📍', label: t.categories_list.local, q: t.queries.local },
    { icon: '💻', label: t.categories_list.science, q: t.queries.science },
    { icon: '🚦', label: t.categories_list.transport, q: t.queries.transport },
    { icon: '🌴', label: t.categories_list.tourism, q: t.queries.tourism },
    { icon: '🧒', label: t.categories_list.youth, q: t.queries.youth }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setLoadingProgress(old => {
        if (old >= 100) {
          clearInterval(timer);
          setTimeout(() => setIsLoading(false), 800);
          return 100;
        }
        return old + 10;
      });
    }, 150);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBotTyping]);

  const handleLogin = (userData, hasProfile, profile) => {
    setUser(userData);
    if (hasProfile) {
      setUserProfile(profile);
      setIsAuthenticated(true);
      setNeedsProfile(false);
    } else {
      setNeedsProfile(true);
    }
  };

  const handleProfileComplete = (profile) => {
    setUserProfile(profile);
    setNeedsProfile(false);
    setIsEditingProfile(false);
    setIsAuthenticated(true);
    setShowProfileView(false);
  };

  const handleProfileSkip = () => {
    if (isEditingProfile) {
      setIsEditingProfile(false);
      setShowProfileView(true);
    } else {
      setNeedsProfile(false);
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setUserProfile(null);
    setIsAuthenticated(false);
    setMessages([]);
    setShowProfileView(false);
    setIsEditingProfile(false);
  };

  const handleSend = async (forcedQuery = null) => {
    const query = forcedQuery || inputText;
    if (!query.trim()) return;

    setMessages(prev => [...prev, { type: 'user', text: query, timestamp: new Date() }]);
    setInputText('');
    setShowRecentSearches(false);
    setIsBotTyping(true);
    // Save to recent searches (max 8, no duplicates)
    setRecentSearches(prev => {
      const updated = [query, ...prev.filter(q => q !== query)].slice(0, 8);
      localStorage.setItem('govmithra_recent_searches', JSON.stringify(updated));
      return updated;
    });

    // Sync current language slot to Rasa before every message
    const convId = user?.email || "user_session";
    try {
      await fetch(`${RASA_URL}/conversations/${convId}/tracker/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ event: 'slot', name: 'user_language', value: selectedLanguage }])
      });
    } catch (_) {}

    try {
      const response = await fetch('http://localhost:5005/webhooks/rest/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: user?.email || "user_session",
          message: query,
          metadata: { 
            language: selectedLanguage,
            userProfile: userProfile
          }
        })
      });

      const data = await response.json();
      setIsBotTyping(false);

      data.forEach(msg => {
        setMessages(prev => {
          const newMsgs = [...prev, {
            type: 'bot',
            text: msg.text,
            results: msg.custom ? msg.custom.data : null,
            isResults: !!msg.custom,
            timestamp: new Date()
          }];
          // attach follow-up questions for plain text replies
          if (msg.text && !msg.custom) {
            const newIdx = newMsgs.length - 1;
            setTimeout(() => attachFollowups(msg.text, newIdx), 100);
          }
          return newMsgs;
        });
      });
    } catch (e) {
      setIsBotTyping(false);
      setMessages(prev => [...prev, { type: 'bot', text: 'Service offline.' }]);
    }
  };

  // ── GIVE SCHEMES BY PROFILE ─────────────────────────────────────
  const handleGetSchemesByProfile = async () => {
    if (!user?.id) return;
    setProfileSchemesLoading(true);

    try {
      // Step 1: Fetch profile from SQLite via Express
      const profileRes = await fetch(`${BACKEND_URL}/api/profile/${user.id}`);
      const profileData = await profileRes.json();

      if (!profileData.success || !profileData.profile) {
        setMessages(prev => [...prev, {
          type: 'bot',
          text: '⚠️ Please complete your profile first to get personalised scheme recommendations.',
          timestamp: new Date()
        }]);
        setProfileSchemesLoading(false);
        return;
      }

      const profile = profileData.profile;

      // Step 2: Map DB columns to Rasa slot events
      const slotEvents = [
        { event: 'slot', name: 'user_age',            value: profile.age?.toString()    || null },
        { event: 'slot', name: 'user_gender',         value: profile.gender             || null },
        { event: 'slot', name: 'user_caste',          value: profile.caste              || null },
        { event: 'slot', name: 'user_city',           value: profile.city               || null },
        { event: 'slot', name: 'user_state',          value: profile.state              || null },
        { event: 'slot', name: 'user_occupation',     value: profile.occupation         || null },
        { event: 'slot', name: 'user_income',         value: profile.income_range       || null },
        { event: 'slot', name: 'user_education',      value: profile.education_level    || null },
        { event: 'slot', name: 'user_marital_status', value: profile.marital_status     || null },
        { event: 'slot', name: 'user_disability',     value: profile.disability         || null },
        { event: 'slot', name: 'user_ration_card',    value: profile.ration_card_type   || null },
        { event: 'slot', name: 'user_land_ownership', value: profile.land_ownership     || null },
      ].filter(s => s.value !== null && s.value !== '');

      if (slotEvents.length === 0) {
        setMessages(prev => [...prev, {
          type: 'bot',
          text: '⚠️ Your profile is empty. Please fill in your details first.',
          timestamp: new Date()
        }]);
        setProfileSchemesLoading(false);
        return;
      }

      // Step 3: Push slots to Rasa tracker
      const conversationId = user.email || user.id.toString();
      await fetch(`${RASA_URL}/conversations/${conversationId}/tracker/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slotEvents)
      });

      // Step 4: Show user message in chat
      setMessages(prev => [...prev, {
        type: 'user',
        text: '🎯 Give schemes based on my profile',
        timestamp: new Date()
      }]);
      setIsBotTyping(true);

      // Step 5: Send trigger message to Rasa via backend
      const chatRes = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: conversationId,
          message: 'give schemes based on my profile',
          metadata: { language: selectedLanguage, userProfile: profile }
        })
      });

      const chatData = await chatRes.json();
      setIsBotTyping(false);

      if (chatData.success && chatData.messages?.length > 0) {
        chatData.messages.forEach(msg => {
          setMessages(prev => [...prev, {
            type: 'bot',
            text: msg.text,
            results: msg.custom ? msg.custom.data : null,
            isResults: !!msg.custom,
            timestamp: new Date()
          }]);
        });
      } else {
        setMessages(prev => [...prev, {
          type: 'bot',
          text: '⚠️ Could not fetch schemes right now. Please try again.',
          timestamp: new Date()
        }]);
      }

    } catch (err) {
      console.error('Profile schemes error:', err);
      setIsBotTyping(false);
      setMessages(prev => [...prev, {
        type: 'bot',
        text: '⚠️ Something went wrong. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setProfileSchemesLoading(false);
    }
  };

  if (isLoading) return <LoadingPage progress={loadingProgress} language={selectedLanguage} />;
  if (!isAuthenticated && !needsProfile) return <AuthPage onLogin={handleLogin} language={selectedLanguage} onLanguageChange={setSelectedLanguage} />;
  if (needsProfile) return <ProfileForm user={user} existingProfile={null} onComplete={handleProfileComplete} onSkip={handleProfileSkip} language={selectedLanguage} isEditMode={false} />;
  if (showProfileView && !isEditingProfile) {
    return <ProfileViewPage 
      user={user} 
      profile={userProfile} 
      onBack={() => setShowProfileView(false)}
      onStartEdit={() => setIsEditingProfile(true)}
      language={selectedLanguage}
    />;
  }
  if (isEditingProfile) {
    return <ProfileForm 
      user={user} 
      existingProfile={userProfile}
      onComplete={handleProfileComplete} 
      onSkip={handleProfileSkip} 
      language={selectedLanguage}
      isEditMode={true}
    />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f1f5f9' }}>
      {/* SIDEBAR */}
      <div style={{
        width: '350px',
        background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        padding: '25px',
        overflowY: 'auto',
        boxShadow: '4px 0 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ fontSize: '3rem' }}>🤖</div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold', color: 'white' }}>GovMithra</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                {user?.name}
              </p>
            </div>
          </div>
        </div>

        {/* View Profile Button */}
        <button
          onClick={() => setShowProfileView(true)}
          style={{
            padding: '14px 20px',
            borderRadius: '15px',
            border: '2px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '1rem',
            marginBottom: '15px',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            justifyContent: 'center'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>👤</span>
          {t.viewProfile}
        </button>

        {/* Give Schemes by Profile Button */}
        <button
          onClick={handleGetSchemesByProfile}
          disabled={profileSchemesLoading}
          style={{
            padding: '14px 20px',
            borderRadius: '15px',
            border: 'none',
            background: profileSchemesLoading
              ? 'rgba(255,255,255,0.3)'
              : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            cursor: profileSchemesLoading ? 'not-allowed' : 'pointer',
            fontWeight: '700',
            fontSize: '0.95rem',
            marginBottom: '15px',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            justifyContent: 'center',
            boxShadow: profileSchemesLoading ? 'none' : '0 4px 15px rgba(245, 87, 108, 0.4)',
            opacity: profileSchemesLoading ? 0.7 : 1
          }}
        >
          {profileSchemesLoading ? (
            <>
              <span style={{ fontSize: '1.1rem' }}>⏳</span>
              Finding schemes...
            </>
          ) : (
            <>
              <span style={{ fontSize: '1.1rem' }}>🎯</span>
              Schemes for My Profile
            </>
          )}
        </button>

        {/* Language Selector */}
        <div style={{ marginBottom: '15px' }}>
          <p style={{ 
            color: 'rgba(255,255,255,0.7)', 
            fontSize: '0.85rem', 
            marginBottom: '10px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            🌐 {t.selectLanguage}
          </p>
          <select
            value={selectedLanguage}
            onChange={(e) => {
              const newLang = e.target.value;
              setSelectedLanguage(newLang);
              localStorage.setItem('govmithra_lang', newLang);
              // Push updated language slot to Rasa immediately
              const convId = user?.email || "user_session";
              fetch(`${RASA_URL}/conversations/${convId}/tracker/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([{ event: 'slot', name: 'user_language', value: newLang }])
              }).catch(() => {});
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '2px solid rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              backgroundImage: "url('data:image/svg+xml,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%2212%22 height%3D%228%22 viewBox%3D%220 0 12 8%22%3E%3Cpath fill%3D%22white%22 d%3D%22M6 8L0 0h12z%22%2F%3E%3C%2Fsvg%3E')",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 14px center',
              paddingRight: '36px',
              backdropFilter: 'blur(10px)'
            }}
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code} style={{ background: '#667eea', color: 'white' }}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            padding: '12px 20px',
            borderRadius: '15px',
            border: '2px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '1rem',
            marginBottom: '25px',
            transition: 'all 0.3s'
          }}
        >
          🚪 {t.logout}
        </button>

        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '20px', color: 'white', opacity: 0.9 }}>
          {t.categories}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sidebarCategories.map((cat, i) => (
            <button
              key={i}
              onClick={() => {
                setInputText(cat.q);
                inputRef.current?.focus();
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '16px 20px',
                border: 'none',
                borderRadius: '15px',
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                transition: 'all 0.3s',
                color: 'white',
                fontWeight: '500'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{cat.icon}</span>
              <span style={{ fontSize: '0.95rem' }}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CHAT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
        <div style={{
          padding: '20px 30px',
          background: 'white',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '1.5rem', 
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            GovMithra Assistant
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Your AI-powered government services companion
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setShowSavedSchemes(!showSavedSchemes)}
            title="Saved Schemes"
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: '2px solid #e2e8f0',
              background: showSavedSchemes ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
              color: showSavedSchemes ? 'white' : '#64748b',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {t.savedSchemes} {savedSchemes.length > 0 && `(${savedSchemes.length})`}
          </button>
          <button
            onClick={downloadChatPDF}
            disabled={messages.length === 0}
            title="Download Chat as PDF"
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: '2px solid #e2e8f0',
              background: messages.length === 0 ? '#f8fafc' : 'white',
              color: messages.length === 0 ? '#cbd5e1' : '#64748b',
              cursor: messages.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {t.downloadPdf}
          </button>
        </div>
      </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '30px',
          display: 'flex',
          flexDirection: 'column',
          background: '#f8fafc'
        }}>
          {/* SAVED SCHEMES PANEL */}
          {showSavedSchemes && (
            <div style={{
              marginBottom: '20px',
              background: 'white',
              borderRadius: '16px',
              border: '2px solid #667eea',
              padding: '20px',
              boxShadow: '0 4px 20px rgba(102,126,234,0.15)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {t.savedHeader} ({savedSchemes.length})
                </h3>
                {savedSchemes.length > 0 && (
                  <button
                    onClick={() => { setSavedSchemes([]); localStorage.removeItem('govmithra_saved_schemes'); setSavedSchemesSearch(''); }}
                    style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}
                  >
                    {t.clearAll}
                  </button>
                )}
              </div>
              {/* ── SEARCH BAR ── */}
              {savedSchemes.length > 0 && (
                <div style={{ marginBottom: '12px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', color: '#94a3b8' }}>🔍</span>
                  <input
                    type="text"
                    value={savedSchemesSearch}
                    onChange={e => setSavedSchemesSearch(e.target.value)}
                    placeholder="Search saved schemes..."
                    style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '10px',
                             border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none',
                             background: '#f8fafc', boxSizing: 'border-box' }}
                  />
                  {savedSchemesSearch && (
                    <button onClick={() => setSavedSchemesSearch('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                               border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                  )}
                </div>
              )}
              {savedSchemes.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', margin: '20px 0', fontStyle: 'italic' }}>
                  {t.noSavedSchemes}
                </p>
              ) : (
                savedSchemes
                  .filter(item => {
                    if (!savedSchemesSearch.trim()) return true;
                    const q = savedSchemesSearch.toLowerCase();
                    const s = item.scheme;
                    return (s.name || s.scheme_name || s.title || '').toLowerCase().includes(q) ||
                           (Array.isArray(s.tags) ? s.tags.join(' ') : String(s.tags || '')).toLowerCase().includes(q) ||
                           (s.domain || '').toLowerCase().includes(q) ||
                           (s.state || '').toLowerCase().includes(q);
                  })
                  .length === 0
                  ? <p style={{ color: '#94a3b8', textAlign: 'center', margin: '20px 0', fontStyle: 'italic' }}>
                      No saved schemes match &ldquo;{savedSchemesSearch}&rdquo;
                    </p>
                  : savedSchemes
                      .filter(item => {
                        if (!savedSchemesSearch.trim()) return true;
                        const q = savedSchemesSearch.toLowerCase();
                        const s = item.scheme;
                        return (s.name || s.scheme_name || s.title || '').toLowerCase().includes(q) ||
                               (Array.isArray(s.tags) ? s.tags.join(' ') : String(s.tags || '')).toLowerCase().includes(q) ||
                               (s.domain || '').toLowerCase().includes(q) ||
                               (s.state || '').toLowerCase().includes(q);
                      })
                      .map((item, idx) => (
                        <div key={idx} style={{
                          marginBottom: '12px',
                          padding: '14px',
                          background: '#f8fafc',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          position: 'relative'
                        }}>
                          <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: '#94a3b8' }}>Saved on {item.savedAt}</p>
                          {Object.entries(item.scheme).slice(0, 3).map(([k, v]) => (
                            <div key={k} style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                              <strong style={{ color: '#475569', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}:</strong>{' '}
                              {String(v).startsWith('http')
                                ? <a href={v} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'none' }}>View ↗</a>
                                : v}
                            </div>
                          ))}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            <button
                              onClick={() => shareOnWhatsApp(item.scheme)}
                              style={{ padding: '5px 10px', borderRadius: '8px', border: 'none', background: '#25D366', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                            >{t.share}</button>
                            <button
                              onClick={() => { const updated = savedSchemes.filter((_, i) => i !== idx); setSavedSchemes(updated); localStorage.setItem('govmithra_saved_schemes', JSON.stringify(updated)); }}
                              style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                            >{t.removeScheme}</button>
                          </div>
                        </div>
                      ))
              )}
            </div>
          )}

          {messages.length === 0 && !showSavedSchemes && (
            <div style={{ textAlign: 'center', marginTop: '100px' }}>
              <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🏛️</div>
              <h2 style={{ 
                fontSize: '2rem', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '10px',
                fontWeight: 'bold'
              }}>
                {t.greeting}
              </h2>
              <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
                Select a service from the sidebar or type your question below
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: m.type === 'user' ? 'flex-end' : 'flex-start'
            }}>
              <div style={{
                maxWidth: '75%',
                padding: '18px 24px',
                borderRadius: m.type === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                background: m.type === 'user' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'white',
                color: m.type === 'user' ? 'white' : '#1e293b',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                fontSize: '1rem',
                lineHeight: '1.6',
                position: 'relative'
              }}>
                <div>{m.text}</div>

                {m.isResults && m.results?.map((res, idx) => (
                  <div key={idx} style={{
                    marginTop: '15px',
                    padding: '18px',
                    background: '#f8fafc',
                    borderRadius: '15px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {/* ── SCHEME HEADER ── */}
                    {(res.name || res.scheme_name || res.title) && (
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#1e293b', lineHeight: '1.4' }}>
                            🏛️ {res.name || res.scheme_name || res.title}
                          </div>
                          {/* ── ELIGIBILITY BADGE ── */}
                          {(() => {
                            const score = getEligibilityScore(res);
                            if (score === null) return null;
                            const color = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
                            const bg    = score >= 80 ? '#dcfce7' : score >= 50 ? '#fef3c7' : '#fee2e2';
                            const label = score >= 80 ? 'Great match' : score >= 50 ? 'Partial match' : 'Low match';
                            return (
                              <div style={{ flexShrink: 0, textAlign: 'center' }}>
                                <div style={{
                                  background: bg, color, border: `2px solid ${color}`,
                                  borderRadius: '12px', padding: '4px 10px',
                                  fontSize: '0.78rem', fontWeight: '700', whiteSpace: 'nowrap'
                                }}>
                                  {score}% {label}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        {res.id && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>
                            Scheme ID: {res.id}
                          </div>
                        )}
                      </div>
                    )}
                    {/* ── DESCRIPTION SENTENCES ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: '#374151' }}>
                      {/* Service type */}
                      {res.service_type && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>🔖</span>
                          <span>This is a <strong>{res.service_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</strong> service.</span>
                        </div>
                      )}
                      {/* Domain */}
                      {res.domain && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>🗂️</span>
                          <span>It falls under the <strong>{res.domain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</strong> department.</span>
                        </div>
                      )}
                      {/* State */}
                      {res.state && res.state !== 'ANY' && res.state !== 'Central' && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>📍</span>
                          <span>This service is available in <strong>{res.state}</strong>.</span>
                        </div>
                      )}
                      {res.state === 'Central' && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>🇮🇳</span>
                          <span>This is a <strong>Central Government</strong> scheme available across India.</span>
                        </div>
                      )}
                      {/* Target roles */}
                      {res.target_roles && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>👥</span>
                          <span>It is meant for: <strong>{
                            (Array.isArray(res.target_roles)
                              ? res.target_roles.join(', ')
                              : String(res.target_roles)
                                  .replace(/([a-z])([A-Z])/g, '$1, $2')
                                  .replace(/_/g, ', ')
                            ).replace(/\b\w/g, c => c.toUpperCase())
                          }</strong>.</span>
                        </div>
                      )}
                      {/* Eligible categories */}
                      {res.eligible_categories && res.eligible_categories !== 'ANY' && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>✅</span>
                          <span>Eligible for: <strong>{res.eligible_categories}</strong>.</span>
                        </div>
                      )}
                      {res.eligible_categories === 'ANY' && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>✅</span>
                          <span>Open to <strong>all eligible citizens</strong> — no category restriction.</span>
                        </div>
                      )}
                      {/* Tags */}
                      {res.tags && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>🏷️</span>
                          <span style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                            <span style={{ marginRight: '4px' }}>Related topics:</span>
                            {(Array.isArray(res.tags)
                              ? res.tags
                              : String(res.tags).match(/[A-Z][a-z]+|[a-z]+/g) || []
                            ).filter((t,i,a) => a.indexOf(t) === i).map((tag, ti) => (
                              <span key={ti} style={{
                                background: '#ede9fe', color: '#6d28d9',
                                borderRadius: '20px', padding: '2px 10px',
                                fontSize: '0.78rem', fontWeight: '600'
                              }}>{tag.charAt(0).toUpperCase() + tag.slice(1)}</span>
                            ))}
                          </span>
                        </div>
                      )}
                      {/* URL */}
                      {Object.entries(res).filter(([k, v]) => String(v).startsWith('http')).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>🔗</span>
                          <a href={v} target="_blank" rel="noopener noreferrer"
                             style={{ color: '#667eea', fontWeight: '600', textDecoration: 'none', fontSize: '0.88rem' }}>
                            Apply / View Official Details ↗
                          </a>
                        </div>
                      ))}
                      {/* Any other fields not yet handled */}
                      {Object.entries(res).filter(([k]) => !['id','name','scheme_name','title','service_type','domain','state','target_roles','eligible_categories','tags'].includes(k) && !String(res[k]).startsWith('http')).map(([k, v]) => v ? (
                        <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>📌</span>
                          <span><strong style={{ textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}:</strong> {v}</span>
                        </div>
                      ) : null)}
                    </div>
                    {/* ── SCHEME ACTION BUTTONS ── */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => { const isBookmarked = isSchemeBookmarked(i, idx); saveScheme(res, idx, i); }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: `2px solid ${isSchemeBookmarked(i, idx) ? '#f59e0b' : '#e2e8f0'}`,
                          background: isSchemeBookmarked(i, idx) ? '#fef3c7' : 'white',
                          color: isSchemeBookmarked(i, idx) ? '#d97706' : '#64748b',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isSchemeBookmarked(i, idx) ? t.saved : t.save}
                      </button>
                      <button
                        onClick={() => shareOnWhatsApp(res)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#25D366',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {t.whatsapp}
                      </button>
                      {/* 🧠 EXPLAIN SIMPLY BUTTON */}
                      <button
                        onClick={() => explainSchemeSimply(res, i, idx)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '2px solid #7c3aed',
                          background: explanations[`${i}-${idx}`] ? '#ede9fe' : 'white',
                          color: '#7c3aed',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {explanations[`${i}-${idx}`] ? t.hideExplanation : t.explainSimply}
                      </button>
                      {/* 🔄 COMPARE BUTTON */}
                      <button
                        onClick={() => toggleCompare(res, res.scheme_name || res.name || res.title || `Scheme ${idx + 1}`, i, idx)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: `2px solid ${isInCompare(i, idx) ? '#f59e0b' : '#e2e8f0'}`,
                          background: isInCompare(i, idx) ? '#fef3c7' : 'white',
                          color: isInCompare(i, idx) ? '#d97706' : '#64748b',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isInCompare(i, idx) ? t.inCompare : t.compare}
                      </button>
                    </div>
                    {/* 🧠 SIMPLE EXPLANATION BOX */}
                    {explanations[`${i}-${idx}`] && (
                      <div style={{
                        marginTop: '12px',
                        padding: '14px 16px',
                        background: 'linear-gradient(135deg, #ede9fe, #f5f3ff)',
                        borderRadius: '12px',
                        border: '2px solid #7c3aed',
                        fontSize: '0.9rem',
                        color: '#3b0764',
                        lineHeight: '1.8'
                      }}>
                        <div style={{ fontWeight: '700', marginBottom: '10px', fontSize: '0.85rem', color: '#7c3aed' }}>
                          {t.simpleExplanation}
                        </div>
                        {explanations[`${i}-${idx}`].split('\n').map((line, li) => (
                          <div key={li} style={{ marginBottom: '6px' }}>{line}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* ── COPY BUTTON (bot messages only) ── */}
              {m.type === 'bot' && m.text && (
                <button
                  onClick={() => copyToClipboard(m.text, i)}
                  title="Copy to clipboard"
                  style={{
                    marginTop: '6px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: copiedMsgId === i ? '#f0fdf4' : 'white',
                    color: copiedMsgId === i ? '#16a34a' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s',
                    alignSelf: 'flex-start'
                  }}
                >
                  {copiedMsgId === i ? t.copied : t.copy}
                </button>
              )}
              {/* 💬 FOLLOW-UP QUESTION CHIPS */}
              {m.type === 'bot' && followups[i] && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px', maxWidth: '80%' }}>
                  {followups[i].map((q, qi) => (
                    <button
                      key={qi}
                      onClick={() => { setInputText(q); inputRef.current?.focus(); }}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '20px',
                        border: '2px solid #667eea',
                        background: 'white',
                        color: '#667eea',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#667eea'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#667eea'; }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isBotTyping && (
            <div style={{
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'flex-start'
            }}>
              <div style={{
                padding: '18px 24px',
                borderRadius: '20px 20px 20px 5px',
                background: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                fontSize: '1rem',
                fontStyle: 'italic',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#667eea' }}></div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#667eea' }}></div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#667eea' }}></div>
                </div>
                {t.typing}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div style={{ background: 'white', borderTop: '1px solid #e2e8f0', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
          {/* ── RECENT SEARCHES DROPDOWN ── */}
          {showRecentSearches && recentSearches.length > 0 && (
            <div style={{ padding: '10px 30px 4px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🕘 Recent Searches</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {recentSearches.map((q, qi) => (
                  <button key={qi} onClick={() => { setInputText(q); setShowRecentSearches(false); inputRef.current?.focus(); }}
                    style={{ padding: '5px 12px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc',
                             color: '#475569', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '500',
                             display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: '#94a3b8' }}>🕘</span> {q}
                  </button>
                ))}
                <button onClick={() => { setRecentSearches([]); localStorage.removeItem('govmithra_recent_searches'); setShowRecentSearches(false); }}
                  style={{ padding: '5px 10px', borderRadius: '16px', border: 'none', background: 'none',
                           color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600' }}>
                  Clear
                </button>
              </div>
            </div>
          )}
          <div style={{ padding: '25px 30px', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onFocus={() => setShowRecentSearches(true)}
            onBlur={() => setTimeout(() => setShowRecentSearches(false), 150)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            style={{
              flex: 1,
              padding: '18px 25px',
              borderRadius: '20px',
              border: '2px solid #e2e8f0',
              outline: 'none',
              fontSize: '1rem'
            }}
            placeholder={t.placeholder}
          />
          <button
            onClick={() => handleSend()}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '18px 35px',
              height: '56px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
          >
            {t.send} ✈️
          </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* 🔄 FLOATING COMPARE BAR */}
      {compareList.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '18px',
          boxShadow: '0 8px 32px rgba(102,126,234,0.55)',
          zIndex: 1000,
          minWidth: '240px',
          maxWidth: '280px',
          animation: 'slideUp 0.3s ease'
        }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: '700', fontSize: '1rem' }}>
            🔄 Compare ({compareList.length}/3)
          </p>
          {compareList.map((s, ci) => (
            <div key={ci} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.9, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                • {s.label}
              </p>
              <button
                onClick={() => setCompareList(prev => prev.filter((_, i) => i !== ci))}
                style={{
                  marginLeft: '8px',
                  background: 'rgba(255,255,255,0.25)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  lineHeight: 1
                }}
              >✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={runComparison}
              disabled={compareList.length < 2}
              style={{
                flex: 1,
                padding: '9px',
                borderRadius: '10px',
                border: 'none',
                background: compareList.length < 2 ? 'rgba(255,255,255,0.3)' : 'white',
                color: compareList.length < 2 ? 'rgba(255,255,255,0.5)' : '#667eea',
                cursor: compareList.length < 2 ? 'not-allowed' : 'pointer',
                fontWeight: '700',
                fontSize: '0.88rem'
              }}
            >
              {t.compareNow}
            </button>
            <button
              onClick={() => { setCompareList([]); setCompareResult(null); setShowCompare(false); }}
              style={{
                padding: '9px 14px',
                borderRadius: '10px',
                border: '2px solid rgba(255,255,255,0.5)',
                background: 'transparent',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '0.88rem'
              }}
            >✕</button>
          </div>
        </div>
      )}

      {/* 🔄 COMPARE MODAL */}
      {showCompare && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '920px',
            width: '100%',
            maxHeight: '88vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.4rem', fontWeight: 'bold' }}>
                  🔄 {compareList.length === 2 ? 'Comparing 2 Schemes' : 'Comparing 3 Schemes'}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                  🟡 Highlighted rows show differences between schemes
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Export Button */}
                <button
                  onClick={() => {
                    if (!compareResult) return;
                    const { headers, rows, linkRows } = compareResult;
                    const htmlRows = rows.map(r =>
                      `<tr style="background:${r.isDiff ? '#fffbeb' : 'white'}">
                        <td style="padding:10px 14px;font-weight:600;color:#475569;border:1px solid #e2e8f0">${r.label}</td>
                        ${r.cells.map(c => `<td style="padding:10px 14px;border:1px solid #e2e8f0">${c}</td>`).join('')}
                      </tr>`
                    ).join('');
                    const linkRowsHtml = (linkRows || []).map(r =>
                      `<tr><td style="padding:10px 14px;font-weight:600;color:#475569;border:1px solid #e2e8f0">${r.label}</td>
                        ${r.cells.map(c => c ? `<td style="padding:10px 14px;border:1px solid #e2e8f0"><a href="${c}" style="color:#667eea">View ↗</a></td>` : `<td style="padding:10px 14px;border:1px solid #e2e8f0">—</td>`).join('')}
                      </tr>`
                    ).join('');
                    const headerHtml = headers.map((h, hi) =>
                      `<th style="padding:12px 14px;text-align:left;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-right:1px solid rgba(255,255,255,0.2)">${h}</th>`
                    ).join('');
                    const content = `<html><head><title>Scheme Comparison</title></head><body style="font-family:sans-serif;padding:30px">
                      <h1 style="color:#667eea">🔄 GovMithra Scheme Comparison</h1>
                      <p style="color:#94a3b8">Generated on ${new Date().toLocaleString()}</p>
                      <table style="width:100%;border-collapse:collapse;margin-top:20px">
                        <thead><tr>${headerHtml}</tr></thead>
                        <tbody>${htmlRows}${linkRowsHtml}</tbody>
                      </table>
                    </body></html>`;
                    const w = window.open('', '_blank');
                    w.document.write(content);
                    w.document.close();
                    setTimeout(() => { w.print(); }, 500);
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: '2px solid #e2e8f0',
                    background: 'white',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.82rem'
                  }}
                >📥 Export</button>
                <button
                  onClick={() => setShowCompare(false)}
                  style={{
                    border: 'none', background: '#f1f5f9',
                    borderRadius: '50%', width: '36px', height: '36px',
                    fontSize: '1.1rem', cursor: 'pointer', color: '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >✕</button>
              </div>
            </div>

            {compareResult ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
                  <thead>
                    <tr>
                      {compareResult.headers.map((h, hi) => (
                        <th key={hi} style={{
                          padding: '13px 16px',
                          textAlign: 'left',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          fontWeight: '700',
                          borderRight: hi < compareResult.headers.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none',
                          borderRadius: hi === 0 ? '10px 0 0 0' : hi === compareResult.headers.length - 1 ? '0 10px 0 0' : '0',
                          whiteSpace: 'nowrap'
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Text rows with diff highlighting */}
                    {compareResult.rows.map((row, ri) => (
                      <tr key={ri} style={{ background: row.isDiff ? '#fffbeb' : (ri % 2 === 0 ? '#f8fafc' : 'white') }}>
                        <td style={{
                          padding: '11px 16px',
                          border: '1px solid #e2e8f0',
                          fontWeight: '700',
                          color: '#475569',
                          verticalAlign: 'top',
                          lineHeight: '1.5',
                          minWidth: '140px'
                        }}>
                          {row.isDiff && <span style={{ color: '#f59e0b', marginRight: '6px', fontSize: '0.8rem' }}>◆</span>}
                          {row.label}
                        </td>
                        {row.cells.map((cell, ci) => (
                          <td key={ci} style={{
                            padding: '11px 16px',
                            border: '1px solid #e2e8f0',
                            color: '#1e293b',
                            verticalAlign: 'top',
                            lineHeight: '1.5',
                            background: row.isDiff ? '#fffbeb' : 'inherit'
                          }}>
                            {cell === '—'
                              ? <span style={{ color: '#cbd5e1' }}>—</span>
                              : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {/* Link rows at the bottom */}
                    {(compareResult.linkRows || []).length > 0 && (
                      <tr>
                        <td colSpan={compareResult.headers.length} style={{
                          padding: '10px 16px',
                          background: '#f1f5f9',
                          fontWeight: '700',
                          color: '#475569',
                          fontSize: '0.82rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          border: '1px solid #e2e8f0'
                        }}>
                          🔗 Official Links
                        </td>
                      </tr>
                    )}
                    {(compareResult.linkRows || []).map((row, ri) => (
                      <tr key={`link-${ri}`} style={{ background: ri % 2 === 0 ? '#f8fafc' : 'white' }}>
                        <td style={{
                          padding: '11px 16px',
                          border: '1px solid #e2e8f0',
                          fontWeight: '700',
                          color: '#475569',
                          verticalAlign: 'top',
                          minWidth: '140px'
                        }}>{row.label}</td>
                        {row.cells.map((cell, ci) => (
                          <td key={ci} style={{ padding: '11px 16px', border: '1px solid #e2e8f0', verticalAlign: 'top' }}>
                            {cell
                              ? <a href={cell} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'none', fontWeight: '500' }}>View ↗</a>
                              : <span style={{ color: '#cbd5e1' }}>—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Legend */}
                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem', color: '#94a3b8' }}>
                  <span><span style={{ color: '#f59e0b' }}>◆</span> = Fields that differ between schemes</span>
                  <span style={{ background: '#fffbeb', padding: '2px 8px', borderRadius: '6px', border: '1px solid #fde68a', color: '#92400e' }}>Yellow = different values</span>
                </div>
              </div>
            ) : (
              <p style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>
                Could not build comparison. Please try again.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '10px' }}>
              <button
                onClick={() => { setCompareList([]); setCompareResult(null); setShowCompare(false); }}
                style={{
                  padding: '10px 20px', borderRadius: '10px',
                  border: '2px solid #e2e8f0', background: 'white',
                  color: '#64748b', cursor: 'pointer', fontWeight: '600'
                }}
              >{t.clearClose}</button>
              <button
                onClick={() => setShowCompare(false)}
                style={{
                  padding: '10px 20px', borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white', cursor: 'pointer', fontWeight: '600'
                }}
              >{t.done}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}