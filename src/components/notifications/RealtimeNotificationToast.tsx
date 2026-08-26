import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Users,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Bell,
  MessageSquare,
  FileText,
  ArrowRight,
  X,
  type LucideIcon,
} from 'lucide-react';

export interface PushNotificationData {
  id?: string;
  title: string;
  body: string;
  type?: string;
  type_id?: string;
  action_id?: string;
  external_url?: string;
  redirect_slug?: string;
  created_at?: string;
}

interface ToastConfig {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeColor: string;
  categoryName: string;
  actionLabel: string;
  route: string;
}

/**
 * Resolves destination route and UI styling based on notification payload,
 * mirroring the official Laravel Shipper panel routing logic.
 */
export function resolveNotificationConfig(data: PushNotificationData): ToastConfig {
  if (data.external_url) {
    return {
      icon: Bell,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50',
      badgeColor: 'text-indigo-700 dark:text-indigo-300',
      categoryName: 'Link',
      actionLabel: 'Open Link',
      route: data.external_url,
    };
  }

  const id = data.type_id || data.action_id;
  const rawTarget = (data.redirect_slug || data.type || '').toLowerCase();

  switch (true) {
    case rawTarget.includes('dashboard') || rawTarget.includes('home'):
      return {
        icon: Bell,
        iconBg: 'bg-indigo-50 dark:bg-indigo-950/60',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50',
        badgeColor: 'text-indigo-700 dark:text-indigo-300',
        categoryName: 'Dashboard',
        actionLabel: 'View Dashboard',
        route: '/dashboard',
      };

    case rawTarget.includes('create_shipment') || rawTarget.includes('shipment.create'):
      return {
        icon: Truck,
        iconBg: 'bg-indigo-50 dark:bg-indigo-950/60',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50',
        badgeColor: 'text-indigo-700 dark:text-indigo-300',
        categoryName: 'Shipment',
        actionLabel: 'Create Shipment',
        route: '/shipments/create',
      };

    case rawTarget.includes('cancel_shipment'):
      return {
        icon: AlertTriangle,
        iconBg: 'bg-rose-50 dark:bg-rose-950/60',
        iconColor: 'text-rose-600 dark:text-rose-400',
        badgeBg: 'bg-rose-50 dark:bg-rose-950/50',
        badgeColor: 'text-rose-700 dark:text-rose-300',
        categoryName: 'Cancellation',
        actionLabel: id ? 'View Shipment' : 'Manage Shipments',
        route: id ? `/shipments/${id}` : '/shipments',
      };

    case rawTarget.includes('manage_shipments') || rawTarget.includes('shipment') || rawTarget.includes('load') || rawTarget.includes('bid'):
      return {
        icon: Truck,
        iconBg: 'bg-indigo-50 dark:bg-indigo-950/60',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50',
        badgeColor: 'text-indigo-700 dark:text-indigo-300',
        categoryName: 'Shipment',
        actionLabel: id ? 'View Load' : 'Manage Shipments',
        route: id ? `/shipments/${id}` : '/shipments',
      };

    case rawTarget.includes('search_available_trucks') || rawTarget.includes('availab') || rawTarget.includes('truck'):
      return {
        icon: Truck,
        iconBg: 'bg-sky-50 dark:bg-sky-950/60',
        iconColor: 'text-sky-600 dark:text-sky-400',
        badgeBg: 'bg-sky-50 dark:bg-sky-950/50',
        badgeColor: 'text-sky-700 dark:text-sky-300',
        categoryName: 'Availability',
        actionLabel: 'Search Trucks',
        route: '/search-trucks',
      };

    case rawTarget.includes('address'):
      return {
        icon: FileText,
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50',
        badgeColor: 'text-emerald-700 dark:text-emerald-300',
        categoryName: 'Address Book',
        actionLabel: 'Address Book',
        route: '/address-book',
      };

    case rawTarget.includes('product'):
      return {
        icon: FileText,
        iconBg: 'bg-amber-50 dark:bg-amber-950/60',
        iconColor: 'text-amber-600 dark:text-amber-400',
        badgeBg: 'bg-amber-50 dark:bg-amber-950/50',
        badgeColor: 'text-amber-700 dark:text-amber-300',
        categoryName: 'Products',
        actionLabel: 'Product Master',
        route: '/product-master',
      };

    case rawTarget.includes('partner'):
      return {
        icon: Users,
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50',
        badgeColor: 'text-emerald-700 dark:text-emerald-300',
        categoryName: 'Partners',
        actionLabel: 'View Partners',
        route: '/partners',
      };

    case rawTarget.includes('account_statement') || rawTarget.includes('invoice') || rawTarget.includes('billing') || rawTarget.includes('payment'):
      return {
        icon: CreditCard,
        iconBg: 'bg-amber-50 dark:bg-amber-950/60',
        iconColor: 'text-amber-600 dark:text-amber-400',
        badgeBg: 'bg-amber-50 dark:bg-amber-950/50',
        badgeColor: 'text-amber-700 dark:text-amber-300',
        categoryName: 'Billing',
        actionLabel: id ? 'View Invoice' : 'View Billing',
        route: id ? `/billing?invoice=${id}` : '/billing',
      };

    case rawTarget.includes('subscription'):
      return {
        icon: FileText,
        iconBg: 'bg-violet-50 dark:bg-violet-950/60',
        iconColor: 'text-violet-600 dark:text-violet-400',
        badgeBg: 'bg-violet-50 dark:bg-violet-950/50',
        badgeColor: 'text-violet-700 dark:text-violet-300',
        categoryName: 'Subscription',
        actionLabel: 'View Subscription',
        route: '/subscription',
      };

    case rawTarget.includes('tutorial'):
      return {
        icon: FileText,
        iconBg: 'bg-purple-50 dark:bg-purple-950/60',
        iconColor: 'text-purple-600 dark:text-purple-400',
        badgeBg: 'bg-purple-50 dark:bg-purple-950/50',
        badgeColor: 'text-purple-700 dark:text-purple-300',
        categoryName: 'Tutorials',
        actionLabel: 'View Tutorials',
        route: '/tutorials',
      };

    case rawTarget.includes('support') || rawTarget.includes('chat') || rawTarget.includes('feedback') || rawTarget.includes('message'):
      return {
        icon: MessageSquare,
        iconBg: 'bg-blue-50 dark:bg-blue-950/60',
        iconColor: 'text-blue-600 dark:text-blue-400',
        badgeBg: 'bg-blue-50 dark:bg-blue-950/50',
        badgeColor: 'text-blue-700 dark:text-blue-300',
        categoryName: 'Support',
        actionLabel: 'Open Support',
        route: '/support',
      };

    case rawTarget.includes('user_management') || rawTarget.includes('sub-users') || rawTarget.includes('user'):
      return {
        icon: Users,
        iconBg: 'bg-teal-50 dark:bg-teal-950/60',
        iconColor: 'text-teal-600 dark:text-teal-400',
        badgeBg: 'bg-teal-50 dark:bg-teal-950/50',
        badgeColor: 'text-teal-700 dark:text-teal-300',
        categoryName: 'Team',
        actionLabel: 'User Management',
        route: '/settings/users',
      };

    case rawTarget.includes('company_operations_information') || rawTarget.includes('company'):
      return {
        icon: FileText,
        iconBg: 'bg-slate-50 dark:bg-slate-800',
        iconColor: 'text-slate-600 dark:text-slate-400',
        badgeBg: 'bg-slate-100 dark:bg-slate-800',
        badgeColor: 'text-slate-700 dark:text-slate-300',
        categoryName: 'Organization',
        actionLabel: 'Company Info',
        route: '/settings/organization',
      };

    case rawTarget.includes('profile') || rawTarget.includes('kyc'):
      return {
        icon: CheckCircle2,
        iconBg: 'bg-purple-50 dark:bg-purple-950/60',
        iconColor: 'text-purple-600 dark:text-purple-400',
        badgeBg: 'bg-purple-50 dark:bg-purple-950/50',
        badgeColor: 'text-purple-700 dark:text-purple-300',
        categoryName: 'Profile',
        actionLabel: 'View Profile',
        route: '/settings/personal',
      };

    case rawTarget.includes('privacy'):
      return {
        icon: FileText,
        iconBg: 'bg-slate-50 dark:bg-slate-800',
        iconColor: 'text-slate-600 dark:text-slate-400',
        badgeBg: 'bg-slate-100 dark:bg-slate-800',
        badgeColor: 'text-slate-700 dark:text-slate-300',
        categoryName: 'Legal',
        actionLabel: 'Privacy Policy',
        route: '/settings/privacy',
      };

    case rawTarget.includes('terms'):
      return {
        icon: FileText,
        iconBg: 'bg-slate-50 dark:bg-slate-800',
        iconColor: 'text-slate-600 dark:text-slate-400',
        badgeBg: 'bg-slate-100 dark:bg-slate-800',
        badgeColor: 'text-slate-700 dark:text-slate-300',
        categoryName: 'Terms & Policies',
        actionLabel: 'Terms & Conditions',
        route: '/settings/terms',
      };

    case rawTarget.includes('notification'):
      return {
        icon: Bell,
        iconBg: 'bg-indigo-50 dark:bg-indigo-950/60',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50',
        badgeColor: 'text-indigo-700 dark:text-indigo-300',
        categoryName: 'Notifications',
        actionLabel: 'View Notifications',
        route: '/notifications',
      };

    default:
      return {
        icon: Bell,
        iconBg: 'bg-indigo-50 dark:bg-indigo-950/60',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50',
        badgeColor: 'text-indigo-700 dark:text-indigo-300',
        categoryName: 'System',
        actionLabel: 'View Details',
        route: id ? `/shipments/${id}` : '/notifications',
      };
  }
}


