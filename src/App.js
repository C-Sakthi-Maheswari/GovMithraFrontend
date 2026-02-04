import React, { useState, useRef, useEffect } from 'react';

// --- LOADING PAGE COMPONENT ---
function LoadingPage({ progress }) {
  const [captionIndex, setCaptionIndex] = useState(0);
  const captions = [
    "Bridging the gap between Citizens and Government...",
    "Finding the fastest MTC routes for you...",
    "Simplifying Governance, one query at a time...",
    "Your digital companion for a smarter Chennai...",
    "Empowering you with instant scheme access..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCaptionIndex((prev) => (prev + 1) % captions.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

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
      <p style={{ marginTop: '15px', fontSize: '0.9rem', opacity: 0.6, fontWeight: 'bold' }}>{progress}% INITIALIZED</p>
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
  const [messages, setMessages] = useState([{
    type: 'bot',
    text: 'Namaste! 🙏 I am GovMithra. How can I help you with government services today?',
    isResults: false,
    timestamp: new Date()
  }]);
  const [inputText, setInputText] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // --- UPDATED CATEGORIES ---
  const sidebarCategories = [
    { icon: '🎓', label: 'Education Schemes', q: 'Scholarships for higher education' },
    { icon: '📝', label: 'Exams', q: 'Upcoming government exam schedule' },
    { icon: '🛂', label: 'Passports', q: 'Documents needed for passport renewal' },
    { icon: '🎾', label: 'Sports Services', q: 'Sports scholarships and training programs' },
    { icon: '🚌', label: 'MTC Bus Routes', q: 'Bus from Tambaram to Adyar' }
  ];

  // --- FUNCTION TO OPEN GOOGLE MAPS ---
  const viewOnMaps = (source, destination) => {
    if (!source || !destination) {
      alert('Source or destination information is missing.');
      return;
    }
    
    // Create Google Maps directions URL
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(source + ', Chennai')}&destination=${encodeURIComponent(destination + ', Chennai')}&travelmode=transit`;
    
    // Open in new tab
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
        body: JSON.stringify({ sender: "user_session_1", message: query })
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
      setMessages(prev => [...prev, { type: 'bot', text: 'Service currently offline.', timestamp: new Date() }]);
    }
  };

  const styles = {
    main: { minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Inter', sans-serif", color: '#1a1f36' },
    header: { background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', padding: '15px 40px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '15px', position: 'sticky', top: 0, zIndex: 100 },
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

  if (isLoading) return <LoadingPage progress={loadingProgress} />;

  return (
    <div style={styles.main}>
      <header style={styles.header}>
        <div style={{ fontSize: '2.2rem' }}>🤖</div>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', background: 'linear-gradient(90deg, #4f46e5, #9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>GovMithra</h1>
      </header>

      <div style={styles.grid}>
        <aside style={styles.sidebar}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#1e293b' }}>Categories</h3>
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
                      {/* Show View on Maps button if source and destination exist */}
                      {(item.source || item.from || item.origin) && (item.destination || item.to) && (
                        <button 
                          className="maps-btn"
                          style={styles.mapsBtn}
                          onClick={() => viewOnMaps(
                            item.source || item.from || item.origin,
                            item.destination || item.to
                          )}
                        >
                          <span>📍</span> View on Maps
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {isBotTyping && <div style={{ color: '#6366f1', fontSize: '0.8rem' }}>Typing...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.inputContainer}>
            <input ref={inputRef} value={inputText} onChange={e => setInputText(e.target.value)} 
                   onKeyDown={e => e.key === 'Enter' && handleSend()} 
                   style={{ flex: 1, padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} 
                   placeholder="Type your query here..." />
            <button onClick={() => handleSend()} 
                    style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0 25px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>
              Send
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .sidebar-btn:hover { background: #eef2f6 !important; transform: translateX(5px); }
        .maps-btn:hover { background: #059669 !important; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
      `}</style>
    </div>
  );
}