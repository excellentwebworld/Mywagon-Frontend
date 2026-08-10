import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/Login/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { ManageShipments } from './pages/ManageShipments';
import { ShipmentDetail } from './pages/ShipmentDetail';
import { CreateShipmentWizardLayout } from './pages/CreateShipmentWizard/CreateShipmentWizardLayout';
import { CreateShipmentStep1Page } from './pages/CreateShipmentWizard/steps/CreateShipmentStep1Page';
import { CreateShipmentStep2Page } from './pages/CreateShipmentWizard/steps/CreateShipmentStep2Page';
import { CreateShipmentStep3Page } from './pages/CreateShipmentWizard/steps/CreateShipmentStep3Page';
import { AddressBook } from './pages/AddressBook';
import { ProductMaster } from './pages/ProductMaster';
import Partners from './pages/Partners';
import { ErpOrders } from './pages/ErpOrders/ErpOrders';
import { SearchTrucks } from './pages/SearchTrucks';
import Settings from './pages/Settings/Settings';
import SettingsSectionOrUserEdit from './pages/Settings/SettingsSectionOrUserEdit';
import {
  BillingPage,
  SubscriptionPage,
  SupportPage,
} from './pages/Placeholders/AccountPlaceholders';

import PriceListsPage from './pages/PriceLists/PriceListsPage';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

const appRoutes = [
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/shipments', element: <ManageShipments /> },
  { path: '/search-trucks', element: <SearchTrucks /> },
  { path: '/shipments/:id', element: <ShipmentDetail /> },
  {
    path: '/shipments/create',
    element: <CreateShipmentWizardLayout />,
    children: [
      { index: true, element: <Navigate to="step/1" replace /> },
      { path: 'step/1', element: <CreateShipmentStep1Page /> },
      { path: 'step/2', element: <CreateShipmentStep2Page /> },
      { path: 'step/3', element: <CreateShipmentStep3Page /> },
    ],
  },
  { path: '/address-book', element: <AddressBook /> },
  { path: '/products', element: <ProductMaster /> },
  { path: '/partners', element: <Partners /> },
  { path: '/pricing', element: <PriceListsPage /> },
  { path: '/erp-orders', element: <ErpOrders /> },
  { path: '/settings', element: <Navigate to="/settings/personal" replace /> },
  { path: '/settings/:section/:tab', element: <SettingsSectionOrUserEdit /> },
  { path: '/settings/:section', element: <Settings /> },
  { path: '/billing', element: <BillingPage /> },
  { path: '/subscription', element: <SubscriptionPage /> },
  { path: '/support', element: <SupportPage /> },
  { path: '/trust', element: <Navigate to="/settings/trustCenter" replace /> },
];

const protectedLayout = {
  element: (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  ),
  children: appRoutes,
};

export const router = createBrowserRouter(
  basename
    ? [
        { path: '/login', element: <LoginPage /> },
        { path: '/', element: <Navigate to="/address-book" replace /> },
        protectedLayout,
        { path: '*', element: <Navigate to="/address-book" replace /> },
      ]
    : [
        { path: '/login', element: <LoginPage /> },
        { path: '/', element: <Navigate to="/login" replace /> },
        { path: '/about', element: <Navigate to="/login" replace /> },
        protectedLayout,
        { path: '*', element: <Navigate to="/login" replace /> },
      ],
  { basename }
);
