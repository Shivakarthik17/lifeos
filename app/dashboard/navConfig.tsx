import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function DashboardIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}
export function CoinIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9.5c-.7-1-1.9-1.5-3-1.5-1.7 0-3 .8-3 2.2 0 1.3 1.2 1.7 3 2.2s3 .9 3 2.2c0 1.4-1.3 2.2-3 2.2-1.1 0-2.3-.5-3-1.5" />
      <path d="M12 7v1M12 16v1" />
    </svg>
  );
}
export function DumbbellIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 6v12M3 9v6M18 6v12M21 9v6M6 12h12" />
    </svg>
  );
}
export function BrainIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-3 3 3 3 0 0 0 1 2.2A3 3 0 0 0 4 14a3 3 0 0 0 2 2.8A3 3 0 0 0 9 20a3 3 0 0 0 3-3V5a2 2 0 0 0-2-2H9Z" />
      <path d="M15 3a3 3 0 0 1 3 3 3 3 0 0 1 3 3 3 3 0 0 1-1 2.2A3 3 0 0 1 20 14a3 3 0 0 1-2 2.8A3 3 0 0 1 15 20a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2h1Z" />
    </svg>
  );
}
export function BriefcaseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
    </svg>
  );
}
export function TargetIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}
export function CalendarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}
export function PeopleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5M14 20c0-2 1.5-3.5 3.5-3.5S21 18 21 20" />
    </svg>
  );
}

export interface NavItem {
  href: string;
  label: string;
  Icon: (props: IconProps) => React.JSX.Element;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/dashboard/finance", label: "Finance", Icon: CoinIcon },
  { href: "/dashboard/fitness", label: "Fitness", Icon: DumbbellIcon },
  { href: "/dashboard/mind", label: "Mind", Icon: BrainIcon },
  { href: "/dashboard/business", label: "Business", Icon: BriefcaseIcon },
  { href: "/dashboard/discipline", label: "Discipline", Icon: TargetIcon },
  { href: "/dashboard/people", label: "People", Icon: PeopleIcon },
  { href: "/dashboard/planner", label: "Planner", Icon: CalendarIcon },
];
