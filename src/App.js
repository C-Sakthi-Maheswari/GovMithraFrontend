import React, { useState, useRef, useEffect } from 'react';

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
      exams: "Government exam schedule 2026",
      passports: "Passport renewal documents",
      agriculture: "Crop insurance schemes",
      business: "MSME registration process",
      electricity: "New electricity connection",
      health: "Ayushman Bharat details",
      housing: "PM Awas Yojana application",
      jobs: "Latest government job openings",
      justice: "Legal aid services",
      local: "Local municipality contacts",
      lpg: "Apply for new LPG connection",
      banking: "Zero balance account opening",
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
      exams: "அரசு தேர்வு அட்டவணை 2026",
      passports: "பாஸ்போர்ட் புதுப்பித்தல் ஆவணங்கள்",
      agriculture: "பயிர் காப்பீட்டு திட்டங்கள்",
      business: "MSME பதிவு செயல்முறை",
      electricity: "புதிய மின் இணைப்பு",
      health: "ஆயுஷ்மான் பாரத் விவரங்கள்",
      housing: "PM ஆவாஸ் யோஜனா விண்ணப்பம்",
      jobs: "சமீபத்திய அரசு வேலைகள்",
      justice: "சட்ட உதவி சேவைகள்",
      local: "நகராட்சி தொடர்புகள்",
      lpg: "புதிய எரிவாயு இணைப்பு",
      banking: "ஜீரோ பேலன்ஸ் கணக்கு",
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
      exams: "सरकारी परीक्षा कार्यक्रम 2026",
      passports: "पासपोर्ट नवीनीकरण दस्तावेज",
      agriculture: "फसल बीमा योजनाएं",
      business: "एमएसएमई पंजीकरण प्रक्रिया",
      electricity: "नया बिजली कनेक्शन",
      health: "आयुष्मान भारत विवरण",
      housing: "पीएम आवास योजना आवेदन",
      jobs: "नवीनतम सरकारी रिक्तियां",
      justice: "कानूनी सहायता सेवाएँ",
      local: "स्थानीय नगर पालिका संपर्क",
      lpg: "नए एलपीजी कनेक्शन के लिए आवेदन",
      banking: "जीरो बैलेंस खाता खोलना",
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
    loading: {
      caption1: "नागरिकों और सरकार के बीच की दूरी कम करना...",
      caption2: "सबसे तेज़ बस मार्ग ढूँढना...",
      caption3: "शासन को सरल बनाना...",
      caption4: "स्मार्ट इंडिया के लिए डिजिटल साथी...",
      caption5: "तत्काल सेवा तक पहुँच...",
      initialized: "प्रारंभ किया गया"
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
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' }
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
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => onLanguageChange(lang.code)}
            style={{
              padding: '12px 24px',
              borderRadius: '25px',
              border: language === lang.code ? '3px solid white' : '2px solid rgba(255,255,255,0.3)',
              background: language === lang.code ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.15)',
              color: language === lang.code ? '#667eea' : 'white',
              cursor: 'pointer',
              fontWeight: language === lang.code ? 'bold' : 'normal',
              fontSize: '1rem',
              transition: 'all 0.3s',
              backdropFilter: 'blur(10px)',
              boxShadow: language === lang.code ? '0 4px 12px rgba(0,0,0,0.2)' : 'none'
            }}>
            <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>{lang.flag}</span>
            {lang.name}
          </button>
        ))}
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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const t = translations[selectedLanguage] || translations['en'];

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' }
  ];

  const sidebarCategories = [
    { icon: '📜', label: t.categories_list.certificates, q: t.queries.certificates },
    { icon: '🎓', label: t.categories_list.education, q: t.queries.education },
    { icon: '🛂', label: t.categories_list.passports, q: t.queries.passports },
    { icon: '💼', label: t.categories_list.jobs, q: t.queries.jobs },
    { icon: '🚌', label: t.categories_list.bus, q: t.queries.bus },
    { icon: '💰', label: t.categories_list.tax, q: t.queries.tax },
    { icon: '🏦', label: t.categories_list.banking, q: t.queries.banking },
    { icon: '🌾', label: t.categories_list.agriculture, q: t.queries.agriculture },
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
    setIsBotTyping(true);

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
        setMessages(prev => [...prev, {
          type: 'bot',
          text: msg.text,
          results: msg.custom ? msg.custom.data : null,
          isResults: !!msg.custom,
          timestamp: new Date()
        }]);
      });
    } catch (e) {
      setIsBotTyping(false);
      setMessages(prev => [...prev, { type: 'bot', text: 'Service offline.' }]);
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
            {t.selectLanguage}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: selectedLanguage === lang.code ? '2px solid white' : '2px solid rgba(255,255,255,0.2)',
                  background: selectedLanguage === lang.code ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.1)',
                  color: selectedLanguage === lang.code ? '#667eea' : 'white',
                  cursor: 'pointer',
                  fontWeight: selectedLanguage === lang.code ? 'bold' : '500',
                  fontSize: '0.95rem',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: selectedLanguage === lang.code ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
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
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
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

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '30px',
          display: 'flex',
          flexDirection: 'column',
          background: '#f8fafc'
        }}>
          {messages.length === 0 && (
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
              justifyContent: m.type === 'user' ? 'flex-end' : 'flex-start'
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
                lineHeight: '1.6'
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
                    {Object.entries(res).map(([k, v]) => (
                      <div key={k} style={{ marginBottom: '10px', fontSize: '0.95rem' }}>
                        <strong style={{ color: '#475569', textTransform: 'capitalize' }}>
                          {k.replace(/_/g, ' ')}:
                        </strong>{' '}
                        {String(v).startsWith('http') ?
                          <a href={v} target="_blank" rel="noopener noreferrer" 
                             style={{ color: '#667eea', fontWeight: '500', textDecoration: 'none' }}>
                            View Details ↗
                          </a>
                          : v}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
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

        <div style={{
          padding: '25px 30px',
          background: 'white',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: '15px',
          alignItems: 'center',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
        }}>
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
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

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}