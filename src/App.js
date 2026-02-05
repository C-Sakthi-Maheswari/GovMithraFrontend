import React, { useState, useRef, useEffect } from 'react';

// --- TRANSLATION DICTIONARY ---
const translations = {
  en: {
    greeting: "Namaste! 🙏 I am GovMithra. How can I help you with government services today?",
    typing: "Typing...",
    placeholder: "Type your query here...",
    send: "Send",
    categories: "Categories",
    viewOnMaps: "View on Maps",
    serviceOffline: "Service currently offline.",
    categories_list: {
      education: "Education Schemes",
      exams: "Exams",
      passports: "Passports",
      sports: "Sports Services",
      bus: "MTC Bus Routes"
    },
    queries: {
      education: "Scholarships for higher education",
      exams: "Upcoming government exam schedule",
      passports: "Documents needed for passport renewal",
      sports: "Sports scholarships and training programs",
      bus: "Bus from Tambaram to Adyar"
    },
    loading: {
      caption1: "Bridging the gap between Citizens and Government...",
      caption2: "Finding the fastest MTC routes for you...",
      caption3: "Simplifying Governance, one query at a time...",
      caption4: "Your digital companion for a smarter Chennai...",
      caption5: "Empowering you with instant scheme access...",
      initialized: "INITIALIZED"
    }
  },
  ta: {
    greeting: "வணக்கம்! 🙏 நான் கவ்மித்ரா. அரசு சேவைகளில் நான் உங்களுக்கு எப்படி உதவ முடியும்?",
    typing: "தட்டச்சு செய்கிறது...",
    placeholder: "உங்கள் கேள்வியை இங்கே தட்டச்சு செய்யவும்...",
    send: "அனுப்பு",
    categories: "வகைகள்",
    viewOnMaps: "வரைபடத்தில் காண்க",
    serviceOffline: "சேவை தற்போது ஆஃப்லைனில் உள்ளது.",
    categories_list: {
      education: "கல்வி திட்டங்கள்",
      exams: "தேர்வுகள்",
      passports: "பாஸ்போர்ட்கள்",
      sports: "விளையாட்டு சேவைகள்",
      bus: "எம்டிசி பேருந்து வழிகள்"
    },
    queries: {
      education: "உயர் கல்விக்கான உதவித்தொகை",
      exams: "வரவிருக்கும் அரசு தேர்வு அட்டவணை",
      passports: "பாஸ்போர்ட் புதுப்பிப்புக்கு தேவையான ஆவணங்கள்",
      sports: "விளையாட்டு உதவித்தொகை மற்றும் பயிற்சி திட்டங்கள்",
      bus: "தாம்பரம் இருந்து அடையாறு பேருந்து"
    },
    loading: {
      caption1: "குடிமக்களுக்கும் அரசுக்கும் இடையிலான இடைவெளியைக் குறைக்கிறது...",
      caption2: "உங்களுக்காக வேகமான எம்டிசி வழிகளைக் கண்டறிகிறது...",
      caption3: "ஆட்சியை எளிமைப்படுத்துதல், ஒரு நேரத்தில் ஒரு கேள்வி...",
      caption4: "புத்திசாலி சென்னைக்கான உங்கள் டிஜிட்டல் துணை...",
      caption5: "உடனடி திட்ட அணுகலுடன் உங்களை மேம்படுத்துகிறது...",
      initialized: "துவக்கப்பட்டது"
    }
  },
  hi: {
    greeting: "नमस्ते! 🙏 मैं गोवमित्र हूं। मैं सरकारी सेवाओं में आपकी कैसे मदद कर सकता हूं?",
    typing: "टाइप कर रहा है...",
    placeholder: "अपना प्रश्न यहां टाइप करें...",
    send: "भेजें",
    categories: "श्रेणियाँ",
    viewOnMaps: "मानचित्र पर देखें",
    serviceOffline: "सेवा वर्तमान में ऑफ़लाइन है।",
    categories_list: {
      education: "शिक्षा योजनाएं",
      exams: "परीक्षाएं",
      passports: "पासपोर्ट",
      sports: "खेल सेवाएं",
      bus: "एमटीसी बस मार्ग"
    },
    queries: {
      education: "उच्च शिक्षा के लिए छात्रवृत्ति",
      exams: "आगामी सरकारी परीक्षा कार्यक्रम",
      passports: "पासपोर्ट नवीनीकरण के लिए आवश्यक दस्तावेज",
      sports: "खेल छात्रवृत्ति और प्रशिक्षण कार्यक्रम",
      bus: "तांबरम से अडयार बस"
    },
    loading: {
      caption1: "नागरिकों और सरकार के बीच की खाई को पाट रहे हैं...",
      caption2: "आपके लिए सबसे तेज़ एमटीसी मार्ग ढूंढ रहे हैं...",
      caption3: "शासन को सरल बनाना, एक समय में एक प्रश्न...",
      caption4: "एक स्मार्ट चेन्नई के लिए आपका डिजिटल साथी...",
      caption5: "तत्काल योजना पहुंच के साथ आपको सशक्त बनाना...",
      initialized: "शुरू किया गया"
    }
  },
  te: {
    greeting: "నమస్కారం! 🙏 నేను గవ్మిత్ర. ప్రభుత్వ సేవలలో నేను మీకు எలా సహాయం చేయగలను?",
    typing: "టైప్ చేస్తోంది...",
    placeholder: "మీ ప్రశ్నను ఇక్కడ టైప్ చేయండి...",
    send: "పంపు",
    categories: "వర్గాలు",
    viewOnMaps: "మ్యాప్‌లో చూడండి",
    serviceOffline: "సేవ ప్రస్తుతం ఆఫ్‌లైన్‌లో ఉంది.",
    categories_list: {
      education: "విద్యా పథకాలు",
      exams: "పరీక్షలు",
      passports: "పాస్‌పోర్ట్‌లు",
      sports: "క్రీడా సేవలు",
      bus: "ఎంటీసీ బస్ మార్గాలు"
    },
    queries: {
      education: "ఉన్నత విద్యకు స్కాలర్‌షిప్‌లు",
      exams: "రాబోయే ప్రభుత్వ పరీక్ష షెడ్యూల్",
      passports: "పాస్‌పోర్ట్ పునరుద్ధరణకు అవసరమైన పత్రాలు",
      sports: "క్రీడా స్కాలర్‌షిప్‌లు మరియు శిక్షణా కార్యక్రమాలు",
      bus: "తాంబరం నుండి అడయారు బస్"
    },
    loading: {
      caption1: "పౌరులు మరియు ప్రభుత్వం మధ్య అంతరాన్ని తగ్గిస్తోంది...",
      caption2: "మీ కోసం వేగవంతమైన ఎంటీసీ మార్గాలను కనుగొంటోంది...",
      caption3: "పాలనను సరళీకరించడం, ఒక సమయంలో ఒక ప్రశ్న...",
      caption4: "స్మార్ట్ చెన్నై కోసం మీ డిజిటల్ సహచరుడు...",
      caption5: "తక్షణ పథకం యాక్సెస్‌తో మిమ్మల్ని శక్తివంతం చేస్తోంది...",
      initialized: "ప్రారంభించబడింది"
    }
  },
  ml: {
    greeting: "നമസ്കാരം! 🙏 ഞാൻ ഗവ്മിത്രയാണ്. സർക്കാർ സേവനങ്ങളിൽ ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കും?",
    typing: "ടൈപ്പ് ചെയ്യുന്നു...",
    placeholder: "നിങ്ങളുടെ ചോദ്യം ഇവിടെ ടൈപ്പ് ചെയ്യുക...",
    send: "അയയ്ക്കുക",
    categories: "വിഭാഗങ്ങൾ",
    viewOnMaps: "മാപ്പിൽ കാണുക",
    serviceOffline: "സേവനം നിലവിൽ ഓഫ്‌ലൈനാണ്.",
    categories_list: {
      education: "വിദ്യാഭ്യാസ പദ്ധതികൾ",
      exams: "പരീക്ഷകൾ",
      passports: "പാസ്‌പോർട്ടുകൾ",
      sports: "കായിക സേവനങ്ങൾ",
      bus: "എംടിസി ബസ് റൂട്ടുകൾ"
    },
    queries: {
      education: "ഉന്നത വിദ്യാഭ്യാസത്തിനുള്ള സ്കോളർഷിപ്പുകൾ",
      exams: "വരാനിരിക്കുന്ന സർക്കാർ പരീക്ഷാ ഷെഡ്യൂൾ",
      passports: "പാസ്‌പോർട്ട് പുതുക്കലിന് ആവശ്യമായ രേഖകൾ",
      sports: "കായിക സ്കോളർഷിപ്പുകളും പരിശീലന പരിപാടികളും",
      bus: "താമ്പരം മുതൽ അടയാർ വരെ ബസ്"
    },
    loading: {
      caption1: "പൗരന്മാരും സർക്കാരും തമ്മിലുള്ള അകലം കുറയ്ക്കുന്നു...",
      caption2: "നിങ്ങൾക്കായി വേഗമേറിയ എംടിസി റൂട്ടുകൾ കണ്ടെത്തുന്നു...",
      caption3: "ഭരണം ലളിതമാക്കുന്നു, ഒരു സമയം ഒരു ചോദ്യം...",
      caption4: "സ്മാർട്ട് ചെന്നൈക്കായുള്ള നിങ്ങളുടെ ഡിജിറ്റൽ കൂട്ടാളി...",
      caption5: "തൽക്ഷണ പദ്ധതി ആക്‌സസ് ഉപയോഗിച്ച് നിങ്ങളെ ശാക്തീകരിക്കുന്നു...",
      initialized: "ആരംഭിച്ചു"
    }
  }
};

