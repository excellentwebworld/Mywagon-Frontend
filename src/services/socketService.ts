import { io, Socket } from 'socket.io-client';

export interface SocketMessagePayload {
  id?: number;
  sender_id: number | string;
  sender_type: string;
  receiver_id: number | string;
  receiver_type: string;
  message: string;
  messages_type?: string;
  duration?: string;
  shipment_id?: string | number;
  created_at?: string | Date;
  request_data?: Record<string, any>;
}

class SocketService {
  private socket: Socket | null = null;
  private currentUserId: number | string | null = null;
  private messageListeners: Set<(msg: SocketMessagePayload) => void> = new Set();
  private badgeListeners: Set<(badge: any) => void> = new Set();

  /**
   * Initialize and connect Socket.IO
   */
  public connect(userId?: number | string): Socket | null {
    if (userId) {
      this.currentUserId = userId;
    }

    if (this.socket && this.socket.connected) {
      if (this.currentUserId) {
        this.socket.emit('join_shipper', { user_id: this.currentUserId });
      }
      return this.socket;
    }

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      import.meta.env.VITE_LARAVEL_URL ||
      '';

    if (!socketUrl) {
      console.warn('VITE_SOCKET_URL is not set in environment.');
      return null;
    }

    try {
      this.socket = io(socketUrl, {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('⚡ Socket connected to:', socketUrl);
        if (this.currentUserId) {
          this.socket?.emit('join_shipper', { user_id: this.currentUserId });
        }
      });

      this.socket.on('connect_error', (err) => {
        console.warn('Socket connection note (polling/fallback active):', err.message);
      });

      this.socket.on('send_message', (data: SocketMessagePayload) => {
        this.messageListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (e) {
            console.error('Error in socket message listener:', e);
          }
        });
      });

      this.socket.on('badge_update', (data: any) => {
        this.badgeListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (e) {
            console.error('Error in socket badge listener:', e);
          }
        });
      });

      return this.socket;
    } catch (err) {
      console.warn('Failed to initialize socket client:', err);
      return null;
    }
  }

  /**
   * Set active Shipper ID and join room
   */
  public setUserId(userId: number | string): void {
    const cleanId = parseInt(String(userId).replace(/\D/g, ''), 10);
    if (!cleanId) return;
    this.currentUserId = cleanId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_shipper', { user_id: cleanId });
    } else {
      this.connect(cleanId);
    }
  }

  /**
   * Send real-time message through socket
   */
  public sendMessage(payload: SocketMessagePayload): Promise<any> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        this.connect(this.currentUserId || undefined);
      }

      const cleanSenderId = parseInt(String(payload.sender_id || this.currentUserId || '0').replace(/\D/g, ''), 10);
      const cleanReceiverId = parseInt(String(payload.receiver_id || '0').replace(/\D/g, ''), 10);
      const cleanReceiverType = (payload.receiver_type === 'company' ? 'carrier' : payload.receiver_type) || 'carrier';
      const cleanSenderType = payload.sender_type || 'shipper';

      const fullPayload = {
        ...payload,
        sender_id: cleanSenderId,
        sender_type: cleanSenderType,
        receiver_id: cleanReceiverId,
        receiver_type: cleanReceiverType,
        request_data: {
          sender_id: cleanSenderId,
          sender_name: payload.request_data?.sender_name || 'Shipper',
          sender_type: cleanSenderType,
          carrier_name: payload.request_data?.sender_name || 'Shipper',
          receiverable_type: cleanReceiverType,
          type: 'message',
          ...(payload.request_data || {}),
        },
      };

      if (this.socket && this.socket.connected) {
        this.socket.emit('send_message', fullPayload, (response: any) => {
          resolve(response);
        });
      } else {
        resolve(null);
      }
    });
  }

  /**
   * Send read message event through socket
   */
  public markAsRead(payload: {
    sender_id: number | string;
    sender_type: string;
    receiver_id: number | string;
    receiver_type: string;
  }): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('read_message', payload);
    }
  }

  /**
   * Subscribe to incoming messages
   */
  public onMessage(callback: (msg: SocketMessagePayload) => void): () => void {
    this.messageListeners.add(callback);
    return () => {
      this.messageListeners.delete(callback);
    };
  }

  /**
   * Subscribe to badge updates
   */
  public onBadgeUpdate(callback: (badge: any) => void): () => void {
    this.badgeListeners.add(callback);
    return () => {
      this.badgeListeners.delete(callback);
    };
  }

  /**
   * Subscribe to read message events
   */
  public onRead(callback: (data: any) => void): () => void {
    const handler = (data: any) => {
      try {
        callback(data);
      } catch (e) {
        console.error('Error in socket read listener:', e);
      }
    };
    if (this.socket) {
      this.socket.on('read_message', handler);
    }
    return () => {
      if (this.socket) {
        this.socket.off('read_message', handler);
      }
    };
  }

  /**
   * Disconnect socket
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
