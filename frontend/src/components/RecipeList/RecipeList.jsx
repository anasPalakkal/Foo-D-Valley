import React from 'react';
import styles from '../../pages/Recipes/Recipes.module.css';

const RecipeList = ({ recipes, onSelect }) => {
  return (
    <div className={styles['recipe-grid']}>
      {recipes.map((recipe) => (
        <div
          className={styles['recipe-card']}
          key={recipe.id}
          onClick={() => onSelect(recipe)}
        >
          <img src={recipe.image} alt={recipe.name} />
          <h3>{recipe.name}</h3>
          <div className={styles['recipe-popup']}>
            <div className={styles['popup-image']}>
              <img src={recipe.image} alt={recipe.name} />
            </div>
            <div className={styles['popup-text']}>
              <p><strong>Origin:</strong> {recipe.area || 'Unknown'}</p>
              <p><strong>Category:</strong> {recipe.category || 'Unknown'}</p>
              <p><strong>Ingredients:</strong> {recipe.ingredients?.length || 0}</p>
              <p className={styles.description}>{recipe.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecipeList;