/**
 * addressBookData.js — Mock data for Address Book page (v2)
 * 
 * v2 changes: Added country field, COUNTRIES list, DEFAULT_DOCK_TYPES,
 * DEFAULT_LOCATION_ROLES, extensible type/dock/role arrays
 */

export const MOCK_LOCATIONS = [
  { id:'LOC-001',name:'ΒΙΚΟΣ Κεντρική Αποθήκη',company:'ΒΙΚΟΣ Α.Ε.',group:'my',city:'Ιωάννινα',region:'Ήπειρος',country:'GR',address:'7ο χλμ Ε.Ο. Ιωαννίνων-Αθηνών, 45500',lat:39.643,lng:20.878,geoVerified:true,role:'both',type:'Warehouse',appt:true,hours:'Mon-Fri 06:00–22:00 · Sat 07:00–14:00',dockTypes:['Dock-level'],equipment:['Forklift','Pallet jack'],maxTruck:'18.75m',maxWeight:'40T',adr:true,palletExchange:true,loadTime:45,contacts:[{name:'Γιώργος Μπακόλας',role:'Receiving',phone:'+30 26510 42100',email:'g.bakolas@vikos.gr'},{name:'Νίκος Δήμου',role:'Gate/Security',phone:'+30 26510 42111',email:''}],tags:['HQ','Primary'],code:'WH-IOA-01',custCode:'',lastUsed:'2h ago',shipments30:24,shipments90:68,otd:96,noteInternal:'Main loading point. 3 docks available. Gate PIN: 4821#',noteCarrier:'Report to Gate B. Driver must wear PPE.',status:'active',created:'15/03/2024'},
  { id:'LOC-002',name:'Εργοστάσιο Εμφιάλωσης',company:'ΒΙΚΟΣ Α.Ε.',group:'my',city:'Ιωάννινα',region:'Ήπειρος',country:'GR',address:'Θέση Αμπέλια, Ζίτσα, 45332',lat:39.710,lng:20.785,geoVerified:true,role:'pickup',type:'Plant',appt:true,hours:'Mon-Fri 05:00–21:00',dockTypes:['Dock-level'],equipment:['Forklift','Crane'],maxTruck:'16.5m',maxWeight:'40T',adr:false,palletExchange:true,loadTime:60,contacts:[{name:'Δημήτρης Τσίπρας',role:'Receiving',phone:'+30 26510 31200',email:'d.tsipras@vikos.gr'}],tags:['Production'],code:'PL-ZIT-01',custCode:'',lastUsed:'5h ago',shipments30:18,shipments90:52,otd:94,noteInternal:'High volume site.',noteCarrier:'Follow signs to loading bay.',status:'active',created:'15/03/2024'},
  { id:'LOC-003',name:'Σκλαβενίτης Κ. Ηρακλείου',company:'Σκλαβενίτης',group:'customer',city:'Ηράκλειο',region:'Αττική',country:'GR',address:'Λεωφ. Ηρακλείου 340, 14122',lat:38.044,lng:23.752,geoVerified:true,role:'delivery',type:'Store',appt:true,hours:'Mon-Sat 06:00–14:00',dockTypes:['Ramp'],equipment:['Pallet jack'],maxTruck:'12m',maxWeight:'19T',adr:false,palletExchange:false,loadTime:30,contacts:[{name:'Μαρία Κωστοπούλου',role:'Receiving',phone:'+30 210 2841500',email:''}],tags:['Retail','Priority'],code:'',custCode:'SKL-HRK-01',lastUsed:'1d ago',shipments30:8,shipments90:22,otd:91,noteInternal:'Strict time windows.',noteCarrier:'Use rear entrance.',status:'active',created:'20/05/2024'},
  { id:'LOC-004',name:'THE MART Μάνδρα',company:'THE MART (Makro)',group:'customer',city:'Μάνδρα',region:'Αττική',country:'GR',address:'Θέση Λιθαρί, Μάνδρα, 19600',lat:38.091,lng:23.502,geoVerified:true,role:'delivery',type:'Warehouse',appt:true,hours:'Mon-Fri 06:00–16:00',dockTypes:['Dock-level'],equipment:['Forklift','Pallet jack'],maxTruck:'18.75m',maxWeight:'40T',adr:true,palletExchange:true,loadTime:40,contacts:[{name:'Αλέξανδρος Νίκου',role:'Receiving',phone:'+30 210 5551234',email:'a.nikou@themart.gr'},{name:'Γεωργία Παπα.',role:'Gate/Security',phone:'+30 210 5551200',email:''}],tags:['DC','Key Account'],code:'',custCode:'MART-MDR-01',lastUsed:'3d ago',shipments30:6,shipments90:19,otd:89,noteInternal:'Pallet exchange mandatory.',noteCarrier:'Appointment slot mandatory.',status:'active',created:'01/06/2024'},
  { id:'LOC-005',name:'AB Βασιλόπουλος DC',company:'AB Βασιλόπουλος',group:'customer',city:'Θήβα',region:'Βοιωτία',country:'GR',address:'ΒΙ.ΠΕ. Θήβας, 32200',lat:38.310,lng:23.310,geoVerified:true,role:'delivery',type:'Cross-dock',appt:true,hours:'Mon-Sun 00:00–23:59 (24h)',dockTypes:['Dock-level'],equipment:['Forklift'],maxTruck:'18.75m',maxWeight:'40T',adr:false,palletExchange:true,loadTime:35,contacts:[{name:'Κώστας Αναγνώστου',role:'Receiving',phone:'+30 22620 89100',email:'k.anagnostou@ab.gr'}],tags:['24h','Cross-dock'],code:'',custCode:'AB-THV-DC',lastUsed:'12h ago',shipments30:10,shipments90:31,otd:93,noteInternal:'Best slots 02:00–06:00.',noteCarrier:'Check in at security.',status:'active',created:'10/04/2024'},
  { id:'LOC-006',name:'Αποθήκη Τρικάλων',company:'ΒΙΚΟΣ Α.Ε.',group:'my',city:'Τρίκαλα',region:'Θεσσαλία',country:'GR',address:'4ο χλμ Τρικάλων-Καρδίτσας, 42100',lat:39.545,lng:21.780,geoVerified:false,role:'both',type:'Warehouse',appt:false,hours:'Mon-Fri 07:00–15:00',dockTypes:['Ground-side'],equipment:['Pallet jack'],maxTruck:'12m',maxWeight:'19T',adr:false,palletExchange:false,loadTime:25,contacts:[],tags:['Secondary'],code:'WH-TRK-01',custCode:'',lastUsed:'14d ago',shipments30:2,shipments90:8,otd:100,noteInternal:'Small facility. Call ahead.',noteCarrier:'',status:'active',created:'22/07/2024'},
  { id:'LOC-007',name:'Μασούτης DC',company:'Μασούτης',group:'customer',city:'Ωραιόκαστρο',region:'Θεσσαλονίκη',country:'GR',address:'ΒΙ.ΠΕ. Ωραιοκάστρου, 57013',lat:40.685,lng:22.916,geoVerified:true,role:'delivery',type:'Warehouse',appt:true,hours:'Mon-Sat 05:00–18:00',dockTypes:['Dock-level'],equipment:['Forklift','Pallet jack'],maxTruck:'18.75m',maxWeight:'40T',adr:false,palletExchange:true,loadTime:50,contacts:[{name:'Σταύρος Τσικαλάκης',role:'Receiving',phone:'+30 2310 698200',email:'s.tsikalakis@masoutis.gr'}],tags:['DC','North Greece'],code:'',custCode:'MAS-ORK-DC',lastUsed:'6d ago',shipments30:4,shipments90:14,otd:92,noteInternal:'Large queue times Monday.',noteCarrier:'Enter from highway exit.',status:'active',created:'15/08/2024'},
  { id:'LOC-008',name:'Metro Αχαρνές',company:'Metro C&C',group:'customer',city:'Αχαρνές',region:'Αττική',country:'GR',address:'Λεωφ. Δημοκρατίας 33, 13671',lat:38.085,lng:23.741,geoVerified:true,role:'delivery',type:'Store',appt:false,hours:'Mon-Fri 06:00–14:00 · Sat 06:00–12:00',dockTypes:['Ramp'],equipment:['Pallet jack'],maxTruck:'10m',maxWeight:'12T',adr:false,palletExchange:false,loadTime:20,contacts:[{name:'Ελένη Βλάχου',role:'Receiving',phone:'+30 210 2407100',email:''}],tags:['Retail'],code:'',custCode:'MET-ACH-01',lastUsed:'8d ago',shipments30:3,shipments90:11,otd:88,noteInternal:'Tight loading bay. 10m max.',noteCarrier:'Ring bell at side entrance.',status:'active',created:'20/09/2024'},
  { id:'LOC-009',name:'Αποθήκη Καλύβια',company:'ΒΙΚΟΣ Α.Ε.',group:'my',city:'Καλύβια',region:'Αττική',country:'GR',address:'Λεωφ. Αθηνών-Σουνίου, Καλύβια 19010',lat:37.828,lng:23.921,geoVerified:true,role:'both',type:'Warehouse',appt:true,hours:'Mon-Fri 07:00–19:00',dockTypes:['Dock-level'],equipment:['Forklift','Pallet jack'],maxTruck:'18.75m',maxWeight:'40T',adr:true,palletExchange:true,loadTime:35,contacts:[{name:'Παναγιώτης Ρέππας',role:'Receiving',phone:'+30 22910 48200',email:'p.reppas@vikos.gr'},{name:'Ειρήνη Μακρή',role:'After-hours',phone:'+30 6945 123456',email:''}],tags:['Attica Hub'],code:'WH-KAL-3PL',custCode:'',lastUsed:'1d ago',shipments30:15,shipments90:42,otd:95,noteInternal:'Main Attica hub.',noteCarrier:'Dock assignment at gate.',status:'active',created:'01/02/2024'},
  { id:'LOC-010',name:'Lidl DC Θήβα',company:'Lidl Hellas',group:'customer',city:'Θήβα',region:'Βοιωτία',country:'GR',address:'ΒΙ.ΠΕ. Σχηματαρίου, 32009',lat:38.345,lng:23.405,geoVerified:true,role:'delivery',type:'Cross-dock',appt:true,hours:'Mon-Sun 00:00–23:59 (24h)',dockTypes:['Dock-level'],equipment:['Forklift'],maxTruck:'18.75m',maxWeight:'40T',adr:false,palletExchange:true,loadTime:30,contacts:[{name:'Ανδρέας Μητρόπουλος',role:'Receiving',phone:'+30 22620 57000',email:'a.mitropoulos@lidl.gr'}],tags:['24h','Cross-dock','Key Account'],code:'',custCode:'LDL-THV-DC',lastUsed:'2d ago',shipments30:7,shipments90:20,otd:90,noteInternal:'Very strict on time.',noteCarrier:'E-booking required 48h before.',status:'active',created:'11/05/2024'},
  { id:'LOC-011',name:'Γραφεία Αθήνα',company:'ΒΙΚΟΣ Α.Ε.',group:'my',city:'Μαρούσι',region:'Αττική',country:'GR',address:'Λεωφ. Κηφισίας 120, 15125',lat:38.033,lng:23.804,geoVerified:true,role:'pickup',type:'Office',appt:false,hours:'Mon-Fri 09:00–17:00',dockTypes:['Ground-side'],equipment:[],maxTruck:'7.5m',maxWeight:'3.5T',adr:false,palletExchange:false,loadTime:15,contacts:[{name:'Αθηνά Κεφάλα',role:'Reception',phone:'+30 210 6100200',email:'a.kefala@vikos.gr'}],tags:['Office','Docs only'],code:'OF-ATH-01',custCode:'',lastUsed:'30d ago',shipments30:1,shipments90:3,otd:100,noteInternal:'Documents and samples only.',noteCarrier:'Call reception.',status:'active',created:'01/01/2024'},
  { id:'LOC-012',name:'Παλαιά Αποθήκη Πάτρα',company:'ΒΙΚΟΣ Α.Ε.',group:'my',city:'Πάτρα',region:'Δ. Ελλάδα',country:'GR',address:'Ακτή Δυμαίων 80, 26333',lat:38.250,lng:21.740,geoVerified:false,role:'pickup',type:'Warehouse',appt:false,hours:'',dockTypes:['Ground-side'],equipment:[],maxTruck:'',maxWeight:'',adr:false,palletExchange:false,loadTime:0,contacts:[],tags:['Archived'],code:'WH-PAT-01',custCode:'',lastUsed:'92d ago',shipments30:0,shipments90:0,otd:0,noteInternal:'Closed since Oct 2025.',noteCarrier:'',status:'archived',created:'10/01/2023'},
];

