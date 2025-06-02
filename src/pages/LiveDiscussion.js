import React, { useEffect, useState, useRef } from 'react'; // Added React import
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import gsap from 'gsap';
import { Tv, Trophy, Globe, Users, Plus, ArrowRight, Loader2 } from 'lucide-react'; // Import icons
import ScrollTrigger from 'gsap/ScrollTrigger'; // Import ScrollTrigger

// Import the CSS file
import './LiveDiscussion.css';

// Removed mock data - using API only now

function LiveDiscussion() {
  const { user } = useSelector((state) => state.auth);
  const [techNews, setTechNews] = useState([]);
  const [sportsNews, setSportsNews] = useState([]);
  const [geoNews, setGeoNews] = useState([]);
  const [customRooms, setCustomRooms] = useState([]);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false); // Separate loading for create
  const [error, setError] = useState(null); // General fetch error
  const [createError, setCreateError] = useState(null); // Create room error

  // Refs for animations
  const containerRef = useRef(null);
  const createSectionRef = useRef(null);
  const techSectionRef = useRef(null);
  const sportsSectionRef = useRef(null);
  const geoSectionRef = useRef(null);
  const customSectionRef = useRef(null);
  const createErrorRef = useRef(null);

  // Fetch Data Effect
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const categories = ['technology', 'sports', 'general']; // 'general' for geopolitics? Adjust if needed

        // Fetch News (using your API key - consider moving to backend/env var)
        const newsPromises = categories.map((category) =>
           fetch(
             `https://api.mediastack.com/v1/news?access_key=aa38960b116e5c34730b8f9e610f03b5&categories=${category}&limit=6&languages=en` // Fetch 6, increase limit
           )
           .then(async (res) => {
               if (!res.ok) { // Check for HTTP errors
                   const errorData = await res.json();
                   console.error(`MediaStack API error for ${category}:`, errorData);
                   throw new Error(`Failed to fetch ${category} news (${res.status})`);
               }
               return res.json();
           })
           .catch(err => { // Catch individual fetch errors
               console.error(`Error fetching ${category} news:`, err);
               return { data: [] }; // Return empty data on error for this category
           })
        );

        // Fetch Custom Rooms
        const roomsPromise = api.get('/rooms').catch(err => {
            console.error("Error fetching custom rooms:", err);
            // Don't throw, just return empty array so page can still load news
            return { data: [] };
        });

        // Resolve all promises
        const [newsResponses, roomsRes] = await Promise.all([
            Promise.all(newsPromises),
            roomsPromise
        ]);

        // Check responses before setting state
        setTechNews(newsResponses[0]?.data || []);
        setSportsNews(newsResponses[1]?.data || []);
        setGeoNews(newsResponses[2]?.data || []);
        setCustomRooms(roomsRes?.data || []);

      } catch (err) {
        // Catch errors from Promise.all or initial setup
        console.error("General fetch error:", err);
        setError('Failed to load discussion topics. Some sections may be unavailable.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);


  // GSAP Animations Effect
  useEffect(() => {
      if (!loading) {
          const tl = gsap.timeline({ defaults: { duration: 0.5, ease: 'power2.out' } });
          const sections = [
              createSectionRef.current,
              techSectionRef.current,
              sportsSectionRef.current,
              geoSectionRef.current,
              customSectionRef.current,
          ].filter(Boolean); // Filter out null refs if data fails

          tl.to(sections, {
              opacity: 1,
              y: 0,
              stagger: 0.15, // Stagger section appearance
          });

          // Animate cards within each section after section reveal
          sections.forEach(section => {
               const cards = section.querySelectorAll('.room-card');
               if (cards.length > 0) {
                    gsap.to(cards, {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        duration: 0.4,
                        ease: "power2.out",
                        stagger: 0.08, // Stagger cards within section
                        scrollTrigger: { // Animate when section scrolls into view
                            trigger: section,
                            start: "top bottom-=100px", // Trigger slightly before bottom hits
                            toggleActions: "play none none none", // Play once
                        }
                    });
               }
          });
            // Cleanup function
            return () => {
                tl.kill();
                // Kill ScrollTriggers associated with cards if necessary
                ScrollTrigger.getAll().forEach(trigger => {
                    if (trigger.trigger && sections.includes(trigger.trigger)) {
                        trigger.kill();
                    }
                });
            }
      }
  }, [loading, techNews, sportsNews, geoNews, customRooms]); // Rerun if data changes


  // Handle Create Room Submission
  const handleCreateRoom = async (e) => {
    e.preventDefault(); // Prevent default form submission
    if (!user) {
      setCreateError('You must be logged in to create a room.');
      gsap.fromTo(createErrorRef.current, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3 });
      return;
    }
    if (!newRoomTitle.trim() || !newRoomDescription.trim()) {
      setCreateError('Title and description are required.');
       gsap.fromTo(createErrorRef.current, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3 });
       // Optional: Shake animation on inputs
       gsap.fromTo('.create-room-form .form-input, .create-room-form .form-textarea',
          { x: 0 },
          { x: 5, duration: 0.07, repeat: 5, yoyo: true, ease: 'power1.inOut'}
       );
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    gsap.to(createErrorRef.current, { opacity: 0, duration: 0.2 }); // Hide previous error

    try {
      const res = await api.post('/rooms', {
        title: newRoomTitle,
        description: newRoomDescription,
      });
      // Add new room to state and animate it in
      const newRoomWithDelay = { ...res.data, animationDelay: '0s', isNew: true }; // Add flag for potential special animation
      setCustomRooms((prev) => [newRoomWithDelay, ...prev]);
      setNewRoomTitle('');
      setNewRoomDescription('');

      // Animate the newly added card (if possible, needs coordination with list animation)
      // Simple approach: rely on the main animation useEffect to catch the change,
      // or manually animate if listRef is available and reliable
      setTimeout(() => {
        const newCard = customSectionRef.current?.querySelector('.room-card'); // Might target the first card
        if(newCard) {
            gsap.fromTo(newCard, { opacity: 0, y: 20, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power2.out' });
        }
      }, 100); // Short delay


    } catch (err) {
      console.error("Create room error:", err.response || err);
      const errorMsg = err.response?.data?.error || 'Failed to create room. Please try again.';
      setCreateError(errorMsg);
       if (createErrorRef.current) {
           gsap.fromTo(createErrorRef.current, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3 });
       }
    } finally {
      setCreateLoading(false);
    }
  };

    // Clear create error when user types
    useEffect(() => {
      if (createError && (newRoomTitle || newRoomDescription)) {
        setCreateError(null);
        gsap.to(createErrorRef.current, { opacity: 0, duration: 0.3 });
      }
    }, [newRoomTitle, newRoomDescription, createError]);


  // Render single room card component
  const renderRoomCard = (item, category, categoryLabel, isCustom = false) => {
    // Use unique identifier: _id for custom, url for news
    const id = isCustom ? item._id : item.url;
    // Ensure consistent title/description access
    const title = item.title || "Untitled Discussion";
    // News API might have 'description' or 'content'
    const description = item.description || (item.content ? item.content.substring(0, 150) + '...' : "No description available.");
    const linkTo = isCustom
        ? `/rooms/${id}` // Route for custom rooms
        : `/discussion/${encodeURIComponent(id)}`; // Route for news discussions (using URL as ID)

    // Determine category CSS class
    let categoryClass = '';
    switch(category.toLowerCase()){
        case 'technology': categoryClass = 'tech'; break;
        case 'sports': categoryClass = 'sports'; break;
        case 'geopolitics': categoryClass = 'geo'; break;
        case 'custom': categoryClass = 'custom'; break;
        default: categoryClass = '';
    }

    return (
      // Use Link with CSS classes
      <Link
        to={linkTo}
        // Pass necessary state for the discussion page
        state={{ title, description, category, sourceUrl: isCustom ? null : item.url }}
        key={id}
        className="room-card-link" // Wrapper link
      >
        {/* Card with animation start state */}
        <div className="room-card" style={{ opacity: 0, transform: 'translateY(15px) scale(0.98)' }}>
          <div className="room-card-content">
            <h3 className="room-card-title">{title}</h3>
            <p className="room-card-description">{description}</p>
          </div>
          <div className="room-card-footer">
            <span className={`room-card-category ${categoryClass}`}>
                {categoryLabel || category}
            </span>
            <span className="room-card-link-indicator">
                <ArrowRight size={16} />
            </span>
          </div>
        </div>
      </Link>
    );
  };

  // --- Render Logic ---

  if (loading) return <div className="loading-indicator">Loading Discussions...</div>;
  // Display general fetch error prominently if it occurs
  if (error && !techNews.length && !sportsNews.length && !geoNews.length && !customRooms.length) {
      return <div className="error-indicator">{error}</div>;
  }


  return (
    // Use CSS class for container
    <div className="live-discussion-container" ref={containerRef}>
      <header className="page-header">
        <h1 className="page-title">
            <Users size={28}/> {/* Icon */}
            Live Discussions
        </h1>
      </header>

      {/* Create Custom Room Section */}
      <section
        ref={createSectionRef}
        className="create-room-section"
        style={{ opacity: 0, transform: 'translateY(20px)' }} // Start hidden
       >
        <h2 className="create-room-title">
            <Plus size={20}/>
            Create a Custom Discussion Room
        </h2>
        {user ? (
            <form onSubmit={handleCreateRoom} className="create-room-form">
            <input
                type="text"
                placeholder="Room Title (e.g., 'React Hooks Deep Dive')"
                value={newRoomTitle}
                onChange={(e) => setNewRoomTitle(e.target.value)}
                className="form-input" // Use CSS class
                required
                aria-label="New room title"
            />
            <textarea
                placeholder="Brief Description (What will be discussed?)"
                value={newRoomDescription}
                onChange={(e) => setNewRoomDescription(e.target.value)}
                className="form-textarea" // Use CSS class
                rows="2"
                required
                aria-label="New room description"
            />
            {/* Create Error Message */}
             <div ref={createErrorRef} className="form-error-message" style={{ opacity: createError ? 1 : 0, height: createError ? 'auto' : 0 }}>
               {createError}
             </div>
            <button type="submit" disabled={createLoading} className="create-room-button">
                {createLoading ? <Loader2 size={16} className="spinner" /> : <Plus size={16}/>}
                <span>{createLoading ? 'Creating...' : 'Create Room'}</span>
            </button>
            </form>
        ) : (
            <p className="login-prompt-threads"> {/* Reuse style */}
                Please <Link to="/login">login</Link> or <Link to="/register">register</Link> to create custom rooms.
            </p>
        )}
      </section>

      {/* News-Based Discussion Sections */}
      {/* Tech Section */}
      <section
        ref={techSectionRef}
        className="discussion-section"
        style={{ opacity: 0, transform: 'translateY(20px)' }} // Start hidden
      >
        <h2 className="section-title"><Tv size={22} /> Technology</h2>
        <div className="room-list">
          {techNews.length > 0 ? (
            techNews.map((article) => renderRoomCard(article, 'Technology', 'Tech'))
          ) : (
            <p className="empty-list-message">No current tech discussions available.</p>
          )}
        </div>
      </section>

      {/* Sports Section */}
       <section
        ref={sportsSectionRef}
        className="discussion-section"
        style={{ opacity: 0, transform: 'translateY(20px)' }} // Start hidden
      >
        <h2 className="section-title"><Trophy size={22} /> Sports</h2>
        <div className="room-list">
          {sportsNews.length > 0 ? (
            sportsNews.map((article) => renderRoomCard(article, 'Sports', 'Sports'))
          ) : (
            <p className="empty-list-message">No current sports discussions available.</p>
          )}
        </div>
      </section>

      {/* Geopolitics Section */}
       <section
        ref={geoSectionRef}
        className="discussion-section"
        style={{ opacity: 0, transform: 'translateY(20px)' }} // Start hidden
      >
        <h2 className="section-title"><Globe size={22} /> World News</h2>
        <div className="room-list">
          {geoNews.length > 0 ? (
            geoNews.map((article) => renderRoomCard(article, 'Geopolitics', 'World'))
          ) : (
            <p className="empty-list-message">No current world news discussions available.</p>
          )}
        </div>
      </section>


      {/* Custom Rooms Section */}
       <section
        ref={customSectionRef}
        className="discussion-section"
        style={{ opacity: 0, transform: 'translateY(20px)' }} // Start hidden
      >
        <h2 className="section-title"><Users size={22} /> Custom Rooms</h2>
        <div className="room-list">
          {customRooms.length > 0 ? (
            customRooms.map((room) => renderRoomCard(room, 'Custom', 'Custom', true)) // Pass isCustom flag
          ) : (
            <p className="empty-list-message">No custom rooms created yet.</p>
          )}
        </div>
      </section>

    </div> // End container
  );
}

export default LiveDiscussion;