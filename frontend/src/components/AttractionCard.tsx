import { Heart, MapPin, Star as StarIcon, Clock } from "lucide-react";

interface Props {
  id?: string | number;
  image: string;
  title: string;
  location: string;
  type: string;
  rating?: number;
  reviews?: number;
  price: number;
  duration?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  viewMode?: "grid" | "list";
}

const TYPE_COLORS: Record<string, string> = {
  Adventure: "bg-orange-50 text-orange-600 border-orange-100",
  Culture: "bg-purple-50 text-purple-600 border-purple-100",
  Nature: "bg-emerald-50 text-emerald-600 border-emerald-100",
  Tour: "bg-blue-50 text-blue-600 border-blue-100",
  Beach: "bg-cyan-50 text-cyan-600 border-cyan-100",
  Temple: "bg-amber-50 text-amber-600 border-amber-100",
};

const AttractionCard = ({
  id = 1, image, title, location, type, rating = 4.5, reviews = 0,
  price, duration, isFavorite = false, onToggleFavorite, viewMode = "grid",
}: Props) => {
  const typeColor = TYPE_COLORS[type] || "bg-gray-100 text-gray-600 border-gray-200";

  if (viewMode === "grid") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
        <div className="relative h-44 overflow-hidden">
          <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite?.(); }}
            className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl hover:bg-white transition-all shadow-sm"
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
          </button>
          <div className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${typeColor}`}>
            {type}
          </div>
          {duration && (
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg text-[10px] font-medium">
              <Clock className="h-2.5 w-2.5" /> {duration}
            </div>
          )}
        </div>

        <div className="p-3.5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-bold text-gray-900 line-clamp-1 flex-1">{title}</h3>
            <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded-lg flex-shrink-0">
              <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-gray-900">{rating}</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 flex items-center gap-1 mb-3">
            <MapPin className="h-3 w-3 text-primary flex-shrink-0" /> {location}
          </p>

          <div className="flex items-center justify-between pt-2.5 border-t border-gray-50">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black text-gray-900">₹{(price || 0).toLocaleString()}</span>
                <span className="text-[10px] text-gray-400">/person</span>
              </div>
              <p className="text-[10px] text-gray-400">{reviews} reviews</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group flex">
      <div className="relative w-48 flex-shrink-0 overflow-hidden">
        <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite?.(); }}
          className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl hover:bg-white transition-all shadow-sm"
        >
          <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
        </button>
        <div className={`absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${typeColor}`}>
          {type}
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="text-sm font-bold text-gray-900 line-clamp-1 flex-1">{title}</h3>
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg flex-shrink-0">
              <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-gray-900">{rating}</span>
              <span className="text-[10px] text-gray-400">({reviews})</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 flex items-center gap-1 mb-3">
            <MapPin className="h-3 w-3 text-primary flex-shrink-0" /> {location}
          </p>

          <div className="flex flex-wrap gap-2">
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${typeColor}`}>
              {type}
            </span>
            {duration && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-500 rounded-full text-[11px] font-medium border border-gray-100">
                <Clock className="h-3 w-3" /> {duration}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-end justify-between pt-2.5 border-t border-gray-50 mt-3">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-gray-900">₹{(price || 0).toLocaleString()}</span>
              <span className="text-[11px] text-gray-400">/person</span>
            </div>
            <p className="text-[11px] text-primary font-medium">Free cancellation</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttractionCard;
