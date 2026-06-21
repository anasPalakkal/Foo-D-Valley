import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { FaHeart } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { getFavorites, addFavorite, removeFavorite } from '../../api/api';
import styles from './Recipes.module.css';

const RecipeDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [recipe] = useState(() => location.state?.recipe || null);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check if this recipe is already in the user's favorites
  useEffect(() => {
    if (!user || !recipe) return;

    const checkFavorite = async () => {
      try {
        const favorites = await getFavorites();
        const exists = favorites.some((fav) =>
          recipe.isExternal
            ? fav.isExternal && fav.externalId === recipe.externalId
            : !fav.isExternal && fav.recipeId === recipe.id
        );
        setIsSaved(exists);
      } catch (err) {
        console.error('Failed to check favorite status:', err);
      }
    };

    checkFavorite();
  }, [user, recipe]);

  const handleToggleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setSaving(true);
    try {
      if (isSaved) {
        await removeFavorite(recipe.isExternal
          ? { isExternal: true, externalId: recipe.externalId }
          : { isExternal: false, recipeId: recipe.id }
        )
        setIsSaved(false)
      } else {
        await addFavorite(recipe);
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!recipe) return <p>Recipe not found.</p>;

  return (
    <>
      <div className={styles['recipe-details']}>
        <div className={styles['top-bar']}>
          <button onClick={() => window.history.back()} className={styles['back-button']}>
            ← Back
          </button>
          <button
            className={styles['heart-button']}
            onClick={handleToggleSave}
            disabled={saving}
          >
            <FaHeart style={{ color: isSaved ? 'crimson' : 'gray', fontSize: '24px' }} />
          </button>
        </div>

        <h2>{recipe.name}</h2>
        {recipe.image && (
          <img src={recipe.image} alt={recipe.name} className={styles['recipe-image']} />
        )}

        {recipe.category && <p><strong>Category:</strong> {recipe.category}</p>}
        {recipe.area && <p><strong>Cuisine:</strong> {recipe.area}</p>}

        <h3>Ingredients</h3>
        <ul>
          {recipe.ingredients?.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>

        <h3>Instructions</h3>
        <ol>
          {recipe.instructions?.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </div>

      <footer className={styles['site-footer']}>
        <div className={styles['footer-content']}>
          <div className={styles['footer-logo']}>
            <Link to="/" className={styles['footer-logo-link']}>
              Foo <span className={styles['logo-d']}>D</span> Valley
            </Link>
          </div>
          <p>© 2025 Foo D Valley. All rights reserved.</p>
          <button
            className={styles['back-to-top']}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Back to Top
          </button>
        </div>
      </footer>
    </>
  );
};

export default RecipeDetails;