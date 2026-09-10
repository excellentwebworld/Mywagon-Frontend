import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/Login/LoginPage';
import { RegisterPage } from './pages/Register/RegisterPage';
import { ForgotPasswordPage } from './pages/Auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/Auth/ResetPasswordPage';
import { PasswordChangeSuccessPage } from './pages/Auth/PasswordChangeSuccessPage';
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
import SupportPage from './pages/Support/SupportPage';
import { TutorialsPage } from './pages/Tutorials/TutorialsPage';
import { BillingPage } from './pages/Billing';
import { SubscriptionPage } from './pages/Subscription';
import { WebViewSubscriptionPage } from './pages/Subscription/WebViewSubscriptionPage';
import { WebViewBillingPage } from './pages/Billing/WebViewBillingPage';
import { PublicTrackingPage } from './pages/PublicTracking/PublicTrackingPage';

import PriceListsPage from './pages/PriceLists/PriceListsPage';
import { MessagesPage } from './pages/Messages';

import { LegalPage } from './pages/Legal/LegalPage';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

const authRoutes = [
  { path: '/login', element: <LoginPage /> },
  { path: '/shipper/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/any/reset/email/:userType', element: <ForgotPasswordPage /> },
  { path: '/reset/email/:userType', element: <ForgotPasswordPage /> },
  { path: '/reset/:token', element: <ResetPasswordPage /> },
  { path: '/any/reset/:token', element: <ResetPasswordPage /> },
  { path: '/password-change-success', element: <PasswordChangeSuccessPage /> },
  { path: '/any/password-change-success', element: <PasswordChangeSuccessPage /> },
];

const legalRoutes = [
  { path: '/terms-condition/:key/:type/:lang', element: <LegalPage document="terms" /> },
  { path: '/terms-condition/*', element: <LegalPage document="terms" /> },
  { path: '/privacy-policy/:key/:type/:lang', element: <LegalPage document="privacy" /> },
  { path: '/privacy-policy/*', element: <LegalPage document="privacy" /> },
];

const appRoutes = [
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/notifications', element: <Navigate to="/settings/notifications" replace /> },
  { path: '/messages', element: <MessagesPage /> },
  { path: '/chat', element: <Navigate to="/messages" replace /> },
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
  { path: '/settings/subscription', element: <Navigate to="/subscription" replace /> },
  { path: '/settings/billing', element: <Navigate to="/billing" replace /> },
  { path: '/settings/:section/:tab', element: <SettingsSectionOrUserEdit /> },
  { path: '/settings/:section', element: <Settings /> },
  { path: '/billing', element: <BillingPage /> },
  { path: '/subscription', element: <SubscriptionPage /> },
  { path: '/support', element: <SupportPage /> },
  { path: '/tutorials', element: <TutorialsPage /> },
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

const webViewRoutes = [
  { path: '/webview/carrier/subscription', element: <WebViewSubscriptionPage role="carrier" /> },
  { path: '/webview/carrier/subscription/', element: <WebViewSubscriptionPage role="carrier" /> },
  { path: '/webview/driver/subscription', element: <WebViewSubscriptionPage role="driver" /> },
  { path: '/webview/driver/subscription/', element: <WebViewSubscriptionPage role="driver" /> },
  { path: '/webview/carrier/billing', element: <WebViewBillingPage role="carrier" /> },
  { path: '/webview/carrier/billing/', element: <WebViewBillingPage role="carrier" /> },
  { path: '/webview/driver/billing', element: <WebViewBillingPage role="driver" /> },
  { path: '/webview/driver/billing/', element: <WebViewBillingPage role="driver" /> },
];

const publicTrackingRoutes = [
  // Query form (emails): /track-shipment?sid=...&lid=...
  { path: '/track-shipment', element: <PublicTrackingPage /> },
  // Legacy path form + Amplify-decoded %2F (extra segments)
  { path: '/track-shipment/:encryptedId/:encryptedLocationIds', element: <PublicTrackingPage /> },
  { path: '/track-shipment/*', element: <PublicTrackingPage /> },
];

export const router = createBrowserRouter(
  basename
    ? [
        ...authRoutes,
        ...legalRoutes,
        ...webViewRoutes,
        ...publicTrackingRoutes,
        { path: '/', element: <Navigate to="/address-book" replace /> },
        protectedLayout,
        { path: '*', element: <Navigate to="/address-book" replace /> },
      ]
    : [
        ...authRoutes,
        ...legalRoutes,
        ...webViewRoutes,
        ...publicTrackingRoutes,
        { path: '/', element: <Navigate to="/login" replace /> },
        { path: '/about', element: <Navigate to="/login" replace /> },
        protectedLayout,
        { path: '*', element: <Navigate to="/login" replace /> },
      ],
  { basename }
);

/**
 * React Router 7 may update `window.location` inside a transition before React
 * commits the new route (URL changes, UI stays on the previous page). Default
 * navigations to flushSync so history + UI stay aligned — especially after
 * modal open/close on the register/info-form flows.
 */
const rawNavigate = router.navigate.bind(router);
router.navigate = ((to, opts) =>
  rawNavigate(to, {
    ...opts,
    flushSync: opts?.flushSync ?? true,
  })) as typeof router.navigate;
