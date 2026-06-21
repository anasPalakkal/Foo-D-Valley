import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHeart } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { getFavorites, removeFavorite } from '../../api/api';
import styles from './SavedRecipes.module.css';

const SavedRecipes = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    const fetchFavorites = async () => {
      try {
        const data = await getFavorites();
        setFavorites(data);
      } catch (err) {
        console.error('Failed to fetch favorites:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user, authLoading, navigate]);

  const handleRemove = async (fav) => {
    try {
      await removeFavorite(fav)
      setFavorites((prev) => prev.filter((f) => f.id !== fav.id))
    } catch (err) {
      console.error('Failed to remove favorite:', err)
    }
  }
  
  if (loading) return <p>Loading saved recipes...</p>;

  return (
    <div className={styles['saved-container']}>
      <h2>Saved Recipes</h2>
      {favorites.length === 0 ? (
        <p>No saved recipes yet.</p>
      ) : (
        <div className={styles['saved-grid']}>
          {favorites.map((fav) => {
            const name = fav.isExternal ? fav.externalName : fav.recipe?.title;
            const image = fav.isExternal ? fav.externalImage : fav.recipe?.imageUrl;

            return (
              <div key={fav.id} className={styles['saved-card']}>
                <div className={styles['image-wrapper']}>
                  <img src={image} alt={name} />
                  <FaHeart
                    className={styles['heart-icon']}
                    onClick={() => handleRemove(fav)}
                  />
                </div>
                <h3>{name}</h3>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavedRecipes;