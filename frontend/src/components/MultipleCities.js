import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MultipleCities.css';

// --- Helper: Marker Icon ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// --- Helper: Component to Change Map View ---
const ChangeView = ({ cities }) => {
  const map = useMap();
  useEffect(() => {
    if (cities.length > 0) {
      const bounds = new L.LatLngBounds(cities.map(city => [city.lat, city.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView([20.5937, 78.9629], 5); // Default India view
    }
  }, [cities, map]);
  return null;
};

// --- Main Component ---
const MultipleCities = ({ onGoBack, onFindPath }) => {
  // State Management
  const [cities, setCities] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Debounced search effect
  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue.length > 2) {
        searchCities(inputValue);
      } else {
        setSuggestions([]);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [inputValue]);

  // --- API Function ---
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

  // --- Event Handlers ---
  const handleAddCity = (city) => {
    if (cities.length >= 4) {
      alert("You can add a maximum of 4 cities.");
      return;
    }
    if (!cities.some(c => c.id === city.id)) {
      setCities([...cities, {
        id: city.id,
        name: city.name, // Concise name for display
        fullName: city.fullName, // Full name from Nominatim for backend
        lat: city.lat,
        lng: city.lng
      }]);
    }
    setInputValue('');
    setSuggestions([]);
  };

  const handleRemoveCity = (id) => {
    setCities(cities.filter(c => c.id !== id));
  };

  // Connects to the backend
  const handleOptimizePath = async () => {
    if (cities.length < 2) {
      alert("Please add at least 2 cities to optimize a path.");
      return;
    }
    setIsLoading(true);
    
    // Reverted: Send the full name to the backend for geocoding
    const cityIdentifiers = cities.map(city => city.fullName);

    try {
      const response = await fetch('http://localhost:5000/solve-tsp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cities: cityIdentifiers, routeType: "multiple-city" }),
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

  return (
    <div className="viz-container">
      {/* Map content: takes 70% width */}
      <div className="viz-main-content">
        <div className="viz-map-area single-city-map">
          <MapContainer center={[20.5937, 78.9629]} zoom={5} scrollWheelZoom={true} className="map-container">
            <ChangeView cities={cities} />
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            {cities.map(city => (
              <Marker key={city.id} position={[city.lat, city.lng]}>
                <Popup>{city.fullName}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
      {/* Sidebar: takes 30% width */}
      <aside className="viz-sidebar">
        {/* Back Button */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'flex-start' }}>
          <div className="animated-button-wrapper" onClick={onGoBack} style={{cursor: "pointer"}}>
            <div className="rotating-gradient-border"></div>
            <div className="button-inner-content" style={{padding: "0.75rem 2rem", fontSize:"1rem"}}>
              ← Back
            </div>
          </div>
        </div>
        <div>
          <h2 className="sidebar-title">Add Cities</h2>
          <p className="sidebar-subtitle">Add up to 4 cities for your route.</p>
          <div className="input-container">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter city name..."
              className="location-input"
              disabled={cities.length >= 4}
            />
            {isLoading && <div className="spinner"></div>}
          </div>
          <div className="suggestions-list">
            {suggestions.map(city => (
              <div key={city.id} className="suggestion-item" onClick={() => handleAddCity(city)}>
                {city.fullName}
              </div>
            ))}
          </div>
          <div className="added-locations-list">
            {cities.map((city, index) => (
              <div key={city.id} className="added-location-item">
                <span className="location-number">{index + 1}</span>
                <span className="location-name">{city.name}</span>
                <button onClick={() => handleRemoveCity(city.id)} className="remove-btn">×</button>
              </div>
            ))}
          </div>
          <div className="find-path-button-container">
            <div className="animated-button-wrapper">
              <div className="rotating-gradient-border"></div>
              <div onClick={handleOptimizePath} className="button-inner-content">
                Optimize Path
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default MultipleCities;