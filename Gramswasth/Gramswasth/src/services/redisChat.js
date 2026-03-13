/**
 * Redis-based chat system (no Socket.IO)
 * - Polls for new messages every 1-2 seconds
 * - Stores messages locally when offline
 * - Syncs when back online
 */

const POLL_INTERVAL = 1000; // Check for messages every 1 second

class RedisChatService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.pollTimers = {};
    this.localMessageQueue = [];
    this.callbacks = {};
    this.lastMessageId = {};
    this.loadLocalQueue();
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('✅ Online - syncing messages...');
      this.syncLocalQueue();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('⚠️ Offline - messages will sync when back online');
    });
  }

  // Register callback for new messages in a consultation
  onMessage(consultationId, callback) {
    if (!this.callbacks[consultationId]) {
      this.callbacks[consultationId] = [];
      this.startPolling(consultationId);
    }
    this.callbacks[consultationId].push(callback);
  }

  // Start polling for new messages
  startPolling(consultationId) {
    if (this.pollTimers[consultationId]) return;
    if (!this.seenMessageIds) this.seenMessageIds = {};
    if (!this.seenMessageIds[consultationId]) this.seenMessageIds[consultationId] = new Set();
    
    const poll = async () => {
      if (!consultationId || consultationId === 'undefined') return;
      if (this.isOnline) {
        try {
          const res = await fetch(`http://localhost:5000/api/consultations/${consultationId}/messages`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
            const data = await res.json();
            const messages = data.data || [];
            
            // Process only new messages
            messages.forEach(msg => {
              if (!this.seenMessageIds[consultationId].has(msg.id)) {
                this.seenMessageIds[consultationId].add(msg.id);
                this.executeCallbacks(consultationId, msg);
              }
            });
          }
        } catch (e) {
          console.warn('Polling error:', e);
          this.isOnline = false;
        }
      }
      this.pollTimers[consultationId] = setTimeout(poll, POLL_INTERVAL);
    };
    poll();
  }

  // Stop polling
  stopPolling(consultationId) {
    if (this.pollTimers[consultationId]) {
      clearTimeout(this.pollTimers[consultationId]);
      delete this.pollTimers[consultationId];
    }
  }

  // Send message (queue if offline, send if online)
  async sendMessage(consultationId, payload) {
    const message = {
      consultation_id: consultationId,
      ...payload,
      timestamp: new Date().toISOString()
    };

    if (!this.isOnline) {
      // Queue locally
      this.localMessageQueue.push(message);
      this.saveLocalQueue();
      console.log('📱 Message queued (offline):', message);
      return { success: true, offline: true };
    }

    try {
      const res = await fetch(`http://localhost:5000/api/consultations/${consultationId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(message)
      });
      
      if (res.ok) {
        console.log('✅ Message sent via Redis');
        return { success: true, offline: false };
      } else {
        this.localMessageQueue.push(message);
        this.saveLocalQueue();
        return { success: true, offline: true };
      }
    } catch (e) {
      this.localMessageQueue.push(message);
      this.saveLocalQueue();
      console.warn('Send failed, queued locally:', e);
      return { success: true, offline: true };
    }
  }

  // Execute all callbacks for a message
  executeCallbacks(consultationId, message) {
    if (this.callbacks[consultationId]) {
      this.callbacks[consultationId].forEach(cb => {
        try {
          cb(message);
        } catch (e) {
          console.error('Callback error:', e);
        }
      });
    }
  }

  // Sync queued messages when back online
  async syncLocalQueue() {
    if (!this.isOnline || this.localMessageQueue.length === 0) return;

    const queue = [...this.localMessageQueue];
    this.localMessageQueue = [];
    
    for (const message of queue) {
      try {
        const res = await fetch(`http://localhost:5000/api/consultations/${message.consultation_id}/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(message)
        });
        if (!res.ok) {
          this.localMessageQueue.push(message);
        } else {
          console.log('✅ Synced:', message.text);
        }
      } catch (e) {
        this.localMessageQueue.push(message);
        console.warn('Sync error, will retry:', e);
      }
    }
    
    this.saveLocalQueue();
    if (this.localMessageQueue.length > 0) {
      console.log(`⚠️ ${this.localMessageQueue.length} messages still queued`);
    }
  }

  // Local storage
  saveLocalQueue() {
    localStorage.setItem('messageQueue', JSON.stringify(this.localMessageQueue));
  }

  loadLocalQueue() {
    try {
      const queued = localStorage.getItem('messageQueue');
      this.localMessageQueue = queued ? JSON.parse(queued) : [];
    } catch (e) {
      this.localMessageQueue = [];
    }
  }

  // Cleanup
  destroy(consultationId) {
    this.stopPolling(consultationId);
    delete this.callbacks[consultationId];
    delete this.lastMessageId[consultationId];
  }
}

export default new RedisChatService();
