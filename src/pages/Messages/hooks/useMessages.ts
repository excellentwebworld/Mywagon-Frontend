import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  chatService,
  QUICK_TEMPLATES,
  extractInitials,
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
import { setActiveChatPartner } from '../../../utils/chatNotificationGuard';
import {
  buildLaravelChatRequestData,
  getChatMessagePreview,
  getShipperDeviceToken,
  isIncomingChatToShipper,
  isMessageFromPartner,
  parsePartnerId,
  resolveActivePartnerType,
  resolveSocketReceiverType,
} from '../../../utils/chatPartnerUtils';

function buildShipperSocketChatPayload(params: {
  user: {
    id?: number | string;
    company_name?: string;
    first_name?: string;
    last_name?: string;
    profile_picture?: string | null;
  };
  conversation: Conversation;
  partnerToken: string;
  message: string;
  messagesType?: 'voice' | 'media';
  duration?: string;
}): SocketMessagePayload {
  const receiverId = parsePartnerId(params.conversation.partnerId || params.conversation.id);
  const receiverType = resolveSocketReceiverType(params.conversation);
  const senderId = parsePartnerId(params.user.id);
  const senderName =
    params.user.company_name ||
    `${params.user.first_name || ''} ${params.user.last_name || ''}`.trim() ||
    'Shipper';

  return {
    sender_id: String(senderId),
    sender_type: 'shipper',
    receiver_id: String(receiverId),
    receiver_type: receiverType,
    message: params.message,
    ...(params.messagesType ? { messages_type: params.messagesType } : {}),
    ...(params.duration ? { duration: params.duration } : {}),
    request_data: buildLaravelChatRequestData({
      senderId: String(senderId),
      senderName,
      senderType: 'shipper',
      senderImg: params.user.profile_picture || '',
      receiverableToken: params.partnerToken,
      senderableToken: getShipperDeviceToken(),
    }),
  };
}

function dedupeMessages(msgs: ChatMessage[]): ChatMessage[] {
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();
  return msgs.filter((m) => {
    if (m.type === 'date' || m.type === 'system') return true;
    if (m.id != null) {
      const idKey = `id:${m.id}`;
      if (seenIds.has(idKey)) return false;
      seenIds.add(idKey);
    }
    const contentKey = `c:${m.type}:${m.text}:${m.time}:${m.messages_type ?? 'text'}`;
    if (seenContent.has(contentKey)) return false;
    seenContent.add(contentKey);
    return true;
  });
}

