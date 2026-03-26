import { useState, useEffect, createContext, useContext, useCallback, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useParams } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import '@livekit/components-styles';
import {
  LiveKitRoom,
  VideoConference,
  GridLayout,
  ParticipantTile,
  useTracks,
  RoomAudioRenderer,
  ControlBar,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Home, User, Settings, LogOut, Diamond, Gift, Video, Eye, Users, 
  DollarSign, Crown, Rocket, Heart, Star, TrendingUp, Menu, X, 
  Camera, Mic, MicOff, VideoOff, Play, Square, Send, Wallet, 
  CreditCard, Check, AlertCircle, ChevronRight, ExternalLink
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_go-rcmg/artifacts/0aiiowdn_8130.jpg";

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("rcmg_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
    } catch (err) {
      localStorage.removeItem("rcmg_token");
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem("rcmg_token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (email, password, username) => {
    const res = await axios.post(`${API}/auth/register`, { email, password, username });
    localStorage.setItem("rcmg_token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("rcmg_token");
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchUser();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/auth" />;
  }
  
  if (adminOnly && !user.is_admin) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

// Loading Screen
const LoadingScreen = () => (
  <div className="min-h-screen bg-dark-main flex items-center justify-center">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    >
      <Diamond className="w-16 h-16 text-secondary" />
    </motion.div>
  </div>
);

// Navigation
const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => navigate(user ? '/dashboard' : '/')}
            data-testid="nav-logo"
          >
            <img src={LOGO_URL} alt="RCMG Live" className="h-10 w-auto rounded" />
            <span className="font-orbitron text-xl font-bold">
              <span className="text-primary">RCMG</span>
              <span className="text-secondary ml-1">LIVE</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <NavLink to="/dashboard" icon={<Home size={18} />} label="Dashboard" />
                <NavLink to="/streams" icon={<Video size={18} />} label="Watch" />
                <NavLink to="/go-live" icon={<Camera size={18} />} label="Go Live" />
                <NavLink to="/gifts" icon={<Gift size={18} />} label="Gifts" />
                {user.is_admin && (
                  <NavLink to="/admin" icon={<Crown size={18} />} label="Admin" />
                )}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/10 border border-secondary/30">
                  <Diamond className="w-5 h-5 text-secondary" />
                  <span className="font-mono text-secondary font-bold">
                    {user.diamond_balance?.toLocaleString()}
                  </span>
                </div>
                <div className="relative group">
                  <button 
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                    data-testid="user-menu-btn"
                  >
                    <User size={18} />
                    <span className="text-sm">{user.username}</span>
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 glass rounded-lg py-2 hidden group-hover:block">
                    <button 
                      onClick={() => navigate('/profile')}
                      className="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors flex items-center gap-2"
                      data-testid="profile-link"
                    >
                      <User size={16} /> Profile
                    </button>
                    <button 
                      onClick={() => navigate('/wallet')}
                      className="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors flex items-center gap-2"
                      data-testid="wallet-link"
                    >
                      <Wallet size={16} /> Wallet
                    </button>
                    <button 
                      onClick={() => navigate('/subscription')}
                      className="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors flex items-center gap-2"
                      data-testid="subscription-link"
                    >
                      <CreditCard size={16} /> Subscription
                    </button>
                    <hr className="my-2 border-white/10" />
                    <button 
                      onClick={logout}
                      className="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors flex items-center gap-2 text-primary"
                      data-testid="logout-btn"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button 
                onClick={() => navigate('/auth')}
                className="btn-primary"
                data-testid="login-btn"
              >
                Get Started
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-4 space-y-2">
                {user ? (
                  <>
                    <MobileNavLink to="/dashboard" icon={<Home size={18} />} label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
                    <MobileNavLink to="/streams" icon={<Video size={18} />} label="Watch" onClick={() => setMobileMenuOpen(false)} />
                    <MobileNavLink to="/go-live" icon={<Camera size={18} />} label="Go Live" onClick={() => setMobileMenuOpen(false)} />
                    <MobileNavLink to="/gifts" icon={<Gift size={18} />} label="Gifts" onClick={() => setMobileMenuOpen(false)} />
                    <MobileNavLink to="/wallet" icon={<Wallet size={18} />} label="Wallet" onClick={() => setMobileMenuOpen(false)} />
                    {user.is_admin && (
                      <MobileNavLink to="/admin" icon={<Crown size={18} />} label="Admin" onClick={() => setMobileMenuOpen(false)} />
                    )}
                    <button 
                      onClick={() => { logout(); setMobileMenuOpen(false); }}
                      className="w-full px-4 py-3 text-left text-primary flex items-center gap-3"
                    >
                      <LogOut size={18} /> Logout
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}
                    className="btn-primary w-full"
                  >
                    Get Started
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

const NavLink = ({ to, icon, label }) => {
  const navigate = useNavigate();
  return (
    <button 
      onClick={() => navigate(to)}
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm"
      data-testid={`nav-${label.toLowerCase()}`}
    >
      {icon}
      {label}
    </button>
  );
};

const MobileNavLink = ({ to, icon, label, onClick }) => {
  const navigate = useNavigate();
  return (
    <button 
      onClick={() => { navigate(to); onClick(); }}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors"
    >
      {icon}
      {label}
    </button>
  );
};

// Landing Page
const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-city">
      <div className="bg-overlay min-h-screen">
        <Navigation />
        
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <img 
                src={LOGO_URL} 
                alt="RCMG Live" 
                className="w-48 h-48 mx-auto mb-8 rounded-2xl shadow-2xl"
                data-testid="hero-logo"
              />
              <h1 className="font-orbitron text-5xl md:text-7xl font-black mb-6">
                <span className="text-primary neon-text-red">RCMG</span>
                <span className="text-secondary neon-text-blue ml-4">LIVE</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-10">
                Go live on TikTok, Twitch, YouTube & more — all at once. 
                Receive gifts, earn diamonds, and build your streaming empire.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => navigate('/auth')}
                  className="btn-primary text-lg px-8 py-4"
                  data-testid="cta-start-streaming"
                >
                  Start Streaming Free
                </button>
                <button 
                  onClick={() => navigate('/streams')}
                  className="btn-secondary text-lg px-8 py-4"
                  data-testid="cta-watch-live"
                >
                  Watch Live Now
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-orbitron text-3xl md:text-4xl font-bold text-center mb-16">
              Stream <span className="text-primary">Everywhere</span> at Once
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Video className="w-10 h-10 text-secondary" />}
                title="Multi-Platform"
                description="Go live on TikTok, Twitch, YouTube, and more simultaneously with one click"
              />
              <FeatureCard 
                icon={<Gift className="w-10 h-10 text-accent-purple" />}
                title="Virtual Gifts"
                description="Receive gifts from your audience and convert them to real earnings"
              />
              <FeatureCard 
                icon={<Diamond className="w-10 h-10 text-accent-gold" />}
                title="Diamond Economy"
                description="Earn diamonds from gifts and cash out whenever you want"
              />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 px-4 bg-black/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-orbitron text-3xl md:text-4xl font-bold text-center mb-16">
              Choose Your <span className="text-secondary">Plan</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <PricingCard 
                title="Monthly"
                price="9.99"
                period="/month"
                features={["Unlimited streams", "No diamond fee", "Priority support", "Custom badge"]}
              />
              <PricingCard 
                title="Yearly"
                price="74.99"
                period="/year"
                features={["Everything in Monthly", "Save 37%", "1000 bonus diamonds", "Exclusive gifts"]}
                popular
              />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-10 px-4 border-t border-white/10">
          <div className="max-w-6xl mx-auto text-center text-gray-500">
            <p>&copy; 2024 RCMG Live. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-card rounded-xl p-8 text-center"
    data-testid={`feature-${title.toLowerCase().replace(' ', '-')}`}
  >
    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 mb-6">
      {icon}
    </div>
    <h3 className="font-orbitron text-xl font-bold mb-4">{title}</h3>
    <p className="text-gray-400">{description}</p>
  </motion.div>
);

