import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import api from "@/api/dalClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Save, Plus, Trash2, GripVertical, BookOpen } from "lucide-react";

export default function EditTest() {
  const urlParams = new URLSearchParams(window.location.search);
  const testId = urlParams.get("id");
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(null);
  const [originalFormData, setOriginalFormData] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [newQuestion, setNewQuestion] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 50;

  const { data: testDetail, isLoading } = useQuery({
    queryKey: ["test", testId],
    queryFn: async () => {
      const { data } = await api.get(`/tests/${testId}`);
      return data;
    },
    enabled: !!testId,
  });

  const { data: examTypes = [] } = useQuery({
    queryKey: ["examTypes"],
    queryFn: () => base44.entities.ExamType.filter({ is_active: true }),
  });

  const questions = testDetail?.questions || [];

  useEffect(() => {
    if (testDetail && !formData) {
      const fd = {
        title: testDetail.title,
        price: testDetail.priceCents != null ? testDetail.priceCents / 100 : 0,
        duration_minutes: testDetail.duration ?? 60,
        is_timed: !!testDetail.isTimed,
        exam_type_id: testDetail.examTypeId || "",
        topic_id: testDetail.topicId || "",
        is_published: !!testDetail.publishedAt,
      };
      setFormData(fd);
      setOriginalFormData(fd);
    }
  }, [testDetail]);

  const updateTestMutation = useMutation({
    mutationFn: async (data) => {
      await api.patch(`/tests/${testId}`, {
        title: data.title,
        priceCents: data.price != null ? Math.round(data.price * 100) : undefined,
        duration: data.duration_minutes,
        isTimed: data.is_timed,
      });
      if (data.is_published != null) {
        if (data.is_published) await api.put(`/tests/${testId}/publish`);
        else await api.put(`/tests/${testId}/unpublish`);
      }
    },
    onSuccess: () => {
      toast.success("Test güncellendi");
      queryClient.invalidateQueries({ queryKey: ["test", testId] });
      setOriginalFormData(formData);
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data) => {
      const options = [
        { content: data.option_a || "", isCorrect: data.correct_answer === "A" },
        { content: data.option_b || "", isCorrect: data.correct_answer === "B" },
        { content: data.option_c || "", isCorrect: data.correct_answer === "C" },
        { content: data.option_d || "", isCorrect: data.correct_answer === "D" },
        { content: data.option_e || "", isCorrect: data.correct_answer === "E" },
      ].filter((o) => o.content.trim());
      await api.post(`/tests/${testId}/questions`, {
        content: data.question_text,
        order: questions.length,
        options,
      });
    },
    onSuccess: () => {
      toast.success("Soru eklendi");
      queryClient.invalidateQueries({ queryKey: ["test", testId] });
      setNewQuestion(false);
      setEditingQuestion(null);
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({ questionId, data }) =>
      api.patch(`/tests/${testId}/questions/${questionId}`, {
        content: data.content,
        order: data.order,
      }),
    onSuccess: () => {
      toast.success("Soru güncellendi");
      queryClient.invalidateQueries({ queryKey: ["test", testId] });
      setEditingQuestion(null);
    },
  });

  const updateOptionMutation = useMutation({
    mutationFn: ({ questionId, optionId, data }) =>
      api.patch(`/tests/${testId}/questions/${questionId}/options/${optionId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test", testId] });
    },
  });

  const handleSaveTest = () => {
    updateTestMutation.mutate(formData);
  };

  const handleTogglePublish = () => {
    if (questions.length === 0 && !formData.is_published) {
      toast.error("Yayınlamak için en az 1 soru ekleyin");
      return;
    }
    const newVal = !formData.is_published;
    setFormData({ ...formData, is_published: newVal });
    updateTestMutation.mutate({ ...formData, is_published: newVal });
  };

  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasChanges =
    originalFormData && formData && JSON.stringify(originalFormData) !== JSON.stringify(formData);
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const startIndex = (currentPage - 1) * questionsPerPage;
  const currentQuestions = questions.slice(startIndex, startIndex + questionsPerPage);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link
          to={createPageUrl("MyTestPackages")}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Test Paketlerime Dön
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={formData.is_published} onCheckedChange={handleTogglePublish} />
            <span className="text-sm text-slate-600">
              {formData.is_published ? "Yayında" : "Taslak"}
            </span>
          </div>
          <Button
            onClick={handleSaveTest}
            disabled={updateTestMutation.isPending || !hasChanges}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Kaydet
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Başlık</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Sınav Türü</Label>
              <Select
                value={formData.exam_type_id || ""}
                onValueChange={(v) => setFormData({ ...formData, exam_type_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {examTypes.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fiyat (₺)</Label>
              <Input
                type="number"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Süre (dakika)</Label>
              <Input
                type="number"
                min="1"
                value={formData.duration_minutes}
                onChange={(e) =>
                  setFormData({ ...formData, duration_minutes: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_timed}
                onCheckedChange={(v) => setFormData({ ...formData, is_timed: v })}
              />
              <Label>Süreli test</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sorular ({questions.length})</CardTitle>
            <Button
              onClick={() => {
                setNewQuestion(true);
                setEditingQuestion(null);
              }}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Soru Ekle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(newQuestion || editingQuestion) && (
            <QuestionForm
              question={editingQuestion}
              options={editingQuestion?.options || []}
              onSave={(data) => {
                if (editingQuestion) {
                  updateQuestionMutation.mutate({
                    questionId: editingQuestion.id,
                    data: { content: data.question_text, order: data.order },
                  });
                  (data.options || []).forEach((opt, i) => {
                    const orig = editingQuestion.options?.[i];
                    if (orig && (opt.content !== orig.content || opt.isCorrect !== orig.isCorrect)) {
                      updateOptionMutation.mutate({
                        questionId: editingQuestion.id,
                        optionId: orig.id,
                        data: { content: opt.content, isCorrect: opt.isCorrect },
                      });
                    }
                  });
                } else {
                  createQuestionMutation.mutate(data);
                }
              }}
              onCancel={() => {
                setNewQuestion(false);
                setEditingQuestion(null);
              }}
              isLoading={createQuestionMutation.isPending || updateQuestionMutation.isPending}
            />
          )}

          <div className="space-y-3 mt-6">
            {currentQuestions.map((q, idx) => {
              const actualIdx = startIndex + idx;
              const correctOpt = q.options?.find((o) => o.isCorrect);
              const correctLetter = correctOpt
                ? ["A", "B", "C", "D", "E"][q.options.indexOf(correctOpt)]
                : "-";
              return (
                <div
                  key={q.id}
                  className="flex items-start gap-4 p-4 rounded-xl bg-slate-50"
                >
                  <div className="flex items-center gap-2 text-slate-400">
                    <GripVertical className="w-5 h-5" />
                    <span className="font-semibold">{actualIdx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 line-clamp-2">{q.content}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        Doğru: {correctLetter}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingQuestion(q);
                      setNewQuestion(false);
                    }}
                  >
                    Düzenle
                  </Button>
                </div>
              );
            })}

            {questions.length === 0 && !newQuestion && (
              <div className="text-center py-12 text-slate-500">
                <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                Henüz soru eklenmedi
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Önceki
              </Button>
              <span className="py-2 px-4 text-sm text-slate-600">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Sonraki
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionForm({ question, options = [], onSave, onCancel, isLoading }) {
  const letters = ["A", "B", "C", "D", "E"];
  const initOptions = (options || []).map((o) => ({
    id: o.id,
    content: o.content,
    isCorrect: o.isCorrect ?? o.is_correct,
  }));
  while (initOptions.length < 5) initOptions.push({ content: "", isCorrect: false });

  const [data, setData] = useState(
    question
      ? {
          question_text: question.content,
          order: question.order ?? 0,
          options: initOptions,
          correct_answer:
            letters[initOptions.findIndex((o) => o.isCorrect)] || "A",
        }
      : {
          question_text: "",
          order: 0,
          options: initOptions,
          correct_answer: "A",
        }
  );

  const opts = data.options;

  const handleSave = () => {
    if (!data.question_text?.trim()) {
      toast.error("Soru metni girin");
      return;
    }
    const hasA = (opts[0]?.content || "").trim();
    const hasB = (opts[1]?.content || "").trim();
    if (!hasA || !hasB) {
      toast.error("A ve B şıkları zorunludur");
      return;
    }
    const finalOpts = opts
      .map((o, i) => ({
        content: o.content || data[`option_${letters[i].toLowerCase()}`] || "",
        isCorrect: data.correct_answer === letters[i],
      }))
      .filter((o) => o.content.trim());
    if (finalOpts.length < 2) {
      toast.error("En az 2 şık girin");
      return;
    }
    onSave({
      question_text: data.question_text,
      order: data.order,
      correct_answer: data.correct_answer,
      option_a: finalOpts[0]?.content,
      option_b: finalOpts[1]?.content,
      option_c: finalOpts[2]?.content,
      option_d: finalOpts[3]?.content,
      option_e: finalOpts[4]?.content,
      options: finalOpts,
    });
  };

  return (
    <div className="border border-indigo-200 rounded-xl p-6 bg-indigo-50/50">
      <h3 className="font-semibold text-slate-900 mb-4">
        {question ? "Soruyu Düzenle" : "Yeni Soru"}
      </h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Soru Metni</Label>
          <Textarea
            value={data.question_text}
            onChange={(e) => setData({ ...data, question_text: e.target.value })}
            rows={3}
            placeholder="Soruyu buraya yazın..."
          />
        </div>
        <div className="grid grid-cols-1 gap-4">
          {letters.map((letter, i) => (
            <div key={letter} className="space-y-2 p-4 bg-white rounded-lg border border-slate-200">
              <Label>
                {letter} Şıkkı {i < 2 ? "*" : "(Opsiyonel)"}
              </Label>
              <Input
                value={opts[i]?.content ?? ""}
                onChange={(e) => {
                  const next = opts.map((o, j) =>
                    j === i ? { ...o, content: e.target.value } : o
                  );
                  setData({ ...data, options: next, correct_answer: data.correct_answer });
                }}
                placeholder={`${letter} şıkkı...`}
              />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Label>Doğru Cevap *</Label>
          <Select
            value={data.correct_answer}
            onValueChange={(v) => {
              const next = opts.map((o, i) => ({
                ...o,
                isCorrect: v === letters[i],
              }));
              setData({ ...data, correct_answer: v, options: next });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {letters.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>
            İptal
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
            {isLoading ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </div>
    </div>
  );
}
