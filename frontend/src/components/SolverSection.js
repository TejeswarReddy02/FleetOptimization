import React, { useState } from 'react';
import { Loader2, Car, Clock, TrendingUp, DollarSign } from 'lucide-react';
import '../App.css';

// Placeholder MetricCard component to make the code runnable
const MetricCard = ({ icon, title, value }) => (
    <div className="metric-card">
        <div className="metric-icon">{icon}</div>
        <div className="metric-details">
            <h4 className="metric-title">{title}</h4>
            <p className="metric-value">{value}</p>
        </div>
    </div>
);

const SolverSection = () => {
    const [citiesInput, setCitiesInput] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [backendUrl, setBackendUrl] = useState('http://localhost:5000');

    const handleSolveTsp = async () => {
        setError('');
        setResult(null);
        setLoading(true);

        try {
            const cityNames = citiesInput.split(',').map(city => city.trim()).filter(city => city !== '');
            if (cityNames.length < 2) {
                setError('Please enter at least two city names.');
                setLoading(false);
                return;
            }

            const response = await fetch(`${backendUrl}/solve-tsp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cities: cityNames }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch results from the backend.');
            }

            setResult(data);
        } catch (err) {
            setError(err.message);
            console.error('API Call Error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="solver-section">
            <h2 className="section-title">Route Optimization</h2>
            <p className="section-subtitle">Input your locations and let our quantum-inspired algorithm find the optimal path.</p>
            
            <div className="input-card">
                <label className="label">Backend Server URL:</label>
                <input
                    type="text"
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.target.value)}
                    className="input-field"
                    placeholder="e.g., http://localhost:5000"
                />
            </div>

            <div className="input-card">
                <label className="label">Enter City Names (comma-separated):</label>
                <textarea
                    className="input-field textarea"
                    value={citiesInput}
                    onChange={(e) => setCitiesInput(e.target.value)}
                    placeholder="e.g., New York, London, Paris, Tokyo"
                />
                <button
                    onClick={handleSolveTsp}
                    className="cta-button"
                    disabled={loading}
                >
                    {loading ? (
                        <span className="loading-text">
                            <Loader2 className="loading-spinner" />
                            Optimizing Route...
                        </span>
                    ) : (
                        'Optimize Route'
                    )}
                </button>
            </div>

            {error && (
                <div className="error-message">
                    <p>🚨 Error: {error}</p>
                </div>
            )}

            {result && (
                <div className="results-card">
                    <h3 className="results-heading">Optimization Results</h3>
                    
                    <div className="results-group">
                        <h4 className="results-label"><Car className="results-icon" /> Optimized Route:</h4>
                        <div className="route-list">
                            {result.route.map((city, index) => (
                                <span key={index} className="city-pill">
                                    {city} {index < result.route.length - 1 && '➡️'}
                                </span>
                            ))}
                        </div>
                    </div>
                    
                    <div className="metric-grid">
                        <MetricCard
                            icon={<Car className="metric-icon" />}
                            title="Optimized Distance"
                            value={`${result.totalDistance} km`}
                        />
                        <MetricCard
                            icon={<TrendingUp className="metric-icon" />}
                            title="Distance Saved"
                            value={`${result.distanceSaved} km`}
                        />
                        <MetricCard
                            icon={<Clock className="metric-icon" />}
                            title="Time Saved"
                            value={`${result.timeSaved} mins`}
                        />
                        <MetricCard
                            icon={<DollarSign className="metric-icon" />}
                            title="Fuel Saved"
                            value={`${result.fuelSaved} L`}
                        />
                    </div>
                </div>
            )}
        </section>
    );
};

export default SolverSection;