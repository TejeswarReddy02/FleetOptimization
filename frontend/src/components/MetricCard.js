import React from 'react';
import '../App.css';

const MetricCard = ({ icon, title, value }) => {
    return (
        <div className="metric-card">
            <div className="metric-header">
                {icon}
                <h4 className="metric-title">{title}</h4>
            </div>
            <p className="metric-value">{value}</p>
        </div>
    );
};

export default MetricCard;