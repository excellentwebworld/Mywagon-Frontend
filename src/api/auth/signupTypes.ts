/** Public shipper signup API types (PDS-955). */

export type SignupUserType = 'shipper' | 'carrier' | 'driver';

export type SignupDuplicateTable = 'shippers' | 'carriers' | 'drivers';

export type SignupDuplicateField = 'email' | 'phone' | 'company_name';

export type SignupStatusResponse = {
  status: boolean;
  success?: boolean;
  message?: string;
  redirect_url?: string;
  otp?: number | string;
  data?: unknown;
};

export type SendEmailOtpPayload = {
  email: string;
  user_type?: SignupUserType;
};

export type SendPhoneOtpPayload = {
  country_code: string;
  phone: string;
  user_type?: SignupUserType;
};

export type VerifyPhoneOtpPayload = {
  country_code: string;
  phone: string;
  otp: string | number;
};

export type CheckDuplicatePayload = {
  table_name: SignupDuplicateTable;
  field_name: SignupDuplicateField;
  new_value: string;
  old_value?: string | null;
};

export type CheckCompanyPayload = {
  table_name: SignupDuplicateTable;
  field_name: string;
  new_value: string;
  old_value?: string | null;
};

/** Fields accepted by POST /auth/signup (multipart). */
export type RegisterShipperFields = {
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  country_code: string;
  phone: string;
  password: string;
  password_confirmation: string;
  kyc_vat_number_shipper: string;
  shipper_certificate: File;
  street_address: string;
  address_line_2?: string | null;
  city: string;
  address_country: string;
  postal_code: string;
  lat?: string | null;
  lng?: string | null;
  hear_about_us_shipper?: string | null;
  hear_about_us_other_shipper?: string | null;
  referral_code?: string | null;
  /** Must be accepted (e.g. "1" / "on" / true). */
  terms: string | boolean | number;
};

export type SignupReferenceCountryCode = {
  code: string;
  label: string;
};

export type SignupReferenceDomicile = {
  value: string;
  label: string;
};

export type SignupReferenceVehicleType = {
  id: number | string;
  name: string;
};

export type SignupReferenceData = {
  vehicle_types: SignupReferenceVehicleType[];
  country_codes: SignupReferenceCountryCode[];
  countries_domicile: SignupReferenceDomicile[];
  videos: {
    shipper?: string;
    carrier?: string;
  };
};

export type SignupReferenceResponse = {
  status: boolean;
  message?: string;
  data: SignupReferenceData;
};

export type VerifyVatResponse = {
  status?: boolean | number | string;
  valid?: boolean;
  message?: string;
  [key: string]: unknown;
};
