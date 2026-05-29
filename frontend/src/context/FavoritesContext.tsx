/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

export interface Property {
  id: string | number;
  image: string;
  title: string;
  location: string;
  rating: number;
  reviews: number;
  price: number;
  totalPrice?: number;
  nights?: number;
  amenities: string[];
  badge?: string;
  urgency?: string;
  type: string;
  cancellable: boolean;
}

interface FavoritesContextType {
  favorites: Property[];
  toggleFavorite: (property: Property) => void;
  isFavorite: (id: string | number) => boolean;
  isLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch favorites on mount if logged in
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!isLoggedIn) {
        setFavorites([]);
        return;
      }
      try {
        setIsLoading(true);
        const response = await api.get("/profile/favorites");
        if (response.data.success) {
          // Backend returns a paginated object: { favorites: [...], page, limit, total, totalPages }
          const resData = response.data.data;
          const favs = Array.isArray(resData) ? resData : (resData?.favorites ?? []);
          setFavorites(favs);
        }
      } catch (error) {
        console.error("Failed to fetch favorites:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavorites();
  }, [isLoggedIn]);

  const normalizeType = (type: string | undefined) => {
    const t = (type || "").toUpperCase();
    if (["HOTEL", "RESORT", "VILLA", "APARTMENT"].includes(t)) return "stay";
    if (["CAR", "BIKE", "VAN"].includes(t)) return "vehicle";
    if (t === "ATTRACTION" || type === "attraction") return "attraction";
    return "stay"; // default fallback
  };

  const toggleFavorite = async (property: Property) => {
    if (!isLoggedIn) {
      toast.error("Please login to save favorites");
      return;
    }

    // Normalize IDs to string to avoid number/string type mismatch
    const exists = favorites.find((p) => String(p.id) === String(property.id));

    try {
      // Backend uses POST /profile/favorites to toggle both add and remove
      const response = await api.post("/profile/favorites", {
        itemId: String(property.id),
        itemType: normalizeType(property.type),
      });

      if (response.data.success) {
        if (exists) {
          setFavorites((prev) => prev.filter((p) => String(p.id) !== String(property.id)));
          toast.info("Removed from favorites");
        } else {
          setFavorites((prev) => [...prev, property]);
          toast.success("Added to favorites!");
        }
      }
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string; errors?: unknown }; status?: number } };
      console.error("toggleFavorite error:", axiosErr.response?.status, axiosErr.response?.data);
      toast.error(axiosErr.response?.data?.message || "Failed to update favorites");
    }
  };

  const isFavorite = (id: string | number) => {
    // Normalize IDs to string to avoid number/string type mismatch
    return Array.isArray(favorites) && favorites.some((p) => String(p.id) === String(id));
  };

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, isLoading }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};