export function useMessages() {
  const { showToast } = useApp();
  const { user } = useAuth();
  const { t, lang } = useTranslation();

  const userInitials = useMemo(() => {
    const first = (user?.first_name || '').trim();
    const last = (user?.last_name || '').trim();
    if (first || last) {
      const i1 = first ? Array.from(first)[0] : '';
      const i2 = last ? Array.from(last)[0] : '';
      const combined = `${i1}${i2}`.trim().toUpperCase();
      if (combined) return combined;
    }
    if (user?.company_name?.trim()) {
      return extractInitials(user.company_name);
    }
    return 'SV';
  }, [user?.first_name, user?.last_name, user?.company_name]);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const locationState = location.state as {
    userId?: number | string;
    userType?: 'carrier' | 'driver';
    userName?: string;
    userAvatar?: string;
    sid?: string;
  } | null;

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

  // Connect Socket.IO when on messages page (global connect also runs from AppLayout)
  useEffect(() => {
    if (user?.id) {
      socketService.setUserId(user.id);
    }
  }, [user?.id]);

  // Load conversations from backend
  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const list = await chatService.getConversations('all', debouncedSearch);

      const targetUserId =
        searchParams.get('userId') ||
        searchParams.get('partner') ||
        (locationState?.userId ? String(locationState.userId) : null);
      const targetUserType =
        searchParams.get('userType') ||
        locationState?.userType ||
        'carrier';
      const targetUserName =
        searchParams.get('name') ||
        locationState?.userName ||
        '';
      const targetUserAvatar =
        searchParams.get('avatar') ||
        locationState?.userAvatar ||
        '';
      const targetSid =
        searchParams.get('sid') ||
        locationState?.sid ||
        '';

      if (targetUserId) {
        setMobileChatOpen(true);
        const match = list.find(
          (c) =>
            String(c.partnerId) === String(targetUserId) ||
            String(c.id) === String(targetUserId) ||
            (targetUserName && c.name.toLowerCase() === targetUserName.toLowerCase())
        );

        if (match) {
          setConversations(list);
          setActiveConvId(match.id);
        } else {
          // First time message to this user! Create a synthetic conversation immediately
          const syntheticId = `user-${targetUserId}-${targetUserType}`;
          const newConv: Conversation = {
            id: syntheticId,
            partnerId: Number(targetUserId),
            partnerType: targetUserType as 'carrier' | 'driver',
            name: targetUserName || (targetUserType === 'driver' ? 'Driver' : 'Carrier Company'),
            initials: extractInitials(targetUserName) || (targetUserName || 'U').substring(0, 2).toUpperCase(),
            avatarUrl: targetUserAvatar || '',
            avatarClass: targetUserType === 'driver' ? 'driver' : 'carrier',
            chips: [],
            role: targetUserType === 'driver' ? 'Driver' : 'Carrier',
            rating: '5.0',
            tripsCount: 0,
            type: targetUserType === 'driver' ? 'freelancer' : 'company',
            lastMsg: '',
            lastTime: 'Just now',
            lastTimestamp: Math.floor(Date.now() / 1000),
            unread: 0,
            online: true,
            latestSid: targetSid || undefined,
            activeShipmentId: targetSid || undefined,
          };
          setConversations([newConv, ...list]);
          setActiveConvId(newConv.id);
        }
      } else if (list.length > 0) {
        setConversations(list);
        setActiveConvId((prev) => {
          if (prev && list.some((c) => String(c.id) === String(prev))) {
            return prev;
          }
          const sidParam = searchParams.get('sid');
          if (sidParam) {
            const match = list.find((c) => c.chips?.includes(sidParam) || c.latestSid === sidParam);
            if (match) return match.id;
          }
          return list[0].id;
        });
      } else {
        setConversations([]);
        setActiveConvId(null);
        setMessages([]);
      }
    } catch (err) {
      console.warn('Error loading conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [debouncedSearch, searchParams, locationState]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // Active conversation memo
  const activeConversation = useMemo(() => {
    const found = conversations.find((c) => String(c.id) === String(activeConvId)) || null;
    activeConvRef.current = found;
    return found;
  }, [conversations, activeConvId]);

  // Track open chat so foreground FCM toasts are suppressed for the active thread
  useEffect(() => {
    if (!activeConvId || !activeConversation) {
      setActiveChatPartner(null);
      return;
    }

    const partnerId = parsePartnerId(activeConversation.partnerId || activeConversation.id);
    const partnerType = resolveActivePartnerType(activeConversation);

    if (partnerId > 0) {
      setActiveChatPartner({ partnerId, partnerType });
    } else {
      setActiveChatPartner(null);
    }

    return () => setActiveChatPartner(null);
  }, [activeConvId, activeConversation]);

  // Listen to incoming real-time socket messages
  useEffect(() => {
    const unsubscribe = socketService.onMessage((incoming: SocketMessagePayload) => {
      const active = activeConvRef.current;
      const activePartnerId = parsePartnerId(active?.partnerId || active?.id);
      const incomingSenderId = parsePartnerId(incoming.sender_id || (incoming as any).senderable_id);
      const incomingReceiverId = parsePartnerId(incoming.receiver_id || (incoming as any).receiverable_id);
      const myId = parsePartnerId(user?.id);
      const incomingSenderType = (incoming.sender_type || (incoming as any).senderable_type || 'carrier').toLowerCase();
      const activePartnerType = resolveActivePartnerType(active);

      // Detect if this is a message received FROM the active partner (incoming from them)
      const isFromActivePartner = isMessageFromPartner(
        incomingSenderId,
        incomingSenderType,
        activePartnerId,
        activePartnerType
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
          initials: active?.initials || extractInitials(active?.name) || 'P',
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

      // Update conversation last message preview and unread count for any partner thread
      if (isIncomingChatToShipper(incoming, myId) && !isOwnMessageEcho) {
        const voiceLabel = t('chatModule.voiceNote') || 'Voice note';
        setConversations((prev) =>
          prev.map((c) => {
            const cPartnerId = parsePartnerId(c.partnerId || c.id);
            const cPartnerType = resolveActivePartnerType(c);

            if (!isMessageFromPartner(incomingSenderId, incomingSenderType, cPartnerId, cPartnerType)) {
              return c;
            }

            const isActiveChat = isMessageFromPartner(
              incomingSenderId,
              incomingSenderType,
              activePartnerId,
              activePartnerType
            );

            return {
              ...c,
              lastMsg: getChatMessagePreview(incoming.message || '', incoming.messages_type, voiceLabel),
              lastTime: 'Just now',
              lastTimestamp: Math.floor(Date.now() / 1000),
              unread: isActiveChat ? 0 : (c.unread || 0) + 1,
            };
          })
        );
      }
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
          setMessages(dedupeMessages(msgs));
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
    async (overrideText?: string | unknown) => {
      const text = (typeof overrideText === 'string' ? overrideText : messageInput).trim();
      if (!text || !activeConvId || !activeConversation) return;

      const now = new Date();
      const timeStr = formatMessageTime(now);
      const msgTempId = Date.now();
      const sid = activeConversation.latestSid || activeConversation.activeShipmentId;

      const newMsg: ChatMessage = {
        id: msgTempId,
        type: 'sent',
        sender: 'You',
        initials: userInitials,
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

      const partnerToken = partnerDeviceTokenRef.current || activeConversation.device_token || '';

      try {
        const response = await socketService.sendMessage(
          buildShipperSocketChatPayload({
            user: user || {},
            conversation: activeConversation,
            partnerToken,
            message: text,
          })
        );

        if (!response) {
          throw new Error('Socket not connected');
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
        initials: userInitials,
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

      const partnerToken = partnerDeviceTokenRef.current || activeConversation.device_token || '';

      try {
        const uploadRes = await chatService.uploadVoice(audioBlob);
        const uploadedUrl = uploadRes?.url || localAudioUrl;

        const response = await socketService.sendMessage(
          buildShipperSocketChatPayload({
            user: user || {},
            conversation: activeConversation,
            partnerToken,
            message: uploadedUrl,
            messagesType: 'voice',
            duration: durationMsSend,
          })
        );

        if (!response) {
          throw new Error('Socket not connected');
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === msgTempId ? { ...m, voiceUrl: uploadedUrl, text: uploadedUrl, status: 'delivered' } : m))
        );

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
        initials: userInitials,
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

        const response = await socketService.sendMessage(
          buildShipperSocketChatPayload({
            user: user || {},
            conversation: activeConversation,
            partnerToken,
            message: uploadedUrl || file.name,
            messagesType: 'media',
          })
        );

        if (!response) {
          throw new Error('Socket not connected');
        }

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

      const partnerToken = partnerDeviceTokenRef.current || activeConversation.device_token || '';

      try {
        const response = await socketService.sendMessage(
          buildShipperSocketChatPayload({
            user: user || {},
            conversation: activeConversation,
            partnerToken,
            message: failedMsg.text,
            ...(failedMsg.messages_type === 'voice' ? { messagesType: 'voice' as const, duration: failedMsg.duration } : {}),
            ...(failedMsg.messages_type === 'media' ? { messagesType: 'media' as const } : {}),
          })
        );

        if (!response) {
          throw new Error('Socket not connected');
        }

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
