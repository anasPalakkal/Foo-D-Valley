import React, { useEffect, useState } from 'react';
import RecipeList from '../../components/RecipeList/RecipeList';
import { useNavigate, Link } from 'react-router-dom';
import { searchMeals } from '../../api/api.js';
import styles from './Recipes.module.css';

const Recipes = ({ searchTerm }) => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        setLoading(true);
        // Empty string returns all meals from search endpoint
        const meals = await searchMeals('');
        setRecipes(meals);
      } catch (err) {
        console.error('Error fetching recipes:', err);
        setError('Failed to load recipes. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchRecipes();
  }, []);

  // Re-fetch when searchTerm changes, debounced to avoid hammering the API
  useEffect(() => {
    if (searchTerm === '') return;

    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        const meals = await searchMeals(searchTerm);
        setRecipes(meals);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const handleSelectRecipe = (recipe) => {
    navigate('/recipe-details', { state: { recipe } });
  };

  return (
    <>
      <div className={styles['recipes-container']}>
        <h2>All Recipes</h2>

        {loading && <p>Loading recipes...</p>}
        {error && <p className={styles.error}>{error}</p>}
        {!loading && !error && (
          <RecipeList recipes={recipes} onSelect={handleSelectRecipe} />
        )}
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

export default Recipes;