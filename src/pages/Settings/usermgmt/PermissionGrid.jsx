/**
 * PermissionGrid — Blade-parity groups from API catalog (Spatie / shipper_permissions.value).
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Link2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { useUserMgmt } from '../../../context/UserMgmtContext';
import {
  PERMISSION_DEPENDENCIES,
  PERMISSION_DEPENDENTS,
} from '../../../utils/shipperAccessPresets';

const GROUP_ICONS = {
  create_shipment: 'Package',
  manage_shipments: 'ClipboardList',
  carrier_assignment: 'Gavel',
  collaboration: 'Handshake',
  control: 'Shield',
  billing: 'CreditCard',
  company_account_information: 'Building2',
};

export default function PermissionGrid({
  permissions,
  editing = false,
  onChange,
  autoEnabledKeys,
  onAutoEnabled,
  searchQuery = '',
  defaultCollapsed = true,
  groups: groupsProp,
}) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();
  const { permissionGroups } = useUserMgmt();

  const catalogGroups = groupsProp?.length ? groupsProp : permissionGroups;

  const allKeys = useMemo(
    () => catalogGroups.flatMap((g) => g.permissions.map((p) => p.name)),
    [catalogGroups],
  );

  const isFullAdmin = permissions === null;
  const permSet = useMemo(() => {
    if (isFullAdmin) return new Set(allKeys);
    return new Set(permissions || []);
  }, [permissions, isFullAdmin, allKeys]);

  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    const init = {};
    catalogGroups.forEach((g) => {
      init[g.key] = editing ? false : defaultCollapsed;
    });
    setCollapsed(init);
  }, [catalogGroups, editing, defaultCollapsed]);

  const toggleGroup = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleToggle = useCallback((permKey) => {
    if (!onChange || isFullAdmin) return;

    const newSet = new Set(permSet);
    const autoSet = new Set(autoEnabledKeys || []);

    if (newSet.has(permKey)) {
      const dependents = PERMISSION_DEPENDENTS[permKey] || [];
      const activeDependents = dependents.filter((d) => newSet.has(d));
      if (activeDependents.length > 0) {
        toast.error(t('userMgmt.deps.cannotDisable', { perms: activeDependents.join(', ') }));
        return;
      }
      newSet.delete(permKey);
      autoSet.delete(permKey);
    } else {
      newSet.add(permKey);
      const deps = PERMISSION_DEPENDENCIES[permKey] || [];
      const newlyEnabled = [];
      deps.forEach((dep) => {
        if (!newSet.has(dep)) {
          newSet.add(dep);
          autoSet.add(dep);
          newlyEnabled.push(dep);
        }
      });
      if (newlyEnabled.length > 0) {
        toast.info(t('userMgmt.deps.autoEnabled', { perms: newlyEnabled.join(', ') }));
      }
    }

    onChange(Array.from(newSet));
    onAutoEnabled?.(autoSet);
  }, [permSet, onChange, isFullAdmin, autoEnabledKeys, onAutoEnabled, t, toast]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return catalogGroups;
    const q = searchQuery.toLowerCase();
    return catalogGroups
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter(
          (p) =>
            (p.label || '').toLowerCase().includes(q) ||
            (p.name || '').toLowerCase().includes(q) ||
            (g.label || '').toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.permissions.length > 0);
  }, [searchQuery, catalogGroups]);

  if (!catalogGroups.length) {
    return (
      <div className="py-8 text-center" style={{ color: T.t3, fontSize: 13 }}>
        {t('userMgmt.roles.loadingPermissions', { defaultValue: 'Loading permissions…' })}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {filteredGroups.map((group) => {
        const iconName = GROUP_ICONS[group.key] || 'Circle';
        const Icon = LucideIcons[iconName] || LucideIcons.Circle;
        const isCollapsed = collapsed[group.key];
        const enabledCount = group.permissions.filter((p) => permSet.has(p.name)).length;
        const totalCount = group.permissions.length;
        const groupLabel =
          t(`userMgmt.permGroup.${group.key}`, { defaultValue: group.label });

        return (
          <div key={group.key} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${T.bd}` }}>
            <button
              type="button"
              onClick={() => toggleGroup(group.key)}
              className="flex items-center justify-between w-full px-3 py-2.5 cursor-pointer border-none"
              style={{ background: T.sa, color: T.t1 }}
            >
              <div className="flex items-center gap-2">
                {isCollapsed ? <ChevronRight size={13} style={{ color: T.t3 }} /> : <ChevronDown size={13} style={{ color: T.t3 }} />}
                <Icon size={14} style={{ color: T.ac }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{groupLabel}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, color: enabledCount === totalCount ? '#10B981' : T.t3 }}>
                {enabledCount}/{totalCount}
              </span>
            </button>

            {!isCollapsed && (
              <div style={{ background: T.sf }}>
                {group.permissions.map((perm) => {
                  const enabled = permSet.has(perm.name);
                  const isAutoEnabled = autoEnabledKeys?.has?.(perm.name);
                  const label = t(`userMgmt.perm.${perm.name}`, { defaultValue: perm.label });

                  return (
                    <div
                      key={perm.name}
                      className="flex items-center gap-2 px-3 py-2"
                      style={{ borderTop: `1px solid ${T.bd}` }}
                    >
                      {editing ? (
                        <input
                          type="checkbox"
                          checked={enabled}
                          disabled={isFullAdmin}
                          onChange={() => handleToggle(perm.name)}
                          className="shrink-0"
                        />
                      ) : (
                        <span style={{ fontSize: 12, width: 18, textAlign: 'center' }}>
                          {enabled ? '✅' : '⛔'}
                        </span>
                      )}

                      <span className="flex-1 min-w-0" style={{ fontSize: 12, fontWeight: 500, color: enabled ? T.t1 : T.t3 }}>
                        {label}
                      </span>

                      {isAutoEnabled && (
                        <Link2 size={11} style={{ color: T.ac, opacity: 0.6 }} title={t('userMgmt.deps.linkedDep')} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
