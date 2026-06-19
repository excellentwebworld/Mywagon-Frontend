import { createBrowserRouter, Navigate } from 'react-router-dom';
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

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

const appRoutes = [
  {
    path: '/dashboard',
    element: <Dashboard />,
  },
  {
    path: '/shipments',
    element: <ManageShipments />,
  },
  {
    path: '/shipments/:id',
    element: <ShipmentDetail />,
  },
  {
    path: '/shipments/create',
    element: <CreateShipmentWizard />,
  },
  {
    path: '/address-book',
    element: <AddressBook />,
  },
  {
    path: '/products',
    element: <ProductMaster />,
  },
  {
    path: '/partners',
    element: <Partners />,
  },
];

export const router = createBrowserRouter(
  basename
    ? [
        { path: '/', element: <Navigate to="/address-book" replace /> },
        { element: <AppLayout />, children: appRoutes },
        { path: '*', element: <Navigate to="/address-book" replace /> },
      ]
    : [
        { path: '/', element: <MarketingHome /> },
        { path: '/about', element: <MarketingAbout /> },
        { element: <AppLayout />, children: appRoutes },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
  { basename }
);
