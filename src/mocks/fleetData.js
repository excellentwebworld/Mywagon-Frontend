/**
 * fleetData.js — Mock data for My Fleet module (v2).
 * Nested costs/stats, cargoSpecs, fuelType, getCombinedCostPerKm for Price Lists.
 */

export const DRIVER_STATUSES = ['available', 'on_trip', 'unavailable', 'suspended'];
export const VEHICLE_STATUSES = ['available', 'assigned', 'maintenance', 'decommissioned'];
export const LICENSE_TYPES = ['B', 'C', 'C1', 'CE', 'D'];
export const EURO_CLASSES = ['euro3', 'euro4', 'euro5', 'euro6', 'euro6d'];
export const EURO_LABELS = { euro3: 'Euro 3', euro4: 'Euro 4', euro5: 'Euro 5', euro6: 'Euro 6', euro6d: 'Euro 6d' };
export const FUEL_TYPES = ['diesel', 'biodiesel', 'lng', 'cng', 'electric'];
export const TRUCK_MAKES = ['Volvo', 'MAN', 'Mercedes', 'Scania', 'DAF', 'Iveco', 'Renault'];

export const VEHICLE_TYPE_TAXONOMY = {
  semi_trailer: { label: 'Semi-Trailer', sub: 'Tilt trailer', icon: '🚛', dry: ['curtainside','box','platform','flatbed'], reefer: ['temperature_controlled','multi_temp'], other: ['tanker','silo'] },
  truck_with_trailer: { label: 'Truck with Trailer', sub: 'Curtainsider', icon: '🚚', dry: ['standard','mega'], reefer: ['refrigerated'], other: [] },
  rigid: { label: 'Rigid Truck (7–12T)', sub: '7.5T – 12.0T', icon: '🚚', dry: ['box','flatbed'], reefer: ['refrigerated'], other: [] },
  van: { label: 'Van', sub: 'Van / LCV', icon: '🚐', dry: ['small_van','large_van'], reefer: ['refrigerated_van'], other: [] },
};
export const CARGO_LABELS = { curtainside:'Curtainside', box:'Box', platform:'Platform', flatbed:'Flatbed', temperature_controlled:'Temperature-controlled', multi_temp:'Multi-temp', tanker:'Tanker', silo:'Silo', standard:'Standard', mega:'Mega (3m+)', refrigerated:'Refrigerated', small_van:'Small Van', large_van:'Large Van (Sprinter)', refrigerated_van:'Refrigerated Van' };

export const DRIVER_STATUS_COLORS = { available:{bg:'#D1FAE5',fg:'#059669',bd:'#A7F3D0'}, on_trip:{bg:'#DBEAFE',fg:'#2563EB',bd:'#BFDBFE'}, unavailable:{bg:'#F3F4F6',fg:'#6B7280',bd:'#D1D5DB'}, suspended:{bg:'#FEE2E2',fg:'#DC2626',bd:'#FECACA'} };
export const VEHICLE_STATUS_COLORS = { available:{bg:'#D1FAE5',fg:'#059669',bd:'#A7F3D0'}, assigned:{bg:'#DBEAFE',fg:'#2563EB',bd:'#BFDBFE'}, paired:{bg:'#EDE9FE',fg:'#7C3AED',bd:'#C4B5FD'}, maintenance:{bg:'#FEF3C7',fg:'#92400E',bd:'#FDE68A'}, decommissioned:{bg:'#F3F4F6',fg:'#6B7280',bd:'#D1D5DB'} };

