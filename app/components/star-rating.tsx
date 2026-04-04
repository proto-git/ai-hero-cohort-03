import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "~/lib/utils";

interface StarRatingProps {
  rating: number;
  totalReviews?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  size?: "sm" | "md";
}

export function StarRating({
  rating,
  totalReviews,
  interactive = false,
  onRate,
  size = "md",
}: StarRatingProps) {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  const starSize = size === "sm" ? "size-3.5" : "size-5";
  const displayRating = hoveredStar ?? rating;

  return (
    <div className="flex items-center gap-1">
      <div
        className={cn("flex", interactive && "cursor-pointer")}
        onMouseLeave={() => interactive && setHoveredStar(null)}
      >
        {[1, 2, 3, 4, 5].map((position) => {
          const isFilled = position <= displayRating;
          const StarWrapper = interactive ? "button" : "span";
          return (
            <StarWrapper
              key={position}
              type={interactive ? "button" : undefined}
              onMouseEnter={() => interactive && setHoveredStar(position)}
              onClick={() => interactive && onRate?.(position)}
              className={cn(
                starSize,
                isFilled ? "text-yellow-400" : "text-muted-foreground/30",
                interactive && "transition-colors hover:scale-110"
              )}
            >
              <Star
                className="size-full"
                fill={isFilled ? "currentColor" : "none"}
              />
            </StarWrapper>
          );
        })}
      </div>
      {totalReviews !== undefined && (
        <span className="ml-1 text-xs text-muted-foreground">
          {totalReviews > 0
            ? `${rating.toFixed(1)} (${totalReviews})`
            : "No ratings yet"}
        </span>
      )}
    </div>
  );
}