export const MOCK_COMPANIES = [
  { id:'C-001',name:'Σκλαβενίτης',vat:'EL094493827',address:'Λεωφ. Κηφισίας 40, Μαρούσι 15125',country:'Greece',phone:'+30 210 6750800',email:'info@sklavenitis.gr',website:'www.sklavenitis.gr',contactPerson:'Ιωάννης Σκλαβενίτης',industry:'Retail'},
  { id:'C-002',name:'THE MART (Makro)',vat:'EL094002314',address:'Θέση Λιθαρί, Μάνδρα 19600',country:'Greece',phone:'+30 210 5551234',email:'info@themart.gr',website:'www.themart.gr',contactPerson:'',industry:'Wholesale'},
  { id:'C-003',name:'AB Βασιλόπουλος',vat:'EL094059468',address:'Σπάτα Αττικής, 19004',country:'Greece',phone:'+30 210 6608000',email:'info@ab.gr',website:'www.ab.gr',contactPerson:'',industry:'Retail'},
  { id:'C-004',name:'Lidl Hellas',vat:'EL094521379',address:'ΒΙ.ΠΕ. Σχηματαρίου, 32009',country:'Greece',phone:'+30 22620 57000',email:'info@lidl.gr',website:'www.lidl.gr',contactPerson:'',industry:'Retail'},
  { id:'C-005',name:'Μασούτης',vat:'EL094073560',address:'ΒΙ.ΠΕ. Ωραιοκάστρου, 57013',country:'Greece',phone:'+30 2310 698200',email:'info@masoutis.gr',website:'www.masoutis.gr',contactPerson:'',industry:'Retail'},
  { id:'C-006',name:'Metro C&C',vat:'EL094328716',address:'Λεωφ. Δημοκρατίας 33, Αχαρνές 13671',country:'Greece',phone:'+30 210 2407100',email:'info@metro.com.gr',website:'www.metro.com.gr',contactPerson:'',industry:'Retail'},
];

