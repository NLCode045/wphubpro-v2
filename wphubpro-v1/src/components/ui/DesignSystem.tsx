import React, { createContext, useContext } from "react";

type Tokens = {
  primary: string;
  foreground: string;
  radius: string;
};

const defaultTokens: Tokens = {
  primary: "239 85% 67%",
  foreground: "222.2 84% 4.9%",
  radius: "0.5rem",
};

const DesignSystemContext = createContext<Tokens>(defaultTokens);

export const DesignSystemProvider: React.FC<{
  children: React.ReactNode;
  tokens?: Partial<Tokens>;
}> = ({ children, tokens }) => {
  const merged = { ...defaultTokens, ...(tokens || {}) };

  const style: React.CSSProperties = {
    // expose HSL tokens as CSS custom properties consumed by index.css
    ["--primary-hsl" as any]: merged.primary,
    ["--foreground" as any]: merged.foreground,
    ["--radius" as any]: merged.radius,
  };

  return (
    <DesignSystemContext.Provider value={merged}>
      <div style={style}>{children}</div>
    </DesignSystemContext.Provider>
  );
};

export const useDesignSystem = () => useContext(DesignSystemContext);

export default DesignSystemProvider;
