import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Percent, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default function MyDiscountCodes() {
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    discount_percent: 10,
    max_uses: 100,
    test_package_id: "",
    valid_until: ""
  });
  const queryClient = useQueryClient();

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["discountCodes", user?.email],
    queryFn: () => base44.entities.DiscountCode.filter({ educator_email: user.email }, "-created_date"),
    enabled: !!user,
  });

  const { data: myTests = [] } = useQuery({
    queryKey: ["myTests", user?.email],
    queryFn: () => base44.entities.TestPackage.filter({ educator_owns: true }),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DiscountCode.create({
      ...data,
      educator_email: user.email,
      current_uses: 0,
      is_active: true
    }),
    onSuccess: () => {
      toast.success("İndirim kodu oluşturuldu");
      queryClient.invalidateQueries({ queryKey: ["discountCodes"] });
      setShowDialog(false);
      setFormData({ code: "", discount_percent: 10, max_uses: 100, test_package_id: "", valid_until: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DiscountCode.delete(id),
    onSuccess: () => {
      toast.success("İndirim kodu silindi");
      queryClient.invalidateQueries({ queryKey: ["discountCodes"] });
    },
  });

  const handleSubmit = () => {
    if (!formData.code || formData.discount_percent < 1) {
      toast.error("Lütfen gerekli alanları doldurun");
      return;
    }
    if (formData.discount_percent > 50) {
      toast.error("İndirim oranı maksimum %50 olabilir");
      return;
    }
    createMutation.mutate(formData);
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success("Kod kopyalandı");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">İndirim Kodlarım</h1>
          <p className="text-slate-500 mt-2">Test paketlerin için indirim kodları oluştur</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Kod
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : codes.length === 0 ? (
            <div className="text-center py-12">
              <Percent className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Henüz indirim kodu oluşturmadınız</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {codes.map((code) => (
                <div key={code.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 rounded-xl">
                      <Percent className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-bold text-slate-900">{code.code}</p>
                        <button onClick={() => copyCode(code.code)} className="text-slate-400 hover:text-slate-600">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-slate-500">
                        %{code.discount_percent} indirim • {code.current_uses}/{code.max_uses} kullanım
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={code.is_active && code.current_uses < code.max_uses 
                      ? "bg-emerald-100 text-emerald-700" 
                      : "bg-slate-100 text-slate-600"
                    }>
                      {code.is_active && code.current_uses < code.max_uses ? "Aktif" : "Pasif"}
                    </Badge>
                    {code.valid_until && (
                      <span className="text-sm text-slate-500">
                        {format(new Date(code.valid_until), "d MMM yyyy", { locale: tr })}
                      </span>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-rose-600"
                      onClick={() => deleteMutation.mutate(code.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni İndirim Kodu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>İndirim Kodu *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Örn: YENI2024"
                className="uppercase"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>İndirim Oranı (%) *</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.discount_percent}
                  onChange={(e) => setFormData({ ...formData, discount_percent: Number(e.target.value) })}
                />
                <p className="text-xs text-slate-500">Maksimum %50</p>
              </div>
              <div className="space-y-2">
                <Label>Kullanım Limiti</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Geçerli Test (Opsiyonel)</Label>
              <Select value={formData.test_package_id} onValueChange={(v) => setFormData({ ...formData, test_package_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Tüm testler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Tüm testler</SelectItem>
                  {myTests.map((test) => (
                    <SelectItem key={test.id} value={test.id}>{test.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Geçerlilik Tarihi (Opsiyonel)</Label>
              <Input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>İptal</Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Oluştur
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}