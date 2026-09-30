import { useState } from 'react';
import {
  getUserAvatarColor,
  getUserFullName,
  getUserInitials,
} from '../../../mocks/userMgmtData';

function getUserAvatarUrl(user) {
  if (!user) return null;
  const url = user.avatar_url || user.avatarUrl || user.profile_picture || null;
  return typeof url === 'string' && url.trim() ? url.trim() : null;
}

/**
 * Circular user avatar: uploaded photo when available, otherwise colored initials.
 */
export default function UserAvatar({ user, size = 36, fontSize = 12, className = '' }) {
  const url = getUserAvatarUrl(user);
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = Boolean(url) && !imgFailed;

  if (showImg) {
    return (
      <img
        src={url}
        alt={getUserFullName(user)}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: getUserAvatarColor(user?.id),
        fontSize,
      }}
    >
      {getUserInitials(user || {})}
    </div>
  );
}
