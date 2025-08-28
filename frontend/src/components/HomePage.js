import React from 'react';
import { motion } from 'framer-motion';
import './HomePage.css'; // Importing the CSS file

const HomePage = ({ onGetStarted }) => {
  return (
    <div className="homepage-container">
      {/* Background from the "TSP Fleet Optimizer" reference image */}
      <div className="homepage-background">
        
        {/* Truck Image */}
        <motion.img
          className="truck-image" 
          src="https://tse4.mm.bing.net/th/id/OIP.SD4RnKRmq99RZPXq5rhzrgHaEJ?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"
          alt="Cargo Truck"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        />

        {/* Title */}
        <motion.h1
          className="homepage-title"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Path Optimizer
        </motion.h1>

        {/* Get Started Button with animation */}
        <motion.div
          className="animated-button-wrapper"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <button onClick={onGetStarted} className="button-inner-content">
            Get Started
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;
