/**
 * Auth adapter for ported Settings / Profile UI (MV_Web_Panel shape).
 */
import { useMemo } from 'react';
import { useAuth as useShipperAuth } from '../context/AuthContext';

export function useAuth() {
  const { user: shipperUser, logout, refreshUser } = useShipperAuth();

  const user = useMemo(() => {
    const firstName = shipperUser?.first_name || '';
    const lastName = shipperUser?.last_name || '';
    const company = shipperUser?.company_name || '';
    let initials = '';
    if (firstName || lastName) {
      const i1 = firstName ? Array.from(firstName.trim())[0] || '' : '';
      const i2 = lastName ? Array.from(lastName.trim())[0] || '' : '';
      initials = `${i1}${i2}`.trim().toUpperCase();
    }
    if (!initials && company) {
      const words = company.trim().split(/\s+/).filter(Boolean);
      if (words.length === 1) {
        initials = Array.from(words[0]).slice(0, 2).join('').toUpperCase();
      } else if (words.length > 1) {
        initials = (Array.from(words[0])[0] + Array.from(words[1])[0]).toUpperCase();
      }
    }
    if (!initials) initials = 'SV';

    return {
      firstName: firstName || 'User',
      lastName,
      email: shipperUser?.email || '',
      initials,
      company,
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
