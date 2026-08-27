import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const skProps = {
  baseColor: 'var(--sa, #F0F0F3)',
  highlightColor: 'var(--sf, #FFFFFF)',
};

/**
 * Skeleton loader for Left Conversation List
 */
export const ConversationListSkeleton: React.FC = () => {
  return (
    <div className="conv-pane" aria-busy="true" aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <div className="conv-header">
        <div className="conv-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Skeleton width={110} height={22} borderRadius={6} {...skProps} />
          <Skeleton width={26} height={20} borderRadius={10} {...skProps} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <Skeleton height={38} borderRadius={8} {...skProps} />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 10 }}>
          <Skeleton width={52} height={28} borderRadius={20} {...skProps} />
          <Skeleton width={68} height={28} borderRadius={20} {...skProps} />
          <Skeleton width={64} height={28} borderRadius={20} {...skProps} />
          <Skeleton width={76} height={28} borderRadius={20} {...skProps} />
          <Skeleton width={62} height={28} borderRadius={20} {...skProps} />
        </div>
      </div>

      <div className="conv-list" style={{ overflow: 'hidden' }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="conv-item"
            style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--bd, #E4E4E8)' }}
          >
            <Skeleton width={42} height={42} borderRadius={10} {...skProps} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Skeleton width="55%" height={14} borderRadius={4} {...skProps} />
                <Skeleton width={40} height={11} borderRadius={4} {...skProps} />
              </div>
              <div style={{ marginBottom: 8 }}>
                <Skeleton width="80%" height={12} borderRadius={4} {...skProps} />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Skeleton width={64} height={18} borderRadius={12} {...skProps} />
                {i % 2 === 0 && <Skeleton width={54} height={18} borderRadius={12} {...skProps} />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton loader for Active Chat Thread & Header & Composer
 */
export const ChatThreadSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }} aria-busy="true" aria-hidden="true">
      {/* Header Skeleton */}
      <div
        className="chat-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid var(--bd, #E4E4E8)',
          background: 'var(--sf, #FFFFFF)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skeleton width={40} height={40} borderRadius={10} {...skProps} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Skeleton width={140} height={16} borderRadius={4} {...skProps} />
              <Skeleton width={60} height={18} borderRadius={10} {...skProps} />
            </div>
            <Skeleton width={90} height={11} borderRadius={4} {...skProps} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton width={34} height={34} borderRadius={8} {...skProps} />
          <Skeleton width={34} height={34} borderRadius={8} {...skProps} />
          <Skeleton width={34} height={34} borderRadius={8} {...skProps} />
          <Skeleton width={34} height={34} borderRadius={8} {...skProps} />
        </div>
      </div>

      {/* Filter by SID Bar Skeleton */}
      <div
        className="ctx-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 20px',
          borderBottom: '1px solid var(--bd, #E4E4E8)',
          background: 'var(--se, #FAFAFE)',
        }}
      >
        <Skeleton width={60} height={14} borderRadius={4} {...skProps} />
        <Skeleton width={130} height={28} borderRadius={6} {...skProps} />
      </div>

      {/* Messages Thread Bubbles Skeleton */}
      <div className="msg-area" style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Date separator */}
        <div style={{ textAlign: 'center', margin: '8px 0' }}>
          <Skeleton width={100} height={16} borderRadius={10} {...skProps} />
        </div>

        {/* Received Bubble */}
        <div style={{ display: 'flex', gap: 10, maxWidth: '65%', alignSelf: 'flex-start' }}>
          <Skeleton width={32} height={32} borderRadius={8} {...skProps} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <Skeleton width={70} height={11} borderRadius={4} {...skProps} />
              <Skeleton width={35} height={11} borderRadius={4} {...skProps} />
            </div>
            <div style={{ background: 'var(--sf, #FFFFFF)', padding: 14, borderRadius: '4px 14px 14px 14px', border: '1px solid var(--bd, #E4E4E8)' }}>
              <Skeleton count={2} height={12} borderRadius={4} {...skProps} />
            </div>
          </div>
        </div>

        {/* Sent Bubble */}
        <div style={{ display: 'flex', gap: 10, maxWidth: '60%', alignSelf: 'flex-end', flexDirection: 'row-reverse' }}>
          <Skeleton width={32} height={32} borderRadius={8} {...skProps} />
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4, justifyContent: 'flex-end' }}>
              <Skeleton width={35} height={11} borderRadius={4} {...skProps} />
              <Skeleton width={30} height={11} borderRadius={4} {...skProps} />
            </div>
            <div style={{ background: 'var(--ap, #F5F3FF)', padding: 14, borderRadius: '14px 4px 14px 14px', border: '1px solid #EDE9FE' }}>
              <Skeleton width="90%" height={12} borderRadius={4} {...skProps} />
            </div>
          </div>
        </div>

        {/* Voice Note Bubble Received */}
        <div style={{ display: 'flex', gap: 10, maxWidth: '55%', alignSelf: 'flex-start' }}>
          <Skeleton width={32} height={32} borderRadius={8} {...skProps} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <Skeleton width={70} height={11} borderRadius={4} {...skProps} />
              <Skeleton width={35} height={11} borderRadius={4} {...skProps} />
            </div>
            <div style={{ background: 'var(--sf, #FFFFFF)', padding: '10px 14px', borderRadius: '4px 14px 14px 14px', border: '1px solid var(--bd, #E4E4E8)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Skeleton circle width={32} height={32} {...skProps} />
              <Skeleton width={120} height={12} borderRadius={6} {...skProps} />
              <Skeleton width={30} height={11} borderRadius={4} {...skProps} />
            </div>
          </div>
        </div>

        {/* Sent Short Bubble */}
        <div style={{ display: 'flex', gap: 10, maxWidth: '45%', alignSelf: 'flex-end', flexDirection: 'row-reverse' }}>
          <Skeleton width={32} height={32} borderRadius={8} {...skProps} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4, justifyContent: 'flex-end' }}>
              <Skeleton width={35} height={11} borderRadius={4} {...skProps} />
            </div>
            <div style={{ background: 'var(--ap, #F5F3FF)', padding: 12, borderRadius: '14px 4px 14px 14px', border: '1px solid #EDE9FE' }}>
              <Skeleton width={110} height={12} borderRadius={4} {...skProps} />
            </div>
          </div>
        </div>
      </div>

      {/* Composer Skeleton */}
      <div
        className="composer-wrap"
        style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--bd, #E4E4E8)',
          background: 'var(--sf, #FFFFFF)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Skeleton width={36} height={36} borderRadius={8} {...skProps} />
          <Skeleton width={36} height={36} borderRadius={8} {...skProps} />
          <Skeleton width={36} height={36} borderRadius={8} {...skProps} />
          <div style={{ flex: 1 }}>
            <Skeleton height={42} borderRadius={10} {...skProps} />
          </div>
          <Skeleton width={42} height={42} borderRadius={10} {...skProps} />
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton loader for Right Shipment Context Pane
 */
