export interface ResidueListing {
  id: string;
  farmerId: string;
  farmerName: string;
  cropType: 'Paddy' | 'Wheat' | 'Sugarcane';
  quantity: number;
  pricePerTon: number;
  totalValue: number;
  location: { lat: number; lng: number; address: string };
  imageUrl?: string;
  status: 'available' | 'pending' | 'sold';
  createdAt: string;
  moisture?: number;
  qualityGrade?: 'A' | 'B' | 'C';
  aiConfidence?: number;
}

export interface IndustryProfile {
  id: string;
  userId: string;
  companyName: string;
  biomassRequirement: number;
  priceOfferedPerTon: number;
  location: { lat: number; lng: number; address: string };
  type: 'Power Plant' | 'Biofuel' | 'Paper Mill' | 'Compost Unit';
}

export interface Transaction {
  id: string;
  farmerId: string;
  farmerName: string;
  industryId: string;
  industryName: string;
  cropType: string;
  quantity: number;
  pricePerTon: number;
  totalValue: number;
  transportCost: number;
  netProfit: number;
  distance: number;
  status: 'pending' | 'accepted' | 'completed' | 'rejected';
  createdAt: string;
  pickupDate?: string;
  clusterEligible?: boolean;
  transportSavings?: number;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: 'info' | 'success' | 'warning';
}

export const CROP_PRICES: Record<string, number> = {
  Paddy: 1800,
  Wheat: 1500,
  Sugarcane: 2200,
};

export const TRANSPORT_RATE = 15;
export const CARBON_FACTOR = 1.5;
export const CO2_PER_TON_BURNED = 1.2; // tons CO₂ emitted per ton burned
export const CARBON_CREDIT_PER_TON = 8; // carbon credit points per ton saved

export const CLUSTER_RADIUS_KM = 10;
export const CLUSTER_DISCOUNT = 0.2; // 20% transport cost reduction

export function getGreenFarmerLevel(totalTons: number): { level: number; title: string; emoji: string } {
  if (totalTons >= 50) return { level: 3, title: 'Green Champion', emoji: '🏆' };
  if (totalTons >= 20) return { level: 2, title: 'Eco Warrior', emoji: '🌿' };
  return { level: 1, title: 'Green Starter', emoji: '🌱' };
}

export function adjustPriceForQuality(basePrice: number, cropType: string, moisture: number, grade: 'A' | 'B' | 'C'): number {
  let price = basePrice;
  if (cropType === 'Paddy' && moisture > 20) price *= 0.88;
  if (cropType === 'Wheat' && grade === 'A') price *= 1.12;
  if (grade === 'C') price *= 0.9;
  return Math.round(price);
}

export const sampleIndustries: IndustryProfile[] = [
  { id: 'ind1', userId: 'i1', companyName: 'GreenPower Biomass Ltd', biomassRequirement: 500, priceOfferedPerTon: 2000, location: { lat: 28.6139, lng: 77.2090, address: 'New Delhi' }, type: 'Power Plant' },
  { id: 'ind2', userId: 'i2', companyName: 'BioFuel India Pvt Ltd', biomassRequirement: 300, priceOfferedPerTon: 1800, location: { lat: 30.7333, lng: 76.7794, address: 'Chandigarh' }, type: 'Biofuel' },
  { id: 'ind3', userId: 'i3', companyName: 'EcoPaper Mills', biomassRequirement: 200, priceOfferedPerTon: 1600, location: { lat: 28.4595, lng: 77.0266, address: 'Gurgaon' }, type: 'Paper Mill' },
  { id: 'ind4', userId: 'i4', companyName: 'NatureCompost Co.', biomassRequirement: 150, priceOfferedPerTon: 1400, location: { lat: 29.9457, lng: 76.8186, address: 'Kurukshetra' }, type: 'Compost Unit' },
];

export const sampleListings: ResidueListing[] = [
  { id: 'l1', farmerId: 'f1', farmerName: 'Rajesh Kumar', cropType: 'Paddy', quantity: 8, pricePerTon: 1800, totalValue: 14400, location: { lat: 29.6857, lng: 76.9905, address: 'Karnal, Haryana' }, status: 'available', createdAt: '2026-02-10', moisture: 18, qualityGrade: 'A', aiConfidence: 92 },
  { id: 'l2', farmerId: 'f2', farmerName: 'Amit Singh', cropType: 'Wheat', quantity: 5, pricePerTon: 1500, totalValue: 7500, location: { lat: 30.3165, lng: 76.3604, address: 'Ambala, Haryana' }, status: 'available', createdAt: '2026-02-09', moisture: 15, qualityGrade: 'B', aiConfidence: 88 },
  { id: 'l3', farmerId: 'f3', farmerName: 'Suresh Yadav', cropType: 'Sugarcane', quantity: 12, pricePerTon: 2200, totalValue: 26400, location: { lat: 29.4727, lng: 77.7085, address: 'Muzaffarnagar, UP' }, status: 'pending', createdAt: '2026-02-08', moisture: 22, qualityGrade: 'A', aiConfidence: 91 },
];

