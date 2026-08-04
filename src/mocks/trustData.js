/**
 * trustData.js — Mock data for Trust Center page (/trust).
 *
 * Drives: TopBar shield status dot, Hero card, Platform Status grid,
 * 90-day uptime bar, Security Pillars, Infrastructure, Encryption Stack,
 * Compliance & Standards, Org Security Posture.
 *
 * All translatable strings carry { en, el } objects — the component
 * picks the right value via i18n.language.
 */

// ── Helpers ─────────────────────────────────────────────────────

function generateUptimeHistory() {
  const days = [];
  const today = new Date('2026-05-10');
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const dayIndex = 89 - i; // 0 = oldest, 89 = today
    if (dayIndex === 44) {
      // ~27 Mar — DB failover
      days.push({ date: iso, uptime: 99.97, note: { en: 'Brief connectivity issue — 4 min degraded', el: 'Σύντομο πρόβλημα συνδεσιμότητας — 4 λεπτά υποβάθμιση' } });
    } else if (dayIndex === 59) {
      // ~11 Mar — scheduled maintenance
      days.push({ date: iso, uptime: 99.99, note: { en: 'Scheduled maintenance — 1 min', el: 'Προγραμματισμένη συντήρηση — 1 λεπτό' } });
    } else {
      days.push({ date: iso, uptime: 100 });
    }
  }
  return days;
}

function generate24hSparkline(degradedHour) {
  return Array.from({ length: 24 }, (_, i) => (i === degradedHour ? 'degraded' : 'up'));
}

// ── Platform Status ─────────────────────────────────────────────

export const PLATFORM_STATUS = {
  overall: 'operational', // 'operational' | 'degraded' | 'outage' | 'maintenance'
  services: [
    { id: 'api',      name: { en: 'API Gateway',      el: 'API Gateway' },         status: 'operational', metric: '12ms avg', metricLabel: { en: 'Response time', el: 'Χρόνος απόκρισης' }, uptime: 99.99, sparkline: generate24hSparkline(-1) },
    { id: 'web',      name: { en: 'Web Application',   el: 'Εφαρμογή Web' },       status: 'operational', metric: '99.99%',   metricLabel: { en: 'Uptime',        el: 'Διαθεσιμότητα' },    uptime: 99.99, sparkline: generate24hSparkline(-1) },
    { id: 'database', name: { en: 'Database',           el: 'Βάση Δεδομένων' },     status: 'operational', metric: '99.99%',   metricLabel: { en: 'Uptime',        el: 'Διαθεσιμότητα' },    uptime: 99.99, sparkline: generate24hSparkline(-1) },
    { id: 'storage',  name: { en: 'File Storage',       el: 'Αποθήκευση Αρχείων' }, status: 'operational', metric: '99.99%',   metricLabel: { en: 'Uptime',        el: 'Διαθεσιμότητα' },    uptime: 99.99, sparkline: generate24hSparkline(-1) },
    { id: 'auth',     name: { en: 'Authentication',     el: 'Αυθεντικοποίηση' },    status: 'operational', metric: '99.99%',   metricLabel: { en: 'Uptime',        el: 'Διαθεσιμότητα' },    uptime: 99.99, sparkline: generate24hSparkline(-1) },
    { id: 'ai',       name: { en: 'AI Services',        el: 'Υπηρεσίες AI' },       status: 'operational', metric: '99.98%',   metricLabel: { en: 'Uptime',        el: 'Διαθεσιμότητα' },    uptime: 99.98, sparkline: generate24hSparkline(3) },
  ],
  uptimeHistory: generateUptimeHistory(),
  overallUptime90Days: 99.99,
  lastIncident: {
    date: '2026-03-27',
    title:       { en: 'Brief connectivity issue', el: 'Σύντομο πρόβλημα συνδεσιμότητας' },
    description: {
      en: 'A brief connectivity issue in the Frankfurt (eu-central-1) environment was mitigated by the load balancer and Auto Scaling. Service recovered quickly. No data was lost.',
      el: 'Ένα σύντομο πρόβλημα συνδεσιμότητας στο περιβάλλον της Φρανκφούρτης (eu-central-1) αντιμετωπίστηκε από το load balancer και το Auto Scaling. Η υπηρεσία επανήλθε γρήγορα. Δεν χάθηκαν δεδομένα.',
    },
    duration: '4 minutes',
    impact: 'minor',
    dataLoss: 'none',
    status: 'resolved',
  },
};