export const MOCK_DRIVERS = [
  { id:'DRV-001',firstName:'Μαρία',lastName:'Δημητρίου',phone:'+30 697 332 1124',email:'maria.d@vagon.gr',dateOfBirth:'1990-11-03',nationality:'GR',licenseTypes:['C','CE'],licenseNumber:'GR-112-3344-5566',licenseExpiry:'2028-03-15',adrCertified:true,tachographCardNumber:'GR-0011223344',status:'available',unavailableReason:null,assignedTruckId:null,currentLoadId:null,costs:{costPerHour:14.00,avgDrivingHoursPerDay:9},stats:{totalTrips:189,tripsPerWeek:3.5,rating:4.9,ratingCount:45,onTimePercent:98,avgKmPerTrip:380,avgLoadTonnes:18.2,shippersWorkedWith:24,tripsLast7Days:0},lastActive:'Today' },
  { id:'DRV-002',firstName:'Αλέξανδρος',lastName:'Νικολάου',phone:'+30 695 880 1199',email:'alex.n@vagon.gr',dateOfBirth:'1992-04-08',nationality:'GR',licenseTypes:['C'],licenseNumber:'GR-334-5566-7788',licenseExpiry:'2027-11-20',adrCertified:false,tachographCardNumber:'GR-0055667788',status:'available',unavailableReason:null,assignedTruckId:null,currentLoadId:null,costs:{costPerHour:13.00,avgDrivingHoursPerDay:8},stats:{totalTrips:67,tripsPerWeek:1.8,rating:4.3,ratingCount:12,onTimePercent:88,avgKmPerTrip:310,avgLoadTonnes:14.0,shippersWorkedWith:6,tripsLast7Days:0},lastActive:'Yesterday' },
  { id:'DRV-003',firstName:'Ελένη',lastName:'Παπαδοπούλου',phone:'+30 694 920 1043',email:'eleni.p@vagon.gr',dateOfBirth:'1988-09-30',nationality:'GR',licenseTypes:['B','C1'],licenseNumber:'GR-556-7788-9900',licenseExpiry:'2029-01-10',adrCertified:false,tachographCardNumber:null,status:'available',unavailableReason:null,assignedTruckId:null,currentLoadId:null,costs:{costPerHour:12.50,avgDrivingHoursPerDay:8},stats:{totalTrips:34,tripsPerWeek:1.2,rating:4.5,ratingCount:8,onTimePercent:92,avgKmPerTrip:180,avgLoadTonnes:8.0,shippersWorkedWith:4,tripsLast7Days:0},lastActive:'3 days ago' },
  { id:'DRV-004',firstName:'Κώστας',lastName:'Αντωνίου',phone:'+30 697 712 3382',email:'kostas.a@vagon.gr',dateOfBirth:'1995-10-05',nationality:'GR',licenseTypes:['B'],licenseNumber:'GR-001-2233-4455',licenseExpiry:'2030-01-01',adrCertified:false,tachographCardNumber:null,status:'available',unavailableReason:null,assignedTruckId:'TRK-005',currentLoadId:null,costs:{costPerHour:11.00,avgDrivingHoursPerDay:8},stats:{totalTrips:112,tripsPerWeek:2.5,rating:4.1,ratingCount:22,onTimePercent:85,avgKmPerTrip:120,avgLoadTonnes:2.8,shippersWorkedWith:10,tripsLast7Days:0},lastActive:'6 hours ago' },
  { id:'DRV-005',firstName:'Νίκος',lastName:'Καραγιάννης',phone:'+30 694 421 8821',email:'nikos.k@vagon.gr',dateOfBirth:'1985-03-15',nationality:'GR',licenseTypes:['C','CE'],licenseNumber:'GR-928-1029-3847',licenseExpiry:'2028-06-30',adrCertified:true,tachographCardNumber:'GR-0012345678',status:'on_trip',unavailableReason:null,assignedTruckId:'TRK-001',currentLoadId:'LD-8821',costs:{costPerHour:14.50,avgDrivingHoursPerDay:9},stats:{totalTrips:156,tripsPerWeek:3.2,rating:4.7,ratingCount:23,onTimePercent:94,avgKmPerTrip:385,avgLoadTonnes:18.5,shippersWorkedWith:8,tripsLast7Days:3},lastActive:'2 hours ago' },
  { id:'DRV-006',firstName:'Γιώργος',lastName:'Μαυρίδης',phone:'+30 695 110 8742',email:'giorgos.m@vagon.gr',dateOfBirth:'1983-07-21',nationality:'GR',licenseTypes:['C','CE'],licenseNumber:'GR-445-6677-8899',licenseExpiry:'2026-12-01',adrCertified:true,tachographCardNumber:'GR-0098765432',status:'on_trip',unavailableReason:null,assignedTruckId:'TRK-002',currentLoadId:'LD-8835',costs:{costPerHour:15.00,avgDrivingHoursPerDay:9},stats:{totalTrips:203,tripsPerWeek:3.8,rating:4.8,ratingCount:38,onTimePercent:96,avgKmPerTrip:520,avgLoadTonnes:26.1,shippersWorkedWith:14,tripsLast7Days:4},lastActive:'12 min ago' },
  { id:'DRV-007',firstName:'Δημήτρης',lastName:'Παναγιώτου',phone:'+30 698 552 9211',email:'dimitris.p@vagon.gr',dateOfBirth:'1978-02-14',nationality:'GR',licenseTypes:['C'],licenseNumber:'GR-223-4455-6677',licenseExpiry:'2026-06-30',adrCertified:false,tachographCardNumber:'GR-0033445566',status:'on_trip',unavailableReason:null,assignedTruckId:'TRK-004',currentLoadId:'LD-8842',costs:{costPerHour:13.00,avgDrivingHoursPerDay:9},stats:{totalTrips:89,tripsPerWeek:2.0,rating:4.2,ratingCount:15,onTimePercent:82,avgKmPerTrip:210,avgLoadTonnes:10.5,shippersWorkedWith:5,tripsLast7Days:2},lastActive:'1 hour ago' },
  { id:'DRV-008',firstName:'Παναγιώτης',lastName:'Θεοδώρου',phone:'+30 698 119 5538',email:'panagiotis.t@vagon.gr',dateOfBirth:'1987-12-15',nationality:'GR',licenseTypes:['C','CE'],licenseNumber:'GR-778-8899-0011',licenseExpiry:'2028-05-01',adrCertified:false,tachographCardNumber:'GR-0077889900',status:'on_trip',unavailableReason:null,assignedTruckId:'TRK-003',currentLoadId:'LD-8850',costs:{costPerHour:14.00,avgDrivingHoursPerDay:9},stats:{totalTrips:134,tripsPerWeek:2.8,rating:4.6,ratingCount:28,onTimePercent:91,avgKmPerTrip:445,avgLoadTonnes:24.0,shippersWorkedWith:11,tripsLast7Days:3},lastActive:'38 min ago' },
  { id:'DRV-009',firstName:'Σπύρος',lastName:'Βασιλείου',phone:'+30 694 728 9914',email:'spyros.v@vagon.gr',dateOfBirth:'1982-01-25',nationality:'GR',licenseTypes:['C','CE'],licenseNumber:'GR-112-2233-4455',licenseExpiry:'2028-09-15',adrCertified:true,tachographCardNumber:'GR-0044556677',status:'unavailable',unavailableReason:'leave',assignedTruckId:null,currentLoadId:null,costs:{costPerHour:14.50,avgDrivingHoursPerDay:9},stats:{totalTrips:178,tripsPerWeek:0,rating:4.4,ratingCount:30,onTimePercent:89,avgKmPerTrip:400,avgLoadTonnes:19.5,shippersWorkedWith:12,tripsLast7Days:0},lastActive:'4 days ago' },
  { id:'DRV-010',firstName:'Θανάσης',lastName:'Γεωργίου',phone:'+30 697 220 4471',email:'thanasis.g@vagon.gr',dateOfBirth:'1975-08-09',nationality:'GR',licenseTypes:['C'],licenseNumber:'GR-667-7788-9900',licenseExpiry:'2026-04-01',adrCertified:false,tachographCardNumber:'GR-0066778899',status:'unavailable',unavailableReason:'sick',assignedTruckId:null,currentLoadId:null,costs:{costPerHour:13.50,avgDrivingHoursPerDay:8},stats:{totalTrips:56,tripsPerWeek:0,rating:3.9,ratingCount:10,onTimePercent:78,avgKmPerTrip:280,avgLoadTonnes:12.0,shippersWorkedWith:7,tripsLast7Days:0},lastActive:'8 days ago' },
  { id:'DRV-011',firstName:'Βαγγέλης',lastName:'Ιωάννου',phone:'+30 698 330 2218',email:'vangelis.i@vagon.gr',dateOfBirth:'1980-03-12',nationality:'GR',licenseTypes:['C','CE'],licenseNumber:'GR-889-9900-1122',licenseExpiry:'2027-07-15',adrCertified:false,tachographCardNumber:null,status:'suspended',unavailableReason:null,assignedTruckId:null,currentLoadId:null,costs:{costPerHour:13.00,avgDrivingHoursPerDay:9},stats:{totalTrips:45,tripsPerWeek:0,rating:3.8,ratingCount:8,onTimePercent:79,avgKmPerTrip:350,avgLoadTonnes:18.0,shippersWorkedWith:5,tripsLast7Days:0},lastActive:'3 weeks ago' },
  { id:'DRV-012',firstName:'Ανδρέας',lastName:'Χατζηπέτρου',phone:'+30 695 440 7821',email:'andreas.ch@vagon.gr',dateOfBirth:'1996-06-22',nationality:'GR',licenseTypes:['C'],licenseNumber:'GR-001-1122-3344',licenseExpiry:'2030-06-01',adrCertified:false,tachographCardNumber:null,status:'available',unavailableReason:null,assignedTruckId:null,currentLoadId:null,costs:null,stats:{totalTrips:0,tripsPerWeek:0,rating:0,ratingCount:0,onTimePercent:0,avgKmPerTrip:0,avgLoadTonnes:0,shippersWorkedWith:0,tripsLast7Days:0},lastActive:'Just added' },
];

