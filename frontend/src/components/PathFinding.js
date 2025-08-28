import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import './PathFinding.css';

const loadGoogleMapsScript = (apiKey, callback) => {
  if (window.google && window.google.maps) {
    callback();
    return;
  }
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMapPathfinding`;
  script.async = true;
  script.defer = true;
  window.initMapPathfinding = callback;
  document.head.appendChild(script);
};

const Pathfinding = ({ onGoBack, pathData }) => {
  const mapRef = useRef(null);
  const googleMap = useRef(null);
  const markers = useRef([]);
  const pathPolyline = useRef(null);

  const GOOGLE_MAPS_API_KEY = '';

  const initMapAndPath = useCallback(() => {
    if (!window.google || !window.google.maps || !pathData) return;

    if (mapRef.current) {
      const optimizedLocations = pathData.optimizedLocations;
      const initialCenter = optimizedLocations.length > 0
        ? { lat: optimizedLocations[0].lat, lng: optimizedLocations[0].lng }
        : { lat: 20.5937, lng: 78.9629 };
      
      googleMap.current = new window.google.maps.Map(mapRef.current, {
        center: initialCenter,
        zoom: 5,
        mapId: 'DEMO_MAP_ID',
      });

      markers.current.forEach(marker => marker.setMap(null));
      markers.current = [];
      if (pathPolyline.current) {
        pathPolyline.current.setMap(null);
      }

      const routeCoords = optimizedLocations.map(loc => ({ lat: loc.lat, lng: loc.lng }));

      const bounds = new window.google.maps.LatLngBounds();
      routeCoords.forEach((coord, index) => {
        const marker = new window.google.maps.Marker({
          position: coord,
          map: googleMap.current,
          title: pathData.route[index],
          animation: window.google.maps.Animation.DROP,
        });
        markers.current.push(marker);
        bounds.extend(coord);
      });
      googleMap.current.fitBounds(bounds);

      if (routeCoords.length > 1) {
        pathPolyline.current = new window.google.maps.Polyline({
          path: routeCoords,
          geodesic: true,
          strokeColor: '#FF0000',
          strokeOpacity: 1.0,
          strokeWeight: 4,
        });
        pathPolyline.current.setMap(googleMap.current);
      }
    }
  }, [pathData]);

  useEffect(() => {
    loadGoogleMapsScript(GOOGLE_MAPS_API_KEY, () => {
      initMapAndPath();
    });
  }, [initMapAndPath]);

  const handleGetAnalysis = () => {
    console.log('Running analysis on path:', pathData);
    alert('Analysis reports would be generated here!');
  };

  return (
    <div className="pathfinding-container">
      <div className="one-city-background"></div>

      <div className="content-wrapper">
        <motion.h1
          className="pathfinding-title"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Path Finding
        </motion.h1>

        <div className="two-column-layout">
          {/* Left Column for Analysis Boxes */}
          <div className="left-column">
            <motion.div
              className="analysis-box"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h3>Distance</h3>
              <p>{pathData.totalDistance.toFixed(1)} km</p>
            </motion.div>
            
            <motion.div
              className="analysis-box"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h3>Time</h3>
              <p>{pathData.timeSaved.toFixed(1)} hrs saved</p>
            </motion.div>
            
            <motion.div
              className="analysis-box"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <h3>Efficiency</h3>
              <p>{pathData.percentImprovement.toFixed(1)} % gained</p>
            </motion.div>

            <motion.button
              className="analysis-button-main"
              onClick={handleGetAnalysis}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Get Analysis
            </motion.button>
          </div>
          
          {/* Right Column for the Map */}
          <div className="right-column">
            <motion.div
              ref={mapRef}
              className="map-placeholder"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {/* Map will be rendered by Google Maps API */}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <motion.button
        className="back-button"
        onClick={onGoBack}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Back
      </motion.button>
    </div>
  );
};

export default Pathfinding;