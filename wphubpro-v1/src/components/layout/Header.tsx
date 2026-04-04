import React from "react";
import { Search, Bell, Menu, LogOut } from "lucide-react";
import Button from "../ui/Button";
import { useAuth } from "../../domains/auth";
import { useNavigate } from "react-router-dom";

const Header: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="flex items-center justify-between h-20 px-4 sm:px-6 lg:px-8 bg-card border-b border-border">
      <button className="md:hidden text-muted-foreground">
        <Menu className="w-6 h-6" />
      </button>
      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search sites..."
          className="w-full max-w-xs pl-10 pr-4 py-2 bg-secondary border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </Button>

        {user && (
          <div className="flex items-center space-x-4 pl-4 border-l border-border">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-foreground">{user.name}</p>
              <p className="text-[10px] font-bold uppercase text-primary tracking-wider leading-none mt-0.5">
                {isAdmin ? "Administrator" : "Platform Member"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Logout"
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
