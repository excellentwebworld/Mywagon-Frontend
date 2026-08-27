import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  chatService,
  QUICK_TEMPLATES,
} from '../../../api/services/chatService';
import { socketService, type SocketMessagePayload } from '../../../services/socketService';
import type {
  Conversation,
  ChatMessage,
  MessageFilterType,
  ShipmentContextInfo,
  QuickTemplate,
} from '../types';
import { formatMessageTime, formatConversationTime } from '../../../utils/timezone';

export function useMessages() {
  const { showToast } = useApp();
  const { user } = useAuth();
  const { t, lang } = useTranslation();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingShipmentContext, setLoadingShipmentContext] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<MessageFilterType>('all');
  const [convSearch, setConvSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [ctxPaneOpen, setCtxPaneOpen] = useState(true);
  const [shipmentFilter, setShipmentFilter] = useState<string>('all');
  const [tplDropdownOpen, setTplDropdownOpen] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [sendErrorModalOpen, setSendErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [dynamicShipmentCtx, setDynamicShipmentCtx] = useState<ShipmentContextInfo | null>(null);

  // Active conversation reference
  const activeConvRef = useRef<Conversation | null>(null);
  // Latest partner device token (FCM) fetched from history endpoint
  const partnerDeviceTokenRef = useRef<string>('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(convSearch.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [convSearch]);

  // Connect Socket.IO on mount
  useEffect(() => {
    if (user?.id) {
      socketService.setUserId(user.id);
    } else {
      socketService.connect();
    }
  }, [user?.id]);

  // Load conversations from backend
  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const list = await chatService.getConversations('all', debouncedSearch);
      setConversations(list);

      // Auto-select first conversation or query param match if none selected
      if (list.length > 0) {
        setActiveConvId((prev) => {
          if (prev && list.some((c) => String(c.id) === String(prev))) {
            return prev;
          }
          const partnerParam = searchParams.get('partner');
          const sidParam = searchParams.get('sid');
          if (partnerParam) {
            const match = list.find((c) => String(c.id) === partnerParam || String(c.partnerId) === partnerParam || c.name.toLowerCase().includes(partnerParam.toLowerCase()));
            if (match) return match.id;
          }
          if (sidParam) {
            const match = list.find((c) => c.chips?.includes(sidParam) || c.latestSid === sidParam);
            if (match) return match.id;
          }
          return list[0].id;
        });
      } else {
        setActiveConvId(null);
        setMessages([]);
      }
    } catch (err) {
      console.warn('Error loading conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [debouncedSearch, searchParams]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // Active conversation memo
  const activeConversation = useMemo(() => {
    const found = conversations.find((c) => String(c.id) === String(activeConvId)) || null;
    activeConvRef.current = found;
    return found;
  }, [conversations, activeConvId]);

  // Listen to incoming real-time socket messages
  useEffect(() => {
    const unsubscribe = socketService.onMessage((incoming: SocketMessagePayload) => {
      const active = activeConvRef.current;
      const activePartnerId = parseInt(String(active?.partnerId || active?.id || '0').replace(/\D/g, ''), 10);
      const incomingSenderId = parseInt(String(incoming.sender_id || (incoming as any).senderable_id || '0').replace(/\D/g, ''), 10);
      const incomingReceiverId = parseInt(String(incoming.receiver_id || (incoming as any).receiverable_id || '0').replace(/\D/g, ''), 10);
      const myId = parseInt(String(user?.id || '0'), 10);
      const incomingSenderType = (incoming.sender_type || (incoming as any).senderable_type || 'carrier').toLowerCase();
      const activePartnerType = (active?.partnerType || (active?.type === 'company' ? 'carrier' : active?.type) || 'carrier').toLowerCase();

      // Detect if this is a message received FROM the active partner (incoming from them)
      const isFromActivePartner = Boolean(
        activePartnerId > 0 &&
        incomingSenderId === activePartnerId &&
        (
          incomingSenderType === activePartnerType ||
          (incomingSenderType === 'carrier' && activePartnerType === 'company') ||
          (incomingSenderType === 'company' && activePartnerType === 'carrier')
        )
      );

      // Detect if this is a server echo of OUR OWN sent message (socket server echoes back to sender too)
      // In this case sender_id == myId and receiver_id == partner_id
      const isOwnMessageEcho = Boolean(
        myId > 0 &&
        incomingSenderId === myId &&
        activePartnerId > 0 &&
        incomingReceiverId === activePartnerId
      );

      // Only append to the chat thread if it's from the partner (not our own echo which REST API already handled)
      if (isFromActivePartner) {
        const timeFormatted = formatMessageTime(incoming.created_at || new Date());

        const isVoice = incoming.messages_type === 'voice' || (incoming.message && incoming.message.includes('chat-voices'));

        const newMsg: ChatMessage = {
          id: incoming.id || Date.now(),
          type: 'received',
          sender: active?.name || 'Partner',
          initials: active?.initials || 'P',
          time: timeFormatted,
          created_at: typeof incoming.created_at === 'string' ? incoming.created_at : new Date().toISOString(),
          text: incoming.message,
          messages_type: isVoice ? 'voice' : ((incoming.messages_type as any) || 'text'),
          voiceUrl: isVoice ? incoming.message : undefined,
          duration: incoming.duration,
          shipmentId: incoming.shipment_id ? String(incoming.shipment_id) : undefined,
        };

        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id || (m.text === newMsg.text && m.time === newMsg.time && m.type === 'received'))) {
            return prev;
          }
          return [...prev, newMsg];
        });

        if (activePartnerId) {
          void chatService.markAsRead(activePartnerId, activePartnerType);
          socketService.markAsRead({
            sender_id: user?.id || 0,
            sender_type: 'shipper',
            receiver_id: activePartnerId,
            receiver_type: activePartnerType,
          });
        }
      }

      // Handle own voice note echo from socket server:
      // Laravel shows own voice via socket echo (server broadcasts back to sender room too).
      // When we receive our own voice echo, update the temp blob URL to the real S3 URL.
      // This ensures the player has a persistent URL even if the ack arrived out of order.
      if (isOwnMessageEcho) {
        const isVoiceEcho = incoming.messages_type === 'voice' ||
          (incoming.message && (incoming.message.includes('chat-voices') || /\.(webm|m4a|mp3|wav|ogg|caf)/i.test(incoming.message)));
        if (isVoiceEcho && incoming.message && incoming.message.startsWith('http')) {
          // Replace any temp blob voice message that still has a blob URL with the real S3 URL
          setMessages((prev) =>
            prev.map((m) => {
              if (m.type === 'sent' && m.messages_type === 'voice' && m.voiceUrl && m.voiceUrl.startsWith('blob:')) {
                return { ...m, voiceUrl: incoming.message, text: incoming.message };
              }
              return m;
            })
          );
        }
      }

      // Update conversation last message preview and unread count
      // For incoming messages from partner: update preview + increment unread if not in active chat
      // For our own echoed messages: don't change unread
      setConversations((prev) =>
        prev.map((c) => {
          const cPartnerId = parseInt(String(c.partnerId || c.id || '0').replace(/\D/g, ''), 10);
          if (isFromActivePartner && cPartnerId > 0 && cPartnerId === incomingSenderId) {
            const isVoice = incoming.messages_type === 'voice' || (incoming.message && incoming.message.includes('chat-voices'));
            const preview = isVoice ? `🎙️ ${t('chatModule.voiceNote') || 'Voice note'}` : incoming.message;
            return {
              ...c,
              lastMsg: preview,
              lastTime: 'Just now',
              unread: isOwnMessageEcho ? 0 : (isFromActivePartner ? 0 : c.unread + 1),
            };
          }
          return c;
        })
      );
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, t]);

  // Load active conversation messages dynamically when activeConvId changes
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      setDynamicShipmentCtx(null);
      setLoadingMessages(false);
      setLoadingShipmentContext(false);
      return;
    }

    const currentConv = conversations.find((c) => String(c.id) === String(activeConvId));
    if (!currentConv) return;

    let mounted = true;
    const partnerType = currentConv.partnerType || (currentConv.type === 'company' ? 'carrier' : 'driver');
    const partnerId = currentConv.partnerId || currentConv.id;

    // Seed device_token from conversation data immediately
    partnerDeviceTokenRef.current = currentConv.device_token || '';

    setLoadingMessages(true);
    chatService
      .getMessages(partnerId, partnerType)
      .then(({ messages: msgs, device_token }) => {
        if (mounted) {
          setMessages(msgs);
          setLoadingMessages(false);
          // Update device token from history endpoint (more reliable, always fresh)
          if (device_token) {
            partnerDeviceTokenRef.current = device_token;
            // Also update the conversation in state so it's available for sending
            setConversations((prev) =>
              prev.map((c) =>
                String(c.id) === String(activeConvId) ? { ...c, device_token } : c
              )
            );
          }
        }
      })
      .catch(() => {
        if (mounted) setLoadingMessages(false);
      });

    // Mark as read in list & DB & Socket without infinite render loop
    if (currentConv.unread > 0) {
      setConversations((prev) =>
        prev.map((c) => (String(c.id) === String(activeConvId) ? { ...c, unread: 0 } : c))
      );
    }

    void chatService.markAsRead(partnerId, partnerType);
    socketService.markAsRead({
      sender_id: user?.id || 0,
      sender_type: 'shipper',
      receiver_id: partnerId,
      receiver_type: partnerType,
    });

    // Load dynamic shipment context if latest SID is present
    const sid = currentConv.latestSid || currentConv.activeShipmentId;
    if (sid) {
      setLoadingShipmentContext(true);
      chatService
        .getShipmentContext(sid)
        .then((ctx) => {
          if (mounted) {
            setDynamicShipmentCtx(ctx);
            setLoadingShipmentContext(false);
          }
        })
        .catch(() => {
          if (mounted) setLoadingShipmentContext(false);
        });
    } else {
      setDynamicShipmentCtx(null);
      setLoadingShipmentContext(false);
    }

    return () => {
      mounted = false;
    };
  }, [activeConvId, user?.id]);

  // Total unread count
  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unread > 0 ? c.unread : 0), 0);
  }, [conversations]);

  // Filtered conversations list (Deep Search across name, SIDs, messages, and type labels)
  const filteredConversations = useMemo(() => {
    let list = [...conversations];
    const q = convSearch.trim().toLowerCase();

    if (currentFilter === 'unread') {
      list = list.filter((c) => c.unread > 0);
    } else if (currentFilter === 'carrier') {
      list = list.filter((c) => c.type === 'company');
    } else if (currentFilter === 'freelancer') {
      list = list.filter((c) => c.type === 'freelancer');
    } else if (currentFilter === 'partner') {
      list = list.filter((c) => c.isPartner);
    }

    if (q) {
      list = list.filter((c) => {
        // Match type labels exactly as Laravel's data-search: Company / Freelancer / Company Driver
        const typeLabel = c.type === 'company' ? 'company' :
          c.type === 'driver' ? 'company driver' :
          c.type === 'freelancer' ? 'freelancer' : '';

        return (
          c.name.toLowerCase().includes(q) ||
          (c.lastMsg && c.lastMsg.toLowerCase().includes(q)) ||
          (c.latestSid && c.latestSid.toLowerCase().includes(q)) ||
          (Array.isArray(c.chips) && c.chips.some((ch) => ch.toLowerCase().includes(q))) ||
          typeLabel.includes(q)
        );
      });
    }

    return list;
  }, [conversations, currentFilter, convSearch]);

  // Filtered messages in active thread (by shipment if selected)
  const filteredMessages = useMemo(() => {
    if (shipmentFilter === 'all') return messages;
    return messages.filter((m) => !m.shipmentId || m.shipmentId === shipmentFilter);
  }, [messages, shipmentFilter]);

  // Select conversation
  const selectConversation = useCallback((id: number | string) => {
    setActiveConvId(id);
    setMobileChatOpen(true);
    setTplDropdownOpen(false);
    setShipmentFilter('all');
  }, []);

  // Back button on mobile
  const handleMobileBack = useCallback(() => {
    setMobileChatOpen(false);
  }, []);

  // Send text message
  const handleSendMessage = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText !== undefined ? overrideText : messageInput).trim();
      if (!text || !activeConvId || !activeConversation) return;

      const now = new Date();
      const timeStr = formatMessageTime(now);
      const msgTempId = Date.now();
      const sid = activeConversation.latestSid || activeConversation.activeShipmentId;

      const newMsg: ChatMessage = {
        id: msgTempId,
        type: 'sent',
        sender: 'You',
        initials: 'ΗΕ',
        time: timeStr,
        created_at: now.toISOString(),
        text,
        status: 'delivered',
        shipmentId: sid,
      };

      setMessages((prev) => [...prev, newMsg]);
      setMessageInput('');

      // Update last message in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          String(c.id) === String(activeConvId)
            ? { ...c, lastMsg: text, lastTime: formatConversationTime(now), lastTimestamp: Math.floor(now.getTime() / 1000) }
            : c
        )
      );

      const receiverId = parseInt(String(activeConversation.partnerId || activeConversation.id).replace(/\D/g, ''), 10);
      const receiverType = (activeConversation.partnerType || (activeConversation.type === 'company' ? 'carrier' : activeConversation.type) || 'carrier').toLowerCase();
      const currentSenderName = user?.company_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Shipper';
      const partnerName = activeConversation.name || 'Partner';
      const partnerImg = activeConversation.avatarUrl || '';
      // Use device_token fetched from history endpoint (guaranteed fresh FCM token)
      const partnerToken = partnerDeviceTokenRef.current || activeConversation.device_token || '';

      try {
        const sentRes = await chatService.sendMessage({
          receiver_id: receiverId,
          receiver_type: receiverType,
          message: text,
          messages_type: 'text',
          shipment_id: sid,
        });

        // Emit via socket for real-time delivery + Firebase push notifications
        void socketService.sendMessage({
          sender_id: user?.id || 0,
          sender_type: 'shipper',
          receiver_id: receiverId,
          receiver_type: receiverType,
          message: text,
          messages_type: 'text',
          shipment_id: sid,
          request_data: {
            sender_id: user?.id || 0,
            sender_name: currentSenderName,
            sender_type: 'shipper',
            sender_img: user?.profile_picture || '',
            receiverable_token: partnerToken,
            senderable_token: '',
            carrier_id: receiverId,
            chat_type: receiverType,
            carrier_name: partnerName,
            carrier_picture: partnerImg,
            receiverable_type: receiverType,
            type: 'message',
          },
        });

        if (sentRes && sentRes.id) {
          setMessages((prev) =>
            prev.map((m) => (m.id === msgTempId ? {
              ...m,
              id: sentRes.id,
              created_at: sentRes.created_at || m.created_at,
              status: 'delivered',
              time: m.time,
            } : m))
          );
        }
      } catch {
        setErrorMessage(t('chatModule.messageSendFailed') || 'Message failed to send. Please check your connection and try again.');
        setSendErrorModalOpen(true);
        setMessages((prev) =>
          prev.map((m) => (m.id === msgTempId ? { ...m, isFailed: true } : m))
        );
      }
    },
    [messageInput, activeConvId, activeConversation, user, t]
  );

  // Send Voice Note
  const handleSendVoiceNote = useCallback(
    async (audioBlob: Blob, durationMsStr: string) => {
      if (!activeConvId || !activeConversation) return;

      // durationMsStr is milliseconds string from ChatComposer (e.g. "14000")
      // Validate it — same guard as Laravel's recordedDuration check
      const durationMs = parseInt(durationMsStr, 10);
      const validDurationMs = (Number.isFinite(durationMs) && durationMs > 0) ? durationMs : 5000;
      const durationMsSend = String(validDurationMs); // what goes to socket + API

      // Human-readable display for UI (convert ms to M:SS)
      const durationSec = validDurationMs / 1000;
      const durationDisplay = (() => {
        const m = Math.floor(durationSec / 60).toString().padStart(2, '0');
        const s = Math.floor(durationSec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
      })();

      const now = new Date();
      const timeStr = formatMessageTime(now);
      const msgTempId = Date.now();
      const sid = activeConversation.latestSid || activeConversation.activeShipmentId;
      const localAudioUrl = URL.createObjectURL(audioBlob);

      const newMsg: ChatMessage = {
        id: msgTempId,
        type: 'sent',
        sender: 'You',
        initials: 'ΗΕ',
        time: timeStr,
        created_at: now.toISOString(),
        text: localAudioUrl,
        messages_type: 'voice',
        voiceUrl: localAudioUrl,
        duration: durationMsSend, // ms string — VoicePlayer.sanitizeDuration handles this
        status: 'delivered',
        shipmentId: sid,
      };

      setMessages((prev) => [...prev, newMsg]);

      // Update conversation last message preview with voice icon
      setConversations((prev) =>
        prev.map((c) =>
          String(c.id) === String(activeConvId)
            ? { ...c, lastMsg: `🎙️ ${t('chatModule.voiceNote') || 'Voice note'} (${durationDisplay})`, lastTime: formatConversationTime(now), lastTimestamp: Math.floor(now.getTime() / 1000) }
            : c
        )
      );

      const receiverId = parseInt(String(activeConversation.partnerId || activeConversation.id).replace(/\D/g, ''), 10);
      const receiverType = (activeConversation.partnerType || (activeConversation.type === 'company' ? 'carrier' : activeConversation.type) || 'carrier').toLowerCase();
      const currentSenderName = user?.company_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Shipper';
      const partnerName = activeConversation.name || 'Partner';
      const partnerImg = activeConversation.avatarUrl || '';
      // Use device_token fetched from history endpoint (guaranteed fresh FCM token)
      const partnerToken = partnerDeviceTokenRef.current || activeConversation.device_token || '';

      try {
        const uploadRes = await chatService.uploadVoice(audioBlob);
        const uploadedUrl = uploadRes?.url || localAudioUrl;

        const sentRes = await chatService.sendMessage({
          receiver_id: receiverId,
          receiver_type: receiverType,
          message: uploadedUrl,
          messages_type: 'voice',
          duration: durationMsSend, // milliseconds string — same as Laravel
          shipment_id: sid,
        });

        // Also emit via socket with full Firebase metadata
        // duration sent as ms string — matches exactly what Laravel chat_history.js sends
        void socketService.sendMessage({
          sender_id: user?.id || 0,
          sender_type: 'shipper',
          receiver_id: receiverId,
          receiver_type: receiverType,
          message: uploadedUrl,
          messages_type: 'voice',
          duration: durationMsSend,
          shipment_id: sid,
          request_data: {
            sender_id: user?.id || 0,
            sender_name: currentSenderName,
            sender_type: 'shipper',
            sender_img: user?.profile_picture || '',
            receiverable_token: partnerToken,
            senderable_token: '',
            carrier_id: receiverId,
            chat_type: receiverType,
            carrier_name: partnerName,
            carrier_picture: partnerImg,
            receiverable_type: receiverType,
            type: 'message',
          },
        });

        if (sentRes && sentRes.id) {
          // Update the temp message with the real server ID and the uploaded S3 URL
          setMessages((prev) =>
            prev.map((m) => (m.id === msgTempId ? { ...m, id: sentRes.id, voiceUrl: uploadedUrl, text: uploadedUrl, status: 'delivered' } : m))
          );
        } else {
          // Update URL even without server ID (at least show real URL instead of blob)
          setMessages((prev) =>
            prev.map((m) => (m.id === msgTempId ? { ...m, voiceUrl: uploadedUrl, text: uploadedUrl, status: 'delivered' } : m))
          );
        }

        showToast(`🎙️ ${t('chatModule.voiceSent') || 'Voice note sent'}`, 'success');
      } catch {
        setErrorMessage(t('chatModule.messageSendFailed') || 'Message failed to send. Please check your connection and try again.');
        setSendErrorModalOpen(true);
        setMessages((prev) =>
          prev.map((m) => (m.id === msgTempId ? { ...m, isFailed: true } : m))
        );
      }
    },
    [activeConvId, activeConversation, user, t, showToast]
  );

  // Send Attachment
  const handleAttachFile = useCallback(
    async (file: File) => {
      if (!activeConvId || !activeConversation) return;

      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const msgTempId = Date.now();
      const sid = activeConversation.latestSid || activeConversation.activeShipmentId;

      const newMsg: ChatMessage = {
        id: msgTempId,
        type: 'sent',
        sender: 'You',
        initials: 'ΗΕ',
        time: timeStr,
        created_at: now.toISOString(),
        text: file.name,
        attachments: [
          {
            name: file.name,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            url: URL.createObjectURL(file),
          },
        ],
        status: 'delivered',
        shipmentId: sid,
      };

      setMessages((prev) => [...prev, newMsg]);

      setConversations((prev) =>
        prev.map((c) =>
          String(c.id) === String(activeConvId)
            ? { ...c, lastMsg: `📎 ${file.name}`, lastTime: formatConversationTime(now), lastTimestamp: Math.floor(now.getTime() / 1000) }
            : c
        )
      );

      const receiverId = parseInt(String(activeConversation.partnerId || activeConversation.id).replace(/\D/g, ''), 10);
      const receiverType = (activeConversation.partnerType || (activeConversation.type === 'company' ? 'carrier' : activeConversation.type) || 'carrier').toLowerCase();
      const currentSenderName = user?.company_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Shipper';
      const partnerName = activeConversation.name || 'Partner';
      const partnerImg = activeConversation.avatarUrl || '';
      // Use device_token fetched from history endpoint (guaranteed fresh FCM token)
      const partnerToken = partnerDeviceTokenRef.current || activeConversation.device_token || '';

      try {
        let uploadedUrl = '';
        try {
          const uploadRes = await chatService.uploadAttachment(file);
          if (uploadRes?.url) {
            uploadedUrl = uploadRes.url;
          }
        } catch {
          // fallback
        }

        await chatService.sendMessage({
          receiver_id: receiverId,
          receiver_type: receiverType,
          message: uploadedUrl || file.name,
          messages_type: 'media',
          shipment_id: sid,
        });

        void socketService.sendMessage({
          sender_id: user?.id || 0,
          sender_type: 'shipper',
          receiver_id: receiverId,
          receiver_type: receiverType,
          message: uploadedUrl || file.name,
          messages_type: 'media',
          shipment_id: sid,
          request_data: {
            sender_id: user?.id || 0,
            sender_name: currentSenderName,
            sender_type: 'shipper',
            sender_img: user?.profile_picture || '',
            receiverable_token: partnerToken,
            senderable_token: '',
            carrier_id: receiverId,
            chat_type: receiverType,
            carrier_name: partnerName,
            carrier_picture: partnerImg,
            receiverable_type: receiverType,
            type: 'message',
          },
        });

        showToast(`📎 ${t('chatModule.toastAttach') || 'Attached'}: ${file.name}`, 'success');
      } catch {
        setErrorMessage(t('chatModule.messageSendFailed') || 'Message failed to send. Please check your connection and try again.');
        setSendErrorModalOpen(true);
        setMessages((prev) =>
          prev.map((m) => (m.id === msgTempId ? { ...m, isFailed: true } : m))
        );
      }
    },
    [activeConvId, activeConversation, user, t, showToast]
  );

  // Retry sending failed message
  const handleRetryMessage = useCallback(
    async (failedMsg: ChatMessage) => {
      if (!failedMsg.text || !activeConvId || !activeConversation) return;

      setMessages((prev) =>
        prev.map((m) => (m.id === failedMsg.id ? { ...m, isFailed: false } : m))
      );

      const receiverId = activeConversation.partnerId || activeConversation.id;
      const receiverType = activeConversation.partnerType || (activeConversation.type === 'company' ? 'carrier' : 'driver');

      try {
        await chatService.sendMessage({
          receiver_id: receiverId,
          receiver_type: receiverType,
          message: failedMsg.text,
          messages_type: failedMsg.messages_type || 'text',
          duration: failedMsg.duration,
          shipment_id: failedMsg.shipmentId,
        });
        showToast(t('chatModule.messageSent') || 'Message sent', 'success');
      } catch {
        setErrorMessage(t('chatModule.messageSendFailed') || 'Message failed to send. Please check your connection and try again.');
        setSendErrorModalOpen(true);
        setMessages((prev) =>
          prev.map((m) => (m.id === failedMsg.id ? { ...m, isFailed: true } : m))
        );
      }
    },
    [activeConvId, activeConversation, t, showToast]
  );

  // Insert template text into message composer
  const handleUseTemplate = useCallback(
    (template: QuickTemplate) => {
      const rawText = t(`chatModule.${template.textKey}`);
      const partnerName = activeConversation?.name || 'Partner';
      const sid = dynamicShipmentCtx?.sid || activeConversation?.latestSid || 'SID-77478';
      const origin = dynamicShipmentCtx?.origin || 'Athens';
      const dest = dynamicShipmentCtx?.destination || 'Thessaloniki';
      const pTime = dynamicShipmentCtx?.pickupTime || '10:00';
      const dTime = dynamicShipmentCtx?.deliveryTime || '15:00';

      const interpolated = rawText
        .replace(/{PartnerName}/g, partnerName)
        .replace(/{SID}/g, sid)
        .replace(/{PickupLocation}/g, origin)
        .replace(/{PickupTime}/g, pTime)
        .replace(/{DeliveryLocation}/g, dest)
        .replace(/{DeliveryTime}/g, dTime);

      setMessageInput(interpolated);
      setTplDropdownOpen(false);
    },
    [t, activeConversation, dynamicShipmentCtx]
  );

  return {
    t,
    lang,
    conversations,
    activeConvId,
    activeConversation,
    activeShipmentContext: dynamicShipmentCtx,
    messages: filteredMessages,
    loadingConversations,
    loadingMessages,
    loadingShipmentContext,
    currentFilter,
    setCurrentFilter,
    convSearch,
    setConvSearch,
    filteredConversations,
    totalUnreadCount,
    isTyping,
    ctxPaneOpen,
    toggleCtxPane: () => setCtxPaneOpen((prev) => !prev),
    shipmentFilter,
    setShipmentFilter,
    tplDropdownOpen,
    toggleTemplates: () => setTplDropdownOpen((prev) => !prev),
    closeTemplates: () => setTplDropdownOpen(false),
    messageInput,
    setMessageInput,
    mobileChatOpen,
    selectConversation,
    handleMobileBack,
    handleSendMessage,
    handleSendVoiceNote,
    handleAttachFile,
    handleRetryMessage,
    handleUseTemplate,
    showToast,
    sendErrorModalOpen,
    closeSendErrorModal: () => setSendErrorModalOpen(false),
    errorMessage,
    templates: QUICK_TEMPLATES,
    refreshConversations: loadConversations,
  };
}
