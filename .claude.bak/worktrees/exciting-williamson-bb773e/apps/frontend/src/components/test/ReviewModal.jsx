import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function ReviewModal({ open, onClose, onSubmit, type, title }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (rating === 0) return;
    onSubmit({ rating, comment });
    setRating(0);
    setComment("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === "test" ? "Testi Değerlendir" : "Eğiticiyi Değerlendir"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          <div className="text-center">
            <p className="text-slate-600 mb-4">{title}</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star 
                    className={cn(
                      "w-10 h-10 transition-colors",
                      (hoverRating || rating) >= star 
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-2">
              {rating > 0 ? `${rating} yıldız` : "Puan verin"}
            </p>
          </div>

          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Yorumunuzu yazın (opsiyonel)..."
            rows={3}
          />

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>İptal</Button>
            <Button 
              onClick={handleSubmit}
              disabled={rating === 0}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Değerlendir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}