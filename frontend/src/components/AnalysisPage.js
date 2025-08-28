import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import './AnalysisPage.css';

// Fix default marker icons for Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Location Pin Icon for Waypoints
const locationPinIcon = L.divIcon({
  html: `<div style="
    width: 25px;
    height: 25px;
    background: #3A0CA3;
    border: 3px solid #00f260;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 3px 15px rgba(0,242,96,0.6);
  ">
    <div style="
      width: 6px;
      height: 6px;
      background: #00f260;
      border-radius: 50%;
      transform: rotate(45deg);
    "></div>
  </div>`,
  className: 'location-pin-icon',
  iconSize: [25, 25],
  iconAnchor: [12, 25]
});

// Static Vehicle Icon (No rotation, completely static)
const vehicleIcon = L.divIcon({
  html: `<div style="filter: drop-shadow(0 0 12px #00f260);">
    <svg width="35" height="35" viewBox="0 0 35 35">
      <circle cx="17.5" cy="17.5" r="16" fill="#3A0CA3" stroke="#00f260" stroke-width="2"/>
      <path d="M10 14h6v9h-6zm7-3h10l3 5v5h-3a4 4 0 01-8 0h-2v-11z" fill="#00f260"/>
      <circle cx="14" cy="25" r="2.5" fill="#fff"/>
      <circle cx="24" cy="25" r="2.5" fill="#fff"/>
    </svg>
  </div>`,
  className: 'vehicle-icon',
  iconSize: [35, 35],
  iconAnchor: [17.5, 17.5]
});