// ── Security Audit Dates ────────────────────────────────────────

export const SECURITY_DATES = {
  lastSecurityAudit:    '2026-03-15',
  lastPenetrationTest:  '2026-02-01',
  nextScheduledAudit:   '2026-09-15',
  lastDrDrill:          '2026-01-20',
};

// ── Security Pillars ────────────────────────────────────────────

export const SECURITY_PILLARS = [
  {
    id: 'encryptionAtRest',
    icon: 'Lock',
    title:       { en: 'Encryption at Rest',         el: 'Κρυπτογράφηση σε Αδράνεια' },
    description: { en: 'All data encrypted with AES-256 via AWS KMS. Keys stored in hardware security modules (HSMs).', el: 'Όλα τα δεδομένα κρυπτογραφημένα με AES-256 μέσω AWS KMS. Κλειδιά αποθηκευμένα σε μονάδες ασφαλείας υλικού (HSMs).' },
    tags: ['AES-256', 'AWS KMS', 'HSM'],
    statusLabel: { en: 'Active', el: 'Ενεργό' },
  },
  {
    id: 'encryptionInTransit',
    icon: 'ShieldCheck',
    title:       { en: 'Encryption in Transit',      el: 'Κρυπτογράφηση στη Μεταφορά' },
    description: { en: 'Every connection protected with TLS 1.3 and perfect forward secrecy. Certificates via AWS Certificate Manager.', el: 'Κάθε σύνδεση προστατεύεται με TLS 1.3 και τέλεια μυστικότητα μεταβίβασης. Πιστοποιητικά μέσω AWS Certificate Manager.' },
    tags: ['TLS 1.3', 'PFS', 'ACM'],
    statusLabel: { en: 'Active', el: 'Ενεργό' },
  },
  {
    id: 'accessControl',
    icon: 'Shield',
    title:       { en: 'Access Control',              el: 'Έλεγχος Πρόσβασης' },
    description: { en: 'Role-based access control (RBAC) with least-privilege policies. MFA enforced across all critical systems.', el: 'Έλεγχος πρόσβασης βάσει ρόλου (RBAC) με πολιτικές ελάχιστων δικαιωμάτων. MFA επιβεβλημένο σε όλα τα κρίσιμα συστήματα.' },
    tags: ['RBAC', 'MFA', 'IAM'],
    statusLabel: { en: 'Enforced', el: 'Επιβεβλημένο' },
  },
  {
    id: 'auditLogging',
    icon: 'ClipboardList',
    title:       { en: 'Audit Logging',               el: 'Καταγραφή Ελέγχου' },
    description: { en: 'Complete audit trail via AWS CloudTrail. Immutable logs in encrypted S3 bucket with write-once policy.', el: 'Πλήρες ιστορικό ελέγχου μέσω AWS CloudTrail. Αμετάβλητα αρχεία σε κρυπτογραφημένο S3 bucket με πολιτική μίας εγγραφής.' },
    tags: ['CloudTrail', 'S3', 'WORM'],
    statusLabel: { en: 'Recording', el: 'Καταγραφή' },
  },
  {
    id: 'monitoring',
    icon: 'Eye',
    title:       { en: '24/7 Monitoring',             el: 'Παρακολούθηση 24/7' },
    description: { en: 'AWS GuardDuty for threat detection, AWS WAF for web protection, and real-time automated alerting.', el: 'AWS GuardDuty για ανίχνευση απειλών, AWS WAF για προστασία web, και αυτοματοποιημένες ειδοποιήσεις πραγματικού χρόνου.' },
    tags: ['GuardDuty', 'WAF', 'CloudWatch'],
    statusLabel: { en: 'Monitoring', el: 'Παρακολούθηση' },
  },
  {
    id: 'secureDev',
    icon: 'Code',
    title:       { en: 'Secure Development',          el: 'Ασφαλής Ανάπτυξη' },
    description: { en: 'Secure SDLC with automated vulnerability scanning, code reviews, and regular penetration testing.', el: 'Ασφαλής SDLC με αυτοματοποιημένη σάρωση ευπαθειών, αναθεωρήσεις κώδικα, και τακτικό penetration testing.' },
    tags: ['SDLC', 'CI/CD', 'SAST/DAST'],
    statusLabel: { en: 'Active', el: 'Ενεργό' },
  },
];

