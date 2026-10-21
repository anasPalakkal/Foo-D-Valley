import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { ToastProvider } from './components/Toast/ToastProvider'
import Navbar from './components/Navbar/Navbar'
import Recipes from './pages/Recipes/Recipes'
import RecipeDetails from './pages/Recipes/RecipeDetails'
import Home from './pages/Home/Home'
import About from './pages/About/About'
import SavedRecipes from './pages/SavedRecipes/SavedRecipes'
import Login from './pages/Login/Login'
import Register from './pages/Login/Register'
import ForgotPassword from './pages/Login/ForgotPassword'
import ResetPassword from './pages/Login/ResetPassword'
import VerifyEmail from './pages/Login/VerifyEmail'
import Profile from './pages/Profile/Profile'
import Settings from './pages/Settings/Settings'
import Notifications from './pages/Notifications/Notifications'
import Messages from './pages/Messages/Messages'
import Conversation from './pages/Messages/Conversation'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import AssistantWidget from './components/AssistantWidget/AssistantWidget'
import ScrollToTop from './components/ScrollToTop/ScrollToTop'
import './App.css'

const SearchSync = ({ setSearchTerm }) => {
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const q = params.get('search') || ''
    setSearchTerm(q)
  }, [location.search])

  return null
}

function App() {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <ToastProvider>
            <div id="main">
              <ScrollToTop />
              <SearchSync setSearchTerm={setSearchTerm} />
              <Navbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/recipes" element={<Recipes searchTerm={searchTerm} />} />
                <Route path="/recipes/:id" element={<RecipeDetails />} />
                <Route path="/saved" element={<SavedRecipes />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <Notifications />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/messages"
                  element={
                    <ProtectedRoute>
                      <Messages />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/messages/:id"
                  element={
                    <ProtectedRoute>
                      <Conversation />
                    </ProtectedRoute>
                  }
                />
              </Routes>
              <AssistantWidget />
            </div>
          </ToastProvider>
        </Router>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App