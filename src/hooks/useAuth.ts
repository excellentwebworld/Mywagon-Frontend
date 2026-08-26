/**
 * Auth adapter for ported Settings / Profile UI (MV_Web_Panel shape).
 */
import { useMemo } from 'react';
import { useAuth as useShipperAuth } from '../context/AuthContext';

export function useAuth() {
  const { user: shipperUser, logout, refreshUser } = useShipperAuth();

  const user = useMemo(() => {
    const firstName = shipperUser?.first_name || 'User';
    const lastName = shipperUser?.last_name || '';
    const initials =
      `${(firstName[0] || '').toUpperCase()}${(lastName[0] || '').toUpperCase()}`.trim() || 'SV';
    return {
      firstName,
      lastName,
      email: shipperUser?.email || '',
      initials,
      company: shipperUser?.company_name || '',
      avatarUrl: shipperUser?.profile_picture || null,
      role: shipperUser?.is_sub_user ? 'member' : 'admin',
      referralCode: shipperUser?.referral_code || null,
    };
  }, [shipperUser]);


  return {
    user,
    role: 'shipper' as const,
    logout,
    refreshUser,
    switchRole: () => {},
  };
}
