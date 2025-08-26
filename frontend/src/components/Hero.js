import React from 'react';
import '../App.css';

const Hero = () => {
    return (
        <section className="hero-section">
            <div className="hero-content">
                <p className="hero-subtitle">QUANTUM OPTIMIZATION</p>
                <h1 className="hero-title">Fleet Optimization with QAOA</h1>
                <p className="hero-description">
                    Utilizing quantum algorithms to find the most efficient routes, minimizing distance, time, and fuel consumption for your logistics needs.
                </p>
            </div>
        </section>
    );
};

export default Hero;