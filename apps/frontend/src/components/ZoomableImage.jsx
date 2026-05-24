/**
 * ZoomableImage
 * Hover'da sağ alta büyüteç çıkar; tıklayınca lightbox dialog'da büyük gösterir.
 *
 * Kullanım: <img> yerine drop-in. Tıklama parent button'a yayılmasın diye
 * stopPropagation yapılır → option button içinde de güvenli kullanılır.
 *
 * Tailwind dinamik class kuralı: iconSize prop yerine sabit `size` enum.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ZoomIn, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_SIZE = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export default function ZoomableImage({
  src,
  alt = "",
  className = "",
  size = "md",
  zoomLabel = "Görseli büyüt",
  closeLabel = "Kapat",
}) {
  const [open, setOpen] = useState(false);

  if (!src) return null;

  const trigger = (e) => {
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      {/* <button> içinde nested <button> yasak — span role=button + keyboard */}
      <span
        role="button"
        tabIndex={0}
        onClick={trigger}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            trigger(e);
          }
        }}
        className="relative group inline-block cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-lg"
        aria-label={zoomLabel}
      >
        <img src={src} alt={alt} className={className} />
        <span className="absolute bottom-1 right-1 p-1 rounded-full bg-slate-900/70 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <ZoomIn className={cn(ICON_SIZE[size] ?? ICON_SIZE.md)} aria-hidden="true" />
        </span>
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl p-2 bg-transparent border-0 shadow-none">
          <DialogTitle className="sr-only">{zoomLabel}</DialogTitle>
          <div className="relative">
            <img
              src={src}
              alt={alt}
              className="w-full h-auto max-h-[85vh] object-contain rounded-xl bg-white"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 p-2 rounded-full bg-slate-900/70 text-white hover:bg-slate-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              aria-label={closeLabel}
            >
              <XIcon className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
