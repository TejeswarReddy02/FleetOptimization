import React from 'react';
import '../App.css';

const Header = () => {
    return (
        <header className="main-header">
            <nav className="header-nav">
                <a href="#home" className="nav-logo">Satya Dev</a>
                <ul className="nav-menu">
                    <li><a href="#home" className="nav-item">Home</a></li>
                    <li><a href="#about" className="nav-item">About</a></li>
                    <li><a href="#services" className="nav-item active-nav">Services</a></li>
                    <li><a href="#portfolio" className="nav-item">Portfolio</a></li>
                    <li><a href="#contact" className="nav-item">Contact</a></li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;