import React, { useState } from 'react';
import HomePage from './components/HomePage';
import ModeSelection from './components/ModeSelection';
import OneCity from './components/OneCity';
import MultipleCities from './components/MultipleCities';
import AnalysisPage from './components/AnalysisPage';
import ComparisonPage from './components/ComparisonPage';

import './App.css'; 

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [previousPage, setPreviousPage] = useState('home');
  const [analysisData, setAnalysisData] = useState(null);

  const navigateTo = (page) => {
    setPreviousPage(currentPage);
    setCurrentPage(page);
  };

  const handleGetStarted = () => navigateTo('modeSelection');

  const handleGoBack = () => {
    if (currentPage === 'analysis') {
      setAnalysisData(null);
      setCurrentPage(previousPage);
    } else {
      setCurrentPage(previousPage);
    }
  };

  const handleSelectMode = (mode) => {
    if (mode === 'oneCity') navigateTo('oneCity');
    else if (mode === 'multipleCities') navigateTo('multipleCities');
  };

  const handleFindPath = (data) => {
    setAnalysisData(data);
    navigateTo('analysis');
  };

  const handleNavigateToComparison = () => {
    navigateTo('comparison');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onGetStarted={handleGetStarted} />;
      case 'modeSelection':
        return <ModeSelection onGoBack={handleGoBack} onSelectMode={handleSelectMode} />;
      case 'oneCity':
        return <OneCity onGoBack={handleGoBack} onFindPath={handleFindPath} />;
      case 'multipleCities':
        return <MultipleCities onGoBack={handleGoBack} onFindPath={handleFindPath} />;
      case 'analysis':
        return <AnalysisPage onGoBack={handleGoBack} analysisResult={analysisData} onNavigateToComparison={handleNavigateToComparison} />;
      case 'comparison':
        // Pass analysisData to the comparison page
        return <ComparisonPage onGoBack={handleGoBack} analysisData={analysisData} />; 
      default:
        return <HomePage onGetStarted={handleGetStarted} />;
    }
  };

  return <>{renderPage()}</>;
};

export default App;