// ── Encryption Stack ────────────────────────────────────────────

export const ENCRYPTION_STACK = [
  { layer: { en: 'Data at rest',      el: 'Δεδομένα σε αδράνεια' },     technology: 'AES-256-GCM',              status: 'active' },
  { layer: { en: 'Data in transit',   el: 'Δεδομένα σε μεταφορά' },     technology: 'TLS 1.3',                   status: 'active' },
  { layer: { en: 'Key management',    el: 'Διαχείριση κλειδιών' },      technology: 'AWS KMS + HSM',             status: 'active' },
  { layer: { en: 'Backups',           el: 'Αντίγραφα ασφαλείας' },      technology: 'AES-256 · eu-central-1',    status: 'active' },
  { layer: { en: 'User passwords',    el: 'Κωδικοί χρηστών' },          technology: 'bcrypt + salt (cost 12)',    status: 'active' },
  { layer: { en: 'API tokens',        el: 'Κλειδιά API' },              technology: 'SHA-256 hashed',            status: 'active' },
  { layer: { en: 'Webhook secrets',   el: 'Μυστικά Webhook' },          technology: 'HMAC-SHA256',               status: 'active' },
];

// ── Infrastructure (confirmed: AWS eu-central-1 + ALB + Auto Scaling) ──

export const INFRASTRUCTURE = [
  {
    code: 'eu-central-1',
    city: { en: 'Frankfurt', el: 'Φρανκφούρτη' },
    role: 'primary',
    status: 'operational',
    description: {
      en: 'Primary AWS region. Production workloads, database (RDS), and file storage (S3).',
      el: 'Κύρια περιοχή AWS. Παραγωγικά φορτία, βάση δεδομένων (RDS) και αποθήκευση αρχείων (S3).',
    },
  },
  {
    code: 'ALB',
    city: { en: 'Load Balancer', el: 'Load Balancer' },
    role: 'load_balancer',
    status: 'operational',
    description: {
      en: 'AWS Application Load Balancer distributes traffic across healthy instances for high availability.',
      el: 'Το AWS Application Load Balancer κατανέμει την κίνηση σε υγιείς instances για υψηλή διαθεσιμότητα.',
    },
  },
  {
    code: 'ASG',
    city: { en: 'Auto Scaling', el: 'Auto Scaling' },
    role: 'autoscaling',
    status: 'operational',
    description: {
      en: 'Auto Scaling Group scales capacity up or down with demand to keep performance stable.',
      el: 'Το Auto Scaling Group αυξομειώνει τη χωρητικότητα ανάλογα με τη ζήτηση για σταθερή απόδοση.',
    },
  },
];

// ── Compliance Certifications ───────────────────────────────────

export const CERTIFICATIONS = [
  { name: 'GDPR',      status: 'compliant',   description: { en: 'EU General Data Protection Regulation',  el: 'Γενικός Κανονισμός Προστασίας Δεδομένων ΕΕ' } },
  { name: 'ISO 27001', status: 'compliant',   via: 'AWS DCs', description: { en: 'Information Security Management',       el: 'Διαχείριση Ασφάλειας Πληροφοριών' } },
  { name: 'SOC 2',     status: 'compliant',   via: 'AWS DCs', description: { en: 'Service Organization Controls',          el: 'Έλεγχοι Οργανισμού Υπηρεσιών' } },
  { name: 'eIDAS',     status: 'coming_soon', description: { en: 'EU Electronic Identification',           el: 'Ηλεκτρονική Ταυτοποίηση ΕΕ' } },
];

// ── Compliance Detail Rows ──────────────────────────────────────

