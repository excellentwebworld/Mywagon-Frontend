/**
 * ssoData.js — SSO configuration mock data.
 */

export const SSO_PROVIDERS = [
  { key: 'azure_ad', label: 'Microsoft Entra ID (Azure AD)', protocol: 'saml', icon: '🔷' },
  { key: 'google', label: 'Google Workspace', protocol: 'saml', icon: '🔴' },
  { key: 'okta', label: 'Okta', protocol: 'saml', icon: '🔵' },
  { key: 'onelogin', label: 'OneLogin', protocol: 'saml', icon: '🟣' },
  { key: 'jumpcloud', label: 'JumpCloud', protocol: 'saml', icon: '🟢' },
  { key: 'saml_custom', label: 'Custom SAML 2.0', protocol: 'saml', icon: '🔒' },
  { key: 'oidc_custom', label: 'Custom OIDC', protocol: 'oidc', icon: '🔑' },
];

export const SSO_CONFIG = {
  enabled: true,
  provider: 'azure_ad',
  providerLabel: 'Microsoft Entra ID (Azure AD)',
  protocol: 'saml',
  domain: 'vikos.com',
  domainVerified: true,
  domainVerificationMethod: 'dns_txt',
  enforcement: 'required_with_exceptions',
  exceptionEmails: ['pavlos@vikos.com'],

  sp: {
    acsUrl: 'https://auth.myvagon.com/sso/saml/acs/ORG-001',
    entityId: 'https://auth.myvagon.com/sso/saml/entity/ORG-001',
    signOnUrl: 'https://app.myvagon.com/login',
  },

  idp: {
    metadataUrl: 'https://login.microsoftonline.com/tenant-id/federationmetadata/2007-06/federationmetadata.xml',
    ssoUrl: 'https://login.microsoftonline.com/tenant-id/saml2',
    issuer: 'https://sts.windows.net/tenant-id/',
    certificateExpiry: '2026-11-14',
    signatureAlgorithm: 'sha256',
    requestSigning: false,
  },

  attributeMapping: {
    email: 'email', firstName: 'givenName', lastName: 'surname',
    phone: 'telephoneNumber', department: 'department', jobTitle: 'jobTitle',
  },

  provisioning: {
    scimEnabled: true,
    scimEndpoint: 'https://api.myvagon.com/scim/v2/ORG-001',
    defaultRole: 'dispatcher',
    usersSynced: 9,
    totalUsers: 9,
    lastSync: '2026-05-09T08:00:00Z',
  },

  health: {
    lastSuccessfulLogin: { user: 'Maria K.', timestamp: '2026-05-09T09:10:00Z' },
    lastFailedLogin: { timestamp: '2026-05-07T14:30:00Z', reason: 'Certificate mismatch — resolved' },
  },

  stats: {
    ssoLogins30d: 342,
    passwordLogins30d: 3,
    failedSso30d: 2,
    newUsersScim: 1,
  },

  activatedAt: '2026-01-20T10:00:00Z',
};

export const DOMAIN_VERIFICATION_TOKEN = 'myvagon-domain-verify=org001-a8f3b2c1d4e5';
