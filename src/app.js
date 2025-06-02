import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import BoardsPage from './pages/BoardsPage';
import ThreadsPage from './pages/ThreadsPage';
import PostsPage from './pages/PostsPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import LiveDiscussion from './pages/LiveDiscussion';
import DiscussionRoom from './pages/DiscussionRoom';
import GamesPage from './pages/GamesPage';


import RegisterPage from './pages/RegisterPage';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<BoardsPage />} />
            <Route path="/boards" element={<BoardsPage />} />
            <Route path="/boards/:boardId" element={<ThreadsPage />} />
            <Route path="/threads/:threadId" element={<PostsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/live-discussion" element={<LiveDiscussion />} />
            <Route path="/discussion/:roomId" element={<DiscussionRoom />} />
            <Route path="/discussion/:roomId" element={<DiscussionRoom />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/road-rash" render={() => {
          window.location.href = '/road-rash.html';
          return null;
        }} />
        
        {/* Add this new route for custom rooms */}
        <Route path="/rooms/:roomId" element={<DiscussionRoom />} />
        
        <Route path="/live-discussions" element={<LiveDiscussion />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<Dashboard />} />

          </Routes>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;