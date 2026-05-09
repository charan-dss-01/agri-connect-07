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

export function hasValidCoordinates(lat?: number | null, lng?: number | null): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

export function calculateDistance(
  lat1?: number | null,
  lng1?: number | null,
  lat2?: number | null,
  lng2?: number | null,
): number | null {
  if (!hasValidCoordinates(lat1, lng1) || !hasValidCoordinates(lat2, lng2)) {
    return null;
  }

  const earthRadiusKm = 6371;
  const deltaLat = (((lat2 as number) - (lat1 as number)) * Math.PI) / 180;
  const deltaLng = (((lng2 as number) - (lng1 as number)) * Math.PI) / 180;
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(((lat1 as number) * Math.PI) / 180)
    * Math.cos(((lat2 as number) * Math.PI) / 180)
    * Math.sin(deltaLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateTransportCost(distanceKm: number | null, quantityTons: number, ratePerKmPerTon = TRANSPORT_RATE): number {
  if (!Number.isFinite(distanceKm) || !Number.isFinite(quantityTons) || quantityTons <= 0) {
    return 0;
  }

  return Math.max(0, Number(distanceKm) * quantityTons * ratePerKmPerTon);
}

export function calculateNetProfit(totalValue: number, transportCost: number): number {
  if (!Number.isFinite(totalValue) || !Number.isFinite(transportCost)) {
    return 0;
  }

  return Math.max(0, totalValue - transportCost);
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
