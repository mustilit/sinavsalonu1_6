import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { GraduationCap, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function SelectExamTypes() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedExams, setSelectedExams] = useState([]);
  const [saving, setSaving] = useState(false);

  const { data: examTypes = [] } = useQuery({
    queryKey: ["examTypes"],
    queryFn: () => base44.entities.ExamType.filter({ is_active: true }),
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Eğer zaten sınav seçmişse, ana sayfaya yönlendir
        if (userData.interested_exam_types && userData.interested_exam_types.length > 0) {
          navigate(createPageUrl("Explore"));
        }
        
        // Eğer profil tamamlanmamışsa, profil tamamlama sayfasına yönlendir
        if (!userData.phone || !userData.city) {
          navigate(createPageUrl("CompleteProfile"));
        }
      } catch (e) {
        navigate(createPageUrl("Home"));
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [navigate]);

  const toggleExam = (examId) => {
    setSelectedExams(prev => 
      prev.includes(examId) 
        ? prev.filter(id => id !== examId)
        : [...prev, examId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedExams.length === 0) {
      toast.error("Lütfen en az bir sınav türü seçin");
      return;
    }

    setSaving(true);
    try {
      await base44.auth.updateMe({ interested_exam_types: selectedExams });
      toast.success("Tercihleriniz kaydedildi");
      navigate(createPageUrl("Explore"));
    } catch (error) {
      toast.error("Tercihler kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    navigate(createPageUrl("Explore"));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-full flex items-center justify-center">
              <GraduationCap className="w-10 h-10 text-indigo-600" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Hangi Sınavlara Hazırlanıyorsunuz?</h1>
            <p className="text-slate-600">
              İlgilendiğiniz sınavları seçin, size özel içerikler önceliklendirilsin
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {examTypes.map((exam) => (
                <label
                  key={exam.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedExams.includes(exam.id)
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <Checkbox
                    checked={selectedExams.includes(exam.id)}
                    onCheckedChange={() => toggleExam(exam.id)}
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{exam.name}</p>
                    {exam.description && (
                      <p className="text-sm text-slate-500 mt-1">{exam.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {examTypes.length === 0 && (
              <p className="text-center text-slate-500 py-8">Sınav türü bulunamadı</p>
            )}

            <div className="flex gap-3 pt-4">
              <Button 
                type="button"
                variant="outline"
                onClick={handleSkip}
                disabled={saving}
                className="flex-1"
              >
                Şimdi Değil
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                disabled={saving || selectedExams.length === 0}
              >
                {saving ? "Kaydediliyor..." : "Devam Et"}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>

          <p className="text-xs text-slate-500 text-center mt-6">
            Tercihlerinizi daha sonra profil ayarlarından değiştirebilirsiniz
          </p>
        </div>
      </div>
    </div>
  );
}