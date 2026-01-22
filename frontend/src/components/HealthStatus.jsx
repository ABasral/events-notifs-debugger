import './HealthStatus.css';

function HealthStatus({ health }) {
  const { status, timestamp, services } = health;

  return (
    <div className="health-status">
      <div className={`overall-status ${status}`}>
        <span className="status-indicator"></span>
        <span>Overall: {status.toUpperCase()}</span>
        <span className="timestamp">{new Date(timestamp).toLocaleTimeString()}</span>
      </div>

      <div className="services-grid">
        {Object.entries(services).map(([name, info]) => (
          <div key={name} className={`service-card ${info.status}`}>
            <div className="service-header">
              <span className="status-dot"></span>
              <span className="service-name">{name}</span>
            </div>
            <div className="service-details">
              <span>Status: {info.status}</span>
              <span>Latency: {info.latencyMs}ms</span>
              {info.error && <span className="error-msg">{info.error}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HealthStatus;
