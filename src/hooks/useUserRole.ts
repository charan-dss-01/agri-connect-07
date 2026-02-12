import { useAuth } from '@/contexts/AuthContext';

export function useUserRole() {
  const { user } = useAuth();
  return user?.role || null;
}
