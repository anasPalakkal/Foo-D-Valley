import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Footer from '../../components/Footer/Footer';
import {
  getProfile,
  getRecipeById,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
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
  IoGridOutline,
  IoPeopleOutline,
  IoPersonAddOutline,
} from 'react-icons/io5'

// Session-only cache for followers/following lists — avoids refetching when
// switching between profiles you've already visited. Cleared on page reload.
// Not a persistence layer: no TTL/eviction, since expected list sizes are small.
const followListCache = new Map()

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

  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [followersLoaded, setFollowersLoaded] = useState(false)
  const [followingLoaded, setFollowingLoaded] = useState(false)
  const [followersLoading, setFollowersLoading] = useState(false)
  const [followingListLoading, setFollowingListLoading] = useState(false)

  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showPostModal, setShowPostModal] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [editLoading, setEditLoading] = useState(false)

  const [openMenuId, setOpenMenuId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const menuRef = useRef()

  const isOwner = authUser && Number(userId) === authUser.id

  useEffect(() => {
    setActiveTab('posts')
    setFollowers([])
    setFollowing([])
    setFollowersLoaded(false)
    setFollowingLoaded(false)
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

  const fetchFollowers = async () => {
    const cacheKey = `followers:${userId}`
    // Serve from cache if already fetched this session — skips the network round trip
    if (followListCache.has(cacheKey)) {
      setFollowers(followListCache.get(cacheKey))
      setFollowersLoaded(true)
      return
    }
    setFollowersLoading(true)
    try {
      const data = await getFollowers(userId)
      setFollowers(data)
      setFollowersLoaded(true)
      followListCache.set(cacheKey, data)
    } catch {
      // leave list empty on failure — tab shows empty state, not an error banner
    } finally {
      setFollowersLoading(false)
    }
  }

  const fetchFollowing = async () => {
    const cacheKey = `following:${userId}`
    if (followListCache.has(cacheKey)) {
      setFollowing(followListCache.get(cacheKey))
      setFollowingLoaded(true)
      return
    }
    setFollowingListLoading(true)
    try {
      const data = await getFollowing(userId)
      setFollowing(data)
      setFollowingLoaded(true)
      followListCache.set(cacheKey, data)
    } catch {
      // same as above
    } finally {
      setFollowingListLoading(false)
    }
  }

  // Switches tab and lazy-loads its data. No scroll-jump — tab content
  // renders in place, right below the stats row.
  const goToTab = (tab) => {
    setActiveTab(tab)
    if (tab === 'followers' && !followersLoaded) fetchFollowers()
    if (tab === 'following' && !followingLoaded) fetchFollowing()
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

  // Follow/unfollow a person from inside a followers or following list.
  // cacheKey identifies which cached list to keep in sync after the mutation.
  const toggleFollowInList = async (targetUser, setList, cacheKey) => {
    if (!authUser) return navigate('/login')

    const wasFollowing = targetUser.isFollowing

    const applyUpdate = (updater) => {
      setList((prev) => {
        const updated = prev.map(updater)
        followListCache.set(cacheKey, updated)
        return updated
      })
    }

    // optimistic update
    applyUpdate((u) => (u.id === targetUser.id ? { ...u, isFollowing: !wasFollowing, busy: true } : u))

    try {
      if (wasFollowing) {
        await unfollowUser(targetUser.id)
      } else {
        await followUser(targetUser.id)
      }
      applyUpdate((u) => (u.id === targetUser.id ? { ...u, busy: false } : u))
    } catch {
      // revert on failure
      applyUpdate((u) => (u.id === targetUser.id ? { ...u, isFollowing: wasFollowing, busy: false } : u))
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

  const handleEditClick = async (recipe) => {
    setOpenMenuId(null)
    setEditLoading(true)
    try {
      const full = await getRecipeById(recipe.id)
      setEditingRecipe(full)
      setShowPostModal(true)
    } catch {
      setEditingRecipe(recipe)
      setShowPostModal(true)
    } finally {
      setEditLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <div className={styles.page}>
          <div className={`${styles.skeletonBanner} ${styles.skeletonFill}`} />
          <div className={styles.container}>
            <div className={styles.profileHeader}>
              <div className={`${styles.skeletonAvatarWrap} ${styles.skeletonFill}`} />
              <div className={styles.headerRight}>
                <div className={`${styles.skeletonNameLine} ${styles.skeletonFill}`} />
                <div className={styles.skeletonStatsRow}>
                  <div className={`${styles.skeletonStat} ${styles.skeletonFill}`} />
                  <div className={`${styles.skeletonStat} ${styles.skeletonFill}`} />
                  <div className={`${styles.skeletonStat} ${styles.skeletonFill}`} />
                </div>
                <div className={`${styles.skeletonBioLine} ${styles.skeletonFill}`} />
              </div>
            </div>

            <div className={styles.skeletonTabsRow}>
              <div className={`${styles.skeletonTab} ${styles.skeletonFill}`} />
              <div className={`${styles.skeletonTab} ${styles.skeletonFill}`} />
              <div className={`${styles.skeletonTab} ${styles.skeletonFill}`} />
            </div>

            <div className={styles.grid}>
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className={styles.card} aria-hidden="true">
                  <div className={`${styles.skeletonPostImg} ${styles.skeletonFill}`} />
                  <div className={`${styles.skeletonPostTitle} ${styles.skeletonFill}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (error || !profile) {
    return <div className={styles.errorWrap}>{error || 'User not found.'}</div>
  }

  const postCount = profile._count?.recipes ?? 0
  const followerCount = profile._count?.followers ?? 0
  const followingCount = profile._count?.following ?? 0

  // Shared row renderer for both followers and following lists
  const renderUserRow = (u, setList, cacheKey) => {
    const isSelf = authUser && u.id === authUser.id
    return (
      <div key={u.id} className={styles.userRow}>
        <div className={styles.userRowLeft} onClick={() => navigate(`/profile/${u.id}`)}>
          {u.avatarUrl ? (
            <img src={u.avatarUrl} alt={u.name} className={styles.userRowAvatar} />
          ) : (
            <div className={styles.userRowAvatarFallback}>{u.name.charAt(0).toUpperCase()}</div>
          )}
          <span className={styles.userRowName}>{u.name}</span>
        </div>

        {/* Hidden only for your own row — you can't follow yourself */}
        {!isSelf && (
          <button
            className={`${styles.userRowBtn} ${u.isFollowing ? styles.userRowBtnFollowing : ''}`}
            onClick={() => toggleFollowInList(u, setList, cacheKey)}
            disabled={u.busy}
          >
            {u.isFollowing ? 'Following' : activeTab === 'following' ? 'Follow' : 'Follow Back'}
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className={styles.page}>
        <div className={styles.banner}>
          {profile.bannerUrl ? (
            <img src={profile.bannerUrl} alt="Profile banner" className={styles.bannerImg} />
          ) : (
            <div className={styles.bannerFallback} />
          )}
        </div>

        <div className={styles.container}>
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
                <div className={`${styles.stat} ${styles.statClickable}`} onClick={() => goToTab('posts')}>
                  <span className={styles.statNum}>{postCount}</span>
                  <span className={styles.statLabel}>Posts</span>
                </div>
                <div className={`${styles.stat} ${styles.statClickable}`} onClick={() => goToTab('followers')}>
                  <span className={styles.statNum}>{followerCount}</span>
                  <span className={styles.statLabel}>Followers</span>
                </div>
                <div className={`${styles.stat} ${styles.statClickable}`} onClick={() => goToTab('following')}>
                  <span className={styles.statNum}>{followingCount}</span>
                  <span className={styles.statLabel}>Following</span>
                </div>
              </div>

              {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
            </div>
          </div>

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'posts' ? styles.activeTab : ''}`}
              onClick={() => goToTab('posts')}
            >
              <IoGridOutline size={16} /> Posts
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'followers' ? styles.activeTab : ''}`}
              onClick={() => goToTab('followers')}
            >
              <IoPeopleOutline size={16} /> Followers
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'following' ? styles.activeTab : ''}`}
              onClick={() => goToTab('following')}
            >
              <IoPersonAddOutline size={16} /> Following
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

          {/* Followers tab */}
          {activeTab === 'followers' && (
            <div className={styles.tabContent}>
              {followersLoading ? (
                <div className={styles.userList}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className={styles.userRow} aria-hidden="true">
                      <div className={styles.userRowLeft}>
                        <div className={`${styles.skeletonUserRowAvatar} ${styles.skeletonFill}`} />
                        <div className={`${styles.skeletonUserRowName} ${styles.skeletonFill}`} />
                      </div>
                      <div className={`${styles.skeletonUserRowBtn} ${styles.skeletonFill}`} />
                    </div>
                  ))}
                </div>
              ) : followers.length === 0 ? (
                <p className={styles.emptyListState}>No followers yet.</p>
              ) : (
                <div className={styles.userList}>
                  {followers.map((u) => renderUserRow(u, setFollowers, `followers:${userId}`))}
                </div>
              )}
            </div>
          )}

          {/* Following tab */}
          {activeTab === 'following' && (
            <div className={styles.tabContent}>
              {followingListLoading ? (
                <div className={styles.userList}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className={styles.userRow} aria-hidden="true">
                      <div className={styles.userRowLeft}>
                        <div className={`${styles.skeletonUserRowAvatar} ${styles.skeletonFill}`} />
                        <div className={`${styles.skeletonUserRowName} ${styles.skeletonFill}`} />
                      </div>
                      <div className={`${styles.skeletonUserRowBtn} ${styles.skeletonFill}`} />
                    </div>
                  ))}
                </div>
              ) : following.length === 0 ? (
                <p className={styles.emptyListState}>No following yet.</p>
              ) : (
                <div className={styles.userList}>
                  {following.map((u) => renderUserRow(u, setFollowers, `following:${userId}`))}
                </div>
              )}
            </div>
          )}
        </div>

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
      <Footer />
    </>
  )
}

export default Profile