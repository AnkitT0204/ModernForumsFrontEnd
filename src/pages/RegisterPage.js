import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../store/authSlice';
import {gsap }from 'gsap';
import './RegisterPage.css';

function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const formRef = useRef(null);
  const cardRef = useRef(null);
  const timeline = useRef(null);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);
  
  // Initialize GSAP animations
  useEffect(() => {
    // Create a timeline for staggered animations
    timeline.current = gsap.timeline({ defaults: { ease: "power3.out" } });
    
    // Card entrance animation
    timeline.current.fromTo(cardRef.current, 
      { y: 50, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.8 }
    );
    
    // Staggered form elements animation
    timeline.current.fromTo(".stagger-item", 
      { y: 20, opacity: 0 }, 
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.5 }, 
      "-=0.4"
    );
    
    // Cleanup function
    return () => {
      timeline.current.kill();
    };
  }, []);

  // Validate password match
  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError('');
    }
  }, [password, confirmPassword]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    // Button press animation
    gsap.to(e.currentTarget.querySelector('button'), {
      scale: 0.95,
      duration: 0.1,
      onComplete: () => {
        gsap.to(e.currentTarget.querySelector('button'), {
          scale: 1,
          duration: 0.1
        });
      }
    });
    
    dispatch(register({ username, password })).then((result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        // Success animation before navigation
        gsap.to(cardRef.current, {
          y: -30,
          opacity: 0,
          duration: 0.6,
          onComplete: () => navigate('/login')
        });
      } else {
        // Error shake animation
        gsap.to(cardRef.current, {
          x: [-10, 10, -10, 10, 0],
          duration: 0.5
        });
      }
    });
  };

  return (
    <div className="register-page">
      <div className="bg-gradient"></div>
      <div className="bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      
      <div className="form-container">
        <div className="card register-card" ref={cardRef}>
          <div className="card-header stagger-item">
            <div className="logo">
              <span className="logo-icon"></span>
            </div>
            <h1 className="card-title">Create Account</h1>
            <p className="card-subtitle">Join us and start your journey</p>
          </div>
          
          <form onSubmit={handleSubmit} ref={formRef}>
            <div className="input-group stagger-item">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <span className="input-icon user-icon"></span>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  required
                  className="focus-animation"
                />
              </div>
            </div>
            
            <div className="input-group stagger-item">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon lock-icon"></span>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className="focus-animation"
                />
              </div>
            </div>
            
            <div className="input-group stagger-item">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <span className="input-icon lock-icon"></span>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className="focus-animation"
                />
              </div>
              {passwordError && (
                <div className="error-message">
                  <span className="error-icon"></span>
                  {passwordError}
                </div>
              )}
            </div>
            
            {error && (
              <div className="error-message stagger-item">
                <span className="error-icon"></span>
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading || passwordError}
              className="btn-register stagger-item"
            >
              {loading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <span>Creating Account...</span>
                </div>
              ) : (
                <>
                  <span className="btn-text">Sign Up</span>
                  <span className="btn-shine"></span>
                </>
              )}
            </button>
            
            <div className="form-footer stagger-item">
              <p>Already have an account? <Link to="/login" className="text-link">Sign in</Link></p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;