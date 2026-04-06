import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Globe,
  Library,
  Gem,
  Settings,
  LifeBuoy,
  ShieldCheck,
  Users,
  CreditCard,
  Package,
  LayoutGrid,
} from "lucide-react";
import { useAuth } from "../../domains/auth";
import { usePlatformSettings } from '../../hooks/usePlatformSettings';

const PlatformBrand: React.FC = () => {
  const { data: details } = usePlatformSettings('details');
  const name = details?.name || 'The Platform';
  const subtitle = details?.subtitle || '';
  const logo = details?.logoUrl || details?.logoDataUrl || null;
  const position = details?.logoPosition || 'left';

  if (position === 'above') {
    return (
      <div className="flex flex-col items-center text-center">
        {logo ? (
          <img src={logo} alt="Logo" className="w-10 h-10 object-contain mb-1" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
        )}
        <div>
          <div className="text-lg font-bold text-foreground">{name}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {logo ? (
        <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
        </svg>
      )}
      <div className="flex flex-col leading-tight">
        <span className="text-lg font-bold text-foreground">{name}</span>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
    </div>
  );
};

type TabId = "user" | "admin";

const Sidebar: React.FC = () => {
  const { isAdmin } = useAuth();
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith("/admin");
  const [activeTab, setActiveTab] = useState<TabId>(isAdmin && isAdminRoute ? "admin" : "user");

  useEffect(() => {
    if (isAdminRoute && isAdmin) setActiveTab("admin");
    else setActiveTab("user");
  }, [pathname, isAdminRoute, isAdmin]);

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/sites", icon: Globe, label: "Sites" },
    { to: "/library", icon: Library, label: "Library" },
    { to: "/subscription", icon: Gem, label: "Subscription" },
  ];

  const adminItems = [
    { to: "/admin/dashboard", icon: LayoutGrid, label: "Admin Dashboard" },
    { to: "/admin/users", icon: Users, label: "User Manager" },
    { to: "/admin/orders", icon: CreditCard, label: "Orders" },
    { to: "/admin/plans", icon: Package, label: "Plan Management" },
    { to: "/admin/subscriptions", icon: Gem, label: "Subscriptions" },
    { to: "/admin/settings", icon: Settings, label: "Platform Settings" },
  ];

  const NavItem = ({
    to,
    icon: Icon,
    label,
  }: {
    to: string;
    icon: React.ElementType;
    label: string;
  }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`
      }
    >
      <Icon className="w-5 h-5 mr-3" />
      <span className="truncate">{label}</span>
    </NavLink>
  );

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border">
      <div className="flex items-center justify-center h-20 border-b border-border px-4">
        <PlatformBrand />
      </div>

      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("user")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "user"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          User
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab("admin")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
              activeTab === "admin"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin
          </button>
        )}
      </div>

      <nav className="flex-1 flex flex-col overflow-auto">
        {activeTab === "user" && (
          <div className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        )}
        {activeTab === "admin" && isAdmin && (
          <div className="flex-1 px-4 py-6 space-y-2">
            {adminItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        )}
      </nav>

      {activeTab === "user" && (
        <div className="px-4 py-6 border-t border-border mt-auto">
          <NavItem to="/settings" icon={Settings} label="Settings" />
          <NavItem to="/support" icon={LifeBuoy} label="Support" />
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
