import React, { useState, useEffect, useRef } from 'react'; // Added React import
import { MessageCircle, ThumbsUp, ThumbsDown, Heart, Smile, Clock, Image, Send, X, MoreHorizontal, ChevronDown } from 'lucide-react'; // Removed UserCircle

// Import the CSS file
import './CommentSystem.css';

function CommentSystem({ threadId, currentUser = "User" }) { // Assuming currentUser is the display name
  const [content, setContent] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [media, setMedia] = useState(null); // Holds the File object
  // Note: Media preview isn't implemented in the original JSX, add if needed
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [sortBy, setSortBy] = useState('popular'); // 'popular', 'recent'
  const [activeReactionComment, setActiveReactionComment] = useState(null); // ID of comment for reaction popup
  const reactionsPopupRef = useRef(null); // Ref specifically for the reaction popup div

  // Defined reactions
  const availableReactions = [
    { id: 'like', icon: <ThumbsUp size={18} />, label: 'Like', color: '#3b82f6' }, // Slightly larger icons
    { id: 'heart', icon: <Heart size={18} />, label: 'Love', color: '#ec4899' },
    { id: 'smile', icon: <Smile size={18} />, label: 'Haha', color: '#f59e0b' },
    // Removed thumbsDown from reactions, kept as separate vote
  ];

  // --- Mock Data & Click Outside Listener ---
  useEffect(() => {
    // Keep mock data setup
    const mockComments = [
      { id: 1, author: 'Jenny Wilson', isAnonymous: false, content: 'This is an amazing feature! Ive been waiting for something like this for ages.', timestamp: '2h ago', upvotes: 24, downvotes: 3, userVote: null, userReaction: null, reactionCounts: { like: 12, heart: 8, smile: 4 } },
      { id: 2, author: 'Anonymous', isAnonymous: true, content: 'Im not sure about this approach. Have you considered the alternative implementation discussed in the forum?', timestamp: '4h ago', upvotes: 7, downvotes: 2, userVote: null, userReaction: null, reactionCounts: { like: 5, heart: 0, smile: 2 } },
      { id: 3, author: 'Alex Morgan', isAnonymous: false, content: 'Just implemented this and it works perfectly! Heres a screenshot of my implementation.', timestamp: '1d ago', upvotes: 31, downvotes: 0, hasMedia: true, userVote: 'up', userReaction: 'heart', reactionCounts: { like: 20, heart: 11, smile: 0 } }
    ];
     setComments(mockComments.map((comment, index) => ({
       ...comment,
       animationDelay: `${index * 0.08}s` // Slightly faster stagger
     })));

    // Click outside listener for reaction popup
    const handleClickOutside = (event) => {
        // Check if the click target is the trigger button itself OR inside the popup
        const triggerButton = document.querySelector(`[data-comment-id="${activeReactionComment}"]`);
        if (
            reactionsPopupRef.current &&
            !reactionsPopupRef.current.contains(event.target) &&
            (!triggerButton || !triggerButton.contains(event.target)) // Also check if not clicking the trigger button again
        ) {
            setActiveReactionComment(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeReactionComment]); // Re-add listener if activeReactionComment changes (needed?)

  // --- Sorting Logic ---
  const sortComments = (commentsToSort, method) => {
    // ... (keep your existing sort logic) ...
    if (method === 'popular') {
      return [...commentsToSort].sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
    } else {
      // Simplified recent sort (assumes timestamps are somewhat comparable or use Date objects)
       return [...commentsToSort].sort((a, b) => {
           // A real implementation would parse timestamps into Date objects
           if (a.timestamp === 'Just now') return -1;
           if (b.timestamp === 'Just now') return 1;
           // Basic comparison for demo
           if (a.timestamp.includes('h') && b.timestamp.includes('d')) return -1;
           if (a.timestamp.includes('d') && b.timestamp.includes('h')) return 1;
           if (a.timestamp.includes('h') && b.timestamp.includes('h')) return parseInt(a.timestamp) - parseInt(b.timestamp);
           return 0; // Fallback
       });
    }
  };

  // --- Form Submission ---
  const handleSubmit = async () => {
    if (!content.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      // MOCK SUBMISSION - Replace with API call
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      console.log("Submitting:", { content, anonymous, media });
      // --- Add comment to state ---
       const newComment = {
         id: Date.now(), // Use timestamp for unique ID in demo
         author: anonymous ? 'Anonymous' : currentUser,
         isAnonymous: anonymous,
         content: content,
         timestamp: 'Just now',
         upvotes: 0,
         downvotes: 0,
         hasMedia: !!media, // Check if media File object exists
         userVote: null,
         userReaction: null,
         reactionCounts: { like: 0, heart: 0, smile: 0 }, // Init counts
         isNew: true, // Flag for animation
         animationDelay: '0s' // No delay for new comments
       };
       setComments(prev => [newComment, ...prev]); // Add to the beginning
       setContent('');
       setMedia(null); // Clear media file
       setError(null); // Clear any previous error

       // Remove the "isNew" flag after animation
       setTimeout(() => {
         setComments(prev =>
           prev.map(comment =>
             comment.id === newComment.id ? { ...comment, isNew: false } : comment
           )
         );
       }, 1000); // Match animation duration

    } catch (err) {
      console.error("Submit error:", err);
      setError('Failed to post comment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- Input Handling ---
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto'; // Reset height
    textarea.style.height = `${textarea.scrollHeight}px`; // Set to scroll height
  };

  const handleFileChange = (e) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
          setMedia(file);
          setError(null); // Clear file errors
      } else if (file) {
          setMedia(null);
          setError("Please select a valid image file.");
      }
      // Clear the input value so the same file can be selected again
      e.target.value = null;
  };

  const clearMedia = () => {
      setMedia(null);
  };


  // --- Vote & Reaction Logic ---
  const handleVote = (commentId, voteType) => {
    // Keep your existing handleVote logic
     setComments(
       comments.map(comment => {
         if (comment.id === commentId) {
           let newUpvotes = comment.upvotes;
           let newDownvotes = comment.downvotes;
           let newUserVote = comment.userVote;

           const wasUpvoted = comment.userVote === 'up';
           const wasDownvoted = comment.userVote === 'down';

           if (voteType === 'up') {
             if (wasUpvoted) { // Clicking upvote again
               newUpvotes -= 1;
               newUserVote = null;
             } else { // Clicking upvote first time or switching from downvote
               newUpvotes += 1;
               if (wasDownvoted) newDownvotes -= 1;
               newUserVote = 'up';
             }
           } else if (voteType === 'down') {
             if (wasDownvoted) { // Clicking downvote again
               newDownvotes -= 1;
               newUserVote = null;
             } else { // Clicking downvote first time or switching from upvote
               newDownvotes += 1;
               if (wasUpvoted) newUpvotes -= 1;
               newUserVote = 'down';
             }
           }
           return { ...comment, upvotes: newUpvotes, downvotes: newDownvotes, userVote: newUserVote };
         }
         return comment;
       })
     );
     // NOTE: Add API call here in real app
  };

  const handleReaction = (commentId, reactionId) => {
     // Keep your existing handleReaction logic
     setComments(
       comments.map(comment => {
         if (comment.id === commentId) {
           const currentReaction = comment.userReaction;
           const newCounts = { ...comment.reactionCounts };

           // If user had a reaction, decrement its count
           if (currentReaction) {
             newCounts[currentReaction] = Math.max(0, (newCounts[currentReaction] || 0) - 1);
           }

           // If clicking the same reaction again, unset it. Otherwise, set the new one.
           const newReaction = (currentReaction === reactionId) ? null : reactionId;

           // If there's a new reaction, increment its count
           if (newReaction) {
             newCounts[newReaction] = (newCounts[newReaction] || 0) + 1;
           }

           return { ...comment, userReaction: newReaction, reactionCounts: newCounts };
         }
         return comment;
       })
     );
     setActiveReactionComment(null); // Close popup
     // NOTE: Add API call here in real app
  };

  const toggleReactionMenu = (commentId) => {
    setActiveReactionComment(activeReactionComment === commentId ? null : commentId);
  };

  // --- Helper Functions ---
  const getTotalReactions = (reactionCounts = {}) => { // Default to empty object
    return Object.values(reactionCounts).reduce((sum, count) => sum + (count || 0), 0);
  };

  const getTopReactions = (reactionCounts = {}, limit = 3) => { // Default, increase limit slightly
    return Object.entries(reactionCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([type]) => availableReactions.find(r => r.id === type)) // Return full reaction object
      .filter(Boolean); // Remove any not found (safety)
  };

  // --- Final Data for Rendering ---
  const sortedComments = sortComments(comments, sortBy);

  return (
    // Use CSS class for main container
    <div className="comment-system-container">
      {/* --- Comment input bar --- */}
      {/* Use CSS classes, remove Tailwind */}
      <div className="comment-input-section">
        <div className="comment-input-main">
          {/* Avatar */}
          <div className="comment-input-avatar">
            {anonymous ? 'A' : (currentUser?.[0]?.toUpperCase() || 'U')}
          </div>
          {/* Textarea and Send Button Wrapper */}
          <div className="comment-input-textarea-wrapper">
            <textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); handleKeyDown(e); }} // Combine handlers
              onKeyDown={handleKeyDown}
              placeholder="Write a comment..."
              rows={1} // Start with 1 row, auto-resize on input
              className="comment-input-textarea" // Use CSS class
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !content.trim()}
              className="comment-send-button" // Use CSS class
              aria-label="Send comment"
            >
              {loading ? (
                <div className="spinner" />
              ) : (
                <Send size={16} className="send-icon" />
              )}
            </button>
          </div>
        </div> {/* End comment-input-main */}

        {/* Options below input */}
        <div className="comment-input-options">
           <div className="comment-input-options-left">
                {/* Media Upload Button */}
               <button
                 type="button"
                 onClick={() => document.getElementById(`media-upload-${threadId || 'main'}`).click()} // Unique ID
                 className="option-button" // Use CSS class
                 aria-label="Add image"
               >
                 <Image size={18} />
                 {/* <span>Add image</span> */} {/* Optional text */}
               </button>
               {/* Anonymous Toggle */}
               <label className="option-button anon-label"> {/* Use class */}
                 <input
                   type="checkbox"
                   checked={anonymous}
                   onChange={(e) => setAnonymous(e.target.checked)}
                   className="anon-checkbox" // Use class
                 />
                 <span>Anonymous</span>
               </label>
           </div>

           {/* Hidden File Input */}
            <input
                id={`media-upload-${threadId || 'main'}`}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden" // Keep hidden
            />

            {/* Media Attached Indicator */}
            {media && (
              <div className="media-indicator">
                <Image size={16} /> {/* Show icon */}
                <span>{media.name.length > 15 ? media.name.substring(0, 12) + '...' : media.name}</span> {/* Show truncated name */}
                <button onClick={clearMedia} className="media-remove-btn" aria-label="Remove image">
                  <X size={14} />
                </button>
              </div>
            )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="input-error-message">
            {error}
          </div>
        )}
      </div> {/* End comment-input-section */}


      {/* --- Comments header and sorting --- */}
      <div className="comments-header">
        <h3 className="comments-title">
          <MessageCircle size={20} /> {/* Adjusted size */}
          <span>Comments ({comments.length})</span>
        </h3>

        {/* Sorting Controls */}
        <div className="sort-options">
          <div className="sort-buttons-group">
            {/* <span className="text-[var(--text-secondary)]">Sort by:</span> */} {/* Label optional */}
            <button
              onClick={() => setSortBy('popular')}
              className={`sort-button ${sortBy === 'popular' ? 'active' : ''}`}
            >
              <ThumbsUp size={14} />
              Popular
            </button>
            <button
              onClick={() => setSortBy('recent')}
              className={`sort-button ${sortBy === 'recent' ? 'active' : ''}`}
            >
              <Clock size={14} />
              Recent
            </button>
          </div>
        </div>
      </div>


      {/* --- Comments list --- */}
      <div className="comments-list">
        {sortedComments.map(comment => (
          <div
            key={comment.id}
            // Apply animation class based on isNew flag
            className={`comment-card ${comment.isNew ? 'is-new animate-comment-new' : 'animate-comment-in'}`}
            style={{ animationDelay: comment.animationDelay }}
          >
            {/* Avatar */}
            <div className={`comment-avatar ${comment.isAnonymous ? 'anon' : 'user'}`}>
              {comment.author?.[0]?.toUpperCase() || '?'}
            </div>

            {/* Main Content Bubble */}
            <div className="comment-content-wrapper">
              <div className="comment-header">
                <div>
                  <span className="comment-author">{comment.author}</span>
                  <span className="comment-meta"> · {comment.timestamp}</span>
                </div>
                <button className="comment-options-button" aria-label="Comment options">
                  <MoreHorizontal size={16} />
                </button>
              </div>

              <div className="comment-body">
                <p className="comment-text">{comment.content}</p>
                {comment.hasMedia && (
                  <div className="comment-media-wrapper">
                    {/* Placeholder - Replace with actual image rendering */}
                    <img
                      src={`https://picsum.photos/seed/${comment.id}/400/200`} // Placeholder image
                      alt="Comment media"
                      className="comment-media"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>

              {/* Actions: Votes and Reactions */}
              <div className="comment-actions">
                {/* Vote buttons */}
                <div className="vote-buttons">
                  <button
                    onClick={() => handleVote(comment.id, 'up')}
                    className={`vote-button up ${comment.userVote === 'up' ? 'active' : ''}`}
                    aria-pressed={comment.userVote === 'up'}
                    aria-label="Upvote"
                  >
                    <ThumbsUp size={15} />
                  </button>
                  <span className="vote-score">
                    {comment.upvotes - comment.downvotes}
                  </span>
                  <button
                    onClick={() => handleVote(comment.id, 'down')}
                    className={`vote-button down ${comment.userVote === 'down' ? 'active' : ''}`}
                    aria-pressed={comment.userVote === 'down'}
                    aria-label="Downvote"
                  >
                    <ThumbsDown size={15} />
                  </button>
                </div>

                {/* Reaction summary display */}
                {getTotalReactions(comment.reactionCounts) > 0 && (
                  <div className="reaction-summary">
                    <div className="reaction-icons">
                      {getTopReactions(comment.reactionCounts).map((reaction) => (
                        <div
                          key={`${comment.id}-${reaction.id}`}
                          className="reaction-icon-wrapper"
                          style={{ color: reaction.color }}
                          title={reaction.label} // Tooltip
                        >
                           {/* Render the icon directly */}
                           {React.cloneElement(reaction.icon, { size: 12 })}
                        </div>
                      ))}
                    </div>
                    <span className="reaction-count">
                      {getTotalReactions(comment.reactionCounts)}
                    </span>
                  </div>
                )}

                {/* Reaction trigger button */}
                <div className="reaction-trigger-wrapper">
                  <button
                    onClick={() => toggleReactionMenu(comment.id)}
                    className={`reaction-trigger-button ${comment.userReaction ? 'has-reaction' : ''}`}
                    style={{ color: comment.userReaction ? availableReactions.find(r => r.id === comment.userReaction)?.color : 'var(--text-secondary)' }}
                    aria-expanded={activeReactionComment === comment.id}
                    aria-label="React to comment"
                    data-comment-id={comment.id} // Add data attribute to identify button
                  >
                     {/* Show user's reaction or default Smile icon */}
                    {comment.userReaction
                      ? React.cloneElement(availableReactions.find(r => r.id === comment.userReaction)?.icon || <Smile size={18} />, { size: 18 })
                      : <Smile size={18} />}
                  </button>

                  {/* --- Reaction Popup (Horizontal) --- */}
                  {activeReactionComment === comment.id && (
                    <div
                      ref={reactionsPopupRef} // Attach ref
                      className="reaction-popup animate-reaction-popup" // Apply CSS class and animation
                    >
                      {availableReactions.map(reaction => (
                        <button
                          key={`${comment.id}-popup-${reaction.id}`}
                          onClick={() => handleReaction(comment.id, reaction.id)}
                          className={`reaction-popup-button ${comment.userReaction === reaction.id ? 'active' : ''}`}
                          aria-label={reaction.label}
                           style={{ color: reaction.color }} // Set color directly
                        >
                           {/* Render the icon directly */}
                           {React.cloneElement(reaction.icon, { size: 22 })} {/* Larger icons in popup */}
                        </button>
                      ))}
                    </div>
                  )}
                </div> {/* End reaction-trigger-wrapper */}
              </div> {/* End comment-actions */}
            </div> {/* End comment-content-wrapper */}
          </div> // End comment-card
        ))}
      </div> {/* End comments-list */}

      {/* No Comments Placeholder */}
      {comments.length === 0 && !loading && ( // Show only if not loading
        <div className="no-comments-container animate-fade-in">
          <MessageCircle size={48} className="no-comments-icon" />
          <p className="no-comments-title">Be the First to Comment!</p>
          <p className="no-comments-subtitle">Your feedback is valuable.</p>
        </div>
      )}

    </div> // End comment-system-container
  );
}

export default CommentSystem;