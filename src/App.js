import React, { useState, useRef, useEffect } from 'react';

export default function GovMithra() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: 'Namaste! 🙏 I am GovMithra, your personal assistant for government services. How can I help you today?',
      isResults: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // --- LOADING SIMULATION ---
  useEffect(() => {
    const steps = [
      { progress: 20, delay: 300 },
      { progress: 40, delay: 500 },
      { progress: 60, delay: 400 },
      { progress: 80, delay: 500 },
      { progress: 100, delay: 400 }
    ];

    let currentStep = 0;
    const runStep = () => {
      if (currentStep < steps.length) {
        setTimeout(() => {
          setLoadingProgress(steps[currentStep].progress);
          currentStep++;
          runStep();
        }, steps[currentStep].delay);
      } else {
        setTimeout(() => setIsLoading(false), 500);
      }
    };
    runStep();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isBotTyping]);

 const quickActions = [
  // Keeping your requested originals
  { icon: '🚌', label: 'Bus Routes', query: 'Bus from [Origin] to [Destination]' },
  { icon: '🎓', label: 'Education Schemes', query: 'Scholarships for [Level of Education]' },
  
  // Adding the new categories from your image
  { icon: '🏥', label: 'Health and Wellness', query: 'Health schemes for [Condition/Age Group]' },
  { icon: '⚡', label: 'Electricity & Water', query: 'Apply for new water connection in [Area]' },
  { icon: '💰', label: 'Money and Taxes', query: 'Income tax deadlines and rebate info' },
  { icon: '💼', label: 'Jobs', query: 'Latest government job openings for [Qualification]' },
  { icon: '⚖️', label: 'Justice & Law', query: 'Legal aid services and grievance portals' },
  { icon: '✈️', label: 'Travel and Tourism', query: 'Tourist spots and permit requirements for [Location]' },
  { icon: '🏪', label: 'Business & Self-employed', query: 'MSME loan schemes and registration' },
  { icon: '📜', label: 'Births, Deaths & Marriages', query: 'Apply for marriage certificate in [City]' },
  { icon: '👴', label: 'Pension and Benefits', query: 'Senior citizen pension eligibility' },
  { icon: '🏗️', label: 'Transport & Infrastructure', query: 'Road project updates and metro phases' },
  { icon: '🛂', label: 'Citizenship & Passports', query: 'Passport renewal documents required' },
  { icon: '🚜', label: 'Agriculture & Rural', query: 'Fertilizer subsidies and crop insurance' },
  { icon: '💻', label: 'Science & IT', query: 'Digital India initiatives and IT grants' },
  { icon: '🎾', label: 'Youth & Sports', query: 'Sports scholarships and training centers' }
];

  // --- API INTEGRATION ---
  const handleSend = async (forcedQuery = null) => {
    const query = forcedQuery || inputText;
    if (!query.trim()) return;

    const userMessage = {
      type: 'user',
      text: query,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsBotTyping(true);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query })
      });

      const data = await response.json();
      setIsBotTyping(false);

      if (data.results && data.results.length > 0) {
        setMessages(prev => [...prev, {
          type: 'bot',
          text: `I found ${data.results.length} bus routes based on your query:`,
          results: data.results,
          isResults: true,
          timestamp: new Date()
        }]);
      } else {
        setMessages(prev => [...prev, {
          type: 'bot',
          text: "I couldn't find a specific match. Try asking with 'from' and 'to', or a bus number like '21G'.",
          isResults: false,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error:', error);
      setIsBotTyping(false);
      setMessages(prev => [...prev, {
        type: 'bot',
        text: 'Sorry, I’m having trouble reaching the server. Please check if Flask is running on port 5000.',
        isResults: false,
        timestamp: new Date()
      }]);
    }
  };

  // Add a ref for the textarea at the top with your other refs
const inputRef = useRef(null);

// Update this function
const handleQuickAction = (query) => {
  setInputText(query);
  // Optional: focus the input so the user can edit immediately
  inputRef.current?.focus();
};

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- STYLES OBJECT ---
  const styles = {
    // (I am keeping all your existing styles here exactly as you provided them)
    mainContainer: { minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 50%, #f3e8ff 100%)' },
    header: { background: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', position: 'sticky', top: 0, zIndex: 50 },
    headerContent: { maxWidth: '1280px', margin: '0 auto', padding: '0 24px' },
    headerFlex: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' },
    logoSection: { display: 'flex', alignItems: 'center', gap: '12px' },
    logoIcon: { background: 'linear-gradient(135deg, #6366f1, #9333ea)', padding: '8px', borderRadius: '12px', fontSize: '32px' },
    brandTitle: { fontSize: '1.5rem', fontWeight: 'bold', background: 'linear-gradient(to right, #4f46e5, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    chatContainer: { background: 'white', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', overflow: 'hidden', height: 'calc(100vh - 200px)', minHeight: '500px', display: 'flex', flexDirection: 'column' },
    messagesContainer: { flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
    messageBubbleBot: { background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)', color: '#1f2937', borderRadius: '16px', padding: '12px 20px' },
    messageBubbleUser: { background: 'linear-gradient(135deg, #6366f1, #9333ea)', color: 'white', borderRadius: '16px', padding: '12px 20px' },
    inputArea: { borderTop: '1px solid #e5e7eb', padding: '16px', background: '#f9fafb' },
    textarea: { flex: 1, padding: '12px 16px', borderRadius: '12px', border: '2px solid #e5e7eb', outline: 'none', resize: 'none' },
    sendButton: { background: 'linear-gradient(to right, #6366f1, #9333ea)', color: 'white', padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer' },
    // Add Bus Card specific styles
    busCard: {
        background: 'white',
        border: '1px solid #e5e7eb',
        borderLeft: '5px solid #f59e0b',
        borderRadius: '12px',
        padding: '12px',
        marginTop: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        textAlign: 'left'
    },
    busBadge: {
        background: '#fee2e2',
        color: '#dc2626',
        padding: '2px 8px',
        borderRadius: '6px',
        fontWeight: 'bold',
        fontSize: '0.8rem'
    }
  };

  // --- RENDERING HELPERS ---
  const renderBotMessage = (message) => {
    if (message.isResults) {
      return (
        <div>
          <p style={{marginBottom: '10px'}}>{message.text}</p>
          {message.results.map((bus, i) => (
            <div key={i} style={styles.busCard}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span style={styles.busBadge}>Bus {bus.no}</span>
                <span style={{fontSize: '12px', color: '#6b7280'}}>
                   {bus.flags.high && '⚡ High Freq'} {bus.flags.night && '🌙 Night'}
                </span>
              </div>
              <div style={{marginTop: '8px', fontWeight: '600', fontSize: '0.95rem'}}>
                {bus.origin} <span style={{color: '#6366f1'}}>➔</span> {bus.dest}
              </div>
              <div style={{fontSize: '0.8rem', color: '#6b7280', marginTop: '4px'}}>
                <strong>Via:</strong> {bus.via}
              </div>
            </div>
          ))}
        </div>
      );
    }
    return <p>{message.text}</p>;
  };

  if (isLoading) return <LoadingPage progress={loadingProgress} />;

  return (
    <div style={styles.mainContainer}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerFlex}>
            <div style={styles.logoSection}>
              <div style={styles.logoIcon}>🤖</div>
              <div style={{display: 'flex', flexDirection: 'column'}}>
                <h1 style={styles.brandTitle}>GovMithra</h1>
                <p style={{fontSize: '0.75rem', color: '#6b7280'}}>Your Government Services Assistant</p>
              </div>
            </div>
            <nav className="desktop-nav" style={{display: 'flex', gap: '20px'}}>
              <a href="#" style={{textDecoration: 'none', color: '#374151', fontWeight: '500'}}>Home</a>
              <a href="#" style={{textDecoration: 'none', color: '#374151', fontWeight: '500'}}>About</a>
            </nav>
          </div>
        </div>
      </header>

      <main style={{maxWidth: '1280px', margin: '0 auto', padding: '32px 24px'}}>
        <div style={{display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px'}}>
          <aside style={{background: 'white', padding: '24px', borderRadius: '16px', height: 'fit-content'}}>
            <h2 style={{fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px'}}>📄 Quick Access</h2>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              {quickActions.map((action, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleQuickAction(action.query)}
                  style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: 'none', background: '#f8fafc', borderRadius: '10px', cursor: 'pointer', textAlign: 'left'}}
                >
                  <span>{action.icon}</span>
                  <span style={{fontSize: '0.9rem', fontWeight: '500'}}>{action.label}</span>
                </button>
              ))}
            </div>
          </aside>

          <div style={styles.chatContainer}>
            <div style={styles.messagesContainer}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{display: 'flex', justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start'}}>
                  <div style={msg.type === 'user' ? styles.messageBubbleUser : styles.messageBubbleBot}>
                    {msg.type === 'bot' ? renderBotMessage(msg) : <p>{msg.text}</p>}
                    <div style={{fontSize: '0.7rem', marginTop: '5px', opacity: 0.7}}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              {isBotTyping && <div style={{color: '#6366f1', fontSize: '0.8rem'}}>GovMithra is searching...</div>}
              <div ref={messagesEndRef} />
            </div>

            <div style={styles.inputArea}>
              <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                <textarea 
  ref={inputRef} // Add this line
  style={styles.textarea} 
  placeholder="Ask me anything... e.g. 'Bus from Adyar to Broadway'"
  value={inputText}
  onChange={(e) => setInputText(e.target.value)}
  onKeyPress={handleKeyPress}
/>
                <button style={styles.sendButton} onClick={() => handleSend()}>➤</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Separate component for the Loading Screen for cleaner code
function LoadingPage({ progress }) {
  const [captionIndex, setCaptionIndex] = useState(0);
  
  const captions = [
    "Bridging the gap between Citizens and Government...",
    "Finding the fastest MTC routes for you...",
    "Simplifying Governance, one query at a time...",
    "Your digital companion for a smarter Chennai...",
    "Empowering you with instant scheme access..."
  ];

  // Cycle through captions every 1.5 seconds
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
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: 'white',
      fontFamily: "'Segoe UI', sans-serif"
    }}>
      {/* Animated Glowing Logo */}
      <div style={{
        fontSize: '100px',
        marginBottom: '10px',
        filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.4))',
        animation: 'pulse 2s ease-in-out infinite'
      }}>
        🤖
      </div>

      <h1 style={{
        fontSize: '3.5rem',
        fontWeight: '900',
        letterSpacing: '-1px',
        marginBottom: '5px',
        background: 'linear-gradient(to bottom, #ffffff, #93c5fd)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        GovMithra
      </h1>

      {/* Rotating Captions */}
      <div style={{ height: '30px', marginBottom: '30px' }}>
        <p style={{
          fontSize: '1.1rem',
          color: '#cbd5e1',
          fontWeight: '300',
          fontStyle: 'italic',
          animation: 'fadeInOut 1.8s infinite'
        }}>
          {captions[captionIndex]}
        </p>
      </div>

      {/* Modern Progress Bar */}
      <div style={{
        width: '320px',
        padding: '4px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '12px',
          background: 'linear-gradient(90deg, #60a5fa, #c084fc)',
          borderRadius: '20px',
          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          boxShadow: '0 0 15px rgba(96, 165, 250, 0.6)'
        }}>
          {/* Subtle light streak animation */}
          <div className="shine-effect"></div>
        </div>
      </div>
      
      <p style={{ marginTop: '15px', fontSize: '0.9rem', opacity: 0.6, fontWeight: 'bold' }}>
        {progress}% INITIALIZED
      </p>

      {/* Injection of Keyframe Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes fadeInOut {
          0%, 100% { opacity: 0; transform: translateY(5px); }
          20%, 80% { opacity: 1; transform: translateY(0); }
        }
        .shine-effect {
          position: absolute;
          top: 0; left: 0; width: 30px; height: 100%;
          background: rgba(255,255,255,0.4);
          transform: skewX(-20deg);
          animation: shine 1.5s infinite;
        }
        @keyframes shine {
          0% { left: -50px; }
          100% { left: 100%; }
        }
          <aside style={{
  background: 'white', 
  padding: '24px', 
  borderRadius: '16px', 
  height: 'calc(100vh - 200px)', // Matches chat container height
  overflowY: 'auto',            // Allows scrolling within the menu
  position: 'sticky',
  top: '100px'
}}>s
      `}</style>
    </div>
  );
}