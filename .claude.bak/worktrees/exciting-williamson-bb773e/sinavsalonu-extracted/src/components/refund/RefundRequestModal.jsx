import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const refundReasons = [
  { value: "wrong_content", label: "İçerik beklentilerime uymadı" },
  { value: "defective_questions", label: "Hatalı soru var" },
  { value: "not_working", label: "Teknik sorun" },
  { value: "quality_issue", label: "Kalite problemi" },
  { value: "other", label: "Diğer" }
];

export default function RefundRequestModal({ open, onClose, purchase, onSubmit, isLoading }) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!reason) {
      toast.error("Lütfen bir sebep seçiniz");
      return;
    }
    if (!description.trim()) {
      toast.error("Lütfen açıklama giriniz");
      return;
    }

    onSubmit({
      reason,
      description
    });

    setReason("");
    setDescription("");
  };

  const handleClose = () => {
    setReason("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>İade Talebi Oluştur</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Test Paketi</p>
            <p className="text-slate-600">{purchase?.test_package_title}</p>
            <p className="text-sm text-slate-500 mt-1">₺{purchase?.price_paid}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-3 block">İade Sebebi</label>
            <div className="space-y-2">
              {refundReasons.map((r) => (
                <label key={r.value} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="description" className="text-sm font-medium text-slate-700 mb-2 block">
              Açıklama
            </label>
            <Textarea
              id="description"
              placeholder="İade talebiniz hakkında detaylı bilgi verin..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-24"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              İptal
            </Button>
            <Button 
              onClick={handleSubmit}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              disabled={isLoading}
            >
              {isLoading ? "Gönderiliyor..." : "İade Talebi Gönder"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}