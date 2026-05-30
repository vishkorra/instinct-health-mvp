import { Building2, HeartPulse, Hospital, ShieldCheck } from 'lucide-react';
import type { Role } from '../shared/types';

const roleConfig: Record<Role, { label: string; icon: typeof Hospital }> = {
  provider: { label: 'Provider', icon: Hospital },
  pharmacy: { label: 'Pharmacy', icon: Building2 },
  insurance: { label: 'Insurance', icon: ShieldCheck },
  patient: { label: 'Patient', icon: HeartPulse }
};

interface RoleTabsProps {
  roles: Role[];
  activeRole: Role;
  onChange: (role: Role) => void;
}

export function RoleTabs({ roles, activeRole, onChange }: RoleTabsProps) {
  return (
    <div className="flex flex-wrap rounded-lg border border-slate-200 bg-slate-100 p-1">
      {roles.map((role) => {
        const Icon = roleConfig[role].icon;
        const active = role === activeRole;
        return (
          <button
            key={role}
            onClick={() => onChange(role)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
              active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <Icon className="h-4 w-4" />
            {roleConfig[role].label}
          </button>
        );
      })}
    </div>
  );
}
