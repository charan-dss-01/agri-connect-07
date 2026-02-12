export interface ResidueListing {
  id: string;
  farmerId: string;
  farmerName: string;
  cropType: 'Paddy' | 'Wheat' | 'Sugarcane';
  quantity: number; // tons
  pricePerTon: number;
  totalValue: number;
  location: { lat: number; lng: number; address: string };
  imageUrl?: string;
  status: 'available' | 'pending' | 'sold';
  createdAt: string;
}

export interface IndustryProfile {
  id: string;
  userId: string;
  companyName: string;
  biomassRequirement: number; // tons per month
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

export const TRANSPORT_RATE = 15; // ₹ per km per ton

export const CARBON_FACTOR = 1.5; // tons CO₂ saved per ton of residue used

export const sampleIndustries: IndustryProfile[] = [
  {
    id: 'ind1', userId: 'i1', companyName: 'GreenPower Biomass Ltd',
    biomassRequirement: 500, priceOfferedPerTon: 2000,
    location: { lat: 28.6139, lng: 77.2090, address: 'New Delhi' },
    type: 'Power Plant',
  },
  {
    id: 'ind2', userId: 'i2', companyName: 'BioFuel India Pvt Ltd',
    biomassRequirement: 300, priceOfferedPerTon: 1800,
    location: { lat: 30.7333, lng: 76.7794, address: 'Chandigarh' },
    type: 'Biofuel',
  },
  {
    id: 'ind3', userId: 'i3', companyName: 'EcoPaper Mills',
    biomassRequirement: 200, priceOfferedPerTon: 1600,
    location: { lat: 28.4595, lng: 77.0266, address: 'Gurgaon' },
    type: 'Paper Mill',
  },
  {
    id: 'ind4', userId: 'i4', companyName: 'NatureCompost Co.',
    biomassRequirement: 150, priceOfferedPerTon: 1400,
    location: { lat: 29.9457, lng: 76.8186, address: 'Kurukshetra' },
    type: 'Compost Unit',
  },
];

export const sampleListings: ResidueListing[] = [
  {
    id: 'l1', farmerId: 'f1', farmerName: 'Rajesh Kumar',
    cropType: 'Paddy', quantity: 8, pricePerTon: 1800, totalValue: 14400,
    location: { lat: 29.6857, lng: 76.9905, address: 'Karnal, Haryana' },
    status: 'available', createdAt: '2026-02-10',
  },
  {
    id: 'l2', farmerId: 'f2', farmerName: 'Amit Singh',
    cropType: 'Wheat', quantity: 5, pricePerTon: 1500, totalValue: 7500,
    location: { lat: 30.3165, lng: 76.3604, address: 'Ambala, Haryana' },
    status: 'available', createdAt: '2026-02-09',
  },
  {
    id: 'l3', farmerId: 'f3', farmerName: 'Suresh Yadav',
    cropType: 'Sugarcane', quantity: 12, pricePerTon: 2200, totalValue: 26400,
    location: { lat: 29.4727, lng: 77.7085, address: 'Muzaffarnagar, UP' },
    status: 'pending', createdAt: '2026-02-08',
  },
];

export const sampleTransactions: Transaction[] = [
  {
    id: 't1', farmerId: 'f1', farmerName: 'Rajesh Kumar',
    industryId: 'i1', industryName: 'GreenPower Biomass Ltd',
    cropType: 'Paddy', quantity: 8, pricePerTon: 2000,
    totalValue: 16000, transportCost: 2400, netProfit: 13600,
    distance: 20, status: 'completed', createdAt: '2026-01-20', pickupDate: '2026-01-25',
  },
  {
    id: 't2', farmerId: 'f2', farmerName: 'Amit Singh',
    industryId: 'i2', industryName: 'BioFuel India Pvt Ltd',
    cropType: 'Wheat', quantity: 5, pricePerTon: 1800,
    totalValue: 9000, transportCost: 1125, netProfit: 7875,
    distance: 15, status: 'accepted', createdAt: '2026-02-05', pickupDate: '2026-02-15',
  },
  {
    id: 't3', farmerId: 'f3', farmerName: 'Suresh Yadav',
    industryId: 'i3', industryName: 'EcoPaper Mills',
    cropType: 'Sugarcane', quantity: 12, pricePerTon: 1600,
    totalValue: 19200, transportCost: 5400, netProfit: 13800,
    distance: 30, status: 'pending', createdAt: '2026-02-10',
  },
  {
    id: 't4', farmerId: 'f1', farmerName: 'Rajesh Kumar',
    industryId: 'i4', industryName: 'NatureCompost Co.',
    cropType: 'Paddy', quantity: 6, pricePerTon: 1400,
    totalValue: 8400, transportCost: 900, netProfit: 7500,
    distance: 10, status: 'completed', createdAt: '2026-01-10', pickupDate: '2026-01-15',
  },
];

export const sampleNotifications: Notification[] = [
  { id: 'n1', userId: 'f1', message: 'Your sell request to GreenPower Biomass has been accepted!', read: false, createdAt: '2026-02-11', type: 'success' },
  { id: 'n2', userId: 'f1', message: 'New industry registered near your location', read: true, createdAt: '2026-02-10', type: 'info' },
  { id: 'n3', userId: 'i1', message: 'New residue listing from Rajesh Kumar — 8 tons of Paddy', read: false, createdAt: '2026-02-10', type: 'info' },
  { id: 'n4', userId: 'a1', message: 'Transaction #t1 completed successfully', read: false, createdAt: '2026-02-10', type: 'success' },
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
