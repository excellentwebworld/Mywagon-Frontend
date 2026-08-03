/**
 * UserMgmtContext — in-memory user list for Settings Users & Roles (mock Phase 2).
 * Keeps list / invite / edit page in sync until real APIs land.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { MOCK_USERS } from '../mocks/userMgmtData';

export type UserMgmtUser = (typeof MOCK_USERS)[number] & Record<string, unknown>;

interface UserMgmtContextValue {
  users: UserMgmtUser[];
  setUsers: React.Dispatch<React.SetStateAction<UserMgmtUser[]>>;
  getUser: (id: string) => UserMgmtUser | undefined;
  updateUser: (user: UserMgmtUser) => void;
  addUser: (user: UserMgmtUser) => void;
  removeUser: (id: string) => void;
}

const UserMgmtContext = createContext<UserMgmtContextValue | null>(null);

export function UserMgmtProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserMgmtUser[]>(() =>
    MOCK_USERS.map((u) => ({ ...u })),
  );

  const getUser = useCallback(
    (id: string) => users.find((u) => u.id === id),
    [users],
  );

  const updateUser = useCallback((user: UserMgmtUser) => {
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...user } : u)));
  }, []);

  const addUser = useCallback((user: UserMgmtUser) => {
    setUsers((prev) => [...prev, user]);
  }, []);

  const removeUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const value = useMemo(
    () => ({ users, setUsers, getUser, updateUser, addUser, removeUser }),
    [users, getUser, updateUser, addUser, removeUser],
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