// Routing and Animation Component
const RouteAnimator = ({ locations }) => {
  const map = useMap();
  const cleanupRef = useRef(null);
  const waypointMarkersRef = useRef([]);
  const animationRef = useRef({
    frameId: null,
    isRunning: false,
    timeoutId: null
  });

  useEffect(() => {
    if (map) {
      map.invalidateSize();
    }
  }, [map]);

  useEffect(() => {
    // Complete cleanup of previous state
    if (animationRef.current.frameId) {
      cancelAnimationFrame(animationRef.current.frameId);
      animationRef.current.frameId = null;
    }
    if (animationRef.current.timeoutId) {
      clearTimeout(animationRef.current.timeoutId);
      animationRef.current.timeoutId = null;
    }
    animationRef.current.isRunning = false;

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    
    // Remove existing waypoint markers
    waypointMarkersRef.current.forEach(marker => {
      try {
        if (map && map.hasLayer && map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      } catch (e) {
        console.warn('Error removing waypoint marker:', e);
      }
    });
    waypointMarkersRef.current = [];

    if (!map || locations.length < 2) {
      return;
    }

    const validLocations = locations.filter(loc => 
      loc && typeof loc.lat === 'number' && typeof loc.lng === 'number'
    );

    if (validLocations.length < 2) {
      console.error("Not enough valid locations to create a route.");
      return;
    }

    // Add location pin markers at each waypoint FIRST
    validLocations.forEach((loc, index) => {
      const marker = L.marker([loc.lat, loc.lng], { 
        icon: locationPinIcon,
        zIndexOffset: 100
      }).addTo(map);
      waypointMarkersRef.current.push(marker);
    });

    const waypoints = validLocations.map(loc => L.latLng(loc.lat, loc.lng));
    
    // Create routing control
    const routingControl = L.Routing.control({
      waypoints: waypoints,
      serviceUrl: 'https://router.project-osrm.org/route/v1',
      routeWhileDragging: false,
      addWaypoints: false,
      fitSelectedRoutes: false,
      createMarker: () => null, // Don't create default markers
      lineOptions: {
        styles: [{ color: 'transparent', weight: 0 }] // Hide default route line
      },
      show: false,
      draggableWaypoints: false,
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'driving'
      })
    });

    let routePath, tracedPath, vehicle;
    let routeCoordinates = [];

    routingControl.on('routesfound', (e) => {
      try {
        const route = e.routes[0];
        if (!route || !route.coordinates) {
          console.warn("No valid route found");
          return;
        }

        routeCoordinates = route.coordinates;
        console.log(`Route found with ${routeCoordinates.length} points`);

        // Show COMPLETE route path IMMEDIATELY - DARKER COLOR
        routePath = L.polyline(routeCoordinates, {
          color: 'rgba(255, 255, 255, 0.8)', // Much more visible - increased opacity
          weight: 8,
          dashArray: '15, 10',
          opacity: 1
        }).addTo(map);

        // Initialize traced path (will be built during animation)
        tracedPath = L.polyline([], {
          color: '#00f260',
          weight: 8,
          opacity: 1
        }).addTo(map);

        // Fit map to show route and waypoints
        const group = new L.featureGroup([...waypointMarkersRef.current, routePath]);
        map.fitBounds(group.getBounds().pad(0.1));

        // Start vehicle animation after showing the path (2 second delay)
        animationRef.current.timeoutId = setTimeout(() => {
          startVehicleAnimation();
        }, 2000);

      } catch (error) {
        console.error("Error in routesfound handler:", error);
      }
    });

    // Vehicle animation function - MEDIUM SPEED
    const startVehicleAnimation = () => {
      if (animationRef.current.isRunning || !routeCoordinates.length) return;
      
      animationRef.current.isRunning = true;
      
      // Create single vehicle at start of route - NO ROTATION PARAMETER
      vehicle = L.marker(routeCoordinates[0], {
        icon: vehicleIcon, // Static icon, no rotation
        zIndexOffset: 1000
      }).addTo(map);

      let currentIndex = 0;
      const totalPoints = routeCoordinates.length;
      
      // MEDIUM SPEED - Adjusted for better visualization
      const skipPoints = Math.max(1, Math.floor(totalPoints / 150)); // Medium speed
      let lastUpdate = 0;
      const updateInterval = 50; // Update every 50ms for smooth medium speed
      
      const animate = (timestamp) => {
        if (currentIndex >= routeCoordinates.length || !animationRef.current.isRunning) {
          animationRef.current.isRunning = false;
          return;
        }

        // Control animation speed with timestamp
        if (timestamp - lastUpdate < updateInterval) {
          animationRef.current.frameId = requestAnimationFrame(animate);
          return;
        }
        lastUpdate = timestamp;

        try {
          const currentPoint = routeCoordinates[currentIndex];
          
          if (vehicle && map.hasLayer(vehicle)) {
            // Move vehicle smoothly WITHOUT ANY ROTATION
            vehicle.setLatLng(currentPoint);
            // Build traced path as vehicle moves
            tracedPath.addLatLng(currentPoint);
          }

          currentIndex += skipPoints;
          animationRef.current.frameId = requestAnimationFrame(animate);
        } catch (error) {
          console.error("Animation error:", error);
          animationRef.current.isRunning = false;
        }
      };

      animationRef.current.frameId = requestAnimationFrame(animate);
    };

    routingControl.on('routingerror', (e) => {
      console.error("Leaflet Routing Machine Error:", e.error);
      alert(`Routing error: ${e.error.message || 'Unknown error'}. Please try again.`);
    });

    // Add routing control to map
    try {
      routingControl.addTo(map);
    } catch (error) {
      console.error("Error adding routing control:", error);
    }

    // Comprehensive cleanup function
    const cleanup = () => {
      try {
        // Stop animation and timeouts
        if (animationRef.current.frameId) {
          cancelAnimationFrame(animationRef.current.frameId);
          animationRef.current.frameId = null;
        }
        if (animationRef.current.timeoutId) {
          clearTimeout(animationRef.current.timeoutId);
          animationRef.current.timeoutId = null;
        }
        animationRef.current.isRunning = false;
        
        // Remove routing control
        if (routingControl && map && map.hasLayer && map.hasLayer(routingControl)) {
          map.removeControl(routingControl);
        }
        
        // Remove route lines
        if (routePath && map.hasLayer(routePath)) {
          map.removeLayer(routePath);
        }
        
        if (tracedPath && map.hasLayer(tracedPath)) {
          map.removeLayer(tracedPath);
        }
        
        // Remove vehicle - CRITICAL: Ensure only one vehicle is removed
        if (vehicle && map.hasLayer(vehicle)) {
          map.removeLayer(vehicle);
          vehicle = null;
        }

        // Clean up waypoint markers
        waypointMarkersRef.current.forEach(marker => {
          if (map.hasLayer(marker)) {
            map.removeLayer(marker);
          }
        });
        waypointMarkersRef.current = [];
        
      } catch (error) {
        console.error("Error in cleanup:", error);
      }
    };

    cleanupRef.current = cleanup;
    return cleanup;
  }, [map, JSON.stringify(locations)]); // Dependency on stringified locations to trigger effect only on actual changes

  return null;
};

