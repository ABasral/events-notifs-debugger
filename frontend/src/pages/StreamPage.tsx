import React, { useEffect } from 'react';
import { LiveStream } from '../components/LiveStream';
import { wsClient } from '../api/websocket';
import { useAppStore } from '../stores/app-store';

export function StreamPage() {
  const addLiveStep = useAppStore((s) => s.addLiveStep);
  const setStreamConnected = useAppStore((s) => s.setStreamConnected);
  const clearLiveSteps = useAppStore((s) => s.clearLiveSteps);
  
  useEffect(() => {
    // Connect WebSocket
    wsClient.connect();
    
    // Subscribe to messages
    const unsubscribe = wsClient.subscribe((message) => {
      if (message.type === 'connected') {
        setStreamConnected(true);
      } else if (message.type === 'trace_step') {
        addLiveStep(message.data);
      }
    });
    
    // Check connection status periodically
    const checkInterval = setInterval(() => {
      setStreamConnected(wsClient.isConnected());
    }, 1000);
    
    return () => {
      unsubscribe();
      clearInterval(checkInterval);
    };
  }, []);
  
  return (
    <div className="h-[calc(100vh-12rem)]">
      <LiveStream />
      
      <div className="mt-4 flex gap-4">
        <button
          onClick={() => clearLiveSteps()}
          className="btn btn-secondary"
        >
          Clear Stream
        </button>
      </div>
    </div>
  );
}
