import React, { useState, useRef, useEffect } from 'react'; // Added React import
import { useSelector } from 'react-redux';
import api from '../utils/api';
import gsap from 'gsap';

// Import the new CSS file
import './PostForm.css';

// Keeping your original component name
function PostForm({ threadId, parentPostId = null }) { // Accept parentPostId if needed for replies
  const { user } = useSelector((state) => state.auth);
  const [content, setContent] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [media, setMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Update Refs to match new structure
  const formContainerRef = useRef(null); // Main component div
  const textareaRef = useRef(null);     // The <textarea> element
  const mediaPreviewRef = useRef(null);
  const successMessageRef = useRef(null);
  const errorMessageRef = useRef(null);
  const fileInputRef = useRef(null);
  // Refs for controls container and individual controls (optional for animation)
  const controlsRef = useRef(null);
  // const anonToggleRef = useRef(null);
  // const mediaButtonRef = useRef(null);
  // const submitButtonRef = useRef(null);


  // Initial form reveal animation
  useEffect(() => {
    if (formContainerRef.current) {
        gsap.to(formContainerRef.current, {
            y: 0,
            opacity: 1,
            duration: 0.6, // Slightly longer duration
            ease: "power3.out",
            delay: 0.1
        });
        // Optional: Stagger controls if needed, target elements inside controlsRef
        // gsap.fromTo(controlsRef.current?.children, {opacity:0, y:10}, {opacity:1, y:0, stagger: 0.1, duration:0.4, delay: 0.3});
    }
    return () => {
        gsap.killTweensOf(formContainerRef.current);
        // gsap.killTweensOf(controlsRef.current?.children); // Kill stagger if added
    };
  }, []);

  // Handle file change and preview animation
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setMedia(file);
      setError(null);
      gsap.to(errorMessageRef.current, { opacity: 0, duration: 0.3 });
      // Apply CSS class logic for textarea styling
      if (textareaRef.current) {
          textareaRef.current.classList.remove('has-error');
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result);
        if (mediaPreviewRef.current) {
            gsap.to(mediaPreviewRef.current, {
                height: 'auto', opacity: 1, duration: 0.4, ease: "power2.out"
            });
        }
      };
      reader.readAsDataURL(file);
    } else if (file) {
      handleRemoveMedia(false);
      setError("Please select a valid image file (jpg, png, gif, webp).");
      if (errorMessageRef.current) {
        gsap.fromTo(errorMessageRef.current, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3 });
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || !content.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);
    gsap.to([errorMessageRef.current, successMessageRef.current], { opacity: 0, duration: 0.2 });

    const formData = new FormData();
    formData.append('content', content);
    formData.append('anonymous', anonymous);
    if (media) formData.append('media', media);
    if (parentPostId) formData.append('parentPost', parentPostId);

    try {
      await api.post(`/threads/${threadId}/posts`, formData, {
           headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess(true);
      setContent('');
      handleRemoveMedia(false);

      // Success animation
      if (successMessageRef.current) {
        gsap.fromTo(successMessageRef.current, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3, delay: 0.1 });
      }
      if (textareaRef.current) {
          textareaRef.current.classList.add('has-success'); // Add class
          setTimeout(() => {
               textareaRef.current?.classList.remove('has-success'); // Remove class
               setSuccess(false); // Reset success state
               gsap.to(successMessageRef.current, { opacity: 0, duration: 0.3 });
          }, 1800);
      }

    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to post comment';
      setError(errorMsg);

      // Error animation
      if (errorMessageRef.current) {
        gsap.fromTo(errorMessageRef.current, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3 });
      }
       if (textareaRef.current) {
           textareaRef.current.classList.add('has-error'); // Add class
           // Shake animation
           gsap.fromTo(textareaRef.current, { x: 0 }, {
               x: 5, duration: 0.07, ease: "power1.inOut", repeat: 5, yoyo: true,
               // Optional: Remove error class after shake
               // onComplete: () => setTimeout(() => textareaRef.current?.classList.remove('has-error'), 1000)
           });
       }

    } finally {
      setLoading(false);
    }
  };

   // Handle removing media
   const handleRemoveMedia = (animate = true) => {
       if (animate && mediaPreviewRef.current) {
           gsap.to(mediaPreviewRef.current, {
               height: 0, opacity: 0, duration: 0.3, ease: "power2.in",
               onComplete: () => {
                   setMedia(null); setMediaPreview(null);
                   if (fileInputRef.current) fileInputRef.current.value = '';
               }
           });
       } else {
           setMedia(null); setMediaPreview(null);
           if (mediaPreviewRef.current) gsap.set(mediaPreviewRef.current, { height: 0, opacity: 0 });
           if (fileInputRef.current) fileInputRef.current.value = '';
       }
   };

  // Clear error when user starts typing in textarea
  useEffect(() => {
    if (error && content && textareaRef.current) {
      setError(null);
      gsap.to(errorMessageRef.current, { opacity: 0, duration: 0.3 });
      textareaRef.current.classList.remove('has-error'); // Remove error class
    }
  }, [content, error]);


  // This component should be rendered conditionally by PostsPage, so no need for user check here
  // if (!user) return null;

  return (
    // Use CSS class, apply ref, start hidden for animation
    <div className="post-form-container" ref={formContainerRef} style={{ opacity: 0, transform: 'translateY(20px)' }}>
      <div className="post-form-wrapper"> {/* Optional inner wrapper */}

         {/* Messages Area */}
         <div>
             {/* Error Message controlled by opacity */}
             <div ref={errorMessageRef} className="form-message error-message" style={{ opacity: error ? 1 : 0 }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
             </div>
             {/* Success Message controlled by opacity */}
             <div ref={successMessageRef} className="form-message success-message" style={{ opacity: success ? 1 : 0 }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>Comment posted!</span>
             </div>
         </div>

        <form onSubmit={handleSubmit} className="post-form">
          {/* Media preview */}
          <div ref={mediaPreviewRef} className="media-preview-container">
            {mediaPreview && (
                <img src={mediaPreview} alt="Preview" className="media-preview-image" />
            )}
            <button
              type="button"
              onClick={() => handleRemoveMedia(true)}
              className="media-remove-button"
              aria-label="Remove media preview"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* === Textarea replaces the input === */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={parentPostId ? "Write your reply..." : "Add a comment..."}
            className="form-input-textarea" // Use specific CSS class
            required
            rows="3"
            aria-label="Comment content"
          />

          {/* === Controls moved below textarea === */}
          <div className="form-controls" ref={controlsRef}>
             {/* Left Controls */}
            <div className="form-controls-left">
                {/* Anonymous checkbox */}
                <label className="anon-toggle-label">
                    <input
                        type="checkbox"
                        checked={anonymous}
                        onChange={(e) => setAnonymous(e.target.checked)}
                        className="anon-toggle-input" // Hidden via CSS
                    />
                    <span className="anon-toggle-visual" aria-hidden="true">
                        <span className="anon-toggle-handle"></span>
                    </span>
                    <span className="anon-toggle-text">Anon</span>
                </label>

                {/* Media upload button */}
                <div className="media-upload-container">
                    <input
                        ref={fileInputRef}
                        type="file"
                        id={`media-upload-${threadId}-${parentPostId || 'root'}`}
                        accept="image/png, image/jpeg, image/gif, image/webp"
                        onChange={handleFileChange}
                        className="media-upload-input" // Hidden via CSS
                    />
                    <label
                        htmlFor={`media-upload-${threadId}-${parentPostId || 'root'}`}
                        className="media-upload-label"
                        aria-label="Upload image"
                    >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </label>
                </div>
            </div> {/* End form-controls-left */}

            {/* Right Controls (Submit Button) */}
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="submit-button" // Use CSS class
            >
              {loading ? (
                <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <span className="button-text">Post</span>
              )}
            </button>
          </div> {/* End form-controls */}
        </form>
      </div>
    </div>
  );
}

export default PostForm;