// Main Page Component
const AnalysisPage = ({ onGoBack, onNavigateToComparison, analysisResult }) => {
  if (!analysisResult) {
    return (
      <div className="viz-container">
        <div className="back-button-pos" onClick={onGoBack} style={{ cursor: 'pointer' }}>
          <div className="animated-button-wrapper">
            <div className="rotating-gradient-border"></div>
            <div className="button-inner-content" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
              ← Back
            </div>
          </div>
        </div>
        <div className="viz-main-content">
          <h1 className="page-title">Route Visualization & Analysis</h1>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>No analysis data available. Please go back and find a path first.</p>
          </div>
        </div>
      </div>
    );
  }

  const { 
    optimizedLocations, 
    totalDistance, 
    timeSaved, 
    percentImprovement, 
    route, 
    segmentDistances 
  } = analysisResult;

  return (
    <div className="viz-container">
      <div className="back-button-pos" onClick={onGoBack} style={{ cursor: 'pointer' }}>
        <div className="animated-button-wrapper">
          <div className="rotating-gradient-border"></div>
          <div className="button-inner-content" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
            ← Back
          </div>
        </div>
      </div>
      
      <main className="viz-main-content">
        <h1 className="page-title">Route Visualization & Analysis</h1>
        
        <div className="viz-map-area">
          <MapContainer 
            center={optimizedLocations[0] ? [optimizedLocations[0].lat, optimizedLocations[0].lng] : [20.5937, 78.9629]} // Default to India if no locations
            zoom={7} 
            style={{ height: "100%", width: "100%" }}
            key={JSON.stringify(optimizedLocations)} // Key to force remount on location changes
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RouteAnimator locations={optimizedLocations} />
          </MapContainer>
        </div>

        <div className="viz-bottom-info">
          <div className="route-sequence">
            <h3>OPTIMIZED ROUTE SEQUENCE</h3>
            <p>{route.join(' → ')}</p>
          </div>
          
          <div className="info-grids">
            <div className="info-grid">
              <div className="grid-text">
                <h4>Total Distance</h4>
                <p>{totalDistance.toFixed(1)} km</p>
              </div>
            </div>
            
            {/* Removed Time Saved and Efficiency cards as requested */}
            
          </div>
        </div>

        {onNavigateToComparison && (
          <div className="analysis-button-container" style={{ textAlign: 'left', marginTop: '2rem', paddingBottom: '2rem' }}>
            <div className="animated-button-wrapper">
              <div className="rotating-gradient-border"></div>
              <div className="button-inner-content" onClick={onNavigateToComparison}>
                View Detailed Comparison
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sidebar with route details */}
      <aside className="viz-sidebar">
        <h2 className="sidebar-title">Route Details</h2>
        
        <div className="distance-list-vertical">
          {segmentDistances.map((distance, index) => (
            <div key={index}>
              {/* Display "From" location */}
              <div className="step">
                <div className="step-location">{optimizedLocations[index].name}</div>
              </div>
              
              {/* Display connector and distance for current segment */}
              {index < segmentDistances.length && (
                <div className="step-connector">
                  <span className="step-arrow">↓</span>
                  <span className="step-distance">{distance.toFixed(1)} km</span>
                </div>
              )}

              {/* Display "To" location only if it's the last location of the current segment */}
              {index === segmentDistances.length - 1 && (
                <div className="step">
                  <div className="step-location">{optimizedLocations[index + 1].name}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
};

export default AnalysisPage;
