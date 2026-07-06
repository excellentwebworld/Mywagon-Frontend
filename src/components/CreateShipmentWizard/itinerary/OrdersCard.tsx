import React from 'react';
import { Package } from 'lucide-react';
import { formatWeightKg } from './cargoUtils';
import type { OrderCardCustomerGroup } from './stopGrouping';

interface OrdersCardProps {
  groups: OrderCardCustomerGroup[];
  t: (key: string, params?: Record<string, unknown>) => string;
}

export const OrdersCard: React.FC<OrdersCardProps> = ({ groups, t }) => {
  const hasCustomers = groups.some((g) => g.customerName);

  return (
    <div className="card">
      <div className="ch" style={{ cursor: 'default' }}>
        <Package size={18} />
        <span>{t('orders') || 'Orders'}</span>
      </div>
      <div className="cb" style={{ padding: 0 }}>
        {groups.length === 0 && (
          <div className="px-4 py-6 text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
            {t('step2NoOrders') || 'No orders on this load.'}
          </div>
        )}
        {groups.map((group, gi) => (
          <div key={gi} className="oc-cust-group">
            {hasCustomers && group.customerName && (
              <div className="oc-cust-head">
                <span>🏪</span>
                <span className="oc-cust-name">{group.customerName}</span>
                <span className="oc-cust-total">{formatWeightKg(group.totalWeightKg)}</span>
              </div>
            )}
            {group.orders.map((order) => (
              <div
                key={order.orderId || order.orderRef}
                className={`order-item${!group.customerName ? ' ungrouped' : ''}`}
              >
                <div>
                  <div className="oi-id">{order.orderRef}</div>
                  <div className="oi-route">
                    <span>{order.routeLabel.split(' → ')[0]}</span>
                    <span className="oi-arrow">→</span>
                    <span>{order.routeLabel.split(' → ')[1] || '—'}</span>
                  </div>
                </div>
                <div className="oi-wt">{formatWeightKg(order.weightKg)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrdersCard;
