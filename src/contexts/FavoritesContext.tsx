import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { getFavoriteIds, toggleFavorite } from "../services/favorites";

interface FavoritesContextType {
  /** Set of favorited minute IDs */
  favoriteIds: Set<string>;
  /** Whether favorites are still loading */
  loading: boolean;
  /** Toggle favorite status for a minute. Returns new state. */
  toggle: (minuteId: string) => Promise<boolean>;
  /** Check if a minute is favorited */
  isFavorited: (minuteId: string) => boolean;
  /** Refresh favorites from server */
  refresh: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType>({
  favoriteIds: new Set(),
  loading: true,
  toggle: async () => false,
  isFavorited: () => false,
  refresh: async () => {},
});

export function FavoritesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }
    const { data } = await getFavoriteIds();
    if (data) setFavoriteIds(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchFavorites();
    }
  }, [fetchFavorites]);

  const toggle = useCallback(
    async (minuteId: string): Promise<boolean> => {
      const { data: newState } = await toggleFavorite(minuteId);
      if (newState) {
        setFavoriteIds((prev) => new Set(prev).add(minuteId));
      } else {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(minuteId);
          return next;
        });
      }
      return newState;
    },
    []
  );

  const isFavorited = useCallback(
    (minuteId: string) => favoriteIds.has(minuteId),
    [favoriteIds]
  );

  return (
    <FavoritesContext.Provider
      value={{ favoriteIds, loading, toggle, isFavorited, refresh: fetchFavorites }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextType {
  return useContext(FavoritesContext);
}
