import React, { useState, useRef, useEffect } from 'react';

export default function GovMithra() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: 'Namaste! 🙏 I am GovMithra, your personal assistant for government services. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Loading page simulation
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
    { icon: '💼', label: 'Loan Schemes', query: 'Show me available loan schemes' },
    { icon: '❤️', label: 'Health Insurance', query: 'What health insurance schemes are available?' },
    { icon: '🎓', label: 'Education', query: 'Tell me about education scholarships' },
    { icon: '🚌', label: 'Bus Routes', query: 'Show me bus routes and schedules' },
    { icon: '🪙', label: 'Gold Rates', query: 'What are the current gold rates?' },
    { icon: '⛽', label: 'Petroleum & Gas', query: 'Show me petroleum and gas prices' }
  ];

  const handleSend = () => {
  if (inputText.trim()) {
    const userMessage = {
      type: 'user',
      text: inputText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Save query BEFORE clearing input
    const query = inputText;
    setInputText('');
    setIsBotTyping(true);

    // Connect to Flask Backend
    fetch('http://localhost:5000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: query })
    })
    .then(response => response.json())
    .then(data => {
      setIsBotTyping(false);
      const botResponse = {
        type: 'bot',
        text: data.response || 'Sorry, I couldn\'t process that.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
    })
    .catch(error => {
      console.error('Error:', error);
      setIsBotTyping(false);
      const errorResponse = {
        type: 'bot',
        text: 'Sorry, I encountered an error connecting to the backend. Please make sure Flask is running on port 5000.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    });
  }
};

  const handleQuickAction = (query) => {
    setInputText(query);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const styles = {
    loadingContainer: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    },
    floatingOrb1: {
      position: 'absolute',
      width: '384px',
      height: '384px',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '50%',
      filter: 'blur(60px)',
      top: '40px',
      left: '40px',
      animation: 'float 6s ease-in-out infinite'
    },
    floatingOrb2: {
      position: 'absolute',
      width: '384px',
      height: '384px',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '50%',
      filter: 'blur(60px)',
      bottom: '40px',
      right: '40px',
      animation: 'floatDelayed 6s ease-in-out infinite'
    },
    loadingContent: {
      position: 'relative',
      zIndex: 10,
      textAlign: 'center',
      padding: '0 20px'
    },
    logoContainer: {
      marginBottom: '32px',
      display: 'flex',
      justifyContent: 'center'
    },
    logoWrapper: {
      position: 'relative'
    },
    logoGlow: {
      position: 'absolute',
      inset: 0,
      background: 'white',
      opacity: 0.2,
      borderRadius: '50%',
      filter: 'blur(40px)',
      animation: 'pulse 2s ease-in-out infinite'
    },
    logo: {
      position: 'relative',
      background: 'white',
      padding: '24px',
      borderRadius: '24px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      animation: 'bounceSlow 2s ease-in-out infinite',
      fontSize: '80px'
    },
    brandName: {
      fontSize: '3.75rem',
      fontWeight: 'bold',
      color: 'white',
      marginBottom: '16px',
      letterSpacing: '-0.025em',
      animation: 'fadeIn 1s ease-out'
    },
    tagline: {
      fontSize: '1.25rem',
      color: 'rgba(199, 210, 254, 1)',
      marginBottom: '48px',
      animation: 'fadeInDelayed 1.5s ease-out'
    },
    progressContainer: {
      maxWidth: '448px',
      margin: '0 auto 24px'
    },
    progressBar: {
      height: '8px',
      background: 'rgba(255, 255, 255, 0.2)',
      borderRadius: '9999px',
      overflow: 'hidden',
      backdropFilter: 'blur(4px)'
    },
    progressFill: {
      height: '100%',
      background: 'linear-gradient(to right, white, rgba(199, 210, 254, 1))',
      borderRadius: '9999px',
      transition: 'width 0.5s ease-out',
      position: 'relative'
    },
    progressText: {
      color: 'white',
      fontSize: '0.875rem',
      marginTop: '12px',
      fontWeight: '500'
    },
    loadingMessage: {
      color: 'rgba(199, 210, 254, 1)',
      fontSize: '0.875rem',
      animation: 'pulse 2s ease-in-out infinite'
    },
    dots: {
      marginTop: '48px',
      display: 'flex',
      justifyContent: 'center',
      gap: '8px'
    },
    dot: {
      width: '8px',
      height: '8px',
      background: 'white',
      borderRadius: '50%',
      animation: 'bounce 1s ease-in-out infinite'
    },
    mainContainer: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 50%, #f3e8ff 100%)'
    },
    header: {
      background: 'white',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    },
    headerContent: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '0 24px'
    },
    headerFlex: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 0'
    },
    logoSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    logoIcon: {
      background: 'linear-gradient(135deg, #6366f1, #9333ea)',
      padding: '8px',
      borderRadius: '12px',
      fontSize: '32px'
    },
    brandInfo: {
      display: 'flex',
      flexDirection: 'column'
    },
    brandTitle: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    brandSubtitle: {
      fontSize: '0.75rem',
      color: '#6b7280'
    },
    menuButton: {
      padding: '8px',
      borderRadius: '8px',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontSize: '24px',
      transition: 'background 0.2s'
    },
    nav: {
      display: 'flex',
      alignItems: 'center',
      gap: '24px'
    },
    navLink: {
      color: '#374151',
      textDecoration: 'none',
      fontWeight: '500',
      transition: 'color 0.2s'
    },
    mobileMenu: {
      borderTop: '1px solid #e5e7eb',
      background: 'white'
    },
    mobileNav: {
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    mobileNavLink: {
      padding: '8px 0',
      color: '#374151',
      textDecoration: 'none',
      fontWeight: '500',
      display: 'block'
    },
    mainContent: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '32px 24px'
    },
    gridContainer: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '24px'
    },
    sidebar: {
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      padding: '24px',
      height: 'fit-content'
    },
    sidebarTitle: {
      fontSize: '1.125rem',
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    quickActionList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    quickActionButton: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      borderRadius: '12px',
      background: 'linear-gradient(to right, #eef2ff, #faf5ff)',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s',
      textAlign: 'left'
    },
    quickActionIcon: {
      fontSize: '20px',
      transition: 'transform 0.3s'
    },
    quickActionLabel: {
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#374151',
      flex: 1
    },
    quickActionArrow: {
      fontSize: '16px',
      color: '#9ca3af',
      transition: 'color 0.3s'
    },
    helpCard: {
      marginTop: '24px',
      padding: '16px',
      background: 'linear-gradient(135deg, #6366f1, #9333ea)',
      borderRadius: '12px',
      color: 'white'
    },
    helpTitle: {
      fontWeight: 'bold',
      fontSize: '0.875rem',
      marginBottom: '8px'
    },
    helpText: {
      fontSize: '0.75rem',
      opacity: 0.9,
      marginBottom: '12px',
      lineHeight: '1.5'
    },
    helpButton: {
      width: '100%',
      background: 'white',
      color: '#6366f1',
      fontSize: '0.875rem',
      fontWeight: '500',
      padding: '8px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      transition: 'background 0.2s'
    },
    chatContainer: {
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      height: 'calc(100vh - 200px)',
      minHeight: '500px',
      display: 'flex',
      flexDirection: 'column'
    },
    messagesContainer: {
      flex: 1,
      overflowY: 'auto',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    messageWrapper: {
      display: 'flex',
      animation: 'fadeInMessage 0.3s ease-out'
    },
    messageWrapperUser: {
      justifyContent: 'flex-end'
    },
    messageWrapperBot: {
      justifyContent: 'flex-start'
    },
    messageContent: {
      display: 'flex',
      gap: '12px',
      maxWidth: '66.666667%',
      alignItems: 'flex-start'
    },
    messageContentUser: {
      flexDirection: 'row-reverse'
    },
    avatar: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      fontSize: '20px'
    },
    avatarBot: {
      background: 'linear-gradient(135deg, #6366f1, #9333ea)'
    },
    avatarUser: {
      background: 'linear-gradient(135deg, #3b82f6, #06b6d4)'
    },
    messageBubble: {
      borderRadius: '16px',
      padding: '12px 20px'
    },
    messageBubbleBot: {
      background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)',
      color: '#1f2937'
    },
    messageBubbleUser: {
      background: 'linear-gradient(135deg, #6366f1, #9333ea)',
      color: 'white'
    },
    messageText: {
      fontSize: '0.875rem',
      lineHeight: '1.5'
    },
    messageTime: {
      fontSize: '0.75rem',
      marginTop: '8px'
    },
    messageTimeBot: {
      color: '#6b7280'
    },
    messageTimeUser: {
      color: 'rgba(199, 210, 254, 1)'
    },
    typingIndicator: {
      display: 'flex',
      gap: '8px'
    },
    typingDot: {
      width: '8px',
      height: '8px',
      background: '#818cf8',
      borderRadius: '50%',
      animation: 'bounce 1s ease-in-out infinite'
    },
    inputArea: {
      borderTop: '1px solid #e5e7eb',
      padding: '16px',
      background: '#f9fafb'
    },
    inputFlex: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: '12px'
    },
    textarea: {
      flex: 1,
      padding: '12px 16px',
      borderRadius: '12px',
      border: '2px solid #e5e7eb',
      outline: 'none',
      resize: 'none',
      fontSize: '0.875rem',
      fontFamily: 'inherit',
      transition: 'border-color 0.2s'
    },
    sendButton: {
      background: 'linear-gradient(to right, #6366f1, #9333ea)',
      color: 'white',
      padding: '16px',
      borderRadius: '12px',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.3s',
      fontSize: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    sendButtonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    },
    disclaimer: {
      fontSize: '0.75rem',
      color: '#6b7280',
      marginTop: '8px',
      textAlign: 'center'
    },
    footer: {
      background: 'white',
      borderTop: '1px solid #e5e7eb',
      marginTop: '48px'
    },
    footerContent: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '24px',
      textAlign: 'center',
      fontSize: '0.875rem',
      color: '#4b5563'
    },
    footerSubtext: {
      marginTop: '4px',
      fontSize: '0.75rem',
      color: '#6b7280'
    }
  };

  // Loading Page Component
  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.floatingOrb1}></div>
        <div style={styles.floatingOrb2}></div>
        
        <div style={styles.loadingContent}>
          <div style={styles.logoContainer}>
            <div style={styles.logoWrapper}>
              <div style={styles.logoGlow}></div>
              <div style={styles.logo}>🤖</div>
            </div>
          </div>

          <h1 style={styles.brandName}>GovMithra</h1>
          <p style={styles.tagline}>Your Gateway to Government Services</p>

          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div style={{...styles.progressFill, width: `${loadingProgress}%`}}></div>
            </div>
            <p style={styles.progressText}>Loading... {loadingProgress}%</p>
          </div>

          <div style={styles.loadingMessage}>
            {loadingProgress < 30 && "Initializing AI Assistant..."}
            {loadingProgress >= 30 && loadingProgress < 60 && "Connecting to Government Databases..."}
            {loadingProgress >= 60 && loadingProgress < 90 && "Loading Scheme Information..."}
            {loadingProgress >= 90 && "Almost Ready..."}
          </div>

          <div style={styles.dots}>
            <div style={styles.dot}></div>
            <div style={{...styles.dot, animationDelay: '0.1s'}}></div>
            <div style={{...styles.dot, animationDelay: '0.2s'}}></div>
          </div>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            50% { transform: translateY(-20px) translateX(20px); }
          }
          @keyframes floatDelayed {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            50% { transform: translateY(20px) translateX(-20px); }
          }
          @keyframes bounceSlow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeInDelayed {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          @keyframes fadeInMessage {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .quick-action-button:hover {
            background: linear-gradient(to right, #e0e7ff, #f5f3ff) !important;
          }
          .quick-action-button:hover .icon {
            transform: scale(1.1);
          }
          .quick-action-button:hover .arrow {
            color: #6366f1;
          }
          .send-button:hover:not(:disabled) {
            transform: scale(1.05);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          }
          .nav-link:hover {
            color: #6366f1;
          }
          .menu-button:hover {
            background: #f3f4f6;
          }
          .help-button:hover {
            background: #f3f4f6;
          }
          .textarea:focus {
            border-color: #6366f1;
          }
          
          @media (min-width: 1024px) {
            .grid-container {
              grid-template-columns: 300px 1fr;
            }
            .mobile-menu-button {
              display: none;
            }
          }
          @media (max-width: 1023px) {
            .desktop-nav {
              display: none;
            }
            .grid-container {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    );
  }

  // Main Application
  return (
    <div style={styles.mainContainer}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerFlex}>
            <div style={styles.logoSection}>
              <div style={styles.logoIcon}>🤖</div>
              <div style={styles.brandInfo}>
                <h1 style={styles.brandTitle}>GovMithra</h1>
                <p style={styles.brandSubtitle}>Your Government Services Assistant</p>
              </div>
            </div>
            
            <button 
              className="mobile-menu-button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={styles.menuButton}
            >
              {isMenuOpen ? '✕' : '☰'}
            </button>

            <nav className="desktop-nav" style={styles.nav}>
              <a href="#" style={styles.navLink} className="nav-link">Home</a>
              <a href="#" style={styles.navLink} className="nav-link">Schemes</a>
              <a href="#" style={styles.navLink} className="nav-link">About</a>
              <a href="#" style={styles.navLink} className="nav-link">Contact</a>
            </nav>
          </div>
        </div>

        {isMenuOpen && (
          <div style={styles.mobileMenu}>
            <nav style={styles.mobileNav}>
              <a href="#" style={styles.mobileNavLink}>Home</a>
              <a href="#" style={styles.mobileNavLink}>Schemes</a>
              <a href="#" style={styles.mobileNavLink}>About</a>
              <a href="#" style={styles.mobileNavLink}>Contact</a>
            </nav>
          </div>
        )}
      </header>

      <main style={styles.mainContent}>
        <div style={styles.gridContainer} className="grid-container">
          <aside style={styles.sidebar}>
            <h2 style={styles.sidebarTitle}>
              📄 Quick Access
            </h2>
            <div style={styles.quickActionList}>
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickAction(action.query)}
                  style={styles.quickActionButton}
                  className="quick-action-button"
                >
                  <div style={styles.quickActionIcon} className="icon">
                    {action.icon}
                  </div>
                  <span style={styles.quickActionLabel}>
                    {action.label}
                  </span>
                  <span style={styles.quickActionArrow} className="arrow">
                    ›
                  </span>
                </button>
              ))}
            </div>


          </aside>

          <div style={styles.chatContainer}>
            <div style={styles.messagesContainer}>
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.messageWrapper,
                    ...(message.type === 'user' ? styles.messageWrapperUser : styles.messageWrapperBot)
                  }}
                >
                  <div
                    style={{
                      ...styles.messageContent,
                      ...(message.type === 'user' ? styles.messageContentUser : {})
                    }}
                  >
                    <div style={{...styles.avatar, ...(message.type === 'bot' ? styles.avatarBot : styles.avatarUser)}}>
                      {message.type === 'bot' ? '🤖' : '👤'}
                    </div>
                    <div style={{...styles.messageBubble, ...(message.type === 'bot' ? styles.messageBubbleBot : styles.messageBubbleUser)}}>
                      <p style={styles.messageText}>{message.text}</p>
                      <p style={{...styles.messageTime, ...(message.type === 'bot' ? styles.messageTimeBot : styles.messageTimeUser)}}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {isBotTyping && (
                <div style={{...styles.messageWrapper, ...styles.messageWrapperBot}}>
                  <div style={styles.messageContent}>
                    <div style={{...styles.avatar, ...styles.avatarBot}}>🤖</div>
                    <div style={{...styles.messageBubble, ...styles.messageBubbleBot}}>
                      <div style={styles.typingIndicator}>
                        <div style={styles.typingDot}></div>
                        <div style={{...styles.typingDot, animationDelay: '0.1s'}}></div>
                        <div style={{...styles.typingDot, animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div style={styles.inputArea}>
              <div style={styles.inputFlex}>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your question about government services..."
                  rows="2"
                  style={styles.textarea}
                  className="textarea"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || isBotTyping}
                  style={{
                    ...styles.sendButton,
                    ...(!inputText.trim() || isBotTyping ? styles.sendButtonDisabled : {})
                  }}
                  className="send-button"
                >
                  {isBotTyping ? '⏳' : '➤'}
                </button>
              </div>
              <p style={styles.disclaimer}>
                Powered by AI • All scheme information is sourced from official government portals
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <p>© 2025 GovMithra. Empowering citizens through accessible governance.</p>
          <p style={styles.footerSubtext}>
            A project initiative to bridge the gap between government schemes and citizens
          </p>
        </div>
      </footer>
    </div>
  );
}