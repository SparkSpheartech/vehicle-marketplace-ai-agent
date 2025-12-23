import { useState, useEffect, useRef, useCallback } from 'react';

const WS_BASE_URL = process.env.REACT_APP_BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://') || 'ws://localhost:8001';

export const useWebSocket = (sessionToken) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!sessionToken) {
      console.log('[WS] No session token, skipping connection');
      return;
    }

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `${WS_BASE_URL}/ws/${sessionToken}`;
    console.log('[WS] Connecting to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WS] Message received:', data.type);
          setLastMessage(data);
        } catch (e) {
          console.error('[WS] Failed to parse message:', e);
        }
      };

      ws.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
      };
    } catch (e) {
      console.error('[WS] Connection failed:', e);
    }
  }, [sessionToken]);

  // Connect when token is available
  useEffect(() => {
    if (sessionToken) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionToken, connect]);

  // Send message function
  const sendMessage = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    console.warn('[WS] Cannot send - not connected');
    return false;
  }, []);

  // Send chat message
  const sendChatMessage = useCallback((squadId, content, messageType = 'text') => {
    return sendMessage({
      type: 'chat_message',
      squad_id: squadId,
      content,
      message_type: messageType
    });
  }, [sendMessage]);

  // Send location update
  const sendLocationUpdate = useCallback((location, speed = 0) => {
    return sendMessage({
      type: 'location_update',
      location,
      speed
    });
  }, [sendMessage]);

  // Ping to keep connection alive
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'ping' });
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [sendMessage]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    sendChatMessage,
    sendLocationUpdate,
    websocket: wsRef.current
  };
};

export default useWebSocket;
