import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './state/AppState';
import { Layout } from './components/Layout';
import Feed from './pages/Feed';
import Detail from './pages/Detail';
import Search from './pages/Search';
import Create from './pages/Create';
import { Aportes, Ganancias, Notificaciones, Perfil, Published } from './pages/Misc';
import { DetalleComercial, Derechos, DraftCreado, Oportunidades, PreviewShopify, Seleccionados, SeleccionarVersion, Tienda } from './merchant/Merchant';
import { Empty } from './components/ui';

export default function App() {
  return (
    <AppProvider><BrowserRouter basename="/app"><Routes><Route element={<Layout />}>
      <Route index element={<Feed />} />
      <Route path="estado/cargando" element={<Feed state="loading" />} />
      <Route path="estado/error" element={<Feed state="error" />} />
      <Route path="buscar" element={<Search />} />
      <Route path="i/:slug" element={<Detail />} />
      <Route path="i/:slug/v/:vslug" element={<Detail />} />
      <Route path="crear" element={<Create kind="idea" />} />
      <Route path="crear-version/:slug" element={<Create kind="version" />} />
      <Route path="publicado/:slug" element={<Published />} />
      <Route path="aportes" element={<Aportes />} />
      <Route path="ganancias" element={<Ganancias />} />
      <Route path="perfil" element={<Perfil />} />
      <Route path="notificaciones" element={<Notificaciones />} />
      <Route path="m" element={<Oportunidades />} />
      <Route path="m/i/:slug" element={<DetalleComercial />} />
      <Route path="m/i/:slug/version" element={<SeleccionarVersion />} />
      <Route path="m/v/:slug/derechos" element={<Derechos />} />
      <Route path="m/v/:slug/preview" element={<PreviewShopify />} />
      <Route path="m/draft/:id" element={<DraftCreado />} />
      <Route path="m/seleccionados" element={<Seleccionados />} />
      <Route path="m/tienda" element={<Tienda />} />
      <Route path="*" element={<div className="page"><Empty icon="alert" title="Página no encontrada" /></div>} />
    </Route></Routes></BrowserRouter></AppProvider>
  );
}