export const sampleTransactions: Transaction[] = [
  { id: 't1', farmerId: 'f1', farmerName: 'Rajesh Kumar', industryId: 'i1', industryName: 'GreenPower Biomass Ltd', cropType: 'Paddy', quantity: 8, pricePerTon: 2000, totalValue: 16000, transportCost: 2400, netProfit: 13600, distance: 20, status: 'completed', createdAt: '2026-01-20', pickupDate: '2026-01-25', clusterEligible: true, transportSavings: 480 },
  { id: 't2', farmerId: 'f2', farmerName: 'Amit Singh', industryId: 'i2', industryName: 'BioFuel India Pvt Ltd', cropType: 'Wheat', quantity: 5, pricePerTon: 1800, totalValue: 9000, transportCost: 1125, netProfit: 7875, distance: 15, status: 'accepted', createdAt: '2026-02-05', pickupDate: '2026-02-15' },
  { id: 't3', farmerId: 'f3', farmerName: 'Suresh Yadav', industryId: 'i3', industryName: 'EcoPaper Mills', cropType: 'Sugarcane', quantity: 12, pricePerTon: 1600, totalValue: 19200, transportCost: 5400, netProfit: 13800, distance: 30, status: 'pending', createdAt: '2026-02-10' },
  { id: 't4', farmerId: 'f1', farmerName: 'Rajesh Kumar', industryId: 'i4', industryName: 'NatureCompost Co.', cropType: 'Paddy', quantity: 6, pricePerTon: 1400, totalValue: 8400, transportCost: 900, netProfit: 7500, distance: 10, status: 'completed', createdAt: '2026-01-10', pickupDate: '2026-01-15', clusterEligible: true, transportSavings: 180 },
];

export const sampleNotifications: Notification[] = [
  { id: 'n1', userId: 'f1', message: 'Your sell request to GreenPower Biomass has been accepted!', read: false, createdAt: '2026-02-11', type: 'success' },
  { id: 'n2', userId: 'f1', message: 'New industry registered near your location', read: true, createdAt: '2026-02-10', type: 'info' },
  { id: 'n3', userId: 'f1', message: 'Pickup scheduled for Jan 25 by GreenPower Biomass', read: false, createdAt: '2026-02-09', type: 'info' },
  { id: 'n4', userId: 'i1', message: 'New residue listing from Rajesh Kumar — 8 tons of Paddy', read: false, createdAt: '2026-02-10', type: 'info' },
  { id: 'n5', userId: 'i1', message: 'New residue listing nearby: 12 tons Sugarcane from Muzaffarnagar', read: false, createdAt: '2026-02-09', type: 'info' },
  { id: 'n6', userId: 'a1', message: 'Transaction #t1 completed successfully', read: false, createdAt: '2026-02-10', type: 'success' },
  { id: 'n7', userId: 'a1', message: '⚠ Large transaction alert: 12 tons Sugarcane (₹19,200)', read: false, createdAt: '2026-02-10', type: 'warning' },
  { id: 'n8', userId: 'a1', message: 'New farmer registered: Suresh Yadav from Muzaffarnagar', read: true, createdAt: '2026-02-09', type: 'info' },
];

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function simulateAIClassification(cropType?: string): string {
  if (cropType) return cropType;
  const types = ['Paddy', 'Wheat', 'Sugarcane'];
  return types[Math.floor(Math.random() * types.length)];
}

export function simulateAIAnalysis(cropType: string) {
  const moisture = Math.floor(Math.random() * 15) + 12; // 12-26%
  const grades: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
  const gradeWeights = [0.4, 0.4, 0.2];
  const r = Math.random();
  const grade = r < gradeWeights[0] ? grades[0] : r < gradeWeights[0] + gradeWeights[1] ? grades[1] : grades[2];
  const confidence = Math.floor(Math.random() * 11) + 85; // 85-95%
  return { cropType, moisture, grade, confidence };
}

// Demo mode helpers
export function generateRandomListing(): ResidueListing {
  const cropTypes: ('Paddy' | 'Wheat' | 'Sugarcane')[] = ['Paddy', 'Wheat', 'Sugarcane'];
  const villages = ['Karnal', 'Ambala', 'Panipat', 'Sonipat', 'Rohtak', 'Hisar', 'Jind', 'Kurukshetra'];
  const names = ['Ramesh Yadav', 'Anil Kumar', 'Baldev Singh', 'Prem Chand', 'Mohan Lal', 'Deepak Sharma'];
  const crop = cropTypes[Math.floor(Math.random() * cropTypes.length)];
  const qty = Math.floor(Math.random() * 15) + 3;
  const village = villages[Math.floor(Math.random() * villages.length)];
  const name = names[Math.floor(Math.random() * names.length)];
  return {
    id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    farmerId: `f_${Math.floor(Math.random() * 100)}`,
    farmerName: name,
    cropType: crop,
    quantity: qty,
    pricePerTon: CROP_PRICES[crop],
    totalValue: qty * CROP_PRICES[crop],
    location: { lat: 28.5 + Math.random() * 2, lng: 76.5 + Math.random() * 1.5, address: `${village}, Haryana` },
    status: 'available',
    createdAt: new Date().toISOString().split('T')[0],
    moisture: Math.floor(Math.random() * 15) + 12,
    qualityGrade: (['A', 'B', 'C'] as const)[Math.floor(Math.random() * 3)],
    aiConfidence: Math.floor(Math.random() * 11) + 85,
  };
}
