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
  ChatContext,
} from '../types';
import { formatMessageTime, formatConversationTime } from '../../../utils/timezone';
import { setActiveChatPartner } from '../../../utils/chatNotificationGuard';
import {
  buildChatFilterSids,
  buildLaravelChatRequestData,
  extractShipmentDbId,
  formatShipmentAutoId,
  getChatMessagePreview,
  getShipperDeviceToken,
  isIncomingChatToShipper,
  isMessageFromPartner,
  isShipmentAutoId,
  parsePartnerId,
  resolveActivePartnerType,
  resolveNavigatedShipmentIds,
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
  shipmentId?: string | number;
}): SocketMessagePayload {
  const receiverId = parsePartnerId(params.conversation.partnerId || params.conversation.id);
  const receiverType = resolveSocketReceiverType(params.conversation);
  const senderId = parsePartnerId(params.user.id);
  const senderName =
    params.user.company_name ||
    `${params.user.first_name || ''} ${params.user.last_name || ''}`.trim() ||
    'Shipper';
  const cleanShipmentId = params.shipmentId != null ? extractShipmentDbId(String(params.shipmentId)) : undefined;

  return {
    sender_id: String(senderId),
    sender_type: 'shipper',
    receiver_id: String(receiverId),
    receiver_type: receiverType,
    message: params.message,
    ...(cleanShipmentId ? { shipment_id: cleanShipmentId } : {}),
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
    if (m.type === 'received' || m.type === 'sent') {
      const hasBody =
        Boolean(String(m.text || '').trim()) ||
        m.messages_type === 'voice' ||
        m.messages_type === 'media' ||
        Boolean(m.voiceUrl) ||
        Boolean(m.attachments?.length);
      if (!hasBody) return false;
    }
    if (m.id != null) {
      const idKey = `id:${m.id}`;
      if (seenIds.has(idKey)) return false;
      seenIds.add(idKey);
    }
    const contentKey = `c:${m.type}:${m.text}:${m.created_at ?? m.time}:${m.messages_type ?? 'text'}`;
    if (seenContent.has(contentKey)) return false;
    seenContent.add(contentKey);
    return true;
  });
}

function buildReceivedMessageFromSocket(
  incoming: SocketMessagePayload,
  conversation: Conversation | null
): ChatMessage | null {
  const rawText = String(
    incoming.message ||
    (incoming as { notification_body?: string }).notification_body ||
    ''
  ).trim();

  const isVoice =
    incoming.messages_type === 'voice' ||
    (rawText && (rawText.includes('chat-voices') || /\.(webm|m4a|mp3|wav|ogg|caf)/i.test(rawText)));

  const isMedia = incoming.messages_type === 'media';

  if (!rawText && !isVoice && !isMedia) {
    return null;
  }

  const createdAt =
    typeof incoming.created_at === 'string'
      ? incoming.created_at
      : incoming.created_at instanceof Date
        ? incoming.created_at.toISOString()
        : new Date().toISOString();

  return {
    id: incoming.id || Date.now(),
    type: 'received',
    sender: conversation?.name || incoming.request_data?.sender_name || 'Partner',
    initials: conversation?.initials || extractInitials(conversation?.name) || 'P',
    time: formatMessageTime(incoming.created_at || new Date()),
    created_at: createdAt,
    text: rawText,
    messages_type: isVoice ? 'voice' : ((incoming.messages_type as ChatMessage['messages_type']) || 'text'),
    voiceUrl: isVoice ? rawText : undefined,
    duration: incoming.duration,
    shipmentId: incoming.shipment_id ? String(incoming.shipment_id) : undefined,
    shipment_id: incoming.shipment_id,
  };
}

