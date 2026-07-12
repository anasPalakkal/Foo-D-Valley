import React, { useState, useEffect, useRef, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaUtensils, FaPencilAlt, FaGlobe } from 'react-icons/fa'
import styles from './Home.module.css'
import Footer from '../../components/Footer/Footer'
import RecipeCard from '../../components/RecipeCard/RecipeCard'
import PostRecipeModal from '../../components/PostRecipeModal/PostRecipeModal'
import { getRecipes, getCategories, normalizeInternal } from '../../api/api.js'
import { useAuth } from '../../context/AuthContext'

const LATEST_COUNT = 6
const CUISINES = ['Italian', 'Japanese', 'Mexican', 'Indian', 'French', 'Chinese', 'Thai', 'Greek']

const SLIDES = [
  {
    id: 'discover',
    tag: 'Foo D Valley',
    heading: 'Discover recipes from around the world',
    sub: '10,000+ dishes from global cuisines and our growing community.',
    cta: 'Explore recipes',
    href: '/recipes',
    bg: 'slide1',
    icon: FaUtensils,
  },
  {
    id: 'share',
    tag: 'Community',
    heading: 'Share your own recipes',
    sub: 'Post recipes, get discovered, inspire other cooks.',
    cta: null, // rendered conditionally based on auth
    bg: 'slide2',
    icon: FaPencilAlt,
  },
  {
    id: 'cuisines',
    tag: 'Browse cuisines',
    heading: 'Explore by cuisine',
    sub: null,
    cta: 'Browse all cuisines',
    href: '/recipes',
    bg: 'slide3',
    icon: FaGlobe,
  },
]

const Home = () => {
  const [latestRecipes, setLatestRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSlide, setActiveSlide] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const timerRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const internalRaw = await getRecipes()
        const latest = internalRaw
          .map(normalizeInternal)
          .filter((r) => r.createdAt)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, LATEST_COUNT)
        setLatestRecipes(latest)
      } catch (err) {
        console.error('Home fetch error:', err)
        setError('Failed to load recipes.')
      } finally {
        setLoading(false)
      }
    }
    fetchHomeData()
  }, [])

  // Auto-advance slides
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length)
    }, 5000)
    return () => clearInterval(timerRef.current)
  }, [])

  const goToSlide = (i) => {
    clearInterval(timerRef.current)
    setActiveSlide(i)
    timerRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length)
    }, 5000)
  }

  const handleSelectRecipe = (recipe) => {
    navigate(recipe.isExternal ? `/recipes/ext_${recipe.externalId}` : `/recipes/${recipe.id}`)
  }

  const handleShareClick = () => {
    if (user) setModalOpen(true)
    else navigate('/login')
  }
  const handleRecipePosted = async () => {
    setModalOpen(false)
    // re-fetch latest so the new recipe appears immediately
    try {
      const internalRaw = await getRecipes()
      const latest = internalRaw
        .map(normalizeInternal)
        .filter((r) => r.createdAt)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, LATEST_COUNT)
      setLatestRecipes(latest)
    } catch (err) {
      console.error('Refresh failed:', err)
    }
  }

  return (
    <>
      <div className={styles.homeContainer}>

        {/* ── Hero Slider ── */}
        <section className={styles.hero}>
          <div className={styles.slidesTrack} style={{ transform: `translateX(-${activeSlide * 100}%)` }}>
            {SLIDES.map((slide) => {
              const Icon = slide.icon
              return (
                <div key={slide.id} className={`${styles.slide} ${styles[slide.bg]}`}>
                  <Icon className={styles.slideIconBg} aria-hidden="true" />
                  <div className={styles.slideContent}>
                    <span className={styles.slideTag}>{slide.tag}</span>
                    <h1 className={styles.slideHeading}>{slide.heading}</h1>

                    {slide.id === 'cuisines' ? (
                      <div className={styles.cuisineChips}>
                        {CUISINES.map((c) => (
                          <Link
                            key={c}
                            to={`/recipes?cuisine=${encodeURIComponent(c)}`}
                            className={styles.cuisineChip}
                          >
                            {c}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.slideSub}>{slide.sub}</p>
                    )}

                    {slide.id === 'share' ? (
                      <button className={styles.slideBtn} onClick={handleShareClick}>
                        {user ? 'Share a recipe' : 'Join the community'}
                      </button>
                    ) : (
                      <Link to={slide.href} className={styles.slideBtn}>{slide.cta}</Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className={styles.dots}>
            {SLIDES.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === activeSlide ? styles.dotActive : ''}`}
                onClick={() => goToSlide(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </section>

        {/* ── Latest Recipes ── */}
        <section className={styles.latestSection}>
          <div className={styles.latestHeader}>
            <h2>Latest from the community</h2>
            <Link to="/recipes?sort=newest" className={styles.seeAll}>See all →</Link>
          </div>

          {loading && (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
            </div>
          )}

          {error && <p className={styles.stateText}>{error}</p>}

          {!loading && !error && latestRecipes.length === 0 && (
            <p className={styles.stateText}>
              No community recipes yet.{' '}
              <button className={styles.inlineLink} onClick={handleShareClick}>
                Be the first to share one.
              </button>
            </p>
          )}

          {!loading && !error && latestRecipes.length > 0 && (
            <div className={styles.latestGrid}>
              {latestRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} onSelect={handleSelectRecipe} />
              ))}
            </div>
          )}
        </section>
      </div>

      {modalOpen && (
        <PostRecipeModal
          onClose={() => setModalOpen(false)}
          onSuccess={handleRecipePosted}
        />
      )}

      <Footer />
    </>
  )
}

export default Home