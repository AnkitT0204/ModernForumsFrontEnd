import { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../utils/api';
import './ReplyForm.css';
import { motion, AnimatePresence } from 'framer-motion';

function ReplyForm({ threadId, parentPostId, onCancel }) {
  const { user } = useSelector((state) => state.auth);
  const [content, setContent] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [charCount, setCharCount] = useState(0);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef(null);
  
  // Auto resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [content]);

  // Character counter
  useEffect(() => {
    setCharCount(content.length);
  }, [content]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    setLoading(true);
    setError(null);

    // Animation for submitting
    const formData = new FormData();
    formData.append('content', content);
    formData.append('anonymous', anonymous);
    formData.append('parentPost', parentPostId);

    try {
      await api.post(`/threads/${threadId}/posts`, formData);
      setContent('');
      setAnonymous(true);
      onCancel();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reply');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="reply-form-container"
    >
      <form onSubmit={handleSubmit} className="reply-form">
        <div className={`textarea-wrapper ${focused ? 'focused' : ''}`}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Write a reply..."
            className="reply-textarea"
            rows="1"
            maxLength="1000"
            required
          />
          <AnimatePresence>
            {charCount > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="char-counter"
              >
                {charCount}/1000
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="reply-form-controls">
          <label className="anonymous-toggle">
            <div className="toggle-container">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="toggle-input"
              />
              <div className={`toggle-slider ${anonymous ? 'active' : ''}`}>
                <div className="toggle-circle"></div>
              </div>
            </div>
            <span className="toggle-label">Anonymous</span>
          </label>
          
          <div className="button-group">
            <motion.button
              type="button"
              onClick={onCancel}
              className="cancel-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
            
            <motion.button
              type="submit"
              disabled={loading || !content.trim()}
              className={`submit-button ${!content.trim() ? 'disabled' : ''}`}
              whileHover={content.trim() ? { scale: 1.05 } : {}}
              whileTap={content.trim() ? { scale: 0.95 } : {}}
            >
              {loading ? (
                <div className="loading-spinner"></div>
              ) : (
                'Reply'
              )}
            </motion.button>
          </div>
        </div>
        
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="error-message"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
}

export default ReplyForm;