export function isMatchingShipment(
  msg: ChatMessage,
  targetSid: string,
  contextDbId?: string | number | null,
  contextLabel?: string | null
): boolean {
  if (!targetSid || targetSid === 'all') return true;
  const targetNorm = extractShipmentDbId(targetSid) || targetSid.toLowerCase().trim();
  const rawMsgSid = msg.shipmentId || (msg as any).shipment_id;
  if (!rawMsgSid) return false;
  const msgNorm = extractShipmentDbId(String(rawMsgSid)) || String(rawMsgSid).toLowerCase().trim();
  if (msgNorm === targetNorm || String(rawMsgSid).toLowerCase().trim() === targetSid.toLowerCase().trim()) {
    return true;
  }
  if (contextDbId) {
    const dbNorm = extractShipmentDbId(String(contextDbId));
    const filterIsContextShipment =
      !contextLabel ||
      String(targetSid).toLowerCase().trim() === String(contextLabel).toLowerCase().trim() ||
      Boolean(dbNorm && targetNorm === dbNorm);
    if (
      filterIsContextShipment &&
      dbNorm &&
      (msgNorm === dbNorm || String(rawMsgSid).toLowerCase().trim() === dbNorm.toLowerCase().trim())
    ) {
      return true;
    }
  }
  return false;
}

export function filterMessagesByShipmentContext(
  messages: ChatMessage[],
  shipmentFilter: string,
  contextDbId?: string | number | null,
  contextLabel?: string | null
): ChatMessage[] {
  if (shipmentFilter === 'all') return messages;

  const result: ChatMessage[] = [];
  let currentDateSep: ChatMessage | null = null;
  let hasContentForDate = false;

  for (const m of messages) {
    if (m.type === 'date') {
      currentDateSep = m;
      hasContentForDate = false;
      continue;
    }

    if (m.type === 'system') {
      if (m.shipmentId && !isMatchingShipment(m, shipmentFilter, contextDbId, contextLabel)) {
        continue;
      }
    } else {
      if (!isMatchingShipment(m, shipmentFilter, contextDbId, contextLabel)) {
        continue;
      }
    }

    if (currentDateSep && !hasContentForDate) {
      result.push(currentDateSep);
      hasContentForDate = true;
    }
    result.push(m);
  }

  return result;
}

