import { create } from "zustand";

export type Page =
  | "chat"
  | "customers"
  | "services"
  | "products"
  | "collaborators"
  | "skills"
  | "agents"
  | "calendar"
  | "finance"
  | "usage";

function getPageFromPath(pathname: string): Page {
  if (pathname.startsWith("/customers")) return "customers";
  if (pathname.startsWith("/services")) return "services";
  if (pathname.startsWith("/products")) return "products";
  if (pathname.startsWith("/collaborators")) return "collaborators";
  if (pathname.startsWith("/skills")) return "skills";
  if (pathname.startsWith("/agents")) return "agents";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/finance")) return "finance";
  if (pathname.startsWith("/usage")) return "usage";
  return "chat";
}

function getInitialPage(): Page {
  if (typeof window === "undefined") return "chat";
  return getPageFromPath(window.location.pathname);
}

interface NavigationStore {
  activePage: Page;
  /**
   * Read-only view. In the new TanStack Start architecture the URL is the
   * source of truth — setActivePage no longer mutates browser history. It
   * only records the current page for components that gate subscriptions by
   * `activePage === X`. Router navigation should use `useNavigate()`/`<Link>`.
   */
  setActivePage: (page: Page) => void;
  /** Call from a router subscription to keep activePage in sync with the URL. */
  syncFromPathname: (pathname: string) => void;
}

const useNavigationStore = create<NavigationStore>((set) => ({
  activePage: getInitialPage(),
  setActivePage: (page: Page) => {
    set({ activePage: page });
  },
  syncFromPathname: (pathname: string) => {
    set({ activePage: getPageFromPath(pathname) });
  },
}));

export default useNavigationStore;
