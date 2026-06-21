import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import styles from './Navbar.module.css';

const Navbar = ({ searchTerm, setSearchTerm }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (location.pathname !== '/recipes') {
      navigate('/recipes');
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles['navbar-logo']}>
        <Link to="/">Foo <span className={styles['logo-d']}>D</span> Valley</Link>
      </div>

      <ul className={styles['navbar-links']}>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/recipes">Recipes</Link></li>
        <li><Link to="/saved">Favorites</Link></li>
        <li><Link to="/about">About</Link></li>
      </ul>

      <form className={styles['navbar-search']} onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <button type="submit">
          <FaSearch />
        </button>
      </form>

      <div className={styles['navbar-auth']}>
        <Link to="/login" className={styles['btn-login']}>Login</Link>
      </div>
    </nav>
  );
};

export default Navbar;