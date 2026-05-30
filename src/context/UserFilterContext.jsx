import { createContext, useContext, useState, useMemo } from "react";
import { useTeam } from "../hooks/useUsers";

const UserFilterCtx = createContext(null);

export function UserFilterProvider({ children }) {
  const { data: team = [] } = useTeam();

  const tls     = useMemo(() => team.filter((u) => u.role === "manager"), [team]);
  const members = useMemo(() => team.filter((u) => u.role === "member"),  [team]);

  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleTL = (tl) => {
    setSelectedIds((prev) => {
      const next      = new Set(prev);
      const tlMembers = members.filter((m) => m.manager === tl.id);
      const group     = [tl.id, ...tlMembers.map((m) => m.id)];
      const allIn     = group.every((id) => next.has(id));
      group.forEach((id) => (allIn ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const toggleMember = (member) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(member.id) ? next.delete(member.id) : next.add(member.id);
      return next;
    });
  };

  const clearAll = () => setSelectedIds(new Set());

  return (
    <UserFilterCtx.Provider value={{
      selectedIds, setSelectedIds,
      toggleTL, toggleMember, clearAll,
      team, tls, members,
    }}>
      {children}
    </UserFilterCtx.Provider>
  );
}

export function useUserFilter() {
  const ctx = useContext(UserFilterCtx);
  if (!ctx) throw new Error("useUserFilter must be used within UserFilterProvider");
  return ctx;
}
