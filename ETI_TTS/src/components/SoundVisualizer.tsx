import { useState, useEffect } from "react";

interface SoundVisualizerProps {
  isPlaying: boolean;
  colorClass?: string;
  count?: number;
}

export default function SoundVisualizer({ isPlaying, colorClass = "bg-emerald-500", count = 32 }: SoundVisualizerProps) {
  const [heights, setHeights] = useState<number[]>([]);

  useEffect(() => {
    // Inicializar alturas
    setHeights(Array.from({ length: count }, () => Math.floor(Math.random() * 85) + 10));
  }, [count]);

  useEffect(() => {
    if (!isPlaying) {
      // Cuando está pausado, reducimos el movimiento a un oleaje estático mínimo
      const timer = setTimeout(() => {
        setHeights(prev => prev.map(() => Math.floor(Math.random() * 8) + 4));
      }, 150);
      return () => clearTimeout(timer);
    }

    // Intervalo para simular variaciones de frecuencia acústica con el reproductor activo
    const interval = setInterval(() => {
      setHeights(prev =>
        prev.map(() => {
          const change = Math.floor(Math.random() * 40) - 20;
          let next = Math.max(10, Math.min(95, (prev[0] || 50) + change)); // Bouncing limit
          // alternate randomness
          next = Math.floor(Math.random() * 80) + 15;
          return next;
        })
      );
    }, 120);

    return () => clearInterval(interval);
  }, [isPlaying, count]);

  return (
    <div className="flex items-end justify-center gap-[3px] h-28 w-full bg-slate-900/40 rounded-xl p-4 border border-slate-800/60 overflow-hidden shadow-inner select-none">
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-[6px] rounded-full transition-all duration-100 ease-out ${colorClass}`}
          style={{
            height: `${h}%`,
            opacity: isPlaying ? 0.4 + (h / 100) * 0.6 : 0.25,
          }}
        />
      ))}
    </div>
  );
}
