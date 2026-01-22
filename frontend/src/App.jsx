import { useState, useEffect } from 'react';
import { getHealthDetailed } from './services/api.js';
import HealthStatus from './components/HealthStatus.jsx';
import './App.css';

function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const data = await getHealthDetailed();
        setHealth(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔍 Event & Notification Debugger</h1>
        <p className="subtitle">Growth Engineering Observability Console</p>
      </header>

      <main className="app-main">
        <section className="section">
          <h2>System Health</h2>
          {loading && <p className="loading">Loading...</p>}
          {error && <p className="error">Error: {error}</p>}
          {health && <HealthStatus health={health} />}
        </section>

        <section className="section placeholder">
          <h2>Coming Soon</h2>
          <ul>
            <li>📊 Event Trace Viewer</li>
            <li>🔔 Notification Pipeline Inspector</li>
            <li>👥 User Fanout Debugger</li>
            <li>📈 Real-time Event Stream</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

export default App;
