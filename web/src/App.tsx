import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './state/AppState';
import { Layout } from './components/Layout';
import Feed from './pages/Feed';
import Detail from './pages/Detail';
import Search from './pages/Search';
import Create from './pages/Create';
import { Contributions, Earnings, Notifications, Profile, Published } from './pages/Misc';
import { MerchantDetail, Rights, DraftCreated, Opportunities, ShopifyPreview, Selected, SelectVersion, Store } from './merchant/Merchant';
import { Empty } from './components/ui';

export default function App() {
  return (
    <AppProvider><BrowserRouter basename="/app"><Routes><Route element={<Layout />}>
      <Route index element={<Feed />} />
      <Route path="state/loading" element={<Feed state="loading" />} />
      <Route path="state/error" element={<Feed state="error" />} />
      <Route path="search" element={<Search />} />
      <Route path="i/:slug" element={<Detail />} />
      <Route path="i/:slug/v/:vslug" element={<Detail />} />
      <Route path="create" element={<Create kind="idea" />} />
      <Route path="create-version/:slug" element={<Create kind="version" />} />
      <Route path="published/:slug" element={<Published />} />
      <Route path="contributions" element={<Contributions />} />
      <Route path="earnings" element={<Earnings />} />
      <Route path="profile" element={<Profile />} />
      <Route path="notifications" element={<Notifications />} />
      <Route path="m" element={<Opportunities />} />
      <Route path="m/i/:slug" element={<MerchantDetail />} />
      <Route path="m/i/:slug/version" element={<SelectVersion />} />
      <Route path="m/v/:slug/rights" element={<Rights />} />
      <Route path="m/v/:slug/preview" element={<ShopifyPreview />} />
      <Route path="m/draft/:id" element={<DraftCreated />} />
      <Route path="m/selected" element={<Selected />} />
      <Route path="m/store" element={<Store />} />
      <Route path="*" element={<div className="page"><Empty icon="alert" title="Page not found" /></div>} />
    </Route></Routes></BrowserRouter></AppProvider>
  );
}
