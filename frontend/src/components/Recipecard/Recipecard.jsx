import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaHeart } from 'react-icons/fa';
import styles from './RecipeCard.module.css';

const RecipeCard = ({ recipe, onSelect }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onSelect) {
      onSelect(recipe);
    } else {
      const path = recipe.isExternal
        ? `/recipes/ext_${recipe.externalId}`
        : `/recipes/${recipe.id}`;
      navigate(path);
    }
  };

  return (
    <div className={styles.card} onClick={handleClick}>
      <div className={styles.imageWrap}>
        <img src={recipe.image} alt={recipe.name} className={styles.image} />
        {!recipe.isExternal && (
          <span className={styles.communityBadge}>Community</span>
        )}
        {recipe.likesCount > 0 && (
          <span className={styles.likesBadge}>
            <FaHeart /> {recipe.likesCount}
          </span>
        )}
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{recipe.name}</h3>

        <div className={styles.badges}>
          {recipe.category && <span className={styles.badge}>{recipe.category}</span>}
          {recipe.area && <span className={styles.badge}>{recipe.area}</span>}
        </div>

        {!recipe.isExternal && recipe.author && (
          <div className={styles.author} onClick={(e) => e.stopPropagation()}>
            {recipe.author.avatarUrl ? (
              <img
                src={recipe.author.avatarUrl}
                alt={recipe.author.name}
                className={styles.authorAvatar}
              />
            ) : (
              <div className={styles.authorFallback}>
                {recipe.author.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <Link to={`/profile/${recipe.author.id}`} className={styles.authorName}>
              {recipe.author.name}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeCard;