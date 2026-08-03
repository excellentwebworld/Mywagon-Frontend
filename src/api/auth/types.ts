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
}

export interface LoginPayload {
  email: string;
  password: string;
  device_token?: string;
}

export interface LoginResponse {
  status: boolean;
  message: string;
  bearer_token: string;
  data: ShipperUser;
}

export interface MeResponse {
  status: boolean;
  message: string;
  data: ShipperUser;
}

export interface LogoutResponse {
  status: boolean;
  message: string;
}