export const MOCK_TRUCKS = [
  { id:'TRK-001',category:'truck',vehicleType:'semi_trailer',make:'Volvo',model:'FH 500 4x2',year:2022,euroClass:'euro6',plateNumber:'ΚΗΙ-4521',maxWeightTonnes:40,maxLengthMeters:18.75,adrEquipped:true,fuelType:'diesel',gpsTrackerId:'TT-09182',cargoSpecs:['curtainside','box'],tempRangeMin:null,tempRangeMax:null,status:'assigned',assignedDriverId:'DRV-005',pairedTrailerId:'TRL-001',costs:{maintenanceCostPerKm:0.09,insuranceCostPerDay:38,depreciationPerKm:0.06,avgConsumptionL100Km:35},stats:{totalTrips:243,totalKm:94500,daysSinceLastTrip:0,utilizationPercent:78,avgLoadTonnes:22.3,tripsLast7Days:4,lastMaintenanceDate:'2026-03-01',nextKteoDate:'2026-09-15'},lastActive:'2 hours ago' },
  { id:'TRK-002',category:'truck',vehicleType:'semi_trailer',make:'MAN',model:'TGX 18.510',year:2021,euroClass:'euro6',plateNumber:'ΑΤΤ-7890',maxWeightTonnes:40,maxLengthMeters:18.75,adrEquipped:true,fuelType:'diesel',gpsTrackerId:'TT-09183',cargoSpecs:['curtainside','temperature_controlled'],tempRangeMin:null,tempRangeMax:null,status:'assigned',assignedDriverId:'DRV-006',pairedTrailerId:'TRL-002',costs:{maintenanceCostPerKm:0.07,insuranceCostPerDay:36,depreciationPerKm:0.05,avgConsumptionL100Km:32},stats:{totalTrips:421,totalKm:218920,daysSinceLastTrip:0,utilizationPercent:91,avgLoadTonnes:26.1,tripsLast7Days:4,lastMaintenanceDate:'2026-02-20',nextKteoDate:'2026-09-15'},lastActive:'12 min ago' },
  { id:'TRK-003',category:'truck',vehicleType:'semi_trailer',make:'Mercedes',model:'Actros 1845',year:2023,euroClass:'euro6d',plateNumber:'ΘΕΣ-3456',maxWeightTonnes:40,maxLengthMeters:18.75,adrEquipped:false,fuelType:'diesel',gpsTrackerId:'TT-09184',cargoSpecs:['curtainside','box','platform'],tempRangeMin:null,tempRangeMax:null,status:'assigned',assignedDriverId:'DRV-008',pairedTrailerId:null,costs:{maintenanceCostPerKm:0.08,insuranceCostPerDay:40,depreciationPerKm:0.04,avgConsumptionL100Km:33},stats:{totalTrips:287,totalKm:127715,daysSinceLastTrip:0,utilizationPercent:68,avgLoadTonnes:24.0,tripsLast7Days:3,lastMaintenanceDate:'2026-04-01',nextKteoDate:'2027-03-01'},lastActive:'38 min ago' },
  { id:'TRK-004',category:'truck',vehicleType:'rigid',make:'DAF',model:'LF 210',year:2020,euroClass:'euro6',plateNumber:'ΑΘΗ-1122',maxWeightTonnes:12,maxLengthMeters:9.5,adrEquipped:false,fuelType:'diesel',gpsTrackerId:'TT-09185',cargoSpecs:['box','flatbed'],tempRangeMin:null,tempRangeMax:null,status:'assigned',assignedDriverId:'DRV-007',pairedTrailerId:null,costs:{maintenanceCostPerKm:0.06,insuranceCostPerDay:28,depreciationPerKm:0.04,avgConsumptionL100Km:22},stats:{totalTrips:92,totalKm:19320,daysSinceLastTrip:0,utilizationPercent:45,avgLoadTonnes:10.5,tripsLast7Days:2,lastMaintenanceDate:'2026-01-10',nextKteoDate:'2026-07-01'},lastActive:'1 hour ago' },
  { id:'TRK-005',category:'truck',vehicleType:'van',make:'Iveco',model:'Daily 35S16',year:2024,euroClass:'euro6d',plateNumber:'ΠΕΙ-5544',maxWeightTonnes:3.5,maxLengthMeters:6.2,adrEquipped:false,fuelType:'diesel',gpsTrackerId:'TT-09186',cargoSpecs:['small_van'],tempRangeMin:null,tempRangeMax:null,status:'assigned',assignedDriverId:'DRV-004',pairedTrailerId:null,costs:{maintenanceCostPerKm:0.04,insuranceCostPerDay:18,depreciationPerKm:0.03,avgConsumptionL100Km:12},stats:{totalTrips:165,totalKm:51150,daysSinceLastTrip:0,utilizationPercent:72,avgLoadTonnes:2.8,tripsLast7Days:3,lastMaintenanceDate:'2026-03-28',nextKteoDate:'2027-01-15'},lastActive:'6 hours ago' },
];

