import React, { createContext, useContext, useState } from "react";

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}

const Tabs = ({ defaultValue, children, className = "" }: TabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

const List = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`border-b border-border mb-6 ${className}`}>
    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
      {children}
    </nav>
  </div>
);

const Trigger = ({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error("Tabs.Trigger must be used within Tabs");

  const isActive = context.activeTab === value;

  return (
    <button
      onClick={() => context.setActiveTab(value)}
      className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
        isActive
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
      }`}
    >
      {children}
    </button>
  );
};

const Content = ({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error("Tabs.Content must be used within Tabs");

  if (context.activeTab !== value) return null;
  return <div className="mt-2">{children}</div>;
};

// Koppel de subcomponenten aan het hoofdobject
Tabs.List = List;
Tabs.Trigger = Trigger;
Tabs.Content = Content;

export default Tabs;
