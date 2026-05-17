import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReviewModal({ open, onOpenChange, onSubmit, type, title, loading }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit({ rating, comment });
      setRating(0);
      setComment("");
    }
  };

  const typeLabels = {
    test: "Testi Puanla",
    educator: "Eğiticiyi Puanla"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{typeLabels[type]}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-slate-600 mb-2">{title}</p>
            <div className="flex items-center justify-center gap-2 py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "w-10 h-10 transition-colors",
                      (hoveredRating || rating) >= star
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Yorumunuz (Opsiyonel)
            </label>
            <Textarea
              placeholder="Deneyiminizi paylaşın..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              İptal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? "Gönderiliyor..." : "Gönder"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}