export const DEFAULT_DIRECTORIES = [
  { id:'all',nameKey:'addressBook.allLocations',icon:'Home',system:true,filterFn:'all' },
  { id:'my',nameKey:'addressBook.myLocations',icon:'Briefcase',system:false,filterFn:'my' },
  { id:'customer',nameKey:'addressBook.customerLocations',icon:'Users',system:false,filterFn:'customer' },
  { id:'archived',nameKey:'addressBook.archived',icon:'Archive',system:true,filterFn:'archived' },
];

export const LOCATION_TEMPLATES = [
  { id:'retail',labelKey:'addressBook.tplRetail',icon:'🏪',presets:{type:'Cross-dock',appt:true,dockTypes:['Dock-level'],hours:'Mon-Fri 06:00–16:00'}},
  { id:'factory',labelKey:'addressBook.tplFactory',icon:'🏭',presets:{type:'Plant',appt:true,dockTypes:['Dock-level'],hours:'Mon-Fri 05:00–21:00'}},
  { id:'warehouse',labelKey:'addressBook.tplWarehouse',icon:'📦',presets:{type:'Warehouse',appt:true,dockTypes:['Dock-level'],hours:'Mon-Fri 07:00–19:00'}},
  { id:'store',labelKey:'addressBook.tplStore',icon:'🛒',presets:{type:'Store',appt:false,dockTypes:['Ramp'],hours:'Mon-Sat 06:00–14:00',maxTruck:'12m',maxWeight:'19T'}},
];