export const MOCK_TRAILERS = [
  { id:'TRL-001',category:'trailer',vehicleType:'semi_trailer',make:'Schmitz Cargobull',model:'SCS 24',year:2021,plateNumber:'ΡΟΔ-2233',maxPayloadTonnes:24,palletCapacity:33,internalLengthM:13.62,internalWidthM:2.48,internalHeightM:2.70,adrEquipped:false,cargoSpecs:['curtainside'],cargoFamily:'dry',tempRangeMin:null,tempRangeMax:null,status:'assigned',pairedTruckId:'TRK-001',costs:{maintenanceCostPerKm:0.04,depreciationPerKm:0.03},stats:{totalTrips:198,totalKm:78200,daysSinceLastTrip:1,avgLoadTonnes:20.1,tripsLast7Days:4,lastMaintenanceDate:'2026-02-15',nextKteoDate:'2026-08-20'},lastActive:'Today' },
  { id:'TRL-002',category:'trailer',vehicleType:'semi_trailer',make:'Carrier',model:'Transicold Vector 1950',year:2022,plateNumber:'ΛΑΡ-6677',maxPayloadTonnes:22,palletCapacity:33,internalLengthM:13.62,internalWidthM:2.48,internalHeightM:2.60,adrEquipped:false,cargoSpecs:['temperature_controlled'],cargoFamily:'reefer',tempRangeMin:-25,tempRangeMax:25,status:'assigned',pairedTruckId:'TRK-002',costs:{maintenanceCostPerKm:0.06,depreciationPerKm:0.04},stats:{totalTrips:350,totalKm:182000,daysSinceLastTrip:0,avgLoadTonnes:19.5,tripsLast7Days:4,lastMaintenanceDate:'2026-04-05',nextKteoDate:'2026-12-01'},lastActive:'Today' },
  { id:'TRL-003',category:'trailer',vehicleType:'semi_trailer',make:'Kögel',model:'Cargo',year:2020,plateNumber:'ΠΑΤ-8899',maxPayloadTonnes:24,palletCapacity:33,internalLengthM:13.62,internalWidthM:2.48,internalHeightM:2.70,adrEquipped:false,cargoSpecs:['box'],cargoFamily:'dry',tempRangeMin:null,tempRangeMax:null,status:'available',pairedTruckId:null,costs:{maintenanceCostPerKm:0.03,depreciationPerKm:0.03},stats:{totalTrips:0,totalKm:0,daysSinceLastTrip:null,avgLoadTonnes:0,tripsLast7Days:0,lastMaintenanceDate:'2026-01-15',nextKteoDate:'2026-08-01'},lastActive:'Never' },
];

