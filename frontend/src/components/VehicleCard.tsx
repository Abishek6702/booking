import { Heart, Star as StarIcon, ArrowRight, Users, Fuel, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  id?: string | number;
  image: string;
  brand: string;
  model: string;
  type: "car" | "bike" | string;
  seats: number;
  pricePerKm: number;
  rating?: number;
  reviews?: number;
  location?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  viewMode?: "grid" | "list";
}

const TYPE_COLORS: Record<string, string> = {
  car: "bg-blue-50 text-blue-600 border-blue-100",
  bike: "bg-orange-50 text-orange-600 border-orange-100",
};

const TYPE_LABELS: Record<string, string> = {
  car: "Car",
  bike: "Bike",
};

const VehicleCard = ({
  id = 1, image, brand, model, type, seats, pricePerKm,
  rating = 4.5, reviews = 0, location,
  isFavorite = false, onToggleFavorite, viewMode = "grid",
}: Props) => {
  const typeColor = TYPE_COLORS[type] || "bg-gray-100 text-gray-600 border-gray-200";
  const typeLabel = TYPE_LABELS[type] || type;

  if (viewMode === "grid") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
        <div className="relative h-44 overflow-hidden bg-gray-50">
          <img src={image} alt={`${brand} ${model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite?.(); }}
            className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl hover:bg-white transition-all shadow-sm"
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
          </button>
          <div className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold border capitalize ${typeColor}`}>
            {typeLabel}
          </div>
        </div>

        <div className="p-3.5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-tight">{brand} {model}</h3>
              {location && <p className="text-[11px] text-gray-400 mt-0.5">{location}</p>}
            </div>
            <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded-lg flex-shrink-0">
              <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-gray-900">{rating}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 my-3">
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <Users className="h-3 w-3 text-primary" /> {seats} seats
            </div>
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <Fuel className="h-3 w-3 text-primary" /> Fuel included
            </div>
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <Gauge className="h-3 w-3 text-primary" /> AC
            </div>
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-gray-50">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black text-gray-900">₹{(pricePerKm || 0).toLocaleString()}</span>
                <span className="text-[10px] text-gray-400">/km</span>
              </div>
              <p className="text-[10px] text-gray-400">{reviews} reviews</p>
            </div>
            <Button size="sm" className="h-7 px-3 rounded-xl text-[11px] font-semibold shadow-sm shadow-primary/20">
              Hire <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group flex">
      <div className="relative w-48 flex-shrink-0 overflow-hidden bg-gray-50">
        <img src={image} alt={`${brand} ${model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite?.(); }}
          className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl hover:bg-white transition-all shadow-sm"
        >
          <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
        </button>
        <div className={`absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold border capitalize ${typeColor}`}>
          {typeLabel}
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">{brand} {model}</h3>
              {location && <p className="text-[11px] text-gray-400 mt-0.5">{location}</p>}
            </div>
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg flex-shrink-0">
              <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-gray-900">{rating}</span>
              <span className="text-[10px] text-gray-400">({reviews})</span>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Users className="h-3.5 w-3.5 text-primary" /> {seats} seats
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Fuel className="h-3.5 w-3.5 text-primary" /> Fuel included
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Gauge className="h-3.5 w-3.5 text-primary" /> AC / GPS
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between pt-2.5 border-t border-gray-50 mt-3">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-gray-900">₹{(pricePerKm || 0).toLocaleString()}</span>
              <span className="text-[11px] text-gray-400">/km</span>
            </div>
            <p className="text-[11px] text-primary font-medium">Driver included</p>
          </div>
          <Button size="sm" className="h-8 px-4 rounded-xl text-xs font-semibold shadow-sm shadow-primary/20">
            Hire Now <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VehicleCard;