export const DIRECTORY_ICON_NAMES = ['Folder','Tag','Star','Truck','Briefcase','Users','Home','Archive'];
export const CONTACT_ROLES = ['Receiving','Gate/Security','After-hours','Billing','Reception'];
export const DEFAULT_LOCATION_TYPES = ['Warehouse','Plant','Store','Office','Cross-dock','Port'];
export const DEFAULT_DOCK_TYPES = ['Dock-level','Ramp','Ground-side'];
export const DEFAULT_LOCATION_ROLES = ['both','pickup','delivery'];
export const LOCATION_TYPES = DEFAULT_LOCATION_TYPES;
export const INDUSTRIES = ['Retail','Wholesale','Manufacturing','Logistics','Food & Beverage','Other'];

export const ROLE_COLORS = {
  pickup:{bg:'#EFF6FF',fg:'#2563EB',bd:'#BFDBFE'},
  delivery:{bg:'#ECFDF5',fg:'#10B981',bd:'#A7F3D0'},
  both:{bg:'#FFFBEB',fg:'#92400E',bd:'#FDE68A'},
};
export const TYPE_COLORS = {
  Warehouse:'#0EA5E9',Plant:'#10B981',Store:'#F59E0B',Office:'#8E8E9A','Cross-dock':'#7C3AED',Port:'#0891B2',
};