export const getDriverById = (id) => MOCK_DRIVERS.find((d) => d.id === id);
export const getTruckById = (id) => MOCK_TRUCKS.find((t) => t.id === id);
export const getTrailerById = (id) => MOCK_TRAILERS.find((t) => t.id === id);
export const getDriverName = (d) => `${d.firstName} ${d.lastName}`;
export const getDriverInitials = (d) => `${d.firstName[0]}${d.lastName[0]}`;
export const VEHICLE_TYPE_ICONS = { semi_trailer:'🚛', truck_with_trailer:'🚚', rigid:'🚚', van:'🚐' };
export const CATEGORY_ICONS = { truck:'🚛', trailer:'🏷️' };
export const VEHICLE_TYPE_LABELS = { semi_trailer:'Semi-trailer', truck_with_trailer:'Truck w/ Trailer', rigid:'Rigid truck', van:'Van' };

export function getCombinedCostPerKm(driver, truck, trailer = null, fuelPricePerLitre = 1.72, avgSpeedKmh = 60) {
  const dc = driver?.costs || { costPerHour:13,avgDrivingHoursPerDay:8 };
  const tc = truck?.costs || { maintenanceCostPerKm:0.08,insuranceCostPerDay:35,depreciationPerKm:0.05,avgConsumptionL100Km:33 };
  const trc = trailer?.costs || { maintenanceCostPerKm:0,depreciationPerKm:0 };
  const driverPerKm = dc.costPerHour / avgSpeedKmh;
  const fuelPerKm = (tc.avgConsumptionL100Km / 100) * fuelPricePerLitre;
  const insurancePerKm = tc.insuranceCostPerDay / (dc.avgDrivingHoursPerDay * avgSpeedKmh);
  const maintenancePerKm = tc.maintenanceCostPerKm + trc.maintenanceCostPerKm;
  const depreciationPerKm = tc.depreciationPerKm + trc.depreciationPerKm;
  return {
    driverPerKm: Math.round(driverPerKm * 1000) / 1000,
    fuelPerKm: Math.round(fuelPerKm * 1000) / 1000,
    maintenancePerKm, depreciationPerKm,
    insurancePerKm: Math.round(insurancePerKm * 1000) / 1000,
    totalPerKm: Math.round((driverPerKm + fuelPerKm + maintenancePerKm + depreciationPerKm + insurancePerKm) * 100) / 100,
  };
}