export const COMPLIANCE_DETAILS = [
  {
    id: 'gdpr',
    icon: 'Flag',
    title: { en: 'GDPR', el: 'GDPR' },
    description: {
      en: 'Full compliance with the EU General Data Protection Regulation. Data Processing Agreements available for all customers. Data Subject Access Requests processed within 30 days. Annual Data Protection Impact Assessments.',
      el: 'Πλήρης συμμόρφωση με τον Γενικό Κανονισμό Προστασίας Δεδομένων ΕΕ. Συμφωνίες Επεξεργασίας Δεδομένων διαθέσιμες για όλους τους πελάτες. Αιτήσεις Πρόσβασης Υποκειμένων Δεδομένων εντός 30 ημερών. Ετήσιες Αξιολογήσεις Αντικτύπου.',
    },
  },
  {
    id: 'backups',
    icon: 'HardDrive',
    title: { en: 'Automated Backups', el: 'Αυτοματοποιημένα Αντίγραφα' },
    description: {
      en: 'Daily snapshots with point-in-time recovery capability in AWS eu-central-1 (Frankfurt).',
      el: 'Καθημερινά στιγμιότυπα με δυνατότητα ανάκτησης ανά χρονικό σημείο στο AWS eu-central-1 (Φρανκφούρτη).',
    },
  },
  {
    id: 'network',
    icon: 'Globe',
    title: { en: 'Network Security', el: 'Ασφάλεια Δικτύου' },
    description: {
      en: 'Traffic enters via AWS Application Load Balancer. Auto Scaling keeps capacity aligned with demand. Hosted in AWS eu-central-1 (Frankfurt).',
      el: 'Η κίνηση εισέρχεται μέσω AWS Application Load Balancer. Το Auto Scaling προσαρμόζει τη χωρητικότητα στη ζήτηση. Φιλοξενία στο AWS eu-central-1 (Φρανκφούρτη).',
    },
  },
  {
    id: 'dr',
    icon: 'RefreshCw',
    title: { en: 'High Availability', el: 'Υψηλή Διαθεσιμότητα' },
    description: {
      en: 'Load balancing and Auto Scaling in AWS Frankfurt (eu-central-1) keep the platform available under changing load.',
      el: 'Load balancing και Auto Scaling στο AWS Φρανκφούρτη (eu-central-1) διατηρούν την πλατφόρμα διαθέσιμη υπό μεταβαλλόμενο φορτίο.',
    },
  },
  {
    id: 'physical',
    icon: 'Building2',
    title: { en: 'Physical Security', el: 'Φυσική Ασφάλεια' },
    description: {
      en: 'Hosted in AWS data centers in Frankfurt (eu-central-1). Physical security is managed by AWS.',
      el: 'Φιλοξενείται σε data centers AWS στη Φρανκφούρτη (eu-central-1). Η φυσική ασφάλεια διαχειρίζεται από την AWS.',
    },
  },
  {
    id: 'privacy',
    icon: 'LockKeyhole',
    title: { en: 'Data Privacy', el: 'Απόρρητο Δεδομένων' },
    description: {
      en: 'We never sell your data. Minimal data collection principle. Full transparency on data processing. Privacy-by-design architecture. Annual privacy impact assessments.',
      el: 'Δεν πουλάμε ποτέ τα δεδομένα σας. Αρχή ελάχιστης συλλογής δεδομένων. Πλήρης διαφάνεια στην επεξεργασία. Αρχιτεκτονική ιδιωτικότητας εκ σχεδιασμού. Ετήσιες αξιολογήσεις αντικτύπου.',
    },
  },
];

// ── Organization Security Posture ───────────────────────────────

export const ORG_SECURITY_POSTURE = {
  kyc:            { status: 'verified',  since: '2024-10-20', renewsAt: '2025-10-20' },
  sso:            { enabled: true,       provider: 'Azure AD', usersViaSso: 9 },
  mfa:            { totalUsers: 9,       usersWithMfa: 7, enforced: false },
  passwordPolicy: { strength: 'strong',  minLength: 12, requireUppercase: true, requireNumbers: true, requireSpecial: false },
};
