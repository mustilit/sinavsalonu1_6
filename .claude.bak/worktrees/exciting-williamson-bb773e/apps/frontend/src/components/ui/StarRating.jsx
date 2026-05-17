import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StarRating({ value, onChange, readonly = false, size = "md" }) {
  const [hoveredRating, setHoveredRating] = useState(0);

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-10 h-10"
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHoveredRating(star)}
          onMouseLeave={() => !readonly && setHoveredRating(0)}
          disabled={readonly}
          className={cn(
            "transition-all",
            !readonly && "hover:scale-110 cursor-pointer",
            readonly && "cursor-default"
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-colors",
              (readonly ? value : (hoveredRating || value)) >= star
                ? "fill-amber-400 text-amber-400"
                : "text-slate-300"
            )}
          />
        </button>
      ))}
    </div>
  );
}