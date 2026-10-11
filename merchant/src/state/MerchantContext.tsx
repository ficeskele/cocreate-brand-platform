import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { merchant } from '../data/catalog';
import { createMerchantService } from '../services/merchantService';
import { browserRepository } from '../services/storage';
import type { Branch, Idea, MerchantData } from '../types';
const service = createMerchantService(browserRepository());
interface State extends MerchantData { ideas: Idea[]; branches: Branch[]; loading: boolean; error: string; warning: string; refresh: () => Promise<void>; service: typeof service }
const Context = createContext<State | null>(null);
export function MerchantProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<MerchantData & { ideas: Idea[]; branches: Branch[] }>({ applications: [], drafts: [], ideas: [], branches: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const refresh = useCallback(async () => {
    try {
      const [ideas, applications, drafts] = await Promise.all([service.getIdeas(), service.getMerchantApplications(merchant.id), service.getProductDrafts(merchant.id)]);
      const branches = (await Promise.all(ideas.map(i => service.getBranchesByIdeaId(i.id)))).flat();
      setData({ ideas, applications, drafts, branches }); setError(''); setWarning(service.getStorageWarning());
    } catch (e) { setError(e instanceof Error ? e.message : 'We could not load your workspace. Please try again.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); const onStorage = () => { void refresh(); }; window.addEventListener('storage', onStorage); return () => window.removeEventListener('storage', onStorage); }, [refresh]);
  return <Context.Provider value={{ ...data, loading, error, warning, refresh, service }}>{children}</Context.Provider>;
}
export function useMerchant() { const context = useContext(Context); if (!context) throw new Error('MerchantProvider is required'); return context; }
