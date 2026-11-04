import { ConnectionBadge } from "@/components/ConnectionBadge";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Bluetooth,
  Droplets,
  History,
  LayoutDashboard,
  Settings,
  Sprout,
} from "lucide-react";
import type { ReactNode } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Inicio", icon: LayoutDashboard },
  { to: "/bluetooth", label: "Bluetooth", icon: Bluetooth },
  { to: "/monitoreo", label: "Monitoreo", icon: Activity },
  { to: "/riego", label: "Riego", icon: Droplets },
  { to: "/plantas", label: "Plantas", icon: Sprout },
  { to: "/historial", label: "Historial", icon: History },
  { to: "/configuracion", label: "Config", icon: Settings },
];

function isActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function Layout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-2"
            data-ocid="nav.home_link"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-subtle">
              <Sprout className="size-5" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              Monitoreg
            </span>
          </Link>
          <ConnectionBadge />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 md:pb-10">
        {children}
      </main>

      <footer className="hidden border-t border-border bg-card px-4 py-4 md:block">
        <p className="mx-auto max-w-5xl text-center text-xs text-muted-foreground">
          © {year}. Built with love using{" "}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
              typeof window !== "undefined" ? window.location.hostname : "",
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            caffeine.ai
          </a>
        </p>
      </footer>

      <nav
        aria-label="Navegación principal"
        data-ocid="nav.bottom_bar"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-sidebar-border bg-sidebar/95 backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto flex max-w-5xl items-stretch justify-between px-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.to);
            const Icon = item.icon;
            return (
              <li key={item.to} className="flex-1">
                <Link
                  to={item.to}
                  data-ocid={`nav.tab.${item.label.toLowerCase()}`}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] font-medium transition-smooth",
                    active
                      ? "text-sidebar-primary"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-0.5 w-6 rounded-full transition-smooth",
                      active ? "bg-sidebar-primary" : "bg-transparent",
                    )}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