function shouldAppendIncomingMessage(prev: ChatMessage[], next: ChatMessage): boolean {
  return !prev.some(
    (m) =>
      (next.id != null && m.id === next.id) ||
      (m.type === 'received' &&
        m.type === next.type &&
        m.text === next.text &&
        (m.created_at === next.created_at || m.time === next.time))
  );
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
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const locationState = location.state as {
    userId?: number | string;
    userType?: 'carrier' | 'driver';
    userName?: string;
    userAvatar?: string;
    sid?: string;
    autoId?: string;
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
  const [chatContext, setChatContext] = useState<ChatContext>({
    mode: 'direct',
    shipmentId: null,
    shipmentDbId: null,
    shipmentLabel: null,
  });
  const [tplDropdownOpen, setTplDropdownOpen] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [sendErrorModalOpen, setSendErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [dynamicShipmentCtx, setDynamicShipmentCtx] = useState<ShipmentContextInfo | null>(null);

  // Active conversation reference
  const activeConvRef = useRef<Conversation | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const activeConvIdRef = useRef<number | string | null>(null);
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
        searchParams.get('tsid') ||
        locationState?.sid ||
        '';
      const targetAutoId =
        searchParams.get('autoId') ||
        searchParams.get('autoid') ||
        locationState?.autoId ||
        '';
      const { primaryId: navPrimaryId, autoId: navAutoId } = resolveNavigatedShipmentIds(
        targetSid,
        targetAutoId
      );

      let match: Conversation | undefined;

      const targetIdNum = targetUserId ? parsePartnerId(targetUserId) : null;
      const normTargetName = targetUserName ? targetUserName.trim().toLowerCase() : '';
      const normTargetSid = navAutoId ? navAutoId.replace(/^SID-/i, '').trim() : '';

      // 1. Try matching by targetUserId (partnerId or id)
      if (targetUserId) {
        match = list.find((c) => {
          if (String(c.partnerId) === String(targetUserId)) return true;
          if (String(c.id) === String(targetUserId)) return true;
          if (targetIdNum && parsePartnerId(c.partnerId || c.id) === targetIdNum) {
            if (c.partnerType && targetUserType && c.partnerType !== targetUserType) return false;
            return true;
          }
          if (c.id === `${targetUserType}_${targetUserId}`) return true;
          return false;
        });
      }

      // 2. Try matching by targetUserName (e.g. "IOS Driver")
      if (!match && normTargetName) {
        match = list.find((c) => c.name && c.name.trim().toLowerCase() === normTargetName);
      }

      // 3. Try matching by navigated auto_id (never by SID-{primaryId})
      if (!match && (normTargetSid || navPrimaryId)) {
        match = list.find((c) => {
          if (normTargetSid) {
            if (c.chips?.some((chip) => chip.replace(/^SID-/i, '').trim() === normTargetSid)) return true;
            if (c.latestSid && String(c.latestSid).replace(/^SID-/i, '').trim() === normTargetSid) return true;
            if (c.activeShipmentId && String(c.activeShipmentId).replace(/^SID-/i, '').trim() === normTargetSid) return true;
          }
          if (navPrimaryId && String(c.latestShipmentDbId || '') === navPrimaryId) return true;
          return false;
        });
      }

      const applyNavigatedShipment = (conversations: Conversation[], conv: Conversation): Conversation[] => {
        if (!navPrimaryId && !navAutoId) {
          setChatContext({
            mode: 'direct',
            shipmentId: null,
            shipmentDbId: null,
            shipmentLabel: null,
          });
          setShipmentFilter('all');
          return conversations;
        }

        setChatContext({
          mode: 'shipment',
          shipmentId: navAutoId || navPrimaryId,
          shipmentDbId: navPrimaryId,
          shipmentLabel: navAutoId,
        });
        setShipmentFilter(navAutoId || 'all');
        setCtxPaneOpen(true);
        return conversations;
      };

      if (match) {
        setMobileChatOpen(true);
        setConversations(applyNavigatedShipment(list, match));
        setActiveConvId(match.id);
      } else if (targetUserId || normTargetName) {
        // First time message to this user! Create a synthetic conversation immediately
        setMobileChatOpen(true);
        const syntheticId = `user-${targetUserId || normTargetName.replace(/\s+/g, '_')}-${targetUserType}`;
        const newConv: Conversation = {
          id: syntheticId,
          partnerId: targetIdNum || Number(targetUserId) || 0,
          partnerType: targetUserType as 'carrier' | 'driver',
          name: targetUserName || (targetUserType === 'driver' ? 'Driver' : 'Carrier Company'),
          initials: extractInitials(targetUserName) || (targetUserName || 'U').substring(0, 2).toUpperCase(),
          avatarUrl: targetUserAvatar || '',
          avatarClass: targetUserType === 'driver' ? 'driver' : 'carrier',
          chips: navAutoId ? [navAutoId] : [],
          role: targetUserType === 'driver' ? 'Driver' : 'Carrier',
          rating: '5.0',
          tripsCount: 0,
          type: targetUserType === 'driver' ? 'freelancer' : 'company',
          lastMsg: '',
          lastTime: 'Just now',
          lastTimestamp: Math.floor(Date.now() / 1000),
          unread: 0,
          online: true,
          latestSid: navAutoId || undefined,
          latestShipmentDbId: navPrimaryId || undefined,
          activeShipmentId: navAutoId || undefined,
        };
        setConversations(applyNavigatedShipment([newConv, ...list], newConv));
        setActiveConvId(newConv.id);
      } else if (list.length > 0) {
        setConversations(list);
        if (navPrimaryId || navAutoId) {
          setChatContext({
            mode: 'shipment',
            shipmentId: navAutoId || navPrimaryId,
            shipmentDbId: navPrimaryId,
            shipmentLabel: navAutoId,
          });
          setShipmentFilter(navAutoId || 'all');
          setCtxPaneOpen(true);
        } else {
          setChatContext({
            mode: 'direct',
            shipmentId: null,
            shipmentDbId: null,
            shipmentLabel: null,
          });
          setShipmentFilter('all');
        }
        setActiveConvId((prev) => {
          if (prev && list.some((c) => String(c.id) === String(prev))) {
            return prev;
          }
          return list[0].id;
        });
      } else {
        setConversations([]);
        setActiveConvId(null);
        setMessages([]);
        setChatContext({
          mode: 'direct',
          shipmentId: null,
          shipmentDbId: null,
          shipmentLabel: null,
        });
        setShipmentFilter('all');
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
    conversationsRef.current = conversations;
    activeConvIdRef.current = activeConvId;
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
    const processIncomingMessage = (incoming: SocketMessagePayload) => {
      const active =
        activeConvRef.current ||
        conversationsRef.current.find((c) => String(c.id) === String(activeConvIdRef.current)) ||
        null;
      const activePartnerId = parsePartnerId(active?.partnerId || active?.id);
      const incomingSenderId = parsePartnerId(incoming.sender_id || (incoming as { senderable_id?: number }).senderable_id);
      const incomingReceiverId = parsePartnerId(incoming.receiver_id || (incoming as { receiverable_id?: number }).receiverable_id);
      const myId = parsePartnerId(user?.id);
      const incomingSenderType = (incoming.sender_type || (incoming as { senderable_type?: string }).senderable_type || 'carrier').toLowerCase();
      const activePartnerType = resolveActivePartnerType(active);
      const voiceLabel = t('chatModule.voiceNote') || 'Voice note';

      const isOwnMessageEcho = Boolean(
        myId > 0 &&
        incomingSenderId === myId &&
        activePartnerId > 0 &&
        incomingReceiverId === activePartnerId
      );

      if (isOwnMessageEcho) {
        const isVoiceEcho =
          incoming.messages_type === 'voice' ||
          (incoming.message &&
            (incoming.message.includes('chat-voices') ||
              /\.(webm|m4a|mp3|wav|ogg|caf)/i.test(incoming.message)));
        if (isVoiceEcho && incoming.message && incoming.message.startsWith('http')) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.type === 'sent' && m.messages_type === 'voice' && m.voiceUrl && m.voiceUrl.startsWith('blob:')) {
                return { ...m, voiceUrl: incoming.message, text: incoming.message };
              }
              return m;
            })
          );
        }
        return;
      }

      if (!isIncomingChatToShipper(incoming, myId)) {
        return;
      }

      const isFromActivePartner =
        activePartnerId > 0 &&
        isMessageFromPartner(incomingSenderId, incomingSenderType, activePartnerId, activePartnerType);

      if (isFromActivePartner) {
        const newMsg = buildReceivedMessageFromSocket(incoming, active);
        if (newMsg) {
          setMessages((prev) => {
            if (!shouldAppendIncomingMessage(prev, newMsg)) return prev;
            return [...prev, newMsg];
          });

          void chatService.markAsRead(activePartnerId, activePartnerType);
          socketService.markAsRead({
            sender_id: user?.id || 0,
            sender_type: 'shipper',
            receiver_id: activePartnerId,
            receiver_type: activePartnerType,
          });
        }
      }

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
    };

    const unsubscribe = socketService.onMessage(processIncomingMessage);

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
    const partnerType = resolveActivePartnerType(currentConv);
    const partnerId = parsePartnerId(currentConv.partnerId || currentConv.id);

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

    return () => {
      mounted = false;
    };
  }, [activeConvId, user?.id]);

  // Fetch shipment context for the SID the user picked in this chat.
  // Depend on the selected label/filter only — filling shipmentDbId after fetch must not skip a swap.
  useEffect(() => {
    if (chatContext.mode !== 'shipment' || !shipmentFilter || shipmentFilter === 'all') {
      setDynamicShipmentCtx(null);
      setLoadingShipmentContext(false);
      return;
    }

    const requested =
      formatShipmentAutoId(shipmentFilter) ||
      formatShipmentAutoId(chatContext.shipmentLabel) ||
      (isShipmentAutoId(String(chatContext.shipmentId || ''))
        ? formatShipmentAutoId(String(chatContext.shipmentId))
        : null) ||
      String(chatContext.shipmentId || shipmentFilter);

    if (!requested) {
      setDynamicShipmentCtx(null);
      setLoadingShipmentContext(false);
      return;
    }

    let cancelled = false;
    setLoadingShipmentContext(true);
    setDynamicShipmentCtx((prev) => {
      const prevSid = formatShipmentAutoId(prev?.autoId || prev?.sid);
      if (prevSid && prevSid.toUpperCase() === requested.toUpperCase()) return prev;
      return null;
    });

    chatService
      .getShipmentContext(requested)
      .then((ctx) => {
        if (cancelled) return;
        setLoadingShipmentContext(false);
        if (!ctx) {
          setDynamicShipmentCtx(null);
          return;
        }
        const autoId = formatShipmentAutoId(ctx.autoId || ctx.sid);
        const dbId = ctx.primaryId != null ? String(ctx.primaryId) : null;
        const requestedAuto = isShipmentAutoId(requested)
          ? formatShipmentAutoId(requested)
          : null;
        if (
          requestedAuto &&
          autoId &&
          requestedAuto.toUpperCase() !== autoId.toUpperCase()
        ) {
          setDynamicShipmentCtx(null);
          return;
        }
        setDynamicShipmentCtx(ctx);
        setChatContext((prev) => {
          if (prev.mode !== 'shipment') return prev;
          const currentLabel =
            formatShipmentAutoId(prev.shipmentLabel) || prev.shipmentLabel;
          if (
            currentLabel &&
            autoId &&
            currentLabel.toUpperCase() !== autoId.toUpperCase()
          ) {
            return prev;
          }
          if (prev.shipmentDbId === dbId && prev.shipmentLabel === autoId) return prev;
          return {
            ...prev,
            shipmentDbId: dbId || prev.shipmentDbId,
            shipmentLabel: autoId || prev.shipmentLabel,
          };
        });
      })
      .catch(() => {
        if (cancelled) return;
        setLoadingShipmentContext(false);
        setDynamicShipmentCtx(null);
      });

    return () => {
      cancelled = true;
    };
  }, [chatContext.mode, chatContext.shipmentId, shipmentFilter]);

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
    return filterMessagesByShipmentContext(
      messages,
      shipmentFilter,
      chatContext.shipmentDbId,
      chatContext.shipmentLabel
    );
  }, [messages, shipmentFilter, chatContext.shipmentDbId, chatContext.shipmentLabel]);

  const loadScopedAutoId = useMemo(() => {
    const { autoId } = resolveNavigatedShipmentIds(
      searchParams.get('sid') || searchParams.get('tsid') || locationState?.sid,
      searchParams.get('autoId') || searchParams.get('autoid') || locationState?.autoId
    );
    return autoId;
  }, [searchParams, locationState]);

  const conversationShipmentSids = useMemo(() => {
    const messageSids = messages
      .filter((m) => m.type !== 'date' && m.type !== 'system')
      .map((m) => m.shipmentId ?? null);

    return buildChatFilterSids({
      loadScopedAutoId,
      messageSids,
      currentFilter: shipmentFilter,
    });
  }, [messages, shipmentFilter, loadScopedAutoId]);

  useEffect(() => {
    if (!loadScopedAutoId) return;
    const current = formatShipmentAutoId(shipmentFilter);
    if (
      shipmentFilter !== 'all' &&
      current?.toUpperCase() !== loadScopedAutoId.toUpperCase()
    ) {
      setShipmentFilter(loadScopedAutoId);
      setChatContext({
        mode: 'shipment',
        shipmentId: loadScopedAutoId,
        shipmentLabel: loadScopedAutoId,
        shipmentDbId: null,
      });
      setCtxPaneOpen(true);
    }
  }, [loadScopedAutoId, shipmentFilter]);

  // Select conversation (defaults to direct user-to-user conversation)
  const selectConversation = useCallback((id: number | string) => {
    setActiveConvId(id);
    setMobileChatOpen(true);
    setTplDropdownOpen(false);
    setMessages([]);
    setDynamicShipmentCtx(null);
    setCtxPaneOpen(false);
    setChatContext({
      mode: 'direct',
      shipmentId: null,
      shipmentDbId: null,
      shipmentLabel: null,
    });
    setShipmentFilter('all');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('sid');
      next.delete('tsid');
      next.delete('autoId');
      next.delete('autoid');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleShipmentFilterChange = useCallback((sid: string) => {
    setShipmentFilter(sid);
    if (!sid || sid === 'all') {
      setDynamicShipmentCtx(null);
      setLoadingShipmentContext(false);
      setCtxPaneOpen(false);
      setChatContext({
        mode: 'direct',
        shipmentId: null,
        shipmentDbId: null,
        shipmentLabel: null,
      });
      return;
    }

    const autoId = formatShipmentAutoId(sid) || sid;
    setCtxPaneOpen(true);
    setChatContext((prev) => ({
      mode: 'shipment',
      shipmentId: autoId,
      shipmentLabel: autoId,
      shipmentDbId:
        prev.shipmentLabel === autoId || prev.shipmentId === autoId
          ? prev.shipmentDbId
          : null,
    }));
  }, []);

  // Resolve active shipment only when this thread is explicitly scoped to a load
  const resolveActiveShipment = useCallback(() => {
    if (chatContext.mode === 'shipment' && chatContext.shipmentDbId) {
      return {
        shipmentId: chatContext.shipmentLabel || formatShipmentAutoId(chatContext.shipmentId) || undefined,
        shipmentDbId: chatContext.shipmentDbId,
      };
    }
    if (chatContext.mode === 'shipment' && shipmentFilter !== 'all') {
      const dbId = chatContext.shipmentDbId || (dynamicShipmentCtx?.primaryId ? String(dynamicShipmentCtx.primaryId) : null);
      return {
        shipmentId: chatContext.shipmentLabel || formatShipmentAutoId(shipmentFilter) || shipmentFilter,
        shipmentDbId: dbId || undefined,
      };
    }
    return {
      shipmentId: undefined,
      shipmentDbId: undefined,
    };
  }, [chatContext, shipmentFilter, dynamicShipmentCtx]);

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
      const { shipmentId: activeSid, shipmentDbId: activeSidDb } = resolveActiveShipment();

      const newMsg: ChatMessage = {
        id: msgTempId,
        type: 'sent',
        sender: 'You',
        initials: userInitials,
        time: timeStr,
        created_at: now.toISOString(),
        text,
        status: 'delivered',
        shipmentId: activeSid,
        shipment_id: activeSidDb,
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
            shipmentId: activeSidDb,
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
      const { shipmentId: activeSid, shipmentDbId: activeSidDb } = resolveActiveShipment();
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
        shipmentId: activeSid,
        shipment_id: activeSidDb,
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
            shipmentId: activeSidDb,
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
      const { shipmentId: activeSid, shipmentDbId: activeSidDb } = resolveActiveShipment();

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
        shipmentId: activeSid,
        shipment_id: activeSidDb,
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
            shipmentId: activeSidDb,
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
      const { shipmentDbId: activeSidDb } = resolveActiveShipment();
      const retrySidDb = failedMsg.shipment_id != null
        ? String(failedMsg.shipment_id)
        : (failedMsg.shipmentId ? extractShipmentDbId(failedMsg.shipmentId) : activeSidDb);

      try {
        const response = await socketService.sendMessage(
          buildShipperSocketChatPayload({
            user: user || {},
            conversation: activeConversation,
            partnerToken,
            message: failedMsg.text,
            ...(failedMsg.messages_type === 'voice' ? { messagesType: 'voice' as const, duration: failedMsg.duration } : {}),
            ...(failedMsg.messages_type === 'media' ? { messagesType: 'media' as const } : {}),
            shipmentId: retrySidDb,
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
      const sid =
        (chatContext.mode === 'shipment' && (chatContext.shipmentLabel || formatShipmentAutoId(chatContext.shipmentId))) ||
        (chatContext.mode === 'shipment' ? dynamicShipmentCtx?.sid : null) ||
        '';
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
    [t, activeConversation, dynamicShipmentCtx, chatContext]
  );

  return {
    t,
    lang,
    conversations,
    activeConvId,
    activeConversation,
    chatContext,
    setChatContext,
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
    handleShipmentFilterChange,
    conversationShipmentSids,
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
