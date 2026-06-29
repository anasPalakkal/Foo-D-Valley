import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Footer from '../../components/Footer/Footer';
import {
  getProfile,
  getRecipeById,
  followUser,
  unfollowUser,
  deleteRecipe,
} from '../../api/api'
import EditProfileModal from '../../components/EditProfileModal/EditProfileModal'
import PostRecipeModal from '../../components/PostRecipeModal/PostRecipeModal'
import styles from './Profile.module.css'
import {
  IoAdd,
  IoEllipsisVertical,
  IoCreateOutline,
  IoTrashOutline,
  IoBookmarkOutline,
  IoGridOutline,
} from 'react-icons/io5'

const Profile = () => {
  const { userId } = useParams()
  const { user: authUser, updateUser } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('posts')
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showPostModal, setShowPostModal] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [editLoading, setEditLoading] = useState(false)

  const [openMenuId, setOpenMenuId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const menuRef = useRef()

  const isOwner = authUser && Number(userId) === authUser.id

  useEffect(() => {
    fetchProfile()
  }, [userId])

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getProfile(userId)
      setProfile(data)
      setIsFollowing(data.isFollowing)
    } catch {
      setError('Could not load profile.')
    } finally {
      setLoading(false)
    }
  }

  const handleFollowToggle = async () => {
    if (!authUser) return navigate('/login')
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await unfollowUser(userId)
        setIsFollowing(false)
        setProfile((prev) => ({
          ...prev,
          _count: { ...prev._count, followers: prev._count.followers - 1 },
        }))
      } else {
        await followUser(userId)
        setIsFollowing(true)
        setProfile((prev) => ({
          ...prev,
          _count: { ...prev._count, followers: prev._count.followers + 1 },
        }))
      }
    } catch {
      // counts re-sync on next fetch
    } finally {
      setFollowLoading(false)
    }
  }

  const handleProfileUpdated = (updatedUser) => {
    setProfile((prev) => ({ ...prev, ...updatedUser }))
  }

  const handlePostSuccess = (recipe, isEdit) => {
    if (isEdit) {
      setProfile((prev) => ({
        ...prev,
        recipes: prev.recipes.map((r) => (r.id === recipe.id ? recipe : r)),
      }))
    } else {
      setProfile((prev) => ({
        ...prev,
        recipes: [recipe, ...prev.recipes],
        _count: { ...prev._count, recipes: prev._count.recipes + 1 },
      }))
    }
  }

  const handleDeleteRecipe = async (id) => {
    try {
      await deleteRecipe(id)
      setProfile((prev) => ({
        ...prev,
        recipes: prev.recipes.filter((r) => r.id !== id),
        _count: { ...prev._count, recipes: prev._count.recipes - 1 },
      }))
    } catch {
      // could add toast here
    } finally {
      setDeleteConfirmId(null)
    }
  }

  // Profile query only returns { id, title, imageUrl, createdAt }
  // Fetch full recipe before opening edit modal so all fields are populated
  const handleEditClick = async (recipe) => {
    setOpenMenuId(null)
    setEditLoading(true)
    try {
      const full = await getRecipeById(recipe.id)
      setEditingRecipe(full)
      setShowPostModal(true)
    } catch {
      // fallback to partial data — modal will show what it has
      setEditingRecipe(recipe)
      setShowPostModal(true)
    } finally {
      setEditLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
      </div>
    )
  }

  if (error || !profile) {
    return <div className={styles.errorWrap}>{error || 'User not found.'}</div>
  }

  const postCount = profile._count?.recipes ?? 0
  const followerCount = profile._count?.followers ?? 0
  const followingCount = profile._count?.following ?? 0

  return (
    <>
    <div className={styles.page}>
      {/* Banner */}
      <div className={styles.banner}>
        {profile.bannerUrl ? (
          <img src={profile.bannerUrl} alt="Profile banner" className={styles.bannerImg} />
        ) : (
          <div className={styles.bannerFallback} />
        )}
      </div>

      <div className={styles.container}>
        {/* Profile header */}
        <div className={styles.profileHeader}>
          <div className={styles.avatarWrap}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.name} className={styles.avatar} />
            ) : (
              <div className={styles.avatarFallback}>
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className={styles.headerRight}>
            <div className={styles.nameRow}>
              <h1 className={styles.name}>{profile.name}</h1>
              {isOwner ? (
                <button className={styles.editBtn} onClick={() => setShowEditProfile(true)}>
                  Edit Profile
                </button>
              ) : (
                <button
                  className={`${styles.followBtn} ${isFollowing ? styles.following : ''}`}
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                >
                  {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statNum}>{postCount}</span>
                <span className={styles.statLabel}>Posts</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statNum}>{followerCount}</span>
                <span className={styles.statLabel}>Followers</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statNum}>{followingCount}</span>
                <span className={styles.statLabel}>Following</span>
              </div>
            </div>

            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'posts' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <IoGridOutline size={16} /> Posts
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'favorites' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            <IoBookmarkOutline size={16} /> Saved
          </button>
        </div>

        {/* Posts tab */}
        {activeTab === 'posts' && (
          <div className={styles.tabContent}>
            {profile.recipes.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No recipes posted yet.</p>
                {isOwner && (
                  <button
                    className={styles.firstPostBtn}
                    onClick={() => {
                      setEditingRecipe(null)
                      setShowPostModal(true)
                    }}
                  >
                    Post your first recipe
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.grid} ref={menuRef}>
                {profile.recipes.map((recipe) => (
                  <div key={recipe.id} className={styles.card}>
                    <Link to={`/recipes/${recipe.id}`} className={styles.cardLink}>
                      {recipe.imageUrl ? (
                        <img src={recipe.imageUrl} alt={recipe.title} className={styles.cardImg} />
                      ) : (
                        <div className={styles.cardImgFallback} />
                      )}
                      <div className={styles.cardTitle}>{recipe.title}</div>
                    </Link>

                    {isOwner && (
                      <div className={styles.menuWrap}>
                        <button
                          className={styles.menuBtn}
                          onClick={(e) => {
                            e.preventDefault()
                            setOpenMenuId(openMenuId === recipe.id ? null : recipe.id)
                          }}
                          aria-label="Options"
                          disabled={editLoading}
                        >
                          <IoEllipsisVertical size={18} />
                        </button>

                        {openMenuId === recipe.id && (
                          <div className={styles.dropdown}>
                            <button
                              className={styles.dropdownItem}
                              onClick={() => handleEditClick(recipe)}
                            >
                              <IoCreateOutline size={15} /> Edit
                            </button>
                            <button
                              className={`${styles.dropdownItem} ${styles.danger}`}
                              onClick={() => {
                                setDeleteConfirmId(recipe.id)
                                setOpenMenuId(null)
                              }}
                            >
                              <IoTrashOutline size={15} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Favorites tab */}
        {activeTab === 'favorites' && (
          <div className={styles.tabContent}>
            {!authUser && !isOwner ? (
              <div className={styles.guestGate}>
                <p>Log in to see saved recipes.</p>
                <Link to="/login" className={styles.loginLink}>Log in</Link>
              </div>
            ) : profile.favorites.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No saved recipes yet.</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {profile.favorites.map((fav) => {
                  const title = fav.isExternal ? fav.externalName : fav.recipe?.title
                  const image = fav.isExternal ? fav.externalImage : fav.recipe?.imageUrl
                  const link = fav.isExternal
                    ? `/recipes/ext_${fav.externalId}`
                    : `/recipes/${fav.recipe?.id}`

                  return (
                    <Link key={fav.id} to={link} className={styles.card}>
                      {image ? (
                        <img src={image} alt={title} className={styles.cardImg} />
                      ) : (
                        <div className={styles.cardImgFallback} />
                      )}
                      <div className={styles.cardTitle}>{title}</div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB — owner only */}
      {isOwner && (
        <button
          className={styles.fab}
          onClick={() => {
            setEditingRecipe(null)
            setShowPostModal(true)
          }}
          aria-label="Post a recipe"
          title="Post a recipe"
        >
          <IoAdd size={28} />
        </button>
      )}

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div className={styles.confirmBackdrop}>
          <div className={styles.confirmBox}>
            <p>Delete this recipe? This cannot be undone.</p>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancel} onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </button>
              <button className={styles.confirmDelete} onClick={() => handleDeleteRecipe(deleteConfirmId)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditProfile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditProfile(false)}
          onSuccess={handleProfileUpdated}
        />
      )}

      {showPostModal && (
        <PostRecipeModal
          onClose={() => {
            setShowPostModal(false)
            setEditingRecipe(null)
          }}
          onSuccess={handlePostSuccess}
          editRecipe={editingRecipe}
        />
      )}
    </div>
    <Footer/>
    </>
  )
}

export default Profile