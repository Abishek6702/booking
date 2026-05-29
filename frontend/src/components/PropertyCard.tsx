import { 
  Heart, MapPin, Wifi, Car, Waves, Star as StarIcon, ArrowRight, Dumbbell, Utensils,
  Wind, Tv, Coffee, Snowflake, Bath, Phone, Sparkles, Eye, Mountain, TreePine, Users, Shield, Square,
  Compass, PawPrint, Flame, Gamepad, Shirt, Briefcase, UtensilsCrossed, Anchor, Palmtree, Activity, Laptop, Bike, BedDouble
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getAmenityIcon } from "@/utils/amenityIcons";

interface Props {
  id?: number | string;
  image: string;
  title: string;
  location: string;
  rating: number;
  reviews: number;
  price: number;
  totalPrice: number;
  nights: number;
  amenities?: string[];
  badge?: string;
  type?: string;
  description?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  viewMode?: "grid" | "list";
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}

const TYPE_COLORS: Record<string, string> = {
  HOTEL: "bg-blue-50 text-blue-600 border-blue-100",
  RESORT: "bg-emerald-50 text-emerald-600 border-emerald-100",
  VILLA: "bg-purple-50 text-purple-600 border-purple-100",
  APARTMENT: "bg-orange-50 text-orange-600 border-orange-100",
};

const PropertyCard = ({
  id = 1, image, title, location, rating, reviews, price, totalPrice, nights,
  amenities = [], badge, type, description, isFavorite = false, onToggleFavorite,
  viewMode = "list", checkIn, checkOut, guests, adults, children,
}: Props & { adults?: number; children?: number }) => {
  const dateParams = new URLSearchParams();
  if (checkIn) dateParams.set("checkIn", checkIn);
  if (checkOut) dateParams.set("checkOut", checkOut);
  if (guests) dateParams.set("guests", String(guests));
  if (adults !== undefined) dateParams.set("adults", String(adults));
  if (children !== undefined) dateParams.set("children", String(children));
  const detailLink = `/stay-details/${id}${dateParams.toString() ? `?${dateParams.toString()}` : ""}`;

  if (viewMode === "grid") {
    return (
      <Link to={detailLink} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group block">
        {/* Image */}
        <div className="relative h-44 overflow-hidden">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1544124499-58912cbddaad?auto=format&fit=crop&q=80&w=800"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite?.(); }}
            className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl hover:bg-white transition-all shadow-sm"
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
          </button>

          {type && (
            <div className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${TYPE_COLORS[type.toUpperCase()] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
              {type}
            </div>
          )}
          {badge && (
            <div className="absolute bottom-2.5 left-2.5 bg-primary/90 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold">
              {badge}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3.5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-1 flex-1">{title}</h3>
            <div className="flex items-center gap-0.5 flex-shrink-0 bg-amber-50 px-1.5 py-0.5 rounded-lg">
              <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-gray-900">{rating}</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 flex items-center gap-1 mb-2">
            <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
            {location}
          </p>

          {description && (
            <p className="text-[11px] text-gray-500 line-clamp-2 mb-2.5 leading-relaxed">{description}</p>
          )}

          <div className="flex flex-wrap gap-1 mb-3">
            {amenities.slice(0, 3).map((amenity, idx) => {
              const Icon = getAmenityIcon(amenity);
              return (
                <span key={idx} className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full text-[10px] font-medium border border-gray-100">
                  {Icon && <Icon className="h-2.5 w-2.5" />}
                  {amenity}
                </span>
              );
            })}
            {amenities.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded-full text-[10px] border border-gray-100">
                +{amenities.length - 3}
              </span>
            )}
          </div>

          <div className="flex items-end justify-between pt-2.5 border-t border-gray-50">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black text-gray-900">₹{(price || 0).toLocaleString()}</span>
                <span className="text-[10px] text-gray-400">/night</span>
              </div>
              <p className="text-[10px] text-gray-400">{reviews} reviews</p>
            </div>
            <div className="inline-flex items-center justify-center whitespace-nowrap h-7 px-3 rounded-xl text-[11px] font-semibold shadow-sm shadow-primary/20 bg-primary text-primary-foreground">
              Book <ArrowRight className="h-3 w-3 ml-1" />
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // List view
  return (
    <Link to={detailLink} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group flex">
      <div className="relative w-48 flex-shrink-0 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1544124499-58912cbddaad?auto=format&fit=crop&q=80&w=800"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite?.(); }}
          className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl hover:bg-white transition-all shadow-sm"
        >
          <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
        </button>
        {type && (
          <div className={`absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${TYPE_COLORS[type.toUpperCase()] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
            {type}
          </div>
        )}
      </div>

      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-1 flex-1">{title}</h3>
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg flex-shrink-0">
              <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-gray-900">{rating}</span>
              <span className="text-[10px] text-gray-400">({reviews})</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 flex items-center gap-1 mb-2">
            <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
            {location}
          </p>

          {description && (
            <p className="text-[11px] text-gray-500 line-clamp-1 mb-2">{description}</p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {amenities.slice(0, 4).map((amenity, idx) => {
              const Icon = getAmenityIcon(amenity);
              return (
                <span key={idx} className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full text-[11px] font-medium border border-gray-100">
                  {Icon && <Icon className="h-2.5 w-2.5" />}
                  {amenity}
                </span>
              );
            })}
            {amenities.length > 4 && (
              <span className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded-full text-[11px] border border-gray-100">
                +{amenities.length - 4} more
              </span>
            )}
          </div>
        </div>

        <div className="flex items-end justify-between pt-2.5 border-t border-gray-50 mt-3">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-gray-900">₹{(price || 0).toLocaleString()}</span>
              <span className="text-[11px] text-gray-400">/night</span>
            </div>
            <p className="text-[11px] text-primary font-medium">Total ₹{(totalPrice || 0).toLocaleString()} incl. taxes</p>
          </div>
          <div className="inline-flex items-center justify-center whitespace-nowrap h-8 px-4 rounded-xl text-xs font-semibold shadow-sm shadow-primary/20 bg-primary text-primary-foreground">
            Book Stay <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PropertyCard;
