import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import gsap from 'gsap';
import { Edit3, ImageUp, Paperclip, XCircle, Loader2 } from 'lucide-react'; // Icons

// Import the new CSS file
import './ThreadForm.css';

function ThreadForm({ boardId }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [media, setMedia] = useState(null); // File object
  const [mediaPreview, setMediaPreview] = useState(null); // Data URL for <img>
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // For general form error

  // Refs for animations
  const formWrapperRef = useRef(null);
  const titleInputRef = useRef(null);
  const contentTextareaRef = useRef(null);
  const mediaPreviewWrapperRef = useRef(null);
  const errorMessageRef = useRef(null);
  const fileInputRef = useRef(null); // Ref for the hidden file input

  // Form reveal animation
  useEffect(() => {
    if (formWrapperRef.current) {
      gsap.to(formWrapperRef.current, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        ease: "power2.out",
        delay: 0.1 // Slight delay if form is part of a larger page animation
      });
    }
    return () => {
      gsap.killTweensOf(formWrapperRef.current);
      gsap.killTweensOf(mediaPreviewWrapperRef.current);
      gsap.killTweensOf(errorMessageRef.current);
    };
  }, []);

  // Handle media file selection
  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setMedia(file);
      setError(null); // Clear previous errors
      gsap.to(errorMessageRef.current, { opacity: 0, height: 0, duration: 0.2 });

      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result);
        // Animate media preview in
        if (mediaPreviewWrapperRef.current) {
          gsap.to(mediaPreviewWrapperRef.current, {
            height: 'auto', // Animate to auto height
            opacity: 1,
            duration: 0.4,
            ease: 'power2.out'
          });
        }
      };
      reader.readAsDataURL(file);
    } else if (file) {
      handleRemoveMedia(false); // Clear if invalid file
      setError('Please upload a valid image file (e.g., JPG, PNG, GIF).');
      if (errorMessageRef.current) {
          gsap.fromTo(errorMessageRef.current, { opacity: 0, y: -10 }, { className: 'form-error-message animate-form-error-in', opacity: 1, y: 0, duration: 0.3 });
      }
    }
    // Reset file input to allow selecting the same file again if removed
    if (e.target) e.target.value = null;
  };

  // Handle removing media
  const handleRemoveMedia = (animate = true) => {
    if (animate && mediaPreviewWrapperRef.current) {
      gsap.to(mediaPreviewWrapperRef.current, {
        height: 0, opacity: 0, duration: 0.3, ease: 'power2.in',
        onComplete: () => {
          setMedia(null); setMediaPreview(null);
        }
      });
    } else {
      setMedia(null); setMediaPreview(null);
      if (mediaPreviewWrapperRef.current) gsap.set(mediaPreviewWrapperRef.current, { height: 0, opacity: 0 });
    }
  };


  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    gsap.to(errorMessageRef.current, { opacity: 0, duration: 0.2 });
    titleInputRef.current?.classList.remove('has-error');
    contentTextareaRef.current?.classList.remove('has-error');


    if (!title.trim() || !content.trim()) {
        setError("Title and content fields are required.");
        if (errorMessageRef.current) {
            gsap.fromTo(errorMessageRef.current, { opacity: 0, y: -10 }, { className: 'form-error-message animate-form-error-in', opacity: 1, y: 0, duration: 0.3 });
        }
        // Animate shake on required fields
        const fieldsToShake = [];
        if (!title.trim() && titleInputRef.current) {
            fieldsToShake.push(titleInputRef.current);
            titleInputRef.current.classList.add('has-error');
        }
        if (!content.trim() && contentTextareaRef.current) {
            fieldsToShake.push(contentTextareaRef.current);
            contentTextareaRef.current.classList.add('has-error');
        }
        if (fieldsToShake.length > 0) {
             gsap.fromTo(fieldsToShake, { x: 0 }, { x: 5, duration: 0.07, ease: "power1.inOut", repeat: 5, yoyo: true });
        }
        return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('anonymous', anonymous);
    if (media) {
      formData.append('media', media);
    }

    try {
      console.log('Submitting thread data:', Object.fromEntries(formData.entries()));
      const res = await api.post(`/boards/${boardId}/threads`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('Thread created:', res.data);

      // Optional: Success animation on form before navigating
      // For now, navigate directly for simplicity
      navigate(`/threads/${res.data._id}`);

    } catch (err) {
      console.error('Thread creation error:', err.response || err);
      setError(err.response?.data?.error || 'Failed to create thread. Please try again.');
      if (errorMessageRef.current) {
          gsap.fromTo(errorMessageRef.current, { opacity: 0, y: -10 }, { className: 'form-error-message animate-form-error-in', opacity: 1, y: 0, duration: 0.3 });
      }
      setLoading(false); // Only stop loading on error, success navigates away
    }
    // setLoading(false); // Removed from here, handle in try/catch
  };

  // Clear general error when user starts typing in title or content
  useEffect(() => {
    if (error && (title || content)) {
        setError(null);
        gsap.to(errorMessageRef.current, { opacity: 0, duration: 0.3 });
        titleInputRef.current?.classList.remove('has-error');
        contentTextareaRef.current?.classList.remove('has-error');
    }
  }, [title, content, error]);


  return (
    // Apply ref and CSS class, start hidden for animation

    <div
    
    style={{ paddingTop:'110px'}}>
    <div
      ref={formWrapperRef}
      className="thread-form-wrapper"
      style={{ opacity: 0, transform: 'translateY(20px) scale(0.98)'}}
    >
      <h2 className="thread-form-title">
        <Edit3 size={20} />
        Create a New Thread
      </h2>

      {/* Form Error Message */}
       <div
        ref={errorMessageRef}
        className="form-error-message" // Will be animated by GSAP
        style={{ opacity: 0, height: error ? 'auto' : 0 }} // Control initial visibility
      >
        {error}
      </div>


      <form onSubmit={handleSubmit} className="thread-form">
        <div className="form-group">
          <label htmlFor={`thread-title-${boardId}`}>Title</label>
          <input
            ref={titleInputRef}
            type="text"
            id={`thread-title-${boardId}`} // Unique ID
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Catchy and descriptive title"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor={`thread-content-${boardId}`}>Content</label>
          <textarea
            ref={contentTextareaRef}
            id={`thread-content-${boardId}`} // Unique ID
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            placeholder="Share your thoughts, questions, or story..."
            className="form-textarea"
            rows="5" // Default rows
          />
        </div>

        <div className="form-group">
          <label htmlFor={`thread-media-${boardId}`}>Upload Image (Optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            id={`thread-media-${boardId}`} // Unique ID
            accept="image/png, image/jpeg, image/gif, image/webp"
            onChange={handleMediaChange}
            className="file-input-hidden" // Hidden via CSS
          />
          <label htmlFor={`thread-media-${boardId}`} className="file-input-label">
            <ImageUp size={16} />
            <span>{media ? 'Change Image' : 'Choose Image'}</span>
          </label>
          {media && <span className="file-name-display">{media.name}</span>}
        </div>

        {/* Media Preview */}
        {mediaPreview && (
          <div ref={mediaPreviewWrapperRef} className="media-preview-wrapper">
            <img src={mediaPreview} alt="Selected preview" className="media-preview-image" />
            <button
              type="button"
              onClick={() => handleRemoveMedia(true)}
              className="media-remove-button"
              aria-label="Remove selected image"
            >
              <XCircle size={14} />
            </button>
          </div>
        )}


        <div className="form-group checkbox-group">
          <input
            type="checkbox"
            id={`thread-anonymous-${boardId}`} // Unique ID
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="anon-toggle-input" // Using custom styled checkbox
          />
          {/* For custom checkbox, the label wraps the visual parts in CSS */}
          <label htmlFor={`thread-anonymous-${boardId}`} className="anon-toggle-visual" aria-hidden="true">
            <span className="anon-toggle-handle"></span>
          </label>
          <label htmlFor={`thread-anonymous-${boardId}`} className="anon-toggle-text">
            Post Anonymously
          </label>
        </div>

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? (
            <>
              <Loader2 size={16} className="spinner" />
              <span className="button-text">Creating...</span>
            </>
          ) : (
            <span className="button-text">Create Thread</span>
          )}
        </button>
      </form>
    </div>
    </div>
  );
}

export default ThreadForm;