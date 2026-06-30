/**
 * greekPrefectures.js — Static list of all 51 Greek prefectures (Νομοί).
 *
 * Used by: LaneLocationPicker when locationType === 'prefecture' and
 * countryCode === 'GR'. For non-Greek countries a free-text input is shown.
 *
 * Each entry: { value, label }
 *   - value: a slugified ID (e.g. 'attikis')
 *   - label: the official Greek name (e.g. 'Αττικής')
 *
 * Note: these are the traditional nomoi / prefectures, not the Kallikratis
 * regional units — this is intentional because logistics partners think in
 * prefecture terms for lane declarations.
 */

const GREEK_PREFECTURES = [
  { value: 'aitoloakarnanias', label: 'Αιτωλοακαρνανίας' },
  { value: 'argolidas', label: 'Αργολίδας' },
  { value: 'arkadias', label: 'Αρκαδίας' },
  { value: 'artas', label: 'Άρτας' },
  { value: 'attikis', label: 'Αττικής' },
  { value: 'achaias', label: 'Αχαΐας' },
  { value: 'voiotias', label: 'Βοιωτίας' },
  { value: 'grevenon', label: 'Γρεβενών' },
  { value: 'dramas', label: 'Δράμας' },
  { value: 'dodekanisou', label: 'Δωδεκανήσου' },
  { value: 'evrou', label: 'Έβρου' },
  { value: 'evvoias', label: 'Ευβοίας' },
  { value: 'evrytanias', label: 'Ευρυτανίας' },
  { value: 'zakynthou', label: 'Ζακύνθου' },
  { value: 'ileias', label: 'Ηλείας' },
  { value: 'imathias', label: 'Ημαθίας' },
  { value: 'irakleiou', label: 'Ηρακλείου' },
  { value: 'thesprotias', label: 'Θεσπρωτίας' },
  { value: 'thessalonikis', label: 'Θεσσαλονίκης' },
  { value: 'ioanninon', label: 'Ιωαννίνων' },
  { value: 'kavalas', label: 'Καβάλας' },
  { value: 'karditsas', label: 'Καρδίτσας' },
  { value: 'kastorias', label: 'Καστοριάς' },
  { value: 'kerkyras', label: 'Κέρκυρας' },
  { value: 'kefallinias', label: 'Κεφαλληνίας' },
  { value: 'kilkis', label: 'Κιλκίς' },
  { value: 'kozanis', label: 'Κοζάνης' },
  { value: 'korinthias', label: 'Κορινθίας' },
  { value: 'kykladon', label: 'Κυκλάδων' },
  { value: 'lakonias', label: 'Λακωνίας' },
  { value: 'larisas', label: 'Λάρισας' },
  { value: 'lasithiou', label: 'Λασιθίου' },
  { value: 'lesvou', label: 'Λέσβου' },
  { value: 'lefkadas', label: 'Λευκάδας' },
  { value: 'magnisias', label: 'Μαγνησίας' },
  { value: 'messinias', label: 'Μεσσηνίας' },
  { value: 'xanthis', label: 'Ξάνθης' },
  { value: 'pellas', label: 'Πέλλας' },
  { value: 'pierias', label: 'Πιερίας' },
  { value: 'prevezas', label: 'Πρέβεζας' },
  { value: 'rethymnou', label: 'Ρεθύμνου' },
  { value: 'rodopis', label: 'Ροδόπης' },
  { value: 'samou', label: 'Σάμου' },
  { value: 'serron', label: 'Σερρών' },
  { value: 'trikalon', label: 'Τρικάλων' },
  { value: 'fthiotidas', label: 'Φθιώτιδας' },
  { value: 'florinas', label: 'Φλώρινας' },
  { value: 'fokidas', label: 'Φωκίδας' },
  { value: 'chalkidikis', label: 'Χαλκιδικής' },
  { value: 'chanion', label: 'Χανίων' },
  { value: 'chiou', label: 'Χίου' },
];

export default GREEK_PREFECTURES;
