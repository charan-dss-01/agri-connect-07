import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DemoProvider } from "@/contexts/DemoContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import FarmerDashboard from "./pages/FarmerDashboard";
import FarmerListResidue from "./pages/FarmerListResidue";
import FarmerRequests from "./pages/FarmerRequests";
import IndustryDashboard from "./pages/IndustryDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole?: string }) {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRole && user?.role !== allowedRole) return <Navigate to={`/${user?.role || ''}`} replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/farmer" element={<ProtectedRoute allowedRole="farmer"><FarmerDashboard /></ProtectedRoute>} />
      <Route path="/farmer/list" element={<ProtectedRoute allowedRole="farmer"><FarmerListResidue /></ProtectedRoute>} />
      <Route path="/farmer/requests" element={<ProtectedRoute allowedRole="farmer"><FarmerRequests /></ProtectedRoute>} />
      <Route path="/industry" element={<ProtectedRoute allowedRole="industry"><IndustryDashboard /></ProtectedRoute>} />
      <Route path="/industry/*" element={<ProtectedRoute allowedRole="industry"><IndustryDashboard /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/*" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <DemoProvider>
          <AppRoutes />
        </DemoProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
