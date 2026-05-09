import { useLocation } from "@/lib/router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompany } from "../context/CompanyContext";
import { useDashboardPersona, type DashboardPersona } from "../context/DashboardPersonaContext";
import { cn } from "@/lib/utils";

export function DashboardPersonaSelect({ className }: { className?: string }) {
  const location = useLocation();
  const { selectedCompanyId } = useCompany();
  const { persona, setPersona } = useDashboardPersona();

  const isInstanceSettingsRoute = location.pathname.startsWith("/instance/");
  const isCompanySettingsRoute = location.pathname.includes("/company/settings");

  if (!selectedCompanyId || isInstanceSettingsRoute || isCompanySettingsRoute) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2 shrink-0", className)}>
      <span className="hidden sm:inline text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        View as
      </span>
      <Select value={persona} onValueChange={(v) => setPersona(v as DashboardPersona)}>
        <SelectTrigger size="sm" className="h-8 w-[140px] text-xs" aria-label="Dashboard role">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="manager">Manager</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
