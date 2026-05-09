import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { Agent } from "@bench/shared";
import { authApi } from "../api/auth";
import { queryKeys } from "../lib/queryKeys";
import { filterAgentsForManagerEmail } from "../lib/manager-scope";

export type DashboardPersona = "admin" | "manager";

const STORAGE_KEY = "bench.dashboardPersona";

function readStoredPersona(): DashboardPersona {
  if (typeof window === "undefined") return "admin";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "manager" ? "manager" : "admin";
  } catch {
    return "admin";
  }
}

type DashboardPersonaContextValue = {
  persona: DashboardPersona;
  setPersona: (next: DashboardPersona) => void;
  isAdminView: boolean;
  isManagerView: boolean;
  sessionEmail: string | null;
};

const DashboardPersonaContext = createContext<DashboardPersonaContextValue | null>(null);

export function DashboardPersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<DashboardPersona>(() => readStoredPersona());

  const setPersona = useCallback((next: DashboardPersona) => {
    setPersonaState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const { data: session } = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
  });

  const sessionEmail = session?.user?.email ?? null;

  const value = useMemo<DashboardPersonaContextValue>(
    () => ({
      persona,
      setPersona,
      isAdminView: persona === "admin",
      isManagerView: persona === "manager",
      sessionEmail,
    }),
    [persona, setPersona, sessionEmail],
  );

  return (
    <DashboardPersonaContext.Provider value={value}>{children}</DashboardPersonaContext.Provider>
  );
}

export function useDashboardPersona(): DashboardPersonaContextValue {
  const ctx = useContext(DashboardPersonaContext);
  if (!ctx) {
    throw new Error("useDashboardPersona must be used within DashboardPersonaProvider");
  }
  return ctx;
}

/** Same as {@link useDashboardPersona} but returns null outside {@link DashboardPersonaProvider} (e.g. Storybook). */
export function useDashboardPersonaOptional(): DashboardPersonaContextValue | null {
  return useContext(DashboardPersonaContext);
}

/** Manager mode narrows to agents whose metadata benchManagerEmail matches the signed-in user. Admin mode returns full lists / null scope (no filtering). */
export function useDashboardAgentScope(agents: Agent[] | undefined): {
  isManagerView: boolean;
  sessionEmail: string | null;
  /** When non-null, UI should filter to these agent ids. Empty set means no assigned hires. */
  scopedAgentIds: Set<string> | null;
  scopedAgents: Agent[];
} {
  const { isManagerView, sessionEmail } = useDashboardPersona();

  return useMemo(() => {
    if (!isManagerView || !agents) {
      return {
        isManagerView: false,
        sessionEmail,
        scopedAgentIds: null,
        scopedAgents: agents ?? [],
      };
    }
    if (!sessionEmail) {
      return {
        isManagerView: true,
        sessionEmail: null,
        scopedAgentIds: new Set<string>(),
        scopedAgents: [],
      };
    }
    const scopedAgents = filterAgentsForManagerEmail(agents, sessionEmail);
    const scopedAgentIds = new Set(scopedAgents.map((a) => a.id));
    return {
      isManagerView: true,
      sessionEmail,
      scopedAgentIds,
      scopedAgents,
    };
  }, [agents, isManagerView, sessionEmail]);
}
