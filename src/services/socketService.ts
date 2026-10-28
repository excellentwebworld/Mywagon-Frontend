import { socketUrl as deploymentSocketUrl } from '../config/deploymentEnv';
import { io, Socket } from 'socket.io-client';
import { normalizeSocketUserType } from '../utils/chatPartnerUtils';

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
  private watchTimer: number | null = null;
  private messageListeners: Set<(msg: SocketMessagePayload) => void> = new Set();
  private badgeListeners: Set<(badge: any) => void> = new Set();
  private connectListeners: Set<() => void> = new Set();

  private joinRoom(target: Socket | null = this.socket): void {
    const id = this.currentUserId;
    if (!id || !target?.connected) return;
    target.emit('join_shipper', { user_id: id });
  }

  /** Keep the shipper room joined after a UI switch, even if the first connect is slow. */
  private ensureWatch(): void {
    if (this.watchTimer != null) return;
    this.watchTimer = window.setInterval(() => {
      if (!this.currentUserId) return;
      if (this.socket?.connected) {
        this.joinRoom();
        return;
      }
      this.connect(this.currentUserId);
    }, 3000);
  }

  /**
   * Initialize and connect Socket.IO
   */
  private resetSocket(): void {
    if (!this.socket) return;
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
  }

  /**
   * Join the shipper room. A dead connection from the previous UI is replaced
   * so live unread updates start without a refresh.
   */
  public activate(userId: number | string): void {
    const cleanId = parseInt(String(userId).replace(/\D/g, ''), 10);
    if (!cleanId) return;
    const userChanged = String(this.currentUserId ?? '') !== String(cleanId);
    this.currentUserId = cleanId;
    this.ensureWatch();

    // A switch mounts the layout while the first socket is still connecting.
    // Replacing it drops the room join, so keep the socket that is already working.
    if (!userChanged && this.socket && (this.socket.connected || this.socket.active)) {
      this.joinRoom();
      return;
    }

    this.resetSocket();
    this.connect(cleanId);
  }

  public connect(userId?: number | string): Socket | null {
    if (userId) {
      this.currentUserId = userId;
    }

    if (this.socket?.connected) {
      this.joinRoom();
      return this.socket;
    }

    if (this.socket?.active) {
      return this.socket;
    }

    if (this.socket) {
      this.resetSocket();
    }

    const socketUrl = deploymentSocketUrl();

    if (!socketUrl) {
      console.warn('VITE_SOCKET_URL is not set in environment.');
      return null;
    }

    try {
      const socket = io(socketUrl, {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 2000,
        timeout: 10000,
      });
      this.socket = socket;

      socket.on('connect', () => {
        console.log('⚡ Socket connected to:', socketUrl);
        this.joinRoom(socket);
        this.connectListeners.forEach((listener) => {
          try {
            listener();
          } catch (e) {
            console.error('Error in socket connect listener:', e);
          }
        });
      });

      socket.on('connect_error', (err) => {
        console.warn('Socket connection note (polling/fallback active):', err.message);
      });

      socket.on('send_message', (data: SocketMessagePayload) => {
        this.messageListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (e) {
            console.error('Error in socket message listener:', e);
          }
        });
      });

      socket.on('badge_update', (data: any) => {
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
    this.activate(userId);
  }

  /**
   * Send real-time message through socket
   */
  private buildOutgoingPayload(payload: SocketMessagePayload): SocketMessagePayload {
    const parsedSender = parseInt(String(payload.sender_id || '').replace(/\D/g, ''), 10) || 0;
    const joinedSender = parseInt(String(this.currentUserId || '').replace(/\D/g, ''), 10) || 0;
    const cleanSenderId = String(parsedSender || joinedSender || 0);
    const cleanReceiverId = String(
      parseInt(String(payload.receiver_id || '0').replace(/\D/g, ''), 10) || 0
    );
    const fullPayload: SocketMessagePayload = {
      ...payload,
      sender_id: cleanSenderId,
      sender_type: (payload.sender_type || 'shipper').toLowerCase(),
      receiver_id: cleanReceiverId,
      receiver_type: normalizeSocketUserType(payload.receiver_type),
      request_data: payload.request_data || {},
    };

    if (fullPayload.messages_type === 'text') {
      delete fullPayload.messages_type;
    }

    return fullPayload;
  }

  public sendMessage(payload: SocketMessagePayload): Promise<any> {
    const fullPayload = this.buildOutgoingPayload(payload);

    const emit = (socket: Socket) =>
      new Promise((resolve) => {
        let settled = false;
        const timer = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          resolve(null);
        }, 8000);
        socket.emit('send_message', fullPayload, (response: any) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          resolve(response ?? { ok: true });
        });
      });

    if (this.socket?.connected) {
      return emit(this.socket);
    }

    this.connect(this.currentUserId || undefined);
    const socket = this.socket;
    if (!socket) {
      return Promise.resolve(null);
    }
    if (socket.connected) {
      return emit(socket);
    }

    return new Promise((resolve) => {
      const giveUp = window.setTimeout(() => {
        socket.off('connect', onConnect);
        resolve(null);
      }, 8000);
      const onConnect = () => {
        window.clearTimeout(giveUp);
        void emit(socket).then(resolve);
      };
      socket.once('connect', onConnect);
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
  public onConnect(callback: () => void): () => void {
    this.connectListeners.add(callback);
    if (this.socket?.connected) callback();
    return () => {
      this.connectListeners.delete(callback);
    };
  }

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
    if (this.watchTimer != null) {
      window.clearInterval(this.watchTimer);
      this.watchTimer = null;
    }
    this.currentUserId = null;
    this.resetSocket();
  }
}

export const socketService = new SocketService();
