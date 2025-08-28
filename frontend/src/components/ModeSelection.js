import React from 'react';
import { motion } from 'framer-motion';
import './ModeSelection.css'; // Importing the CSS file

const ModeSelection = ({ onSelectMode, onGoBack }) => {
  return (
    <div className="mode-selection-container">
      <div className="mode-selection-background">
        <motion.h1
          className="mode-selection-title"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Select Optimization Mode
        </motion.h1>

        <div className="button-group">
          {/* One City Button */}
          <motion.button
            className="mode-button"
            onClick={() => onSelectMode('oneCity')}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            One City
          </motion.button>

          {/* Multiple Cities Button */}
          <motion.button
            className="mode-button"
            onClick={() => onSelectMode('multipleCities')}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Multiple Cities
          </motion.button>
        </div>

        {/* Back Button */}
        <motion.button
          className="back-button"
          onClick={onGoBack}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Back
        </motion.button>
      </div>
    </div>
  );
};

export default ModeSelection;