interface RealtimeNotificationToastProps {
  notification: PushNotificationData | null;
  onDismiss: () => void;
}

const DURATION_MS = 6500;

export const RealtimeNotificationToast: React.FC<RealtimeNotificationToastProps> = ({
  notification,
  onDismiss,
}) => {
  const navigate = useNavigate();
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number>(Date.now());
  const remainingRef = useRef<number>(DURATION_MS);

  useEffect(() => {
    if (!notification) return;

    setProgress(100);
    remainingRef.current = DURATION_MS;
    startTimeRef.current = Date.now();

    const interval = setInterval(() => {
      if (paused) return;

      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.max(0, 100 - (elapsed / DURATION_MS) * 100);
      setProgress(pct);

      if (elapsed >= DURATION_MS) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [notification, paused, onDismiss]);

  if (!notification) return null;

  const config = resolveNotificationConfig(notification);
  const Icon = config.icon;

  const handleNavigate = () => {
    onDismiss();
    if (config.route.startsWith('http://') || config.route.startsWith('https://')) {
      window.open(config.route, '_blank');
    } else {
      navigate(config.route);
    }
  };

  return (
    <aside
      aria-label="Real-time notification"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        startTimeRef.current = Date.now() - (100 - progress) * (DURATION_MS / 100);
      }}
      onClick={handleNavigate}
      className="fixed bottom-6 right-6 z-[999999] w-[380px] max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-4 transition-all duration-300 transform animate-in slide-in-from-bottom-5 fade-in hover:shadow-indigo-500/10 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer overflow-hidden group select-none"
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${config.iconBg} ${config.iconColor} shadow-2xs`}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${config.badgeBg} ${config.badgeColor}`}
              >
                {config.categoryName}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Just now
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
              {notification.title || 'New Notification'}
            </h4>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors -mr-1 -mt-1 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Message */}
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 pl-[42px] mb-3">
        {notification.body}
      </p>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-2 pl-[42px]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNavigate();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs hover:shadow-xs group-hover:translate-x-0.5 transition-all cursor-pointer"
        >
          <span>{config.actionLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress countdown line */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full bg-indigo-600 transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </aside>
  );
};
