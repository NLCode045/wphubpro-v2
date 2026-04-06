import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

/** One tab in the top bar breadcrumb (links with icon + label). */
export interface BreadcrumbTabItem {
  label: string;
  /** Material Icons ligature name, e.g. `inventory_2` */
  icon: string;
  href: string;
}

/** Tabbed page: Home / page name (link) / current tab label (orange). Tab switching stays in the page tab bar. */
export interface BreadcrumbConfig {
  pageName: string;
  /** Where the page name links (e.g. `/library`, `/sites/:id`) */
  pageHref: string;
  tabs: BreadcrumbTabItem[];
  /** Active tab index in `tabs`, or `null` to show only the page name crumb. */
  activeTabIndex: number | null;
}

interface PageBreadcrumbContextType {
  /** Simple last segment (detail views, non-tabbed pages). Clears `breadcrumbConfig`. */
  simpleTitle: string | null;
  setBreadcrumbTitle: (title: string | null) => void;
  /** Full tabbed breadcrumb. Clears `simpleTitle`. */
  breadcrumbConfig: BreadcrumbConfig | null;
  setBreadcrumbConfig: (config: BreadcrumbConfig | null) => void;
}

const PageBreadcrumbContext = createContext<PageBreadcrumbContextType | undefined>(undefined);

export function PageBreadcrumbProvider({ children }: { children: ReactNode }) {
  const [simpleTitle, setSimpleTitle] = useState<string | null>(null);
  const [breadcrumbConfig, setBreadcrumbConfigState] = useState<BreadcrumbConfig | null>(null);

  const setBreadcrumbTitle = useCallback((title: string | null) => {
    setSimpleTitle(title);
    setBreadcrumbConfigState(null);
  }, []);

  const setBreadcrumbConfig = useCallback((config: BreadcrumbConfig | null) => {
    setBreadcrumbConfigState(config);
    setSimpleTitle(null);
  }, []);

  return (
    <PageBreadcrumbContext.Provider
      value={{ simpleTitle, setBreadcrumbTitle, breadcrumbConfig, setBreadcrumbConfig }}
    >
      {children}
    </PageBreadcrumbContext.Provider>
  );
}

export function usePageBreadcrumb() {
  const context = useContext(PageBreadcrumbContext);
  return (
    context ?? {
      simpleTitle: null,
      setBreadcrumbTitle: () => {},
      breadcrumbConfig: null,
      setBreadcrumbConfig: () => {},
    }
  );
}