const PricingCard = ({ title, price, period, features, popular }) => (
  <motion.div 
    whileHover={{ scale: 1.02 }}
    className={`glass-card rounded-xl p-8 relative ${popular ? 'border-2 border-secondary' : ''}`}
  >
    {popular && (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-secondary text-black font-bold text-sm px-4 py-1 rounded-full">
        BEST VALUE
      </div>
    )}
    <h3 className="font-orbitron text-2xl font-bold mb-4">{title}</h3>
    <div className="mb-6">
      <span className="text-4xl font-bold">${price}</span>
      <span className="text-gray-400">{period}</span>
    </div>
    <ul className="space-y-3 mb-8">
      {features.map((f, i) => (
        <li key={i} className="flex items-center gap-2">
          <Check className="w-5 h-5 text-accent-green" />
          <span>{f}</span>
        </li>
      ))}
    </ul>
    <button className={popular ? "btn-primary w-full" : "btn-secondary w-full"}>
      Get Started
    </button>
  </motion.div>
);

// Auth Page
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, username);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-city">
      <div className="bg-overlay min-h-screen flex items-center justify-center px-4">
        <Navigation />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-8 w-full max-w-md mt-20"
        >
          <div className="text-center mb-8">
            <img src={LOGO_URL} alt="RCMG Live" className="w-20 h-20 mx-auto mb-4 rounded-xl" />
            <h1 className="font-orbitron text-2xl font-bold">
              {isLogin ? "Welcome Back" : "Join RCMG Live"}
            </h1>
          </div>

          {error && (
            <div className="bg-primary/20 border border-primary text-primary px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-dark"
                  placeholder="Choose a username"
                  required
                  data-testid="input-username"
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark"
                placeholder="your@email.com"
                required
                data-testid="input-email"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-dark"
                placeholder="Your password"
                required
                data-testid="input-password"
              />
            </div>
            <button 
              type="submit" 
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={loading}
              data-testid="auth-submit-btn"
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                  <Diamond size={20} />
                </motion.div>
              ) : (
                isLogin ? "Sign In" : "Create Account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-secondary hover:underline"
              data-testid="auth-toggle-btn"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Dashboard
const Dashboard = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [liveStreams, setLiveStreams] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ gifters: [], streamers: [] });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [streamsRes, giftersRes, streamersRes] = await Promise.all([
        axios.get(`${API}/streams`),
        axios.get(`${API}/leaderboard/gifters`),
        axios.get(`${API}/leaderboard/streamers`)
      ]);
      setLiveStreams(streamsRes.data);
      setLeaderboard({ gifters: giftersRes.data, streamers: streamersRes.data });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-dark-main pt-20">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome & Balance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-6 md:col-span-2"
          >
            <h1 className="font-orbitron text-2xl font-bold mb-2">
              Welcome back, <span className="text-secondary">{user?.username}</span>!
            </h1>
            <p className="text-gray-400 mb-6">Ready to go live and connect with your audience?</p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => navigate('/go-live')}
                className="btn-primary flex items-center gap-2"
                data-testid="dashboard-go-live-btn"
              >
                <Camera size={20} /> Go Live Now
              </button>
              <button 
                onClick={() => navigate('/streams')}
                className="btn-secondary flex items-center gap-2"
                data-testid="dashboard-watch-btn"
              >
                <Eye size={20} /> Watch Streams
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Diamond className="w-8 h-8 text-secondary" />
              <span className="text-gray-400">Diamond Balance</span>
            </div>
            <p className="font-orbitron text-4xl font-bold text-secondary" data-testid="diamond-balance">
              {user?.diamond_balance?.toLocaleString()}
            </p>
            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => navigate('/wallet')}
                className="text-sm text-secondary hover:underline"
              >
                Buy Diamonds
              </button>
              <span className="text-gray-600">|</span>
              <button 
                onClick={() => navigate('/wallet')}
                className="text-sm text-accent-green hover:underline"
              >
                Cash Out
              </button>
            </div>
          </motion.div>
        </div>

        {/* Live Streams */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-orbitron text-xl font-bold flex items-center gap-2">
              <span className="live-badge">LIVE</span> Now
            </h2>
            <button 
              onClick={() => navigate('/streams')}
              className="text-secondary hover:underline flex items-center gap-1"
            >
              View All <ChevronRight size={16} />
            </button>
          </div>
          {liveStreams.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {liveStreams.slice(0, 4).map((stream) => (
                <StreamCard key={stream.id} stream={stream} onClick={() => navigate(`/watch/${stream.id}`)} />
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-xl p-8 text-center">
              <Video className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No live streams right now</p>
              <button 
                onClick={() => navigate('/go-live')}
                className="mt-4 text-secondary hover:underline"
              >
                Be the first to go live!
              </button>
            </div>
          )}
        </section>

        {/* Leaderboards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-xl p-6"
          >
            <h3 className="font-orbitron text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="text-accent-gold" /> Top Gifters
            </h3>
            <div className="space-y-3">
              {leaderboard.gifters.slice(0, 5).map((u, i) => (
                <div key={u.id} className="flex items-center gap-3">
                  <span className={`font-bold w-6 ${i === 0 ? 'text-accent-gold' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                    #{i + 1}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-sm font-bold">
                    {u.username?.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1">{u.username}</span>
                  <span className="flex items-center gap-1 text-secondary">
                    <Diamond size={14} /> {u.total_gifted?.toLocaleString()}
                  </span>
                </div>
              ))}
              {leaderboard.gifters.length === 0 && (
                <p className="text-gray-500 text-center py-4">No data yet</p>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-xl p-6"
          >
            <h3 className="font-orbitron text-lg font-bold mb-4 flex items-center gap-2">
              <Star className="text-accent-purple" /> Top Streamers
            </h3>
            <div className="space-y-3">
              {leaderboard.streamers.slice(0, 5).map((u, i) => (
                <div key={u.id} className="flex items-center gap-3">
                  <span className={`font-bold w-6 ${i === 0 ? 'text-accent-gold' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                    #{i + 1}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gradient-cyber flex items-center justify-center text-sm font-bold">
                    {u.username?.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1">{u.username}</span>
                  <span className="flex items-center gap-1 text-accent-green">
                    <Diamond size={14} /> {u.total_received?.toLocaleString()}
                  </span>
                </div>
              ))}
              {leaderboard.streamers.length === 0 && (
                <p className="text-gray-500 text-center py-4">No data yet</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const StreamCard = ({ stream, onClick }) => (
  <motion.div 
    whileHover={{ scale: 1.03 }}
    onClick={onClick}
    className="glass-card rounded-xl overflow-hidden cursor-pointer group"
    data-testid={`stream-card-${stream.id}`}
  >
    <div className="relative aspect-video bg-gradient-brand">
      <div className="absolute inset-0 flex items-center justify-center">
        <Video className="w-12 h-12 text-white/50" />
      </div>
      <div className="absolute top-2 left-2">
        <span className="live-badge">LIVE</span>
      </div>
      <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 px-2 py-1 rounded text-xs">
        <Eye size={12} /> {stream.viewer_count}
      </div>
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
        <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
    <div className="p-4">
      <h4 className="font-bold truncate">{stream.title}</h4>
      <p className="text-sm text-gray-400">{stream.streamer_username}</p>
    </div>
  </motion.div>
);

// Streams List
const StreamsPage = () => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStreams();
    const interval = setInterval(fetchStreams, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStreams = async () => {
    try {
      const res = await axios.get(`${API}/streams`);
      setStreams(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-main pt-20">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="font-orbitron text-3xl font-bold mb-8 flex items-center gap-3">
          <span className="live-badge">LIVE</span> Streams
        </h1>

        {loading ? (
          <LoadingScreen />
        ) : streams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {streams.map((stream) => (
              <StreamCard 
                key={stream.id} 
                stream={stream} 
                onClick={() => navigate(`/watch/${stream.id}`)} 
              />
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-xl p-12 text-center">
            <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="font-orbitron text-xl font-bold mb-2">No Live Streams</h2>
            <p className="text-gray-400 mb-6">Be the first to go live and start streaming!</p>
            <button 
              onClick={() => navigate('/go-live')}
              className="btn-primary"
              data-testid="no-streams-go-live-btn"
            >
              Go Live Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Go Live Page
const GoLivePage = () => {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [streamData, setStreamData] = useState(null);
  const [livekitToken, setLivekitToken] = useState(null);
  const [error, setError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const videoRef = useRef(null);

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Connect video element when stream is ready
  useEffect(() => {
    if (localStream && videoRef.current) {
      videoRef.current.srcObject = localStream;
      videoRef.current.play().catch(e => console.log("Autoplay blocked:", e));
    }
  }, [localStream]);

  const startCamera = async () => {
    try {
      // Stop any existing stream first
      stopCamera();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: true
      });
      
      setLocalStream(stream);
      setCameraReady(true);
      setMicReady(true);
      setError("");
      
      // Directly connect to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.log("Autoplay blocked:", e));
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraReady(false);
      setMicReady(false);
      
      if (err.name === 'NotAllowedError') {
        setError("Camera access denied. Click the camera icon in your browser's address bar to allow access.");
      } else if (err.name === 'NotFoundError') {
        setError("No camera found. Please connect a camera and refresh.");
      } else if (err.name === 'NotReadableError') {
        setError("Camera is being used by another app. Close other apps and try again.");
      } else {
        setError(`Camera error: ${err.message}`);
      }
    }
  };

  const stopCamera = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
      });
      setLocalStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startStream = async () => {
    if (!title.trim()) {
      setError("Please enter a stream title");
      return;
    }
    if (!cameraReady || !micReady) {
      setError("Camera and microphone are required to go live");
      return;
    }
    setError("");

    // Stop local preview (LiveKit will take over)
    stopCamera();

    try {
      const streamRes = await axios.post(
        `${API}/streams`,
        { title, description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const tokenRes = await axios.post(
        `${API}/livekit/token`,
        { room_name: streamRes.data.room_name, can_publish: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStreamData(streamRes.data);
      setLivekitToken(tokenRes.data);
      setIsLive(true);
      await refreshUser();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to start stream");
      startCamera(); // Restart preview on error
    }
  };

  const endStream = async () => {
    if (streamData) {
      try {
        await axios.post(
          `${API}/streams/${streamData.id}/end`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.error(err);
      }
    }
    setIsLive(false);
    setStreamData(null);
    setLivekitToken(null);
    navigate('/dashboard');
  };

  if (isLive && livekitToken) {
    return (
      <div className="min-h-screen bg-dark-main">
        <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="live-badge">LIVE</span>
              <span className="font-orbitron font-bold">{streamData?.title}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-gray-400">
                <Eye size={16} /> {streamData?.viewer_count || 0} viewers
              </span>
              <button 
                onClick={endStream}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2"
                data-testid="end-stream-btn"
              >
                <Square size={16} /> End Stream
              </button>
            </div>
          </div>
        </div>

        <div className="pt-16 h-screen">
          <LiveKitRoom
            serverUrl={livekitToken.server_url}
            token={livekitToken.token}
            connect={true}
            video={true}
            audio={true}
            onDisconnected={endStream}
          >
            <div className="h-full flex">
              <div className="flex-1">
                <VideoConference />
              </div>
            </div>
            <RoomAudioRenderer />
          </LiveKitRoom>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-main pt-20">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Camera Preview */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-xl p-6"
          >
            <h2 className="font-orbitron text-xl font-bold mb-4 flex items-center gap-2">
              <Camera className="text-secondary" /> Camera Preview
            </h2>
            
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden mb-4">
              {cameraReady && localStream ? (
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <VideoOff className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">Camera not available</p>
                    <button 
                      onClick={startCamera}
                      className="btn-primary px-6 py-3"
                      data-testid="enable-camera-btn"
                    >
                      <Camera className="inline mr-2" size={18} />
                      Enable Camera & Mic
                    </button>
                    <p className="text-xs text-gray-500 mt-4">
                      Click the button and allow access when your browser asks
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Device Status */}
            <div className="flex items-center gap-4">
              <button 
                onClick={startCamera}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all hover:scale-105 ${cameraReady ? 'bg-accent-green/20 text-accent-green' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}
              >
                {cameraReady ? <Camera size={16} /> : <VideoOff size={16} />}
                <span className="text-sm font-medium">{cameraReady ? 'Camera Ready' : 'Click to Enable'}</span>
              </button>
              <button 
                onClick={startCamera}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all hover:scale-105 ${micReady ? 'bg-accent-green/20 text-accent-green' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}
              >
                {micReady ? <Mic size={16} /> : <MicOff size={16} />}
                <span className="text-sm font-medium">{micReady ? 'Mic Ready' : 'Click to Enable'}</span>
              </button>
            </div>
          </motion.div>

          {/* Stream Settings */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-xl p-6"
          >
            <h2 className="font-orbitron text-xl font-bold mb-4 flex items-center gap-2">
              <Play className="text-primary" /> Stream Settings
            </h2>

            {user?.subscription_status === "free" && (
              <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4 mb-6">
                <p className="text-sm">
                  <span className="text-secondary font-bold">50 diamonds</span> will be deducted to go live.
                  <button 
                    onClick={() => navigate('/subscription')}
                    className="text-secondary ml-2 underline"
                  >
                    Subscribe for unlimited streams
                  </button>
                </p>
              </div>
            )}

            {error && (
              <div className="bg-primary/20 border border-primary text-primary px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Stream Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-dark"
                  placeholder="What's your stream about?"
                  data-testid="stream-title-input"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-dark h-24 resize-none"
                  placeholder="Tell viewers what to expect..."
                  data-testid="stream-description-input"
                />
              </div>

              <button 
                onClick={startStream}
                disabled={!cameraReady || !micReady}
                className={`w-full text-lg flex items-center justify-center gap-2 py-4 rounded-lg font-orbitron tracking-wider transition-all ${
                  cameraReady && micReady 
                    ? 'btn-primary' 
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
                data-testid="start-stream-btn"
              >
                <Play size={24} /> {cameraReady && micReady ? 'Start Streaming' : 'Enable Camera & Mic First'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Watch Stream Page
const WatchStreamPage = () => {
  const { id } = useParams();
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [stream, setStream] = useState(null);
  const [livekitToken, setLivekitToken] = useState(null);
  const [gifts, setGifts] = useState([]);
  const [selectedGift, setSelectedGift] = useState(null);
  const [giftQuantity, setGiftQuantity] = useState(1);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comboAnimation, setComboAnimation] = useState(null);

  useEffect(() => {
    joinStream();
    fetchGifts();
    return () => leaveStream();
  }, [id]);

  const joinStream = async () => {
    try {
      // Get stream details
      const streamRes = await axios.get(`${API}/streams/${id}`);
      setStream(streamRes.data);

      if (!streamRes.data.is_live) {
        setError("This stream has ended");
        setLoading(false);
        return;
      }

      if (user && token) {
        // Join stream
        await axios.post(
          `${API}/streams/${id}/join`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Get LiveKit token for viewing
        const tokenRes = await axios.post(
          `${API}/livekit/token`,
          { room_name: streamRes.data.room_name, can_publish: false, can_subscribe: true },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setLivekitToken(tokenRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to join stream");
    } finally {
      setLoading(false);
    }
  };

  const leaveStream = async () => {
    if (user && token) {
      try {
        await axios.post(
          `${API}/streams/${id}/leave`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.error(err);
      }
    }
  };

  const fetchGifts = async () => {
    try {
      const res = await axios.get(`${API}/gifts`);
      setGifts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const sendGift = async () => {
    if (!selectedGift || !user) return;

    try {
      const res = await axios.post(
        `${API}/gifts/send`,
        {
          gift_id: selectedGift.id,
          recipient_id: stream.streamer_id,
          stream_id: stream.id,
          quantity: giftQuantity
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Check for combo
      if (res.data.combo) {
        setComboAnimation(res.data.combo);
        setTimeout(() => setComboAnimation(null), 3000);
      }
      
      await refreshUser();
      setSelectedGift(null);
      setGiftQuantity(1);
      // Keep panel open for combo chains!
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send gift");
    }
  };

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div className="min-h-screen bg-dark-main pt-20">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="glass-card rounded-xl p-8 text-center">
            <AlertCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="font-orbitron text-xl font-bold mb-2">{error}</h2>
            <button 
              onClick={() => navigate('/streams')}
              className="btn-secondary mt-4"
            >
              Browse Streams
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-main">
      {/* Stream header */}
      <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/streams')} className="p-2 hover:bg-white/10 rounded-lg">
              <X size={20} />
            </button>
            <span className="live-badge">LIVE</span>
            <div>
              <h1 className="font-bold">{stream?.title}</h1>
              <p className="text-sm text-gray-400">{stream?.streamer_username}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-gray-400">
              <Eye size={16} /> {stream?.viewer_count || 0}
            </span>
            {user && (
              <button 
                onClick={() => setShowGiftPanel(!showGiftPanel)}
                className="btn-primary flex items-center gap-2"
                data-testid="gift-btn"
              >
                <Gift size={16} /> Send Gift
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Video area */}
      <div className="pt-16 h-screen relative">
        {livekitToken ? (
          <LiveKitRoom
            serverUrl={livekitToken.server_url}
            token={livekitToken.token}
            connect={true}
            video={false}
            audio={false}
          >
            <div className="h-full">
              <VideoConference />
            </div>
            <RoomAudioRenderer />
          </LiveKitRoom>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Video className="w-24 h-24 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Please login to watch this stream</p>
              <button 
                onClick={() => navigate('/auth')}
                className="btn-primary mt-4"
              >
                Login to Watch
              </button>
            </div>
          </div>
        )}
        
        {/* Combo Animation Overlay */}
        <AnimatePresence>
          {comboAnimation && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, -5, 5, 0]
                }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="text-center"
              >
                <div className={`font-orbitron text-6xl md:text-8xl font-black mb-4 ${
                  comboAnimation.combo_count >= 7 ? 'gradient-text-animated' : 
                  comboAnimation.combo_count >= 5 ? 'text-accent-gold' :
                  comboAnimation.combo_count >= 3 ? 'text-accent-purple' : 'text-secondary'
                }`} style={{ textShadow: '0 0 40px currentColor' }}>
                  x{comboAnimation.combo_count}
                </div>
                <div className="font-orbitron text-3xl md:text-5xl font-bold text-white" style={{ textShadow: '0 0 20px rgba(255,255,255,0.8)' }}>
                  {comboAnimation.combo_name}
                </div>
                {comboAnimation.bonus_diamonds > 0 && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-4 flex items-center justify-center gap-2 text-2xl text-accent-green font-bold"
                  >
                    <Diamond size={28} /> +{comboAnimation.bonus_diamonds} BONUS!
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Gift Panel */}
      <AnimatePresence>
        {showGiftPanel && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed bottom-0 left-0 right-0 glass border-t border-white/10 p-4 z-50"
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-orbitron font-bold">Send a Gift</h3>
                <button onClick={() => setShowGiftPanel(false)}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex gap-4 overflow-x-auto pb-4">
                {gifts.map((gift) => (
                  <button
                    key={gift.id}
                    onClick={() => setSelectedGift(gift)}
                    className={`flex-shrink-0 p-3 rounded-xl transition-all ${
                      selectedGift?.id === gift.id 
                        ? 'bg-primary/20 border-2 border-primary' 
                        : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                    }`}
                    data-testid={`gift-${gift.name.toLowerCase()}`}
                  >
                    <img src={gift.image_url} alt={gift.name} className="w-16 h-16 object-cover rounded-lg mb-2" />
                    <p className="text-sm font-bold">{gift.name}</p>
                    <p className="text-xs text-secondary flex items-center gap-1">
                      <Diamond size={12} /> {gift.diamond_cost}
                    </p>
                  </button>
                ))}
              </div>

              {selectedGift && (
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setGiftQuantity(Math.max(1, giftQuantity - 1))}
                      className="w-8 h-8 rounded bg-white/10 hover:bg-white/20"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-bold">{giftQuantity}</span>
                    <button 
                      onClick={() => setGiftQuantity(giftQuantity + 1)}
                      className="w-8 h-8 rounded bg-white/10 hover:bg-white/20"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex-1">
                    <div className="text-right">
                      <span className="text-gray-400">Total: </span>
                      <span className="text-secondary font-bold flex items-center gap-1 inline-flex">
                        <Diamond size={16} /> {selectedGift.diamond_cost * giftQuantity}
                      </span>
                    </div>
                    <p className="text-xs text-accent-purple text-right mt-1">
                      Send rapidly for COMBO BONUS!
                    </p>
                  </div>
                  <button 
                    onClick={sendGift}
                    className="btn-primary flex items-center gap-2"
                    data-testid="send-gift-confirm-btn"
                  >
                    <Send size={16} /> Send
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Gifts Page
const GiftsPage = () => {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGifts();
  }, []);

  const fetchGifts = async () => {
    try {
      const res = await axios.get(`${API}/gifts`);
      setGifts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-main pt-20">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="font-orbitron text-3xl font-bold mb-8 flex items-center gap-3">
          <Gift className="text-accent-purple" /> Gift Shop
        </h1>

        {loading ? (
          <LoadingScreen />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {gifts.map((gift) => (
              <motion.div
                key={gift.id}
                whileHover={{ scale: 1.05 }}
                className="glass-card rounded-xl p-6 text-center"
              >
                <img 
                  src={gift.image_url} 
                  alt={gift.name} 
                  className="w-24 h-24 object-cover rounded-xl mx-auto mb-4"
                />
                <h3 className="font-orbitron font-bold text-lg mb-2">{gift.name}</h3>
                <p className="flex items-center justify-center gap-2 text-secondary">
                  <Diamond size={18} />
                  <span className="font-bold">{gift.diamond_cost.toLocaleString()}</span>
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Wallet Page
const WalletPage = () => {
  const { user, token, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API}/wallet/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setError("");
    setSuccess("");

    const amount = parseInt(withdrawAmount);
    if (!amount || amount < 1000) {
      setError("Minimum withdrawal is 1000 diamonds");
      return;
    }
    if (!paypalEmail) {
      setError("Please enter your PayPal email");
      return;
    }

    try {
      const res = await axios.post(
        `${API}/wallet/withdraw`,
        { amount, paypal_email: paypalEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(`Withdrawal request submitted! You will receive $${res.data.usd_amount.toFixed(2)} to ${paypalEmail}`);
      setShowWithdraw(false);
      setWithdrawAmount("");
      setPaypalEmail("");
      await refreshUser();
      await fetchTransactions();
    } catch (err) {
      setError(err.response?.data?.detail || "Withdrawal failed");
    }
  };

  return (
    <div className="min-h-screen bg-dark-main pt-20">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-orbitron text-3xl font-bold mb-8 flex items-center gap-3">
          <Wallet className="text-secondary" /> Wallet
        </h1>

        {/* Balance Card */}
        <div className="glass-card rounded-xl p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-400 mb-2">Diamond Balance</p>
              <p className="font-orbitron text-4xl font-bold text-secondary flex items-center gap-2">
                <Diamond size={32} /> {user?.diamond_balance?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-2">USD Value</p>
              <p className="font-orbitron text-4xl font-bold text-accent-green">
                ${((user?.diamond_balance || 0) / 100).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">100 diamonds = $1.00</p>
            </div>
            <div className="flex items-end">
              <button 
                onClick={() => setShowWithdraw(!showWithdraw)}
                className="btn-primary w-full flex items-center justify-center gap-2"
                data-testid="withdraw-btn"
              >
                <DollarSign size={20} /> Cash Out
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-primary/20 border border-primary text-primary px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
        {success && (
          <div className="bg-accent-green/20 border border-accent-green text-accent-green px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <Check size={18} />
            {success}
          </div>
        )}

        {/* Withdraw Form */}
        <AnimatePresence>
          {showWithdraw && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="glass-card rounded-xl p-6 mb-8 overflow-hidden"
            >
              <h3 className="font-orbitron font-bold mb-4">Withdraw Diamonds</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Amount (diamonds)</label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="input-dark"
                    placeholder="Min 1000"
                    min="1000"
                    data-testid="withdraw-amount-input"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">PayPal Email</label>
                  <input
                    type="email"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    className="input-dark"
                    placeholder="your@paypal.com"
                    data-testid="paypal-email-input"
                  />
                </div>
              </div>
              {withdrawAmount && parseInt(withdrawAmount) >= 1000 && (
                <p className="text-sm text-gray-400 mb-4">
                  You will receive: <span className="text-accent-green font-bold">${(parseInt(withdrawAmount) / 100).toFixed(2)}</span>
                </p>
              )}
              <button 
                onClick={handleWithdraw}
                className="btn-primary"
                data-testid="confirm-withdraw-btn"
              >
                Request Withdrawal
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transactions */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-orbitron font-bold mb-4">Transaction History</h3>
          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
                  <div>
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`font-mono font-bold ${tx.amount > 0 ? 'text-accent-green' : 'text-primary'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No transactions yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Subscription Page
const SubscriptionPage = () => {
  const { user, token, refreshUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await axios.get(`${API}/subscription/plans`);
      setPlans(res.data.plans);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (data, actions) => {
    const plan = plans.find(p => p.id === selectedPlan);
    return actions.order.create({
      purchase_units: [{
        amount: {
          value: plan.price.toString()
        },
        description: `RCMG Live ${plan.name} Subscription`
      }]
    });
  };

  const onApprove = async (data, actions) => {
    setProcessing(true);
    try {
      const details = await actions.order.capture();
      
      // Create order in our system
      const orderRes = await axios.post(
        `${API}/subscription/create-order`,
        { plan: selectedPlan },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Capture the order
      await axios.post(
        `${API}/subscription/capture-order`,
        { order_id: orderRes.data.order_id, paypal_order_id: details.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await refreshUser();
      setSelectedPlan(null);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-main pt-20">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-orbitron text-3xl font-bold mb-8 flex items-center gap-3">
          <Crown className="text-accent-gold" /> Subscription
        </h1>

        {/* Current Status */}
        <div className="glass-card rounded-xl p-6 mb-8">
          <h3 className="font-orbitron font-bold mb-2">Current Plan</h3>
          <p className={`text-2xl font-bold ${user?.subscription_status === 'premium' ? 'text-accent-gold' : 'text-gray-400'}`}>
            {user?.subscription_status === 'premium' ? 'Premium' : 'Free'}
          </p>
          {user?.subscription_status === 'premium' && (
            <p className="text-sm text-gray-400 mt-2">Your subscription is active</p>
          )}
        </div>

        {/* Plans */}
        <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                whileHover={{ scale: 1.02 }}
                className={`glass-card rounded-xl p-6 cursor-pointer transition-all ${
                  selectedPlan === plan.id ? 'border-2 border-secondary' : 'border-2 border-transparent'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <h3 className="font-orbitron text-xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-gray-400">/{plan.interval}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent-green" />
                      {f}
                    </li>
                  ))}
                </ul>
                
                {selectedPlan === plan.id && !processing && (
                  <div className="mt-4" data-testid={`paypal-buttons-${plan.id}`}>
                    <PayPalButtons
                      createOrder={createOrder}
                      onApprove={onApprove}
                      style={{ layout: "horizontal", color: "gold" }}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </PayPalScriptProvider>
      </div>
    </div>
  );
};

// Profile Page
const ProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-main pt-20">
      <Navigation />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-orbitron text-3xl font-bold mb-8 flex items-center gap-3">
          <User className="text-secondary" /> Profile
        </h1>

        <div className="glass-card rounded-xl p-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-brand flex items-center justify-center text-4xl font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-orbitron text-2xl font-bold">{user?.username}</h2>
              <p className="text-gray-400">{user?.email}</p>
              {user?.is_admin && (
                <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-accent-gold/20 text-accent-gold rounded-full text-sm">
                  <Crown size={14} /> Admin
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm">Diamonds</p>
              <p className="font-orbitron text-2xl font-bold text-secondary">
                {user?.diamond_balance?.toLocaleString()}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm">Subscription</p>
              <p className={`font-orbitron text-2xl font-bold ${user?.subscription_status === 'premium' ? 'text-accent-gold' : 'text-gray-500'}`}>
                {user?.subscription_status === 'premium' ? 'Premium' : 'Free'}
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
};

// Admin Page
const AdminPage = () => {
  const { user, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, statsRes, withdrawalsRes] = await Promise.all([
        axios.get(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/withdrawals`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
      setWithdrawals(withdrawalsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const grantDiamonds = async () => {
    if (!grantUserId || !grantAmount) {
      setMessage("Please fill in user ID and amount");
      return;
    }

    try {
      await axios.post(
        `${API}/admin/diamonds/grant`,
        {
          user_id: grantUserId,
          amount: parseInt(grantAmount),
          reason: grantReason || "Admin Grant"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Diamonds granted successfully!");
      setGrantUserId("");
      setGrantAmount("");
      setGrantReason("");
      fetchData();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Failed to grant diamonds");
    }
  };

  const approveWithdrawal = async (withdrawalId) => {
    try {
      await axios.post(
        `${API}/admin/withdrawals/${withdrawalId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Withdrawal approved!");
      fetchData();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Failed to approve");
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-dark-main pt-20">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="font-orbitron text-3xl font-bold mb-8 flex items-center gap-3">
          <Crown className="text-accent-gold" /> Admin Panel
        </h1>

        {message && (
          <div className="bg-secondary/20 border border-secondary text-secondary px-4 py-3 rounded-lg mb-6">
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-white/10 pb-4">
          {["overview", "users", "diamonds", "withdrawals"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                activeTab === tab ? 'bg-primary text-white' : 'hover:bg-white/10'
              }`}
              data-testid={`admin-tab-${tab}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === "overview" && stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total Users" value={stats.total_users} icon={<Users />} />
            <StatCard label="Total Streams" value={stats.total_streams} icon={<Video />} />
            <StatCard label="Live Now" value={stats.live_streams} icon={<Play />} color="primary" />
            <StatCard label="Transactions" value={stats.total_transactions} icon={<DollarSign />} />
            <StatCard label="Pending Withdrawals" value={stats.pending_withdrawals} icon={<AlertCircle />} color="gold" />
          </div>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-4">User</th>
                  <th className="text-left p-4">Email</th>
                  <th className="text-right p-4">Diamonds</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-white/10">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span>{u.username}</span>
                        {u.is_admin && <Crown size={14} className="text-accent-gold" />}
                      </div>
                    </td>
                    <td className="p-4 text-gray-400">{u.email}</td>
                    <td className="p-4 text-right font-mono text-secondary">{u.diamond_balance?.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        u.subscription_status === 'premium' ? 'bg-accent-gold/20 text-accent-gold' : 'bg-gray-600/20 text-gray-400'
                      }`}>
                        {u.subscription_status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Diamond Grant */}
        {activeTab === "diamonds" && (
          <div className="glass-card rounded-xl p-6 max-w-xl">
            <h3 className="font-orbitron font-bold mb-4 flex items-center gap-2">
              <Diamond className="text-secondary" /> Grant Diamonds
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">User ID</label>
                <select
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                  className="input-dark"
                  data-testid="grant-user-select"
                >
                  <option value="">Select a user</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Amount</label>
                <input
                  type="number"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  className="input-dark"
                  placeholder="Number of diamonds"
                  data-testid="grant-amount-input"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Reason (optional)</label>
                <input
                  type="text"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  className="input-dark"
                  placeholder="Why are you granting these diamonds?"
                  data-testid="grant-reason-input"
                />
              </div>
              <button 
                onClick={grantDiamonds}
                className="btn-primary flex items-center gap-2"
                data-testid="grant-diamonds-btn"
              >
                <Diamond size={18} /> Grant Diamonds
              </button>
            </div>
          </div>
        )}

        {/* Withdrawals */}
        {activeTab === "withdrawals" && (
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-4">User</th>
                  <th className="text-right p-4">Diamonds</th>
                  <th className="text-right p-4">USD</th>
                  <th className="text-left p-4">PayPal</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => {
                  const wUser = users.find(u => u.id === w.user_id);
                  return (
                    <tr key={w.id} className="border-t border-white/10">
                      <td className="p-4">{wUser?.username || w.user_id}</td>
                      <td className="p-4 text-right font-mono text-secondary">{w.diamond_amount?.toLocaleString()}</td>
                      <td className="p-4 text-right font-mono text-accent-green">${w.usd_amount?.toFixed(2)}</td>
                      <td className="p-4 text-gray-400 text-sm">{w.paypal_email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          w.status === 'approved' ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-gold/20 text-accent-gold'
                        }`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {w.status === 'pending' && (
                          <button
                            onClick={() => approveWithdrawal(w.id)}
                            className="text-sm text-accent-green hover:underline"
                            data-testid={`approve-withdrawal-${w.id}`}
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {withdrawals.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">No withdrawal requests</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color = "secondary" }) => (
  <div className="glass-card rounded-xl p-6">
    <div className={`w-10 h-10 rounded-lg bg-${color}/20 flex items-center justify-center mb-3 text-${color}`}>
      {icon}
    </div>
    <p className="text-gray-400 text-sm">{label}</p>
    <p className="font-orbitron text-2xl font-bold">{value}</p>
  </div>
);

// Main App
function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/streams" element={<StreamsPage />} />
            <Route path="/watch/:id" element={<WatchStreamPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/go-live" element={<ProtectedRoute><GoLivePage /></ProtectedRoute>} />
            <Route path="/gifts" element={<ProtectedRoute><GiftsPage /></ProtectedRoute>} />
            <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;
