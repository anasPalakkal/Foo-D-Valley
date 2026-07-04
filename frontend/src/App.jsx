import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar/Navbar'
import Recipes from './pages/Recipes/Recipes'
import RecipeDetails from './pages/Recipes/RecipeDetails'
import Home from './pages/Home/Home'
import About from './pages/About/About'
import SavedRecipes from './pages/SavedRecipes/SavedRecipes'
import Login from './pages/Login/Login'
import Register from './pages/Login/Register'
import Profile from './pages/Profile/Profile'
import './App.css'

// Syncs searchTerm state with ?search= query param on /recipes
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
      <div id="main">
        <Router>
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
            <Route path="/profile/:userId" element={<Profile />} />
          </Routes>
        </Router>
      </div>
    </AuthProvider>
  )
}

export default App