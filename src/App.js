import React, { useState, useRef, useEffect } from 'react';

// --- COMPLETE TRANSLATION DICTIONARY ---
const translations = {
  en: {
    greeting: "Namaste! 🙏 I am GovMithra. How can I help you today?",
    typing: "Typing...",
    placeholder: "Type your query here...",
    send: "Send",
    categories: "All Services",
    viewOnMaps: "View on Maps",
    serviceOffline: "Service offline.",
    login: "Login",
    signup: "Sign Up",
    logout: "Logout",
    welcome: "Welcome back",
    newUser: "New to GovMithra?",
    email: "Email Address",
    password: "Password",
    name: "Full Name",
    confirmPassword: "Confirm Password",
    forgotPassword: "Forgot Password?",
    alreadyHaveAccount: "Already have an account?",
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
    viewOnMaps: "வரைபடத்தில் காண்க",
    serviceOffline: "சேவை கிடைக்கவில்லை.",
    login: "உள்நுழைய",
    signup: "பதிவு செய்க",
    logout: "வெளியேறு",
    welcome: "மீண்டும் வரவேற்கிறோம்",
    newUser: "கவ்மித்ராவில் புதியவரா?",
    email: "மின்னஞ்சல் முகவரி",
    password: "கடவுச்சொல்",
    name: "முழு பெயர்",
    confirmPassword: "கடவுச்சொல்லை உறுதிப்படுத்தவும்",
    forgotPassword: "கடவுச்சொல்லை மறந்துவிட்டீர்களா?",
    alreadyHaveAccount: "ஏற்கனவே கணக்கு உள்ளதா?",
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
    viewOnMaps: "मानचित्र पर देखें",
    serviceOffline: "सेवा वर्तमान में बंद है।",
    login: "लॉगिन करें",
    signup: "साइन अप करें",
    logout: "लॉगआउट",
    welcome: "वापसी पर स्वागत है",
    newUser: "गोवमित्र में नए हैं?",
    email: "ईमेल पता",
    password: "पासवर्ड",
    name: "पूरा नाम",
    confirmPassword: "पासवर्ड की पुष्टि करें",
    forgotPassword: "पासवर्ड भूल गए?",
    alreadyHaveAccount: "पहले से खाता है?",
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
  },
  te: {
    greeting: "నమస్కారం! 🙏 నేను గవ్మిత్ర. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?",
    typing: "టైప్ చేస్తోంది...",
    placeholder: "మీ ప్రశ్నను ఇక్కడ టైప్ చేయండి...",
    send: "పంపు",
    categories: "అన్ని సేవలు",
    viewOnMaps: "మ్యాప్‌లో చూడండి",
    serviceOffline: "సేవ అందుబాటులో లేదు.",
    login: "లాగిన్",
    signup: "సైన్ అప్",
    logout: "లాగౌట్",
    welcome: "తిరిగి స్వాగతం",
    newUser: "గవ్మిత్రలో కొత్తవారా?",
    email: "ఇమెయిల్ చిరునామా",
    password: "పాస్‌వర్డ్",
    name: "పూర్తి పేరు",
    confirmPassword: "పాస్‌వర్డ్ నిర్ధారించండి",
    forgotPassword: "పాస్‌వర్డ్ మరచిపోయారా?",
    alreadyHaveAccount: "ఇప్పటికే ఖాతా ఉందా?",
    categories_list: {
      education: "విద్య",
      certificates: "ధృవీకరణ పత్రాలు",
      exams: "పరీక్షలు",
      passports: "పాస్‌పోర్ట్‌లు",
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
      science: "సైన్స్ & ఐటి",
      sports: "క్రీడలు",
      transport: "రవాణా",
      tourism: "పర్యాటకం",
      water: "నీరు",
      youth: "యువజన సేవలు",
      bus: "బస్సు సర్చ్"
    },
    queries: {
      education: "ఉన్నత విద్య కోసం స్కాలర్‌షిప్‌లు",
      certificates: "జనన/మరణ ధృవీకరణ పత్రం కోసం దరఖాస్తు",
      exams: "ప్రభుత్వ పరీక్షల షెడ్యూల్ 2026",
      passports: "పాస్‌పోర్ట్ పునరుద్ధరణ పత్రాలు",
      agriculture: "పంట బీమా పథకాలు",
      business: "MSME రిజిస్ట్రేషన్ ప్రక్రియ",
      electricity: "కొత్త విద్యుత్ కనెక్షన్",
      health: "ఆయుష్మాన్ భారత్ వివరాలు",
      housing: "PM ఆవాస్ యోజన దరఖాస్తు",
      jobs: "తాజా ప్రభుత్వ ఉద్యోగ అవకాశాలు",
      justice: "న్యాయ సహాయ సేవలు",
      local: "స్థానిక మునిసిపాలిటీ పరిచయాలు",
      lpg: "కొత్త LPG కనెక్షన్ కోసం దరఖాస్తు",
      banking: "జీరో బ్యాలెన్స్ ఖాతా ప్రారంభం",
      pension: "వృద్ధాప్య పెన్షన్ అర్హత",
      tax: "ఆదాయపు పన్ను ఫైలింగ్ గైడ్",
      science: "డిజిటల్ ఇండియా కార్యక్రమాలు",
      sports: "క్రీడల స్కాలర్‌షిప్‌లు",
      transport: "డ్రైవింగ్ లైసెన్స్ విధానం",
      tourism: "భారతదేశంలోని పర్యాటక ప్రాంతాలు",
      water: "నీటి కనెక్షన్ కోసం దరఖాస్తు",
      youth: "నైపుణ్యాభివృద్ధి కార్యక్రమాలు",
      bus: "తాంబరం నుండి అడయార్ వరకు బస్సు"
    },
    loading: {
      caption1: "పౌరులకు మరియు ప్రభుత్వానికి మధ్య దూరాన్ని తగ్గించడం...",
      caption2: "వేగవంతమైన బస్సు మార్గాలను కనుగొనడం...",
      caption3: "పాలనను సరళీకృతం చేయడం...",
      caption4: "స్మార్ట్ ఇండియా కోసం డిజిటల్ తోడు...",
      caption5: "తక్షణ పథక సమాచారం...",
      initialized: "ప్రారంభించబడింది"
    }
  },
  ml: {
    greeting: "നമസ്കാരം! 🙏 ഞാൻ ഗവ്മിത്രയാണ്. ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കും?",
    typing: "ടൈപ്പ് ചെയ്യുന്നു...",
    placeholder: "നിങ്ങളുടെ ചോദ്യം ടൈപ്പ് ചെയ്യുക...",
    send: "അയക്കുക",
    categories: "എല്ലാ സേവനങ്ങളും",
    viewOnMaps: "മാപ്പിൽ കാണുക",
    serviceOffline: "സേവനം ലഭ്യമല്ല.",
    login: "ലോഗിൻ",
    signup: "സൈൻ അപ്പ്",
    logout: "ലോഗൗട്ട്",
    welcome: "തിരികെ സ്വാഗതം",
    newUser: "ഗവ്മിത്രയിൽ പുതിയതാണോ?",
    email: "ഇമെയിൽ വിലാസം",
    password: "പാസ്‌വേഡ്",
    name: "പൂർണ്ണ നാമം",
    confirmPassword: "പാസ്‌വേഡ് സ്ഥിരീകരിക്കുക",
    forgotPassword: "പാസ്‌വേഡ് മറന്നോ?",
    alreadyHaveAccount: "ഇതിനകം അക്കൗണ്ട് ഉണ്ടോ?",
    categories_list: {
      education: "വിദ്യാഭ്യാസം",
      certificates: "സർട്ടിഫിക്കറ്റുകൾ",
      exams: "പരീക്ഷകൾ",
      passports: "പാസ്‌പോർട്ട്",
      agriculture: "കൃഷി",
      business: "ബിസിനസ്സ്",
      electricity: "വൈദ്യുതി",
      health: "ആരോഗ്യം",
      housing: "ഭവനം",
      jobs: "ജോലികൾ",
      justice: "നീതി",
      local: "പ്രാദേശിക സേവനങ്ങൾ",
      lpg: "LPG സേവനങ്ങൾ",
      banking: "ബാങ്കിംഗ്",
      pension: "പെൻഷൻ",
      tax: "പണം & നികുതി",
      science: "ശാസ്ത്രം & ഐടി",
      sports: "കായീകം",
      transport: "ഗതാഗതം",
      tourism: "ടൂറിസം",
      water: "ജലം",
      youth: "യുവജന സേവനങ്ങൾ",
      bus: "ബസ് തിരയുക"
    },
    queries: {
      education: "ഉന്നത വിദ്യാഭ്യാസത്തിനുള്ള സ്കോളർഷിപ്പുകൾ",
      certificates: "ജനന/മരണ സർട്ടിഫിക്കറ്റിനായി അപേക്ഷിക്കുക",
      exams: "സർക്കാർ പരീക്ഷാ ഷെഡ്യൂൾ 2026",
      passports: "പാസ്‌പോർട്ട് പുതുക്കുന്നതിനുള്ള രേഖകൾ",
      agriculture: "കൃഷി ഇൻഷുറൻസ് പദ്ധതികൾ",
      business: "MSME രജിസ്ട്രേഷൻ നടപടിക്രമം",
      electricity: "പുതിയ വൈദ്യുതി കണക്ഷൻ",
      health: "ആയുഷ്മാൻ ഭാരത് വിവരങ്ങൾ",
      housing: "PM ആവാസ് യോജന അപേക്ഷ",
      jobs: "പുതിയ സർക്കാർ തൊഴിലവസരങ്ങൾ",
      justice: "നിയമ സഹായ സേവനങ്ങൾ",
      local: "പ്രാദേശിക നഗരസഭാ ബന്ധങ്ങൾ",
      lpg: "പുതിയ LPG കണക്ഷനായി അപേക്ഷിക്കുക",
      banking: "സീറോ ബാലൻസ് അക്കൗണ്ട് തുറക്കൽ",
      pension: "വാർദ്ധക്യകാല പെൻഷൻ അർഹത",
      tax: "ആദായനികുതി ഫയലിംഗ് ഗൈഡ്",
      science: "ഡിജിറ്റൽ ഇന്ത്യ പദ്ധതികൾ",
      sports: "കായിക സ്കോളർഷിപ്പുകൾ",
      transport: "ഡ്രൈവിംഗ് ലൈസൻസ് നടപടിക്രമം",
      tourism: "ഇന്ത്യയിലെ ടൂറിസ്റ്റ് സ്ഥലങ്ങൾ",
      water: "ജല കണക്ഷനായി അപേക്ഷിക്കുക",
      youth: "നൈപുണ്യ വികസന പദ്ധതികൾ",
      bus: "താമ്പരത്തുനിന്ന് അടയാറിലേക്കുള്ള ബസ്"
    },
    loading: {
      caption1: "ജനങ്ങളും സർക്കാരും തമ്മിലുള്ള ദൂരം കുറയ്ക്കുന്നു...",
      caption2: "വേഗമേറിയ ബസ് റൂട്ടുകൾ കണ്ടെത്തുന്നു...",
      caption3: "ഭരണം ലളിതമാക്കുന്നു...",
      caption4: "സ്മാർട്ട് ഇന്ത്യക്കായുള്ള ഡിജിറ്റൽ സഹായി...",
      caption5: "പദ്ധതികളിലേക്ക് തൽക്ഷണ പ്രവേശനം...",
      initialized: "ആരംഭിച്ചു"
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

// --- LOGIN/SIGNUP COMPONENT ---
function AuthPage({ onLogin, language, onLanguageChange }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const t = translations[language] || translations['en'];

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      if (formData.email && formData.password) {
        onLogin({ email: formData.email, name: formData.name || 'User' });
      }
    } else {
      if (formData.name && formData.email && formData.password && formData.password === formData.confirmPassword) {
        onLogin({ email: formData.email, name: formData.name });
      }
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
              padding: '10px 20px',
              borderRadius: '25px',
              border: language === lang.code ? '2px solid white' : '2px solid transparent',
              background: language === lang.code ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: language === lang.code ? 'bold' : 'normal',
              fontSize: '0.9rem',
              transition: 'all 0.3s',
              backdropFilter: 'blur(10px)'
            }}>
            {lang.flag} {lang.name}
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
                  transition: 'border 0.3s',
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
                transition: 'border 0.3s',
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
                transition: 'border 0.3s',
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
                  transition: 'border 0.3s',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
          )}

          {isLogin && (
            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <span style={{ color: '#667eea', fontSize: '0.9rem', cursor: 'pointer' }}>
                {t.forgotPassword}
              </span>
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              marginBottom: '20px'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            {isLogin ? t.login : t.signup}
          </button>

          <div style={{ textAlign: 'center' }}>
            <span style={{ color: '#64748b' }}>
              {isLogin ? t.newUser : t.alreadyHaveAccount}{' '}
            </span>
            <span
              onClick={() => setIsLogin(!isLogin)}
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
  const [user, setUser] = useState(null);
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
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' }
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

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setMessages([]);
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
          metadata: { language: selectedLanguage }
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
      setMessages(prev => [...prev, { type: 'bot', text: t.serviceOffline }]);
    }
  };

  if (isLoading) return <LoadingPage progress={loadingProgress} language={selectedLanguage} />;
  if (!isAuthenticated) return <AuthPage onLogin={handleLogin} language={selectedLanguage} onLanguageChange={setSelectedLanguage} />;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f1f5f9' }}>
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

        <div style={{ position: 'relative', marginBottom: '25px' }}>
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            style={{
              padding: '12px 20px',
              borderRadius: '15px',
              border: '2px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              width: '100%',
              color: 'white',
              fontSize: '1rem',
              transition: 'all 0.3s'
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.3rem' }}>{languages.find(l => l.code === selectedLanguage).flag}</span>
              <span>{languages.find(l => l.code === selectedLanguage).name}</span>
            </div>
            <span style={{ transform: showLanguageMenu ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }}>▼</span>
          </button>

          {showLanguageMenu && (
            <div style={{
              position: 'absolute',
              top: '110%',
              left: 0,
              right: 0,
              background: 'white',
              border: 'none',
              borderRadius: '15px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              zIndex: 100,
              overflow: 'hidden'
            }}>
              {languages.map(lang => (
                <div
                  key={lang.code}
                  onClick={() => {
                    setSelectedLanguage(lang.code);
                    setShowLanguageMenu(false);
                  }}
                  style={{
                    padding: '15px',
                    cursor: 'pointer',
                    background: selectedLanguage === lang.code ? '#f0f4ff' : 'white',
                    fontWeight: selectedLanguage === lang.code ? 'bold' : 'normal',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background 0.2s',
                    color: selectedLanguage === lang.code ? '#667eea' : '#1e293b'
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{lang.flag}</span>
                  <span style={{ fontSize: '1rem' }}>{lang.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

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
            <div style={{ 
              textAlign: 'center', 
              marginTop: '100px',
              animation: 'fadeIn 1s'
            }}>
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
              justifyContent: m.type === 'user' ? 'flex-end' : 'flex-start',
              animation: 'slideIn 0.3s'
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
                <div style={{ 
                  display: 'flex', 
                  gap: '5px',
                  animation: 'pulse 1.5s infinite'
                }}>
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
              fontSize: '1rem',
              transition: 'border 0.3s'
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
              transition: 'all 0.3s',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
          >
            {t.send} ✈️
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}