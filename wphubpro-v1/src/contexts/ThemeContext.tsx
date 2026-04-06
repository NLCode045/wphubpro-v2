
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { usePlatformSettings } from '../hooks/usePlatformSettings';
import { hexToHsl } from '../lib/utils';

interface ThemeContextType {
  theme: any; 
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: theme, isLoading } = usePlatformSettings('branding');

  useEffect(() => {
    if (theme && typeof theme === 'object') {
      const root = document.documentElement;

      // --- Handle Colors ---
      // Convert saved HEX colors to HSL strings for CSS variables
      if (theme.primaryColor) {
        const primaryHsl = hexToHsl(theme.primaryColor);
        if (primaryHsl) {
          root.style.setProperty('--primary-hsl', primaryHsl);
        }
      }
      if (theme.secondaryColor) {
        const secondaryHsl = hexToHsl(theme.secondaryColor);
        if (secondaryHsl) {
          root.style.setProperty('--secondary-hsl', secondaryHsl);
        }
      }

      // --- Handle Gradients (blue-gradient, orange-gradient) ---
      if (theme.primaryGradientStart && theme.primaryGradientEnd) {
        root.style.setProperty('--primary-gradient', `linear-gradient(310deg, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`);
      }
      if (theme.secondaryGradientStart && theme.secondaryGradientEnd) {
        root.style.setProperty('--secondary-gradient', `linear-gradient(310deg, ${theme.secondaryGradientStart}, ${theme.secondaryGradientEnd})`);
      }

      // --- Handle Fonts ---
      if (theme.bodyFont) {
        document.body.style.fontFamily = theme.bodyFont;
      }
      
      if (theme.headerFont) {
        const styleId = 'dynamic-header-font-style';
        let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = styleId;
          document.head.appendChild(styleTag);
        }
        styleTag.innerHTML = `
          h1, h2, h3, h4, h5, h6, .font-heading {
            font-family: ${theme.headerFont};
          }
        `;
      }
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};


export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