// ── Driver ratings/reviews (mock) ──
export const MOCK_DRIVER_REVIEWS = {
  'DRV-001': [
    { id:'R-001', shipperId:'USR-101', shipperName:'Αθανάσιος Κ.', shipperCompany:'TechCorp GR', rating:5, comment:'Εξαιρετική οδηγός, πάντα στην ώρα της.', loadId:'LD-8701', route:'Athens → Thessaloniki', date:'2026-04-12T14:30:00Z', onTime:true },
    { id:'R-002', shipperId:'USR-102', shipperName:'Δημήτρης Μ.', shipperCompany:'LogiTrans', rating:5, comment:'Πολύ προσεκτική με το φορτίο, άψογη επικοινωνία.', loadId:'LD-8688', route:'Patras → Athens', date:'2026-04-08T09:15:00Z', onTime:true },
    { id:'R-003', shipperId:'USR-103', shipperName:'Elena S.', shipperCompany:'EuroFreight', rating:5, comment:'Great driver, very professional.', loadId:'LD-8650', route:'Thessaloniki → Sofia', date:'2026-03-28T16:00:00Z', onTime:true },
    { id:'R-004', shipperId:'USR-101', shipperName:'Αθανάσιος Κ.', shipperCompany:'TechCorp GR', rating:4, comment:'Καλή δουλειά, μικρή καθυστέρηση λόγω κίνησης.', loadId:'LD-8612', route:'Athens → Volos', date:'2026-03-20T11:00:00Z', onTime:false },
    { id:'R-005', shipperId:'USR-104', shipperName:'Marco P.', shipperCompany:'ItalTrans', rating:5, comment:'Excellent, arrived early.', loadId:'LD-8590', route:'Athens → Igoumenitsa', date:'2026-03-15T08:45:00Z', onTime:true },
  ],
  'DRV-005': [
    { id:'R-010', shipperId:'USR-101', shipperName:'Αθανάσιος Κ.', shipperCompany:'TechCorp GR', rating:5, comment:'Ο Νίκος είναι εξαιρετικός. Πάντα αξιόπιστος.', loadId:'LD-8820', route:'Athens → Thessaloniki', date:'2026-04-16T10:30:00Z', onTime:true },
    { id:'R-011', shipperId:'USR-102', shipperName:'Δημήτρης Μ.', shipperCompany:'LogiTrans', rating:5, comment:'Πολύ γρήγορος και ασφαλής.', loadId:'LD-8800', route:'Thessaloniki → Alexandroupoli', date:'2026-04-10T14:00:00Z', onTime:true },
    { id:'R-012', shipperId:'USR-105', shipperName:'Georg W.', shipperCompany:'DeutschLog', rating:4, comment:'Good driver, minor delay at customs.', loadId:'LD-8775', route:'Athens → Munich', date:'2026-04-02T09:00:00Z', onTime:false },
    { id:'R-013', shipperId:'USR-103', shipperName:'Elena S.', shipperCompany:'EuroFreight', rating:5, comment:'Very careful with fragile cargo.', loadId:'LD-8740', route:'Patras → Milan', date:'2026-03-25T16:30:00Z', onTime:true },
    { id:'R-014', shipperId:'USR-101', shipperName:'Αθανάσιος Κ.', shipperCompany:'TechCorp GR', rating:4, comment:'Καλός, αλλά χρειάζεται καλύτερη επικοινωνία.', loadId:'LD-8700', route:'Athens → Larissa', date:'2026-03-18T11:15:00Z', onTime:true },
    { id:'R-015', shipperId:'USR-106', shipperName:'Πέτρος Α.', shipperCompany:'PetroCargo', rating:5, comment:'Εξαιρετικός ADR οδηγός.', loadId:'LD-8660', route:'Elefsina → Thessaloniki', date:'2026-03-10T07:30:00Z', onTime:true },
  ],
};