export const COUNTRIES = [
  'AF','AL','DZ','AD','AO','AR','AM','AU','AT','AZ','BH','BD','BY','BE','BA','BR','BG','CA',
  'CL','CN','CO','HR','CY','CZ','DK','EG','EE','FI','FR','GE','DE','GR','HU','IS','IN','ID',
  'IQ','IE','IL','IT','JP','JO','KZ','KE','KW','LV','LB','LY','LT','LU','MK','MY','MT','MX',
  'MD','ME','MA','NL','NZ','NG','NO','OM','PK','PS','PA','PY','PE','PH','PL','PT','QA','RO',
  'RU','SA','RS','SG','SK','SI','ZA','KR','ES','SE','CH','TW','TH','TN','TR','UA','AE','GB',
  'US','UY','UZ','VE','VN',
];

export function getEmptyCreateData() {
  return {
    context:'my',company:'',template:'',
    name:'',address:'',city:'',postal:'',region:'',country:'GR',
    role:'both',type:'Warehouse',
    appt:false,hours:'',dockTypes:[],equipment:[],
    maxTruck:'',maxWeight:'',adr:false,palletExchange:false,loadTime:'',
    noteInternal:'',noteCarrier:'',
    contacts:[],code:'',custCode:'',tags:'',
    amenities:[],driverInstructions:'',arrivalNotes:'',siteContact:null,
    loadingPoints:[],siteLayout:null,
  };
}

// ── Enrich existing locations with amenities, loading points, site layout ──

