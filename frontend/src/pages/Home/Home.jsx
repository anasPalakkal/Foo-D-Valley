import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaUtensils, FaPencilAlt, FaGlobe, FaThumbsUp } from 'react-icons/fa'
import styles from './Home.module.css'
import Footer from '../../components/Footer/Footer'
import RecipeCard from '../../components/RecipeCard/RecipeCard'
import PostRecipeModal from '../../components/PostRecipeModal/PostRecipeModal'
import {
  getFeed,
  getPopularRecipes,
  getMealById,
  normalizeInternal,
  getFavorites,
  getRecommendations,
  getProfile,
} from '../../api/api.js'
import { getRecentlyViewed, clearRecentlyViewed } from '../../utils/recentlyViewed'
import { useAuth } from '../../context/AuthContext'

const LATEST_COUNT = 9
const POPULAR_COUNT = 9
const RECOMMENDED_COUNT = 9
const SAVED_PREVIEW_COUNT = 6
const RECENTLY_VIEWED_COUNT = 6
const ACTIVITY_NUDGE_DAYS = 14
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

const mapFavoriteToCard = (fav) =>
  fav.isExternal
    ? {
        id: `fav-ext-${fav.externalId}`,
        externalId: fav.externalId,
        isExternal: true,
        name: fav.externalName,
        image: fav.externalImage,
      }
    : {
        id: fav.recipe?.id,
        isExternal: false,
        name: fav.recipe?.title,
        image: fav.recipe?.imageUrl,
      }

const Home = () => {
  const [feedRecipes, setFeedRecipes] = useState([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [feedError, setFeedError] = useState('')
  const [isFollowingFeed, setIsFollowingFeed] = useState(false)

  const [popularRecipes, setPopularRecipes] = useState([])
  const [popularLoading, setPopularLoading] = useState(true)
  const [popularError, setPopularError] = useState('')

  const [savedRecipes, setSavedRecipes] = useState([])
  const [recentlyViewed, setRecentlyViewed] = useState([])
  const [recommended, setRecommended] = useState({ basis: null, recipes: [] })
  const [activityNudge, setActivityNudge] = useState('')

  const [activeSlide, setActiveSlide] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const timerRef = useRef(null)
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

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

  useEffect(() => {
    setRecentlyViewed(getRecentlyViewed().slice(0, RECENTLY_VIEWED_COUNT))
  }, [])

  useEffect(() => {
    if (!user) {
      setSavedRecipes([])
      return
    }
    getFavorites()
      .then((favs) => setSavedRecipes(favs.slice(0, SAVED_PREVIEW_COUNT).map(mapFavoriteToCard)))
      .catch(() => setSavedRecipes([]))
  }, [user])

  useEffect(() => {
    if (!user) {
      setRecommended({ basis: null, recipes: [] })
      return
    }
    getRecommendations(RECOMMENDED_COUNT)
      .then((data) =>
        setRecommended({
          basis: data.basis,
          recipes: (data.recipes || []).map(normalizeInternal),
        })
      )
      .catch(() => setRecommended({ basis: null, recipes: [] }))
  }, [user])

  useEffect(() => {
    if (!user) {
      setActivityNudge('')
      return
    }
    getProfile(user.id)
      .then((profile) => {
        const lastPostedAt = profile.recipes?.[0]?.createdAt
        if (!lastPostedAt) {
          setActivityNudge("You haven't posted a recipe yet — share your first one.")
          return
        }
        const daysSince = Math.floor((Date.now() - new Date(lastPostedAt).getTime()) / 86400000)
        setActivityNudge(
          daysSince >= ACTIVITY_NUDGE_DAYS
            ? `You haven't posted in ${daysSince} days — got something new cooking?`
            : ''
        )
      })
      .catch(() => setActivityNudge(''))
  }, [user])

  // Guard against running the guest-only slide timer while session restore
  // is still in flight — user is null during that window too, but nothing
  // is rendered yet so starting the timer here is just wasted work.
  useEffect(() => {
    if (user || authLoading) return
    timerRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length)
    }, 5000)
    return () => clearInterval(timerRef.current)
  }, [user, authLoading])

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
    fetchFeed()
  }

  const handleClearRecentlyViewed = () => {
    clearRecentlyViewed()
    setRecentlyViewed([])
  }

  const renderState = (loading, error, empty, list, metricIcon) => {
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
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onSelect={handleSelectRecipe}
            compact
            metricIcon={metricIcon}
          />
        ))}
      </div>
    )
  }

  const firstName = user?.name?.split(' ')[0]

  const recommendedHeading = recommended.basis?.category
    ? `Because you liked ${recommended.basis.category}`
    : recommended.basis?.cuisine
    ? `Because you liked ${recommended.basis.cuisine} cuisine`
    : 'Recommended for you'

  return (
    <>
      <div className={styles.homeContainer}>

        {authLoading ? (
          /* ── Session restore in flight — neutral skeleton, don't guess
               guest vs logged-in and risk a flash of the wrong UI. ── */
          <section className={styles.heroSkeleton}>
            <div className={styles.skeletonBlock} />
          </section>
        ) : user ? (
          <section className={styles.welcomeBar}>
            <div className={styles.welcomeText}>
              <h1 className={styles.welcomeHeading}>Welcome back, {firstName}</h1>
              <p className={styles.welcomeSub}>
                {activityNudge || "Here's what's cooking in your feed today."}
              </p>
            </div>
            <div className={styles.quickActions}>
              <button className={styles.quickActionPrimary} onClick={handleShareClick}>
                <FaPencilAlt /> Post a Recipe
              </button>
              <Link to="/saved" className={styles.quickActionSecondary}>Saved Recipes</Link>
              <Link to="/recipes" className={styles.quickActionSecondary}>Browse All</Link>
            </div>
          </section>
        ) : (
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
                          Join the community
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
        )}

        {user && recommended.recipes.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>{recommendedHeading}</h2>
              <Link to="/recipes" className={styles.seeAll}>See all →</Link>
            </div>
            <div className={styles.cardsGrid}>
              {recommended.recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} onSelect={handleSelectRecipe} compact />
              ))}
            </div>
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{isFollowingFeed ? 'Latest from people you follow' : 'Latest from the community'}</h2>
            <Link
              to={isFollowingFeed ? "/recipes?source=following&sort=newest" : "/recipes?sort=newest"}
              className={styles.seeAll}>
              See all →
            </Link>
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

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Most Popular</h2>
            <Link to="/recipes?sort=popular" className={styles.seeAll}>See all →</Link>
          </div>
          {renderState(
            popularLoading,
            popularError,
            <p className={styles.stateText}>No popular recipes yet.</p>,
            popularRecipes,
            FaThumbsUp
          )}
        </section>

        {recentlyViewed.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Recently Viewed</h2>
              <button className={styles.seeAll} onClick={handleClearRecentlyViewed}>Clear</button>
            </div>
            <div className={styles.previewGrid}>
              {recentlyViewed.map((recipe) => (
                <RecipeCard key={recipe.key} recipe={recipe} onSelect={handleSelectRecipe} compact />
              ))}
            </div>
          </section>
        )}

        {user && savedRecipes.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Your Saved Recipes</h2>
              <Link to="/saved" className={styles.seeAll}>See all →</Link>
            </div>
            <div className={styles.previewGrid}>
              {savedRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} onSelect={handleSelectRecipe} compact />
              ))}
            </div>
          </section>
        )}
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