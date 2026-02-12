import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  sampleTransactions, sampleIndustries, sampleListings,
  CROP_PRICES, TRANSPORT_RATE, calculateDistance, simulateAIClassification, CARBON_FACTOR
} from '@/data/mockData';
import { Wheat, IndianRupee, TrendingUp, Truck, MapPin, Send, CheckCircle, Clock, XCircle, Upload, Leaf } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    pending: 'bg-warning/15 text-warning',
    accepted: 'bg-info/15 text-info',
    completed: 'bg-success/15 text-success',
    rejected: 'bg-destructive/15 text-destructive',
  };
  const icons: Record<string, any> = { pending: Clock, accepted: CheckCircle, completed: CheckCircle, rejected: XCircle };
  const Icon = icons[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${map[status] || ''}`}>
      <Icon className="w-3 h-3" /> {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const FarmerDashboard = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  const [showListForm, setShowListForm] = useState(false);
  const [cropType, setCropType] = useState('Paddy');
  const [quantity, setQuantity] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sentRequests, setSentRequests] = useState<string[]>([]);

  const myTransactions = sampleTransactions.filter(t => t.farmerId === user?.id);
  const totalEarnings = myTransactions.filter(t => t.status === 'completed').reduce((s, t) => s + t.netProfit, 0);
  const totalBiomass = myTransactions.reduce((s, t) => s + t.quantity, 0);
  const carbonSaved = totalBiomass * CARBON_FACTOR;

  const pricePerTon = CROP_PRICES[cropType] || 1500;
  const qty = parseFloat(quantity) || 0;
  const totalValue = qty * pricePerTon;

  const nearbyIndustries = sampleIndustries.map(ind => {
    const dist = user?.location ? calculateDistance(user.location.lat, user.location.lng, ind.location.lat, ind.location.lng) : Math.floor(Math.random() * 50 + 10);
    const transportCost = dist * TRANSPORT_RATE * qty;
    const netProfit = (ind.priceOfferedPerTon * qty) - transportCost;
    return { ...ind, distance: dist, transportCost, netProfit };
  }).sort((a, b) => a.distance - b.distance);

  const handleSendRequest = (indId: string) => {
    setSentRequests(prev => [...prev, indId]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Farmer Dashboard</h2>
          <button
            onClick={() => { setShowListForm(true); setSubmitted(false); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Wheat className="w-4 h-4" /> List Residue
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: IndianRupee, label: 'Total Earnings', value: `₹${totalEarnings.toLocaleString()}`, color: 'text-success' },
            { icon: Wheat, label: 'Biomass Listed', value: `${totalBiomass} tons`, color: 'text-primary' },
            { icon: Truck, label: 'Transactions', value: myTransactions.length.toString(), color: 'text-info' },
            { icon: Leaf, label: 'CO₂ Saved', value: `${carbonSaved} tons`, color: 'text-primary' },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-card animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* List Residue Form */}
        {showListForm && (
          <div className="bg-card rounded-xl p-6 shadow-card animate-scale-in">
            <h3 className="font-semibold text-lg mb-4">List Crop Residue</h3>
            {!submitted ? (
              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="text-xs font-medium mb-1 block">Upload Image (AI will classify)</label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 transition-colors">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Click to upload or drag & drop</p>
                    <p className="text-[10px] text-muted-foreground mt-1">AI Classification: <strong className="text-primary">{simulateAIClassification(cropType)}</strong></p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Crop Type</label>
                    <select value={cropType} onChange={e => setCropType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                      <option>Paddy</option><option>Wheat</option><option>Sugarcane</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Quantity (tons)</label>
                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="e.g. 10" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Location</label>
                  <div className="flex items-center gap-2">
                    <input type="text" defaultValue={user?.location?.address || ''} className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                    <button className="px-3 py-2 rounded-lg bg-muted text-xs font-medium flex items-center gap-1 hover:bg-secondary transition-colors">
                      <MapPin className="w-3 h-3" /> Auto-detect
                    </button>
                  </div>
                </div>

                {qty > 0 && (
                  <div className="bg-muted rounded-lg p-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Estimated Breakdown</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Price per ton:</span><span className="font-medium">₹{pricePerTon}</span>
                      <span className="text-muted-foreground">Total value:</span><span className="font-medium text-success">₹{totalValue.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <button onClick={() => setSubmitted(true)} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  Submit Listing
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Listing submitted successfully!</p>
                    <p className="text-xs text-muted-foreground mt-1">{qty} tons of {cropType} — Estimated value: ₹{totalValue.toLocaleString()}</p>
                  </div>
                </div>

                <h4 className="font-semibold">Nearby Industries (sorted by distance)</h4>
                <div className="space-y-3">
                  {nearbyIndustries.map(ind => (
                    <div key={ind.id} className="bg-muted/50 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm">{ind.companyName}</p>
                        <p className="text-xs text-muted-foreground">{ind.type} • {ind.location.address}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>📍 {ind.distance} km</span>
                          <span>₹{ind.priceOfferedPerTon}/ton</span>
                          <span>🚚 ₹{ind.transportCost.toLocaleString()}</span>
                          <span className="text-success font-medium">Net: ₹{ind.netProfit.toLocaleString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSendRequest(ind.id)}
                        disabled={sentRequests.includes(ind.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                          sentRequests.includes(ind.id)
                            ? 'bg-success/10 text-success cursor-default'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                      >
                        {sentRequests.includes(ind.id) ? <><CheckCircle className="w-3 h-3" /> Sent</> : <><Send className="w-3 h-3" /> Send Request</>}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* My Requests */}
        <div className="bg-card rounded-xl p-6 shadow-card">
          <h3 className="font-semibold text-lg mb-4">My Requests</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 text-xs text-muted-foreground font-medium">Industry</th>
                  <th className="pb-3 text-xs text-muted-foreground font-medium">Crop</th>
                  <th className="pb-3 text-xs text-muted-foreground font-medium">Qty</th>
                  <th className="pb-3 text-xs text-muted-foreground font-medium">Net Profit</th>
                  <th className="pb-3 text-xs text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {myTransactions.map(t => (
                  <tr key={t.id} className="border-b border-border/50">
                    <td className="py-3 font-medium">{t.industryName}</td>
                    <td className="py-3">{t.cropType}</td>
                    <td className="py-3">{t.quantity}t</td>
                    <td className="py-3 text-success font-medium">₹{t.netProfit.toLocaleString()}</td>
                    <td className="py-3"><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FarmerDashboard;
