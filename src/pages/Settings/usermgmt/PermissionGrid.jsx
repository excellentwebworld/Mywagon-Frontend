/**
 * PermissionGrid — Reusable permission checkbox grid with dependency enforcement.
 *
 * Used by: UserDrawer (read/edit mode), RolesTab (Session 2)
 *
 * Features:
 * - 14 permission groups, ~50 permissions
 * - Risk level dots (low/medium/high)
 * - ⓘ tooltip per permission with description
 * - 🔗 icon on auto-enabled dependencies
 * - Collapsible groups (click header to toggle)
 * - Dependency auto-enable with toast
 * - Block disable if dependents are active
 * - Read mode: compact ✅/⛔ view with counts
 * - Edit mode: full checkbox grid
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Info, Link2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import {
  PERMISSION_GROUPS, PERMISSION_DEPENDENCIES, PERMISSION_DEPENDENTS,
  getRiskColor, ALL_PERMISSION_KEYS,
} from '../../../mocks/userMgmtData';

export default function PermissionGrid({
  permissions,        // string[]|null — current enabled permissions (null = all)
  editing = false,    // whether in edit mode
  onChange,           // (newPerms: string[]) => void
  autoEnabledKeys,   // Set<string> — permissions that were auto-enabled by dependencies
  onAutoEnabled,     // (Set<string>) => void — callback when auto-enabled set changes
  searchQuery = '',  // optional search filter
  defaultCollapsed = true, // whether groups start collapsed in read mode
}) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();

  const isFullAdmin = permissions === null;
  const permSet = useMemo(() => {
    if (isFullAdmin) return new Set(ALL_PERMISSION_KEYS);
    return new Set(permissions || []);
  }, [permissions, isFullAdmin]);

  const [collapsed, setCollapsed] = useState(() => {
    const init = {};
    PERMISSION_GROUPS.forEach(g => { init[g.key] = editing ? false : defaultCollapsed; });
    return init;
  });

  const toggleGroup = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  /* ── Toggle a permission (edit mode) ── */
  const handleToggle = useCallback((permKey) => {
    if (!onChange || isFullAdmin) return;

    const newSet = new Set(permSet);
    const autoSet = new Set(autoEnabledKeys || []);

    if (newSet.has(permKey)) {
      // Trying to disable: check if dependents are enabled
      const dependents = PERMISSION_DEPENDENTS[permKey] || [];
      const activeDependents = dependents.filter(d => newSet.has(d));
      if (activeDependents.length > 0) {
        const names = activeDependents.map(d => t(`userMgmt.perm.${d}`)).join(', ');
        toast.error(t('userMgmt.deps.cannotDisable', { perms: names }));
        return;
      }
      newSet.delete(permKey);
      autoSet.delete(permKey);
    } else {
      // Enabling: auto-enable dependencies
      newSet.add(permKey);
      const deps = PERMISSION_DEPENDENCIES[permKey] || [];
      const newlyEnabled = [];
      deps.forEach(dep => {
        if (!newSet.has(dep)) {
          newSet.add(dep);
          autoSet.add(dep);
          newlyEnabled.push(t(`userMgmt.perm.${dep}`));
        }
      });
      if (newlyEnabled.length > 0) {
        toast.info(t('userMgmt.deps.autoEnabled', { perms: newlyEnabled.join(', ') }));
      }
    }

    onChange(Array.from(newSet));
    onAutoEnabled?.(autoSet);
  }, [permSet, onChange, isFullAdmin, autoEnabledKeys, onAutoEnabled, t, toast]);

  /* ── Filter groups by search ── */
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return PERMISSION_GROUPS;
    const q = searchQuery.toLowerCase();
    return PERMISSION_GROUPS.map(g => ({
      ...g,
      permissions: g.permissions.filter(p =>
        t(`userMgmt.perm.${p.key}`).toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q)
      ),
    })).filter(g => g.permissions.length > 0);
  }, [searchQuery, t]);

  return (
    <div className="space-y-1">
      {filteredGroups.map(group => {
        const Icon = LucideIcons[group.icon] || LucideIcons.Circle;
        const isCollapsed = collapsed[group.key];
        const enabledCount = group.permissions.filter(p => permSet.has(p.key)).length;
        const totalCount = group.permissions.length;

        return (
          <div key={group.key} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${T.bd}` }}>
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group.key)}
              className="flex items-center justify-between w-full px-3 py-2.5 cursor-pointer border-none"
              style={{ background: T.sa, color: T.t1 }}
            >
              <div className="flex items-center gap-2">
                {isCollapsed ? <ChevronRight size={13} style={{ color: T.t3 }} /> : <ChevronDown size={13} style={{ color: T.t3 }} />}
                <Icon size={14} style={{ color: T.ac }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{t(`userMgmt.permGroup.${group.key}`)}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, color: enabledCount === totalCount ? '#10B981' : T.t3 }}>
                {enabledCount}/{totalCount}
              </span>
            </button>

            {/* Permissions list */}
            {!isCollapsed && (
              <div style={{ background: T.sf }}>
                {group.permissions.map(perm => {
                  const enabled = permSet.has(perm.key);
                  const risk = getRiskColor(perm.risk);
                  const isAutoEnabled = autoEnabledKeys?.has?.(perm.key);

                  return (
                    <div
                      key={perm.key}
                      className="flex items-center gap-2 px-3 py-2"
                      style={{ borderTop: `1px solid ${T.bd}` }}
                    >
                      {editing ? (
                        <input
                          type="checkbox"
                          checked={enabled}
                          disabled={isFullAdmin}
                          onChange={() => handleToggle(perm.key)}
                          className="shrink-0"
                        />
                      ) : (
                        <span style={{ fontSize: 12, width: 18, textAlign: 'center' }}>
                          {enabled ? '✅' : '⛔'}
                        </span>
                      )}

                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        title={`${perm.risk} risk`}
                        style={{ background: risk.fg }}
                      />

                      <span className="flex-1 min-w-0" style={{ fontSize: 12, fontWeight: 500, color: enabled ? T.t1 : T.t3 }}>
                        {t(`userMgmt.perm.${perm.key}`)}
                      </span>

                      {isAutoEnabled && (
                        <Link2 size={11} style={{ color: T.ac, opacity: 0.6 }} title={t('userMgmt.deps.linkedDep')} />
                      )}

                      <PermTooltip permKey={perm.key} T={T} t={t} />
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

/* ── Info tooltip for permission description ── */
function PermTooltip({ permKey, T, t }) {
  const [show, setShow] = useState(false);
  const desc = t(`userMgmt.permDesc.${permKey}`, { defaultValue: '' });
  if (!desc) return null;

  return (
    <div className="relative shrink-0">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        className="p-0.5 cursor-pointer border-none bg-transparent"
        style={{ color: T.t3, opacity: 0.5 }}
      >
        <Info size={12} />
      </button>
      {show && (
        <div
          className="absolute right-0 top-full mt-1 px-3 py-2 rounded-lg shadow-lg"
          style={{
            background: T.sf, border: `1px solid ${T.bd}`,
            fontSize: 11, color: T.t2, maxWidth: 240, zIndex: 80,
            whiteSpace: 'normal', lineHeight: 1.5,
          }}
        >
          {desc}
        </div>
      )}
    </div>
  );
}
