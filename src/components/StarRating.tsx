import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: number;
  readonly?: boolean;
}

export const StarRating = ({ value, onChange, max = 5, size = 20, readonly = false }: StarRatingProps) => (
  <div className="flex gap-0.5">
    {Array.from({ length: max }, (_, i) => (
      <Star
        key={i}
        size={size}
        className={cn(
          "transition-colors",
          i < value ? "fill-accent text-accent" : "text-muted-foreground/30",
          !readonly && "cursor-pointer hover:text-accent"
        )}
        onClick={() => !readonly && onChange?.(i + 1)}
      />
    ))}
  </div>
);