// Generic reviews for drivers without specific ones
export function getDriverReviews(driverId) {
  if (MOCK_DRIVER_REVIEWS[driverId]) return MOCK_DRIVER_REVIEWS[driverId];
  // Generate generic reviews based on driver stats
  const d = MOCK_DRIVERS.find(x => x.id === driverId);
  if (!d || d.stats.ratingCount === 0) return [];
  const names = ['Αθανάσιος Κ.','Δημήτρης Μ.','Elena S.','Marco P.','Georg W.','Πέτρος Α.'];
  const companies = ['TechCorp GR','LogiTrans','EuroFreight','ItalTrans','DeutschLog','PetroCargo'];
  const comments = ['Πολύ καλός οδηγός.','Good service.','Στην ώρα του.','Αξιόπιστος.','Professional driver.','Καλή δουλειά.'];
  const routes = ['Athens → Thessaloniki','Patras → Athens','Athens → Volos','Thessaloniki → Sofia'];
  const reviews = [];
  const count = Math.min(d.stats.ratingCount, 10);
  for (let i = 0; i < count; i++) {
    const daysAgo = i * 5 + Math.floor(Math.random() * 3);
    const dt = new Date(); dt.setDate(dt.getDate() - daysAgo);
    reviews.push({
      id: `R-gen-${driverId}-${i}`, shipperId: `USR-${100+i}`,
      shipperName: names[i % names.length], shipperCompany: companies[i % companies.length],
      rating: Math.max(3, Math.min(5, Math.round(d.stats.rating - 0.5 + Math.random()))),
      comment: comments[i % comments.length],
      loadId: `LD-${8500 + i * 10}`, route: routes[i % routes.length],
      date: dt.toISOString(), onTime: Math.random() > 0.2,
    });
  }
  return reviews;
}
