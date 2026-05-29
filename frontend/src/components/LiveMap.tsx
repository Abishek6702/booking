import { useEffect, useRef, useState } from "react";

type Props = {
  height?: number | string;
  simulate?: boolean;
};

const PATH: { x: number; y: number }[] = [
  { x: 15, y: 20 }, { x: 22, y: 28 }, { x: 30, y: 35 },
  { x: 40, y: 38 }, { x: 50, y: 42 }, { x: 58, y: 48 },
  { x: 65, y: 52 }, { x: 70, y: 58 }, { x: 75, y: 60 },
];

const DRIVERS = [
  { id: "d1", emoji: "🚗", offset: 0 },
  { id: "d2", emoji: "🚕", offset: 2 },
  { id: "d3", emoji: "🏍️", offset: 4 },
];

export default function LiveMap({ height = 280, simulate = true }: Props) {
  const [idx, setIdx] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!simulate) return;
    intervalRef.current = window.setInterval(() => {
      setIdx((p) => (p >= PATH.length - 1 ? 0 : p + 1));
    }, 3000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [simulate]);

  const containerStyle: React.CSSProperties = {
    height: typeof height === "number" ? `${height}px` : String(height),
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white" style={containerStyle}>
      <iframe
        src="https://www.openstreetmap.org/export/embed.html?bbox=80.1,12.9,80.3,13.1&layer=mapnik"
        className="w-full h-full border-0 opacity-70 grayscale"
        title="Live Map"
      />

      <div className="absolute inset-0 pointer-events-none">
        {/* overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/80" />

        {/* driver dots */}
        {DRIVERS.map((d) => {
          const p = PATH[(idx + d.offset) % PATH.length];
          return (
            <div
              key={d.id}
              className="absolute z-20 transition-all duration-750 ease-linear"
              style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%,-50%)" }}
            >
              <div className="absolute inset-0 h-8 w-8 rounded-full bg-primary/40 animate-ping" />
              <div className="relative h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-lg border border-white">
                <span className="text-sm">{d.emoji}</span>
              </div>
            </div>
          );
        })}

        {/* passenger / you pin (static) */}
        <div className="absolute bottom-6 right-8 z-20">
          <div className="flex flex-col items-center">
            <div className="bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest mb-1 shadow">YOU</div>
            <div className="h-4 w-4 rounded-full bg-emerald-500 border-2 border-white shadow-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
