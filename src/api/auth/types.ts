export interface ShipperPermission {
  id?: number;
  name?: string;
  value?: string;
  slug?: string | null;
}

export interface ShipperUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  company_name: string;
  type: string;
  locale: string | null;
  profile_picture: string | null;
  kyc_status: string | null;
  status: string;
  is_sub_user: boolean;
  parent_shipper_id: number | null;
  /** Spatie RBAC names (= shipper_permissions.value) */
  permissions?: string[] | ShipperPermission[];
  two_factor_enabled?: boolean;
  two_factor_method?: 'authenticator' | 'email' | null;
  has_past_due?: boolean;
  referral_code?: string | null;
}


export interface LoginPayload {
  email: string;
  password: string;
  device_token?: string;
}

export type TwoFactorMethod = 'authenticator' | 'email';

export interface TwoFactorChallenge {
  challenge_token: string;
  method: TwoFactorMethod;
  masked_email: string;
}

export interface LoginSuccessResponse {
  status: boolean;
  message: string;
  bearer_token: string;
  data: ShipperUser;
  two_factor_required?: false;
}

export interface LoginTwoFactorResponse {
  status: boolean;
  message: string;
  two_factor_required: true;
  challenge_token: string;
  method: TwoFactorMethod;
  masked_email: string;
}

export type LoginResponse = LoginSuccessResponse | LoginTwoFactorResponse;

export type LoginResult =
  | { kind: 'authenticated'; token: string; user: ShipperUser }
  | { kind: 'two_factor'; challenge: TwoFactorChallenge };

export interface MeResponse {
  status: boolean;
  message: string;
  data: ShipperUser;
}

export interface LogoutResponse {
  status: boolean;
  message: string;
}