export const ShipmentContextSkeleton: React.FC = () => {
  return (
    <div
      className="ctx-pane open"
      style={{ width: 340, padding: 20, borderLeft: '1px solid var(--bd, #E4E4E8)', background: 'var(--sf, #FFFFFF)', overflowY: 'auto' }}
      aria-busy="true"
      aria-hidden="true"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Skeleton width={18} height={18} borderRadius={4} {...skProps} />
          <Skeleton width={120} height={16} borderRadius={4} {...skProps} />
        </div>
        <Skeleton width={20} height={20} borderRadius={4} {...skProps} />
      </div>

      <div style={{ padding: 14, borderRadius: 10, background: 'var(--sa, #F0F0F3)', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <Skeleton width={80} height={14} borderRadius={4} {...skProps} />
          <Skeleton width={60} height={18} borderRadius={10} {...skProps} />
        </div>
        <Skeleton width="100%" height={10} borderRadius={4} {...skProps} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Skeleton width={90} height={12} borderRadius={4} style={{ marginBottom: 8 }} {...skProps} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Skeleton circle width={16} height={16} {...skProps} />
            <Skeleton width="75%" height={12} borderRadius={4} {...skProps} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Skeleton circle width={16} height={16} {...skProps} />
            <Skeleton width="65%" height={12} borderRadius={4} {...skProps} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div style={{ padding: 10, borderRadius: 8, background: 'var(--sa, #F0F0F3)' }}>
          <Skeleton width={40} height={10} borderRadius={4} style={{ marginBottom: 6 }} {...skProps} />
          <Skeleton width={65} height={14} borderRadius={4} {...skProps} />
        </div>
        <div style={{ padding: 10, borderRadius: 8, background: 'var(--sa, #F0F0F3)' }}>
          <Skeleton width={40} height={10} borderRadius={4} style={{ marginBottom: 6 }} {...skProps} />
          <Skeleton width={65} height={14} borderRadius={4} {...skProps} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton height={36} borderRadius={8} {...skProps} />
        <Skeleton height={36} borderRadius={8} {...skProps} />
      </div>
    </div>
  );
};

/**
 * Full Page Chat Skeleton
 */
export const FullChatPageSkeleton: React.FC = () => {
  return (
    <div className="messages-page-wrapper" aria-busy="true" aria-hidden="true">
      <div className="chat-layout">
        <div className="conv-pane-wrap">
          <ConversationListSkeleton />
        </div>
        <div className="chat-pane open">
          <ChatThreadSkeleton />
        </div>
        <ShipmentContextSkeleton />
      </div>
    </div>
  );
};
