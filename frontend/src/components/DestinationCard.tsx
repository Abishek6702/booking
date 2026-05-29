import { ArrowUpRight, Star } from "lucide-react";

interface Props {
  image: string;
  name: string;
  priceFrom: string;
  priceTo?: string;
  rating?: number;
  reviews?: number;
}

const DestinationCard = ({ image, name, priceFrom, priceTo, rating = 4.5, reviews = 12 }: Props) => (
  <div className="relative rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group cursor-pointer">
    <div className="relative aspect-[4/3] overflow-hidden">
      <img src={image} alt={name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md rounded-xl p-2 border border-white/30 text-white opacity-0 group-hover:opacity-100 group-hover:rotate-12 transition-all duration-500">
        <ArrowUpRight className="h-4 w-4" />
      </div>
      <div className="absolute bottom-3 left-3">
        <span className="px-2 py-0.5 bg-black/40 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-widest rounded-full border border-white/20">
          {name.split(",")[1]?.trim() || "Destination"}
        </span>
      </div>
    </div>
    <div className="p-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-sm font-black text-slate-900 leading-tight">{name.split(",")[0]}</h3>
        <div className="text-right">
          <p className="text-[8px] font-black text-primary uppercase tracking-widest leading-none mb-0.5">From</p>
          <p className="text-sm font-black text-slate-900">{priceFrom.split("/")[0]}</p>
        </div>
      </div>
      <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs font-bold text-slate-900">{rating}</span>
          <span className="text-[10px] text-slate-400">({reviews} reviews)</span>
        </div>
      </div>
    </div>
  </div>
);

export default DestinationCard;
