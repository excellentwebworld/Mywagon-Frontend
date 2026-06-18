import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { ManageShipments } from './pages/ManageShipments';
import { ShipmentDetail } from './pages/ShipmentDetail';
import { CreateShipmentWizard } from './pages/CreateShipmentWizard/CreateShipmentWizard';
import { AddressBook } from './pages/AddressBook';
import { ProductMaster } from './pages/ProductMaster';
import { MarketingHome } from './pages/MarketingHome';
import { MarketingAbout } from './pages/MarketingAbout';
import Partners from './pages/Partners';

import './App.css';

function App() {
  return (
    <Routes>
      {/* Public Marketing Routes */}
      <Route path="/" element={<MarketingHome />} />
      <Route path="/about" element={<MarketingAbout />} />

      {/* Shipper Panel Layout Shell */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/shipments" element={<ManageShipments />} />
        <Route path="/shipments/:id" element={<ShipmentDetail />} />
        <Route path="/shipments/create" element={<CreateShipmentWizard />} />
        <Route path="/address-book" element={<AddressBook />} />
        <Route path="/products" element={<ProductMaster />} />
        <Route path="/partners" element={<Partners />} />
      </Route>

      {/* Redirect fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
