import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaUtensils, FaPencilAlt, FaGlobe } from 'react-icons/fa'
import styles from './Home.module.css'
import Footer from '../../components/Footer/Footer'
import RecipeCard from '../../components/RecipeCard/RecipeCard'
import PostRecipeModal from '../../components/PostRecipeModal/PostRecipeModal'
import { getFeed, getPopularRecipes, getMealById, normalizeInternal } from '../../api/api.js'
import { useAuth } from '../../context/AuthContext'

const LATEST_COUNT = 5
const POPULAR_COUNT = 5
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
    cta: null,
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
  const [feedRecipes, setFeedRecipes] = useState([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [feedError, setFeedError] = useState('')
  const [isFollowingFeed, setIsFollowingFeed] = useState(false)

  const [popularRecipes, setPopularRecipes] = useState([])
  const [popularLoading, setPopularLoading] = useState(true)
  const [popularError, setPopularError] = useState('')

  const [activeSlide, setActiveSlide] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const timerRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  const fetchFeed = async () => {
    try {
      setFeedLoading(true)
      const { isFollowingFeed, recipes } = await getFeed(LATEST_COUNT)
      setFeedRecipes(recipes.map(normalizeInternal))
      setIsFollowingFeed(isFollowingFeed)
      setFeedError('')
    } catch (err) {
      console.error('Feed fetch error:', err)
      setFeedError('Failed to load recipes.')
    } finally {
      setFeedLoading(false)
    }
  }

  const fetchPopular = async () => {
    try {
      setPopularLoading(true)
      const merged = await getPopularRecipes(POPULAR_COUNT)

      const hydrated = await Promise.all(
        merged.map(async (item) => {
          if (item.isExternal) {
            const meal = await getMealById(item.externalId)
            return meal ? { ...meal, likesCount: item.likesCount } : null
          }
          return { ...normalizeInternal(item.recipe), likesCount: item.likesCount }
        })
      )

      setPopularRecipes(hydrated.filter(Boolean))
      setPopularError('')
    } catch (err) {
      console.error('Popular fetch error:', err)
      setPopularError('Failed to load popular recipes.')
    } finally {
      setPopularLoading(false)
    }
  }

  useEffect(() => {
    fetchFeed()
    fetchPopular()
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

  const handleRecipePosted = () => {
    setModalOpen(false)
    fetchFeed() // new recipe won't have likes yet, no need to refetch popular
  }

  const renderState = (loading, error, empty, list) => {
    if (loading) {
      return (
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
        </div>
      )
    }
    if (error) return <p className={styles.stateText}>{error}</p>
    if (list.length === 0) return empty
    return (
      <div className={styles.cardsGrid}>
        {list.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} onSelect={handleSelectRecipe} />
        ))}
      </div>
    )
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

        {/* ── Feed: following-based when possible, falls back to global latest ── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{isFollowingFeed ? 'Latest from people you follow' : 'Latest from the community'}</h2>
            <Link
              to={isFollowingFeed ? "/recipes?source=following&sort=newest" : "/recipes?sort=newest"}
              className={styles.seeAll}>
              See all → </Link>
          </div>

          {!feedLoading && !feedError && !isFollowingFeed && user && (
            <p className={styles.feedHint}>Follow people to see their posts here.</p>
          )}

          {renderState(
            feedLoading,
            feedError,
            <p className={styles.stateText}>
              No community recipes yet.{' '}
              <button className={styles.inlineLink} onClick={handleShareClick}>
                Be the first to share one.
              </button>
            </p>,
            feedRecipes
          )}
        </section>

        {/* ── Popular Recipes ── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Most Popular</h2>
            <Link to="/recipes?sort=popular" className={styles.seeAll}>See all →</Link>
          </div>
          {renderState(
            popularLoading,
            popularError,
            <p className={styles.stateText}>No popular recipes yet.</p>,
            popularRecipes
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