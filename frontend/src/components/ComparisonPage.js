import React, { useEffect, useState } from "react";
import "./ComparisonPage.css";

const ComparisonPage = ({ onGoBack, analysisData }) => {
  const [classical, setClassical] = useState(null);
  const [quantum, setQuantum] = useState(null);
  const [loadingClassical, setLoadingClassical] = useState(true);
  const [loadingQuantum, setLoadingQuantum] = useState(true);
  const [errorClassical, setErrorClassical] = useState(null);
  const [errorQuantum, setErrorQuantum] = useState(null);
  const [loadingComplete, setLoadingComplete] = useState(false);

  useEffect(() => {
    if (!analysisData) {
      setErrorClassical("No analysis data provided.");
      setErrorQuantum("No analysis data provided.");
      setLoadingClassical(false);
      setLoadingQuantum(false);
      return;
    }

    const cityNames = analysisData.originalLocations.map(loc => loc.name);

    const commonFetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cities: cityNames }),
    };

    const fetchClassical = () => {
      setLoadingClassical(true);
      setErrorClassical(null);
      fetch("http://127.0.0.1:5000/classical", commonFetchOptions)
        .then(res => {
          if (!res.ok) {
            return res.json().then(err => Promise.reject(err.error));
          }
          return res.json();
        })
        .then(data => {
          setClassical(data);
          setLoadingClassical(false);
        })
        .catch(error => {
          console.error("Error fetching classical data:", error);
          setErrorClassical(error || "Failed to load classical data.");
          setLoadingClassical(false);
        });
    };

    const fetchQuantum = () => {
      setLoadingQuantum(true);
      setErrorQuantum(null);
      fetch("http://127.0.0.1:5000/quantum", commonFetchOptions)
        .then(res => {
          if (!res.ok) {
            return res.json().then(err => Promise.reject(err.error));
          }
          return res.json();
        })
        .then(data => {
          setQuantum(data);
          setLoadingQuantum(false);
        })
        .catch(error => {
          console.error("Error fetching quantum data:", error);
          setErrorQuantum(error || "Failed to load quantum data.");
          setLoadingQuantum(false);
        });
    };

    fetchClassical();
    fetchQuantum();

  }, [analysisData]); // Re-run effect if analysisData changes

  return (
    <div className="analytics-container">
      <div className="back-button-pos">
        <div className="animated-button-wrapper" onClick={onGoBack} style={{ cursor: 'pointer' }}>
          <div className="rotating-gradient-border"></div>
          <div className="button-inner-content" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
            ← Back
          </div>
        </div>
      </div>
      
      <h1 className="page-title">Analytics</h1>
      
      <div className="comparison-grid">
        {/* Classical Result Card */}
        <div className="card classical">
          <h2>Classical</h2>
          {loadingClassical ? (
            <p className="loading-text">Loading...</p>
          ) : errorClassical ? (
            <p className="error-text">{errorClassical}</p>
          ) : classical ? (
            <>
              <p className="path">Path: {classical.path.join(" → ")}</p>
              <div className="stats">
                <div className="stat-box">Distance: {classical.distance} km</div>
              </div>
            </>
          ) : (
            <p className="error-text">No data available.</p>
          )}
        </div>

        {/* Quantum Result Card */}
        <div className="card quantum">
          <h2>Quantum</h2>
          {loadingQuantum ? (
            <p className="loading-text">Loading...</p>
          ) : errorQuantum ? (
            <p className="error-text">{errorQuantum}</p>
          ) : quantum ? (
            <>
              <p className="path">Path: {quantum.path.join(" → ")}</p>
              <div className="stats">
                <div className="stat-box">Distance: {quantum.distance} km</div>
              </div>
            </>
          ) : (
            <p className="error-text">No data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComparisonPage;
