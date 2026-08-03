/**
 * UserMgmtContext — live Users & Roles data (PDS-937 Spatie).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usersSettingsService, type SeatMeta, type SettingsUser } from '../api/services/usersSettingsService';
import {
  rolesSettingsService,
  type PermissionCatalogGroup,
  type SettingsRole,
} from '../api/services/rolesSettingsService';

export type UserMgmtUser = SettingsUser & Record<string, unknown>;

interface UserMgmtContextValue {
  users: UserMgmtUser[];
  seats: SeatMeta | null;
  roles: SettingsRole[];
  permissionGroups: PermissionCatalogGroup[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setUsers: React.Dispatch<React.SetStateAction<UserMgmtUser[]>>;
  getUser: (id: string) => UserMgmtUser | undefined;
  updateUser: (user: UserMgmtUser) => void;
  addUser: (user: UserMgmtUser) => void;
  removeUser: (id: string) => void;
  setRoles: React.Dispatch<React.SetStateAction<SettingsRole[]>>;
  setPermissionGroups: React.Dispatch<React.SetStateAction<PermissionCatalogGroup[]>>;
  setSeats: React.Dispatch<React.SetStateAction<SeatMeta | null>>;
}

const UserMgmtContext = createContext<UserMgmtContextValue | null>(null);

export function UserMgmtProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserMgmtUser[]>([]);
  const [seats, setSeats] = useState<SeatMeta | null>(null);
  const [roles, setRoles] = useState<SettingsRole[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionCatalogGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersPayload, rolesPayload] = await Promise.all([
        usersSettingsService.list(),
        rolesSettingsService.list(),
      ]);
      setUsers((usersPayload.users || []).map((u) => ({ ...u })));
      setSeats(usersPayload.seats || null);
      setRoles(rolesPayload.roles || []);
      setPermissionGroups(rolesPayload.groups || []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load users & roles';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getUser = useCallback(
    (id: string) => users.find((u) => String(u.id) === String(id)),
    [users],
  );

  const updateUser = useCallback((user: UserMgmtUser) => {
    setUsers((prev) => prev.map((u) => (String(u.id) === String(user.id) ? { ...u, ...user } : u)));
  }, []);

  const addUser = useCallback((user: UserMgmtUser) => {
    setUsers((prev) => [...prev, user]);
  }, []);

  const removeUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((u) => String(u.id) !== String(id)));
  }, []);

  const value = useMemo(
    () => ({
      users,
      seats,
      roles,
      permissionGroups,
      loading,
      error,
      refresh,
      setUsers,
      getUser,
      updateUser,
      addUser,
      removeUser,
      setRoles,
      setPermissionGroups,
      setSeats,
    }),
    [
      users,
      seats,
      roles,
      permissionGroups,
      loading,
      error,
      refresh,
      getUser,
      updateUser,
      addUser,
      removeUser,
    ],
  );

  return <UserMgmtContext.Provider value={value}>{children}</UserMgmtContext.Provider>;
}

export function useUserMgmt() {
  const ctx = useContext(UserMgmtContext);
  if (!ctx) {
    throw new Error('useUserMgmt must be used within UserMgmtProvider');
  }
  return ctx;
}