// --- LOADING PAGE COMPONENT WITH MULTILINGUAL SUPPORT ---
function LoadingPage({ progress, language = 'en' }) {
  const [captionIndex, setCaptionIndex] = useState(0);
  const t = translations[language].loading;
  const captions = [t.caption1, t.caption2, t.caption3, t.caption4, t.caption5];

  useEffect(() => {
    const interval = setInterval(() => {
      setCaptionIndex((prev) => (prev + 1) % captions.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [captions.length]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at center, #4f46e5 0%, #1e1b4b 100%)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', color: 'white', fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ fontSize: '100px', marginBottom: '10px', filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.4))', animation: 'pulse 2s ease-in-out infinite' }}>🤖</div>
      <h1 style={{ fontSize: '3.5rem', fontWeight: '900', letterSpacing: '-1px', marginBottom: '5px', background: 'linear-gradient(to bottom, #ffffff, #93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>GovMithra</h1>
      <div style={{ height: '30px', marginBottom: '30px' }}>
        <p style={{ fontSize: '1.1rem', color: '#cbd5e1', fontWeight: '300', fontStyle: 'italic', animation: 'fadeInOut 1.8s infinite' }}>{captions[captionIndex]}</p>
      </div>
      <div style={{ width: '320px', padding: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '20px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <div style={{ width: `${progress}%`, height: '12px', background: 'linear-gradient(90deg, #60a5fa, #c084fc)', borderRadius: '20px', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', boxShadow: '0 0 15px rgba(96, 165, 250, 0.6)' }}>
          <div className="shine-effect"></div>
        </div>
      </div>
      <p style={{ marginTop: '15px', fontSize: '0.9rem', opacity: 0.6, fontWeight: 'bold' }}>{progress}% {t.initialized}</p>
      <style>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } }
        @keyframes fadeInOut { 0%, 100% { opacity: 0; transform: translateY(5px); } 20%, 80% { opacity: 1; transform: translateY(0); } }
        @keyframes shine { 0% { left: -50px; } 100% { left: 100%; } }
        .shine-effect { position: absolute; top: 0; left: 0; width: 30px; height: 100%; background: rgba(255,255,255,0.4); transform: skewX(-20deg); animation: shine 1.5s infinite; }
      `}</style>
    </div>
  );
}

export default function GovMithra() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Get current translations
  const t = translations[selectedLanguage];

  // Language options
  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
    { code: 'te', name: 'Telugu', flag: '🇮🇳' },
    { code: 'ml', name: 'Malayalam', flag: '🇮🇳' }
  ];

  // Initialize welcome message when language changes
  useEffect(() => {
    setMessages([{
      type: 'bot',
      text: t.greeting,
      isResults: false,
      timestamp: new Date()
    }]);
  }, [selectedLanguage]);

  const sidebarCategories = [
    { icon: '🎓', label: t.categories_list.education, q: t.queries.education },
    { icon: '📝', label: t.categories_list.exams, q: t.queries.exams },
    { icon: '🛂', label: t.categories_list.passports, q: t.queries.passports },
    { icon: '🎾', label: t.categories_list.sports, q: t.queries.sports },
    { icon: '🚌', label: t.categories_list.bus, q: t.queries.bus }
  ];

  // Change language handler
  const changeLanguage = (langCode) => {
    setSelectedLanguage(langCode);
    setShowLanguageMenu(false);
    
    const langData = languages.find(l => l.code === langCode);
    
    // Send language change to backend
    handleSend(`Set language to ${langData.name}`);
  };

  const viewOnMaps = (source, destination) => {
    if (!source || !destination) {
      alert('Source or destination information is missing.');
      return;
    }
    
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(source + ', Chennai')}&destination=${encodeURIComponent(destination + ', Chennai')}&travelmode=transit`;
    window.open(mapsUrl, '_blank');
  };

  const renderValue = (val) => {
    const stringVal = String(val);
    if (stringVal.startsWith('http')) {
      return (
        <a href={stringVal} target="_blank" rel="noopener noreferrer" 
           style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: '600', borderBottom: '1px dashed #4f46e5' }}>
          View Link ↗
        </a>
      );
    }
    return stringVal;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setLoadingProgress(old => {
        if (old >= 100) { clearInterval(timer); setTimeout(() => setIsLoading(false), 800); return 100; }
        return old + 10;
      });
    }, 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBotTyping]);

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
          sender: "user_session_1", 
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
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: t.serviceOffline, 
        timestamp: new Date() 
      }]);
    }
  };

  const styles = {
    main: { minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Inter', sans-serif", color: '#1a1f36' },
    header: { 
      background: 'rgba(255, 255, 255, 0.8)', 
      backdropFilter: 'blur(10px)', 
      padding: '15px 40px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      position: 'sticky', 
      top: 0, 
      zIndex: 100 
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px'
    },
    languageBtn: {
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      padding: '8px 16px',
      borderRadius: '10px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '600',
      fontSize: '0.9rem',
      transition: 'all 0.2s',
      position: 'relative'
    },
    languageMenu: {
      position: 'absolute',
      top: '50px',
      right: '40px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
      padding: '10px',
      minWidth: '200px',
      zIndex: 1000
    },
    languageOption: {
      padding: '12px 15px',
      cursor: 'pointer',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      transition: 'all 0.2s',
      fontSize: '0.95rem'
    },
    grid: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: '30px', maxWidth: '1300px', margin: '30px auto', padding: '0 20px' },
    sidebar: { background: 'white', padding: '25px', borderRadius: '20px', height: 'fit-content', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', position: 'sticky', top: '100px' },
    chatBox: { background: 'white', borderRadius: '24px', height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' },
    msgArea: { flex: 1, overflowY: 'auto', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' },
    userBubble: { background: '#4f46e5', color: 'white', padding: '12px 18px', borderRadius: '18px 18px 2px 18px', alignSelf: 'flex-end' },
    botBubble: { background: '#f1f5f9', color: '#1e293b', padding: '12px 18px', borderRadius: '18px 18px 18px 2px', alignSelf: 'flex-start' },
    card: { background: 'white', borderRadius: '12px', padding: '15px', marginTop: '12px', border: '1px solid #eef2f6', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
    inputContainer: { padding: '20px 30px', background: 'white', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '15px' },
    actionBtn: { width: '100%', textAlign: 'left', padding: '12px 15px', marginBottom: '10px', border: 'none', borderRadius: '12px', cursor: 'pointer', background: '#f8fafc', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px', color: '#475569', fontWeight: '500' },
    mapsBtn: { 
      background: '#10b981', 
      color: 'white', 
      border: 'none', 
      padding: '8px 16px', 
      borderRadius: '8px', 
      cursor: 'pointer', 
      fontWeight: '600', 
      fontSize: '0.85rem',
      marginTop: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'all 0.2s'
    }
  };

  if (isLoading) return <LoadingPage progress={loadingProgress} language={selectedLanguage} />;

  const currentLang = languages.find(l => l.code === selectedLanguage);

  return (
    <div style={styles.main}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={{ fontSize: '2.2rem' }}>🤖</div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', background: 'linear-gradient(90deg, #4f46e5, #9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>GovMithra</h1>
        </div>
        
        {/* Language Selector */}
        <div style={{ position: 'relative' }}>
          <button 
            className="language-btn"
            style={styles.languageBtn}
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
          >
            <span style={{ fontSize: '1.2rem' }}>{currentLang.flag}</span>
            <span>{currentLang.name}</span>
            <span style={{ fontSize: '0.7rem' }}>▼</span>
          </button>
          
          {showLanguageMenu && (
            <div style={styles.languageMenu}>
              {languages.map(lang => (
                <div
                  key={lang.code}
                  className="language-option"
                  style={{
                    ...styles.languageOption,
                    background: selectedLanguage === lang.code ? '#eef2ff' : 'transparent',
                    fontWeight: selectedLanguage === lang.code ? '700' : '500'
                  }}
                  onClick={() => changeLanguage(lang.code)}
                >
                  <span style={{ fontSize: '1.3rem' }}>{lang.flag}</span>
                  <span>{lang.name}</span>
                  {selectedLanguage === lang.code && <span style={{ marginLeft: 'auto', color: '#4f46e5' }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <div style={styles.grid}>
        <aside style={styles.sidebar}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#1e293b' }}>{t.categories}</h3>
          {sidebarCategories.map((act, i) => (
            <button key={i} onClick={() => { setInputText(act.q); inputRef.current.focus(); }} 
                    className="sidebar-btn" style={styles.actionBtn}>
              <span style={{ fontSize: '1.2rem' }}>{act.icon}</span> {act.label}
            </button>
          ))}
        </aside>

        <div style={styles.chatBox}>
          <div style={styles.msgArea}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.type === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={m.type === 'user' ? styles.userBubble : styles.botBubble}>
                  <div style={{ fontSize: '0.95rem' }}>{m.text}</div>
                  {m.isResults && m.results.map((item, idx) => (
                    <div key={idx} style={styles.card}>
                      {Object.entries(item).map(([k, v]) => (
                        <div key={k} style={{ fontSize: '0.85rem', marginBottom: '6px' }}>
                          <b style={{ textTransform: 'capitalize', color: '#6366f1', display: 'inline-block', width: '90px' }}>{k.replace(/_/g, ' ')}</b> 
                          <span style={{ color: '#64748b' }}>|</span> &nbsp; {renderValue(v)}
                        </div>
                      ))}
                      {(item.source || item.from || item.origin) && (item.destination || item.to) && (
                        <button 
                          className="maps-btn"
                          style={styles.mapsBtn}
                          onClick={() => viewOnMaps(
                            item.source || item.from || item.origin,
                            item.destination || item.to
                          )}
                        >
                          <span>📍</span> {t.viewOnMaps}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {isBotTyping && <div style={{ color: '#6366f1', fontSize: '0.8rem' }}>{t.typing}</div>}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.inputContainer}>
            <input ref={inputRef} value={inputText} onChange={e => setInputText(e.target.value)} 
                   onKeyDown={e => e.key === 'Enter' && handleSend()} 
                   style={{ flex: 1, padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} 
                   placeholder={t.placeholder} />
            <button onClick={() => handleSend()} 
                    style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0 25px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>
              {t.send}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .sidebar-btn:hover { background: #eef2f6 !important; transform: translateX(5px); }
        .maps-btn:hover { background: #059669 !important; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
        .language-btn:hover { background: #eef2ff !important; }
        .language-option:hover { background: #f8fafc !important; }
      `}</style>
    </div>
  );
}