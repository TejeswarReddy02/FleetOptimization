import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import './OneCity.css';

// Fix for Leaflet's default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ChangeView for dynamic map recenter/zoom
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const OneCity = ({ onGoBack, onFindPath }) => {
  const [selectedCity, setSelectedCity] = useState(null);
  const [locations, setLocations] = useState([]);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [mapZoom, setMapZoom] = useState(5);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  
  // Debounced search for cities or locations
  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue.length > 2) {
        if (!selectedCity) searchCities(inputValue);
        else searchLocations(inputValue);
      } else {
        setSuggestions([]);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [inputValue, selectedCity]);

  // Using Nominatim for geocoding
  const searchCities = async (query) => {
    setIsLoading(true);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=IN&featuretype=city&limit=5`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      setSuggestions(data.map(item => {
        return {
          id: item.place_id,
          name: item.display_name.split(',')[0], // Concise name for display
          fullName: item.display_name, // Full name from Nominatim for backend
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        };
      }));
    } catch (error) {
      console.error("Failed to fetch cities:", error);
    }
    setIsLoading(false);
  };

  const searchLocations = async (query) => {
    if (!selectedCity) return;
    setIsLoading(true);
    // Use selectedCity's fullName for context in location search
    const searchQuery = `${query}, ${selectedCity.fullName}`; 
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=IN&limit=5`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      setSuggestions(data.map(item => {
        return {
          id: item.place_id,
          name: item.display_name.split(',')[0], // Concise name for display
          fullName: item.display_name, // Full name from Nominatim for backend
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        };
      }));
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }
    setIsLoading(false);
  };

  const handleSelectCity = (city) => {
    setSelectedCity({
      name: city.name, // Concise name for display
      fullName: city.fullName, // Full name for backend
      lat: city.lat,
      lng: city.lng
    });
    setMapCenter([city.lat, city.lng]);
    setMapZoom(12);
    setInputValue('');
    setSuggestions([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleAddLocation = (location) => {
    if (locations.length >= 4) {
      alert("You can add a maximum of 4 locations.");
      return;
    }
    if (!locations.some(loc => loc.id === location.id)) {
      setLocations([...locations, { 
        id: location.id,
        name: location.name, // Concise name for display
        fullName: location.fullName, // Full name for backend
        lat: location.lat,
        lng: location.lng
      }]);
    }
    setInputValue('');
    setSuggestions([]);
  };

  const handleRemoveLocation = (id) => {
    setLocations(locations.filter(loc => loc.id !== id));
  };
  
  const handleOptimizePath = async () => {
    if (locations.length < 2) return;
    
    setIsLoading(true);
    
    // Reverted: Send the full name to the backend for geocoding
    const cityIdentifiers = locations.map(loc => loc.fullName);

    try {
      const response = await fetch('http://localhost:5000/solve-tsp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cities: cityIdentifiers }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get a response from the server.');
      }
      
      const result = await response.json();
      onFindPath(result);
      
    } catch (error) {
      console.error("Error optimizing path:", error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetCity = () => {
    setSelectedCity(null);
    setLocations([]);
    setMapCenter([20.5937, 78.9629]);
    setMapZoom(5);
  };

  return (
    <div className="viz-container">
      <div className="viz-main-content">
        <div className="viz-map-area single-city-map">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            className="map-container"
          >
            <ChangeView center={mapCenter} zoom={mapZoom} />
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            {locations.map(location => (
              <Marker key={location.id} position={[location.lat, location.lng]}>
                <Popup>{location.fullName}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
      <aside className="viz-sidebar">
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'flex-start' }}>
          <div className="animated-button-wrapper" onClick={onGoBack} style={{cursor: "pointer"}}>
            <div className="rotating-gradient-border"></div>
            <div className="button-inner-content" style={{padding: "0.75rem 2rem", fontSize:"1rem"}}>
              ← Back
            </div>
          </div>
        </div>
        <div>
          {!selectedCity ? (
            <>
              <h2 className="sidebar-title">Select City</h2>
              <p className="sidebar-subtitle">Choose a city to start planning.</p>
            </>
          ) : (
            <div className="selected-city-header" style={{marginBottom: '2rem'}}>
              <h2 className="sidebar-title">{selectedCity.name}</h2>
              <div className="animated-button-wrapper" onClick={resetCity} style={{cursor: "pointer", padding:0}}>
                <div className="rotating-gradient-border"></div>
                <div className="button-inner-content" style={{fontSize:"0.9rem", padding: "0.4rem 1rem"}}>Change City</div>
              </div>
            </div>
          )}
          <div className="input-container">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={selectedCity ? "Add locations..." : "Enter city name..."}
              className="location-input"
              disabled={selectedCity && locations.length >= 4}
            />
            {isLoading && <div className="spinner"></div>}
          </div>
          <div className="suggestions-list">
            {suggestions.map(item => (
              <div
                key={item.id}
                className="suggestion-item"
                onClick={() => selectedCity ? handleAddLocation(item) : handleSelectCity(item)}
              >
                {item.fullName}
              </div>
            ))}
          </div>
          {selectedCity && (
            <div className="added-locations-list">
              {locations.map((location, index) => (
                <div key={location.id} className="added-location-item">
                  <span className="location-number">{index + 1}</span>
                  <span className="location-name">{location.name}</span>
                  <button onClick={() => handleRemoveLocation(location.id)} className="remove-btn">×</button>
                </div>
              ))}
            </div>
          )}
          {selectedCity && locations.length >= 2 && (
            <div className="find-path-button-container" style={{marginTop:'2.5rem'}}>
              <div className="animated-button-wrapper">
                <div className="rotating-gradient-border"></div>
                <div className="button-inner-content" onClick={handleOptimizePath} style={{cursor:"pointer"}}>
                  Optimize Path
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default OneCity;