const LOCATION_EXTENSIONS = {
  'LOC-001': {
    amenities: ['parking', 'wc', 'snacks', 'weighing', 'security', 'cctv', 'fuel', 'water'],
    driverInstructions: 'Enter from Gate B. Show ID at guardhouse. Proceed to parking area, wait for dock call via SMS. PPE mandatory in loading zone.',
    arrivalNotes: 'After hours delivery: call +30 26510 42100 ext. 5',
    siteContact: { name: 'Γιώργος Μπακόλας', phone: '+30 26510 42100', role: 'Warehouse manager' },
    loadingPoints: [
      { id:'LP-001',name:'Dock 1',type:'dock',status:'available',capabilities:{maxTruckLength:18.75,maxWeight:40,adr:false,temperatureControlled:false,palletExchange:true},estimatedLoadTime:45,estimatedUnloadTime:30,externalId:null,position:{x:20,y:30},sortOrder:1 },
      { id:'LP-002',name:'Dock 2',type:'dock',status:'occupied',capabilities:{maxTruckLength:18.75,maxWeight:40,adr:true,temperatureControlled:true,palletExchange:true},estimatedLoadTime:60,estimatedUnloadTime:45,externalId:null,position:{x:35,y:30},sortOrder:2 },
      { id:'LP-003',name:'Dock 3',type:'dock',status:'maintenance',capabilities:{maxTruckLength:12,maxWeight:24,adr:false,temperatureControlled:false,palletExchange:false},estimatedLoadTime:30,estimatedUnloadTime:20,externalId:null,position:{x:50,y:30},sortOrder:3 },
      { id:'LP-004',name:'Ramp A',type:'ramp',status:'available',capabilities:{maxTruckLength:7.5,maxWeight:12,adr:false,temperatureControlled:false,palletExchange:false},estimatedLoadTime:20,estimatedUnloadTime:15,externalId:null,position:{x:65,y:30},sortOrder:4 },
      { id:'LP-005',name:'Ground Bay A',type:'ground',status:'available',capabilities:{maxTruckLength:null,maxWeight:null,adr:false,temperatureControlled:false,palletExchange:true},estimatedLoadTime:60,estimatedUnloadTime:45,externalId:null,position:null,sortOrder:5 },
    ],
    siteLayout: { imageData: null, gates: [
      { id:'GATE-1',name:'Gate B — Main entrance',type:'entry',position:{x:50,y:95} },
      { id:'GATE-2',name:'Gate C — Exit',type:'exit',position:{x:80,y:95} },
    ]},
  },
  'LOC-004': {
    amenities: ['parking', 'wc', 'weighing', 'security', 'cctv', 'restArea'],
    driverInstructions: 'Appointment slot required. E-booking confirmation email must be shown at gate.',
    arrivalNotes: '',
    siteContact: { name: 'Αλέξανδρος Νίκου', phone: '+30 210 5551234', role: 'Receiving supervisor' },
    loadingPoints: [
      { id:'LP-010',name:'Dock 1',type:'dock',status:'available',capabilities:{maxTruckLength:18.75,maxWeight:40,adr:true,temperatureControlled:false,palletExchange:true},estimatedLoadTime:40,estimatedUnloadTime:30,externalId:'YMS-D01',position:{x:15,y:25},sortOrder:1 },
      { id:'LP-011',name:'Dock 2',type:'dock',status:'available',capabilities:{maxTruckLength:18.75,maxWeight:40,adr:false,temperatureControlled:true,palletExchange:true},estimatedLoadTime:40,estimatedUnloadTime:30,externalId:'YMS-D02',position:{x:35,y:25},sortOrder:2 },
      { id:'LP-012',name:'Dock 3',type:'dock',status:'closed',capabilities:{maxTruckLength:18.75,maxWeight:40,adr:false,temperatureControlled:false,palletExchange:true},estimatedLoadTime:40,estimatedUnloadTime:30,externalId:'YMS-D03',position:{x:55,y:25},sortOrder:3 },
      { id:'LP-013',name:'Dock 4',type:'dock',status:'available',capabilities:{maxTruckLength:18.75,maxWeight:40,adr:false,temperatureControlled:false,palletExchange:true},estimatedLoadTime:40,estimatedUnloadTime:30,externalId:'YMS-D04',position:{x:75,y:25},sortOrder:4 },
      { id:'LP-014',name:'Ramp B',type:'ramp',status:'available',capabilities:{maxTruckLength:12,maxWeight:19,adr:false,temperatureControlled:false,palletExchange:false},estimatedLoadTime:25,estimatedUnloadTime:20,externalId:null,position:{x:45,y:65},sortOrder:5 },
      { id:'LP-015',name:'Ground C',type:'ground',status:'available',capabilities:{maxTruckLength:null,maxWeight:null,adr:false,temperatureControlled:false,palletExchange:false},estimatedLoadTime:50,estimatedUnloadTime:40,externalId:null,position:null,sortOrder:6 },
    ],
    siteLayout: { imageData: null, gates: [
      { id:'GATE-10',name:'Gate 1 — Entry',type:'entry',position:{x:50,y:95} },
      { id:'GATE-11',name:'Gate 2 — Exit',type:'exit',position:{x:85,y:95} },
    ]},
  },
  'LOC-007': {
    amenities: ['parking', 'wc', 'fuel', 'restArea', 'water', 'weighing'],
    driverInstructions: 'Enter from highway exit. Follow signs to warehouse loading area. Gate code: 5522#',
    arrivalNotes: 'Monday mornings have large queue times — aim for Tuesday–Friday.',
    siteContact: { name: 'Σταύρος Τσικαλάκης', phone: '+30 2310 698200', role: 'Shift manager' },
    loadingPoints: [
      { id:'LP-020',name:'Ramp 1',type:'ramp',status:'available',capabilities:{maxTruckLength:18.75,maxWeight:40,adr:false,temperatureControlled:false,palletExchange:true},estimatedLoadTime:50,estimatedUnloadTime:40,externalId:null,position:{x:30,y:40},sortOrder:1 },
      { id:'LP-021',name:'Ramp 2',type:'ramp',status:'occupied',capabilities:{maxTruckLength:18.75,maxWeight:40,adr:false,temperatureControlled:true,palletExchange:true},estimatedLoadTime:50,estimatedUnloadTime:40,externalId:null,position:{x:60,y:40},sortOrder:2 },
      { id:'LP-022',name:'Ground East',type:'ground',status:'available',capabilities:{maxTruckLength:null,maxWeight:null,adr:false,temperatureControlled:false,palletExchange:false},estimatedLoadTime:60,estimatedUnloadTime:45,externalId:null,position:null,sortOrder:3 },
    ],
    siteLayout: { imageData: null, gates: [] },
  },
  'LOC-009': {
    amenities: ['parking', 'wc', 'security', 'cctv', 'weighing', 'electric'],
    driverInstructions: 'Dock assignment given at gate. Wait at parking zone until dock number is called.',
    arrivalNotes: '',
    siteContact: { name: 'Παναγιώτης Ρέππας', phone: '+30 22910 48200', role: 'Warehouse manager' },
    loadingPoints: [],
    siteLayout: null,
  },
};

// Apply enrichment
MOCK_LOCATIONS.forEach((loc) => {
  const ext = LOCATION_EXTENSIONS[loc.id];
  if (ext) Object.assign(loc, ext);
  // Ensure all locations have the new field defaults
  if (!loc.amenities) loc.amenities = [];
  if (!loc.driverInstructions) loc.driverInstructions = '';
  if (!loc.arrivalNotes) loc.arrivalNotes = '';
  if (!loc.siteContact) loc.siteContact = null;
  if (!loc.loadingPoints) loc.loadingPoints = [];
  if (!loc.siteLayout) loc.siteLayout = null;
});
