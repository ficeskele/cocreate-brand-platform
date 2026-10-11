import { StrictMode, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Empty, ErrorNotice } from './components/ui';
import { MerchantProvider, useMerchant } from './state/MerchantContext';
import { Discover } from './pages/Discover';
import { IdeaDetail } from './pages/IdeaDetail';
import { BranchDetail } from './pages/BranchDetail';
import { Applications } from './pages/Applications';
import { ProductDraft } from './pages/ProductDraft';
import { Drafts } from './pages/Drafts';
import './styles.css';
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="boot-state"><h1>We couldn’t open your workspace</h1><p>Please reload to try again. Your saved drafts will remain in this browser.</p><button className="button primary" onClick={() => window.location.reload()}>Reload workspace</button></div> : this.props.children; }
}
function AppRoutes() {
  const { loading, error, refresh } = useMerchant();
  if (loading) return <div className="boot-state" role="status"><span className="loading-spinner" /><h1>Opening your workspace…</h1><p>Finding the next good thing.</p></div>;
  if (error) return <div className="boot-state"><ErrorNotice>{error}</ErrorNotice><button className="button primary" onClick={() => void refresh()}>Try again</button></div>;
  return <Routes><Route element={<Layout />}><Route index element={<Discover />} /><Route path="ideas/:id" element={<IdeaDetail />} /><Route path="branches/:id" element={<BranchDetail />} /><Route path="applications" element={<Applications />} /><Route path="launch/:id" element={<ProductDraft />} /><Route path="drafts" element={<Drafts />} /><Route path="*" element={<Empty title="This page has wandered off" action={<Link className="button primary" to="/">Back to discovery</Link>}>Choose a page from the navigation to keep exploring.</Empty>} /></Route></Routes>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><MerchantProvider><HashRouter><AppRoutes /></HashRouter></MerchantProvider></ErrorBoundary></StrictMode>);
