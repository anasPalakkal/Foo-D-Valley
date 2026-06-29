import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Home.module.css';
import Footer from '../../components/Footer/Footer';

const Home = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const res = await fetch('https://dummyjson.com/recipes');
        const data = await res.json();
        setRecipes(data.recipes || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching recipes:', error);
        setLoading(false);
      }
    };
    fetchRecipes();
  }, []);

  const handleRecipeClick = (recipe) => {
    navigate('/recipe-details', { state: { recipe } });
  };

  return (
    <>
      <div className={styles['home-container']}>
        <div className={styles['hero-section']}>
          <div className={styles['hero-slideshow']}>
            <div className={styles['hero-slide']}></div>
            <div className={styles['hero-slide']}></div>
            <div className={styles['hero-slide']}></div>
            <div className={styles['hero-slide']}></div>
          </div>
          <div className={styles['hero-overlay']}>
            <h1>Welcome to Foo D Valley</h1>
            <p>Discover, cook, and share amazing recipes from around the world.</p>
            <Link to="/recipes" className={styles['explore-button']}>Explore Recipes</Link>
          </div>
        </div>

        <div className={styles['features-section']}>
          <h2>Why Choose Us?</h2>
          <div className={styles.features}>
            <div className={styles['feature-card']}>
              <h3>Handpicked Recipes</h3>
              <p>Only the best recipes with top ratings and real chef touches.</p>
            </div>
            <div className={styles['feature-card']}>
              <h3>Global Variety</h3>
              <p>Explore culinary creations from across continents and cultures.</p>
            </div>
            <div className={styles['feature-card']}>
              <h3>Step-by-Step Guides</h3>
              <p>Help you cook with confidence, perfect for beginners and pros alike.</p>
            </div>
          </div>
        </div>

        <div className={styles['home-recipes-preview']}>
          <h2>Popular Picks</h2>
          {loading ? (
            <p>Loading recipes...</p>
          ) : (
            <div className={styles['recipe-preview-row']}>
              {recipes.slice(0, 4).map((recipe) => (
                <div
                  className={styles['preview-card']}
                  key={recipe.id}
                  onClick={() => handleRecipeClick(recipe)}
                  style={{ cursor: 'pointer' }}
                >
                  <img src={recipe.image} alt={recipe.name} />
                  <h4>{recipe.name}</h4>
                </div>
              ))}
            </div>
          )}
          <Link to="/recipes" className={styles['more-button']}>View More Recipes</Link>
        </div>
      </div>
      <Footer/>
    </>
  );
};

export default Home;