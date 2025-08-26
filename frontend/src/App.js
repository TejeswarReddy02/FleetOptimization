import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import SolverSection from './components/SolverSection';
import './App.css';

const App = () => {
    return (
        <div className="app-main-container">
            <Header />
            <main className="content-container">
                <Hero />
                <SolverSection />
            </main>
        </div>
    );
};

export default App;