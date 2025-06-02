import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login } from '../store/authSlice';
import './LoginPage.css';
import { gsap } from "gsap";

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);
  
  // Refs for GSAP animations
  const formRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const buttonRef = useRef(null);
  const footerRef = useRef(null);
  const decorRef = useRef(null);
  
  // Initialize animations when component mounts
  useEffect(() => {
    // Set timeout to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      setIsLoaded(true);
      
      // Main container animation
      gsap.fromTo(
        formRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      );
      
      // Staggered text animations
      const tl = gsap.timeline({ delay: 0.2 });
      tl.fromTo(
        titleRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.7)" }
      )
      .fromTo(
        subtitleRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.7)" },
        "-=0.4"
      )
      .fromTo(
        [usernameRef.current, passwordRef.current, buttonRef.current, footerRef.current],
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" },
        "-=0.3"
      );
      
      // Decorative elements animation
      gsap.fromTo(
        decorRef.current,
        { opacity: 0, scale: 0.8, rotate: -5 },
        { opacity: 0.6, scale: 1, rotate: 0, duration: 1.2, ease: "elastic.out(1, 0.4)" }
      );
      
      // Hover animations for input fields
      const inputs = document.querySelectorAll('.input-animated');
      inputs.forEach(input => {
        input.addEventListener('focus', () => {
          gsap.to(input, { boxShadow: '0 0 0 3px rgba(136, 206, 2, 0.15)', duration: 0.3 });
        });
        input.addEventListener('blur', () => {
          gsap.to(input, { boxShadow: 'none', duration: 0.3 });
        });
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Button click animation
    gsap.to(buttonRef.current, {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut"
    });
    
    dispatch(login({ username, password })).then((result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        // Success animation before navigate
        gsap.to(formRef.current, {
          y: -30,
          opacity: 0,
          duration: 0.5,
          ease: "power3.in",
          onComplete: () => navigate('/boards')
        });
      } else {
        // Error shake animation
        gsap.to(formRef.current, {
          x: 10,
          duration: 0.1,
          repeat: 5,
          yoyo: true,
          ease: "power2.inOut"
        });
      }
    });
  };

  return (
    <div className="login-container">
      <div className="login-page">
        <div className="background-gradient">
          <div className="circle-decoration circle-1"></div>
          <div className="circle-decoration circle-2"></div>
          <div className="circle-decoration circle-3"></div>
        </div>
        
        <div ref={formRef} className={`login-card-container ${isLoaded ? 'loaded' : ''}`}>
          <div className="login-card">
            <div className="card-inner">
              <div className="decoration" ref={decorRef}>
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                  <path fill="var(--accent-primary)" d="M45.7,-52.8C59.1,-41.7,69.5,-27.1,73.7,-10.7C78,5.7,76.1,24,67.1,38.5C58.1,52.9,42,63.5,24.7,69.5C7.3,75.6,-11.2,77,-27.1,71.1C-43,65.2,-56.2,51.9,-65.3,35.6C-74.4,19.4,-79.3,0.2,-75.7,-17.2C-72.1,-34.6,-60,-50.2,-45.2,-61C-30.5,-71.8,-13.1,-77.8,1.9,-80C16.9,-82.2,32.2,-64,45.7,-52.8Z" transform="translate(100 100)" />
                </svg>
              </div>
              
              <div className="login-content">
                <div className="login-header">
                  <h1 ref={titleRef} className="login-title">Welcome Back</h1>
                  <p ref={subtitleRef} className="login-subtitle">Sign in to continue your journey</p>
                </div>
                
                <form onSubmit={handleSubmit} className="login-form">
                  <div ref={usernameRef} className="input-group">
                    <label htmlFor="username">Username</label>
                    <div className="input-wrapper">
                      <span className="input-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <input
                        type="text"
                        id="username"
                        className="input-animated"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        required
                      />
                    </div>
                  </div>
                  
                  <div ref={passwordRef} className="input-group">
                    <label htmlFor="password">Password</label>
                    <div className="input-wrapper">
                      <span className="input-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <input
                        type="password"
                        id="password"
                        className="input-animated"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                  </div>
                  
                  {error && (
                    <div className="error-message">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <circle cx="12" cy="16" r="1" fill="currentColor"/>
                      </svg>
                      {error}
                    </div>
                  )}
                  
                  <button
                    ref={buttonRef}
                    type="submit"
                    disabled={loading}
                    className="btn-login"
                  >
                    {loading ? (
                      <div className="loader-container">
                        <span className="loader"></span>
                        <span>Signing In...</span>
                      </div>
                    ) : (
                      <div className="btn-content">
                        <span>Sign In</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                  
                  <div ref={footerRef} className="form-footer">
                    <a href="#forgot-password" className="link-animated">Forgot password?</a>
                    <a href="#register" className="link-animated">Create account</a>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;