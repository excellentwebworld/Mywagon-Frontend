/** Invite / edit user first & last name: letters + spaces only, max 25. */
export const INVITE_NAME_MAX = 25;

export function sanitizeInviteNameInput(value) {
  return String(value ?? '')
    .replace(/[^\p{L}\s]/gu, '')
    .slice(0, INVITE_NAME_MAX);
}

export function isValidInviteName(value) {
  const v = String(value ?? '').trim();
  if (!v) return false;
  if (v.length > INVITE_NAME_MAX) return false;
  return /^[\p{L}\s]+$/u.test(v);
}
