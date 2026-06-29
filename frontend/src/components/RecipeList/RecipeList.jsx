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
        </div>
      ))}
    </div>
  );
};

export default RecipeList;