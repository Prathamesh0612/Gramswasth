import { io } from 'socket.io-client';

// Socket.IO must connect directly to backend (bypasses Vite proxy)
// In production: VITE_SOCKET_URL = https://gramhealth-backend.onrender.com
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connectionPromise = null;
    this.connectionResolve = null;
    this.isConnected = false;
  }

  connect(token) {
    if (this.socket?.connected) {
      if (this.connectionPromise) return this.connectionPromise;
      return Promise.resolve();
    }

    // Create a promise that resolves when authenticated
    this.connectionPromise = new Promise((resolve) => {
      this.connectionResolve = resolve;
    });

    this.socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'], // polling first for reliability
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      // Authenticate strictly with JWT
      if (this.socket) {
        this.socket.emit('authenticate', { token });
      }
    });

    this.socket.on('authenticated', (data) => {
      console.log('Socket authenticated as user:', data.user_id);
      this.isConnected = true;
      if (this.connectionResolve) {
        this.connectionResolve();
        this.connectionResolve = null;
      }
    });

    this.socket.on('auth_error', (err) => {
      console.error('Socket authentication failed:', err);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.isConnected = false;
      this.connectionPromise = null;
    });

    // Re-bind dynamic listeners
    this.listeners.forEach((callback, event) => {
      this.socket.on(event, callback);
    });

    return this.connectionPromise;
  }

  waitForConnection() {
    if (this.isConnected) return Promise.resolve();
    if (this.connectionPromise) return this.connectionPromise;
    return Promise.resolve();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    this.listeners.set(event, callback);
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event) {
    this.listeners.delete(event);
    if (this.socket) {
      this.socket.off(event);
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Socket not connected. Dropping event: ${event}`);
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();
