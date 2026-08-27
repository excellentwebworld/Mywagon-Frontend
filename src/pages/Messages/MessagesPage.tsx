import React from 'react';
import { MessageSquare, AlertCircle, X } from 'lucide-react';
import '../../styles/messages.css';
import { useMessages } from './hooks/useMessages';
import { ConversationList } from './components/ConversationList';
import { ChatHeader } from './components/ChatHeader';
import { ChatThread } from './components/ChatThread';
import { ChatComposer } from './components/ChatComposer';
import { ShipmentContextPane } from './components/ShipmentContextPane';
import { ChatThreadSkeleton } from './components/ChatSkeleton';

export const MessagesPage: React.FC = () => {
  const {
    t,
    lang,
    conversations,
    activeConvId,
    activeConversation,
    activeShipmentContext,
    messages,
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
    toggleCtxPane,
    shipmentFilter,
    setShipmentFilter,
    tplDropdownOpen,
    toggleTemplates,
    closeTemplates,
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
    closeSendErrorModal,
    errorMessage,
    templates,
  } = useMessages();

  return (
    <div className="messages-page-wrapper">
      <div className="chat-layout">
        {/* Left Pane: Conversations List */}
        <div className={`conv-pane-wrap ${mobileChatOpen ? 'chat-open' : ''}`}>
          <ConversationList
            conversations={filteredConversations}
            allConversationsCount={conversations.length}
            activeConvId={activeConvId}
            totalUnreadCount={totalUnreadCount}
            currentFilter={currentFilter}
            convSearch={convSearch}
            onFilterChange={setCurrentFilter}
            onSearchChange={setConvSearch}
            onSelectConversation={selectConversation}
            loading={loadingConversations}
            t={t}
          />
        </div>

        {/* Center Pane: Active Chat Thread & Composer */}
        <div className={`chat-pane ${mobileChatOpen ? 'open' : ''}`} id="chatPane">
          {loadingMessages ? (
            <ChatThreadSkeleton />
          ) : !activeConversation ? (
            <div className="chat-empty" id="chatEmpty">
              <MessageSquare size={56} />
              <p>{t('chatModule.emptyState') || 'Select a conversation to start chatting'}</p>
            </div>
          ) : (
            <div
              id="chatActive"
              style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
            >
              <ChatHeader
                conversation={activeConversation}
                ctxPaneOpen={ctxPaneOpen}
                onToggleCtxPane={toggleCtxPane}
                onBackMobile={handleMobileBack}
                onShowToast={(msg) => showToast(msg, 'info')}
                t={t}
              />

              <ChatThread
                messages={messages}
                conversation={activeConversation}
                isTyping={isTyping}
                shipmentFilter={shipmentFilter}
                onShipmentFilterChange={(sid) => {
                  setShipmentFilter(sid);
                  showToast(
                    sid === 'all'
                      ? (t('chatModule.toastAllMessages') || 'Showing all messages')
                      : `${t('chatModule.toastFiltered') || 'Filtered by'}: ${sid}`,
                    'info'
                  );
                }}
                onRetryMessage={handleRetryMessage}
                t={t}
                lang={lang}
              />

              <ChatComposer
                messageInput={messageInput}
                onInputChange={setMessageInput}
                onSendMessage={handleSendMessage}
                onSendVoiceNote={handleSendVoiceNote}
                onAttachFile={handleAttachFile}
                templates={templates}
                tplDropdownOpen={tplDropdownOpen}
                onToggleTemplates={toggleTemplates}
                onCloseTemplates={closeTemplates}
                onSelectTemplate={handleUseTemplate}
                shipmentContext={activeShipmentContext}
                activeShipmentId={activeConversation.latestSid || activeConversation.activeShipmentId}
                onShowToast={(msg) => showToast(msg, 'info')}
                t={t}
              />
            </div>
          )}
        </div>

        {/* Right Pane: Shipment Context & Details */}
        <ShipmentContextPane
          shipmentContext={activeShipmentContext}
          isOpen={ctxPaneOpen && !!activeConversation}
          onClose={toggleCtxPane}
          onUseTemplate={handleUseTemplate}
          templates={templates}
          onShowToast={(msg) => showToast(msg, 'info')}
          loading={loadingShipmentContext}
          t={t}
        />
      </div>

      {/* Message Send Failure Modal Popup */}
      {sendErrorModalOpen && (
        <div className="chat-modal-backdrop" onClick={closeSendErrorModal}>
          <div className="chat-error-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cem-header">
              <div className="cem-title-wrap">
                <AlertCircle size={22} color="#EF4444" />
                <h3 className="cem-title">{t('chatModule.errorModalTitle') || 'Message Failed to Send'}</h3>
              </div>
              <button type="button" className="cem-close" onClick={closeSendErrorModal}>
                <X size={18} />
              </button>
            </div>
            <div className="cem-body">
              <p>{errorMessage || t('chatModule.messageSendFailed') || 'We could not send your message. Please check your internet connection and try again.'}</p>
            </div>
            <div className="cem-footer">
              <button type="button" className="btn btn-primary" onClick={closeSendErrorModal}>
                {t('chatModule.dismiss') || 'Dismiss'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
