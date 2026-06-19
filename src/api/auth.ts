export { authService, getStoredToken, setStoredToken, clearStoredToken } from './auth/authService';
export type { LoginPayload, LoginResponse, ShipperUser, ShipperPermission } from './auth/types';

/** @deprecated Use authService.me() */
export const getProfileAPI = () => import('./auth/authService').then((m) => m.authService.me());
