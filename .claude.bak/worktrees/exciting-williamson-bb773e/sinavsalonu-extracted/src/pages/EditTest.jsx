import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  GripVertical,
  Image as ImageIcon,
  X,
  BookOpen
} from "lucide-react";

export default function EditTestPackage() {
  const urlParams = new URLSearchParams(window.location.search);
  const packageId = urlParams.get("id");
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(null);
  const [originalFormData, setOriginalFormData] = useState(null);
  const [activeTestId, setActiveTestId] = useState(null);
  const [activeTab, setActiveTab] = useState("package");
  const [showNewTest, setShowNewTest] = useState(false);
  const [newTestData, setNewTestData] = useState({ title: "", description: "", duration_minutes: 60, is_timed: false });
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [newQuestion, setNewQuestion] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 50;

  const { data: testPackage, isLoading } = useQuery({
    queryKey: ["testPackage", packageId],
    queryFn: async () => {
      const packages = await base44.entities.TestPackage.filter({ id: packageId });
      return packages[0];
    },
    enabled: !!packageId,
  });

  const { data: tests = [] } = useQuery({
    queryKey: ["tests", packageId],
    queryFn: () => base44.entities.Test.filter({ test_package_id: packageId }, "order_index"),
    enabled: !!packageId,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["questions", activeTestId],
    queryFn: () => base44.entities.Question.filter({ test_id: activeTestId }, "order_index"),
    enabled: !!activeTestId,
  });

  const { data: examTypes = [] } = useQuery({
    queryKey: ["examTypes"],
    queryFn: () => base44.entities.ExamType.filter({ is_active: true }),
  });

  useEffect(() => {
    if (testPackage && !formData) {
      setFormData(testPackage);
      setOriginalFormData(testPackage);
    }
  }, [testPackage]);

  useEffect(() => {
    if (tests.length > 0 && !activeTestId) {
      setActiveTestId(tests[0].id);
    }
  }, [tests]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTestId]);

  const updatePackageMutation = useMutation({
    mutationFn: (data) => base44.entities.TestPackage.update(packageId, data),
    onSuccess: () => {
      toast.success("Paket güncellendi");
      queryClient.invalidateQueries({ queryKey: ["testPackage", packageId] });
      setOriginalFormData(formData);
    },
  });

  const createTestMutation = useMutation({
    mutationFn: async (data) => {
      const newTest = await base44.entities.Test.create({
        ...data,
        test_package_id: packageId,
        order_index: tests.length,
      });
      await base44.entities.TestPackage.update(packageId, {
        test_count: tests.length + 1
      });
      return newTest;
    },
    onSuccess: (newTest) => {
      toast.success("Test oluşturuldu");
      queryClient.invalidateQueries({ queryKey: ["tests", packageId] });
      queryClient.invalidateQueries({ queryKey: ["testPackage", packageId] });
      setActiveTestId(newTest.id);
      setShowNewTest(false);
      setNewTestData({ title: "", description: "", duration_minutes: 60, is_timed: false });
    },
  });

  const deleteTestMutation = useMutation({
    mutationFn: async (testId) => {
      await base44.entities.Question.filter({ test_id: testId }).then(qs => 
        Promise.all(qs.map(q => base44.entities.Question.delete(q.id)))
      );
      await base44.entities.Test.delete(testId);
      await base44.entities.TestPackage.update(packageId, {
        test_count: tests.length - 1
      });
    },
    onSuccess: () => {
      toast.success("Test silindi");
      queryClient.invalidateQueries({ queryKey: ["tests", packageId] });
      queryClient.invalidateQueries({ queryKey: ["testPackage", packageId] });
      setActiveTestId(tests[0]?.id || null);
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Question.create({
        ...data,
        test_id: activeTestId,
        test_package_id: packageId,
        order_index: questions.length,
      });
      const activeTest = tests.find(t => t.id === activeTestId);
      await base44.entities.Test.update(activeTestId, {
        question_count: (activeTest?.question_count || 0) + 1
      });
    },
    onSuccess: async () => {
      toast.success("Soru eklendi");
      queryClient.invalidateQueries({ queryKey: ["questions", activeTestId] });
      queryClient.invalidateQueries({ queryKey: ["tests", packageId] });
      setNewQuestion(false);
      setEditingQuestion(null);
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Question.update(id, data),
    onSuccess: () => {
      toast.success("Soru güncellendi");
      queryClient.invalidateQueries({ queryKey: ["questions", activeTestId] });
      setEditingQuestion(null);
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Question.delete(id);
      const activeTest = tests.find(t => t.id === activeTestId);
      await base44.entities.Test.update(activeTestId, {
        question_count: Math.max(0, (activeTest?.question_count || 0) - 1)
      });
    },
    onSuccess: () => {
      toast.success("Soru silindi");
      queryClient.invalidateQueries({ queryKey: ["questions", activeTestId] });
      queryClient.invalidateQueries({ queryKey: ["tests", packageId] });
    },
  });

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order_index for all questions
    const updates = items.map((item, index) => 
      base44.entities.Question.update(item.id, { order_index: index })
    );

    try {
      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ["questions", activeTestId] });
      toast.success("Soru sırası güncellendi");
    } catch (error) {
      toast.error("Sıralama güncellenemedi");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, cover_image: file_url });
      updatePackageMutation.mutate({ cover_image: file_url });
    } catch (error) {
      toast.error("Görsel yüklenirken hata oluştu");
    } finally {
      setUploading(false);
    }
  };

  const handleSavePackage = () => {
    if (formData.campaign_price) {
      if (formData.campaign_price <= 0) {
        toast.error("İndirimli fiyat sıfırdan büyük olmalı");
        return;
      }
      if (formData.campaign_price >= formData.price) {
        toast.error("İndirimli fiyat normal fiyattan küçük olmalı");
        return;
      }
    }
    
    const examType = examTypes.find(e => e.id === formData.exam_type_id);
    updatePackageMutation.mutate({
      ...formData,
      exam_type_name: examType?.name || formData.exam_type_name,
    });
  };

  const handleTogglePublish = () => {
    if (tests.length === 0 && !formData.is_published) {
      toast.error("Yayınlamak için en az 1 test ekleyin");
      return;
    }
    const newPublishState = !formData.is_published;
    setFormData({ ...formData, is_published: newPublishState });
    updatePackageMutation.mutate({ is_published: newPublishState });
  };

  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeTest = tests.find(t => t.id === activeTestId);

  const hasChanges = originalFormData && formData && JSON.stringify(originalFormData) !== JSON.stringify(formData);

  // Pagination
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const currentQuestions = questions.slice(startIndex, endIndex);

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
            <Switch 
              checked={formData.is_published} 
              onCheckedChange={handleTogglePublish}
            />
            <span className="text-sm text-slate-600">
              {formData.is_published ? "Yayında" : "Taslak"}
            </span>
          </div>
          {activeTab === "package" && (
            <Button 
              onClick={handleSavePackage}
              disabled={updatePackageMutation.isPending || !hasChanges}
              style={{backgroundColor: '#0000CD'}}
              className="hover:opacity-90"
            >
              <Save className="w-4 h-4 mr-2" />
              Kaydet
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="package" className="space-y-6" onValueChange={(val) => setActiveTab(val)}>
        <TabsList>
          <TabsTrigger value="package">Paket Bilgileri</TabsTrigger>
          <TabsTrigger value="tests">Testler ({tests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="package">
          <Card>
            <CardHeader>
              <CardTitle>Test Paketi Bilgileri</CardTitle>
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
                <div className="col-span-2 space-y-2">
                  <Label>Açıklama</Label>
                  <Textarea
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Kapak Görseli</Label>
                  {formData.cover_image && (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden mb-2">
                      <img src={formData.cover_image} alt="Kapak" className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setFormData({ ...formData, cover_image: "" });
                          updatePackageMutation.mutate({ cover_image: "" });
                        }}
                      >
                        Kaldır
                      </Button>
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  {uploading && <p className="text-sm text-slate-500">Yükleniyor...</p>}
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
                        <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Zorluk</Label>
                  <Select 
                    value={formData.difficulty || "medium"} 
                    onValueChange={(v) => setFormData({ ...formData, difficulty: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Kolay</SelectItem>
                      <SelectItem value="medium">Orta</SelectItem>
                      <SelectItem value="hard">Zor</SelectItem>
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
                  <Label>İndirimli Fiyat (₺) - Opsiyonel</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.campaign_price || ""}
                    onChange={(e) => setFormData({ ...formData, campaign_price: e.target.value ? Number(e.target.value) : null })}
                    placeholder="İndirim yoksa boş bırakın"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Test List Sidebar */}
            <div className="lg:col-span-1">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Testler ({tests.length})</h3>
                <div className="space-y-2">
                  {tests.map((test) => (
                    <button
                      key={test.id}
                      onClick={() => setActiveTestId(test.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        activeTestId === test.id 
                          ? 'bg-indigo-50 border-indigo-300' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-medium text-sm text-slate-900 truncate">{test.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{test.question_count || 0} soru</p>
                    </button>
                  ))}
                  
                  {tests.length === 0 && !showNewTest && (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      Henüz test yok
                    </div>
                  )}

                  {showNewTest && (
                    <div className="p-3 border-2 border-indigo-200 rounded-lg bg-indigo-50/50 space-y-3">
                      <Input 
                        placeholder="Test başlığı"
                        value={newTestData.title}
                        onChange={(e) => setNewTestData({ ...newTestData, title: e.target.value })}
                        className="text-sm"
                      />
                      <div className="space-y-2">
                        <Label className="text-xs">Süre (dakika)</Label>
                        <Input 
                          type="number"
                          min="1"
                          placeholder="60"
                          value={newTestData.duration_minutes}
                          onChange={(e) => setNewTestData({ ...newTestData, duration_minutes: Number(e.target.value) })}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={newTestData.is_timed}
                          onCheckedChange={(checked) => setNewTestData({ ...newTestData, is_timed: checked })}
                        />
                        <Label className="text-xs">Süreli test</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setShowNewTest(false)} variant="ghost">İptal</Button>
                        <Button 
                          size="sm" 
                          onClick={() => createTestMutation.mutate(newTestData)}
                          disabled={!newTestData.title}
                          style={{backgroundColor: '#0000CD'}}
                          className="hover:opacity-90"
                        >
                          Oluştur
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button 
                    size="sm" 
                    onClick={() => setShowNewTest(true)}
                    variant="outline"
                    className="w-full mt-2"
                    disabled={showNewTest}
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    Yeni Test
                  </Button>
                </div>
              </div>
            </div>

            {/* Questions Panel */}
            <div className="lg:col-span-3">
              {activeTest ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-slate-900">{activeTest.title}</h2>
                      <p className="text-sm text-slate-500 mt-1">{questions.length} soru</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => { setNewQuestion(true); setEditingQuestion(null); }}
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Soru Ekle
                      </Button>
                      <Button 
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm("Bu testi ve tüm sorularını silmek istediğinize emin misiniz?")) {
                            deleteTestMutation.mutate(activeTest.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    {(newQuestion || editingQuestion) && (
                      <QuestionForm
                        question={editingQuestion}
                        onSave={(data) => {
                          if (editingQuestion) {
                            updateQuestionMutation.mutate({ id: editingQuestion.id, data });
                          } else {
                            createQuestionMutation.mutate(data);
                          }
                        }}
                        onCancel={() => { setNewQuestion(false); setEditingQuestion(null); }}
                        isLoading={createQuestionMutation.isPending || updateQuestionMutation.isPending}
                      />
                    )}

                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="questions">
                        {(provided) => (
                          <div 
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-3 mt-6"
                          >
                            {currentQuestions.map((q, idx) => {
                              const actualIndex = startIndex + idx;
                              return (
                                <Draggable key={q.id} draggableId={q.id} index={actualIndex}>
                                  {(provided, snapshot) => (
                                    <div 
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`flex items-start gap-4 p-4 rounded-xl transition-all ${
                                        snapshot.isDragging 
                                          ? 'bg-indigo-50 shadow-lg' 
                                          : 'bg-slate-50'
                                      }`}
                                    >
                                      <div 
                                        {...provided.dragHandleProps}
                                        className="flex items-center gap-2 text-slate-400 cursor-grab active:cursor-grabbing"
                                      >
                                        <GripVertical className="w-5 h-5" />
                                        <span className="font-semibold">{actualIndex + 1}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-slate-900 line-clamp-2">{q.question_text}</p>
                                        <div className="flex gap-2 mt-2">
                                          <Badge variant="outline" className="text-xs">
                                            Doğru: {q.correct_answer}
                                          </Badge>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => { setEditingQuestion(q); setNewQuestion(false); }}
                                        >
                                          Düzenle
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="text-rose-600 hover:text-rose-700"
                                          onClick={() => deleteQuestionMutation.mutate(q.id)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}

                            {questions.length === 0 && !newQuestion && (
                              <div className="text-center py-12 text-slate-500">
                                Henüz soru eklenmedi
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>

                    {totalPages > 1 && (
                      <Pagination className="mt-6">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center">
                  <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Soldaki listeden bir test seçin veya yeni test oluşturun</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuestionForm({ question, onSave, onCancel, isLoading }) {
  const [data, setData] = useState(question || {
    question_text: "",
    question_image: "",
    option_a: "",
    option_a_image: "",
    option_b: "",
    option_b_image: "",
    option_c: "",
    option_c_image: "",
    option_d: "",
    option_d_image: "",
    option_e: "",
    option_e_image: "",
    correct_answer: "A",
    explanation: "",
  });
  const [uploadingField, setUploadingField] = useState(null);
  const [missingFields, setMissingFields] = useState([]);

  const handleImageUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Lütfen bir resim dosyası seçin");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resim boyutu en fazla 5MB olabilir");
      return;
    }

    setUploadingField(field);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setData({ ...data, [field]: file_url });
      toast.success("Görsel yüklendi");
    } catch (error) {
      toast.error("Görsel yüklenirken hata oluştu");
    } finally {
      setUploadingField(null);
    }
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
          
          <div className="mt-2">
            <Label className="text-sm text-slate-600">Soru Görseli (Opsiyonel)</Label>
            {data.question_image ? (
              <div className="relative mt-2 inline-block">
                <img 
                  src={data.question_image} 
                  alt="Soru görseli" 
                  className="max-w-md w-full h-auto rounded-lg border border-slate-200"
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => setData({ ...data, question_image: "" })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="mt-2">
                <input
                  id="question-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'question_image')}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('question-image-upload').click()}
                  disabled={uploadingField === 'question_image'}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {uploadingField === 'question_image' ? "Yükleniyor..." : "Görsel Ekle"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {["A", "B", "C", "D", "E"].map((opt) => {
            const optionKey = `option_${opt.toLowerCase()}`;
            const imageKey = `option_${opt.toLowerCase()}_image`;
            const isRequired = opt === "A" || opt === "B";
            const isMissing = missingFields.includes(optionKey);
            return (
              <div key={opt} className={`space-y-2 p-4 bg-white rounded-lg border-2 transition-colors ${
                isMissing ? 'border-rose-500 bg-rose-50' : 'border-slate-200'
              }`}>
                <Label className={isMissing ? 'text-rose-700' : ''}>
                  {opt} Şıkkı {isRequired ? "*" : "(Opsiyonel)"}
                </Label>
                <Input
                  value={data[optionKey] || ""}
                  onChange={(e) => setData({ ...data, [optionKey]: e.target.value })}
                  placeholder={`${opt} şıkkı metni...`}
                  className={isMissing ? 'border-rose-300' : ''}
                />
                
                <div className="mt-2">
                  {data[imageKey] ? (
                    <div className="relative inline-block">
                      <img 
                        src={data[imageKey]} 
                        alt={`${opt} şıkkı görseli`} 
                        className="max-w-xs w-full h-auto rounded border border-slate-200"
                        style={{ maxHeight: '150px', objectFit: 'contain' }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={() => setData({ ...data, [imageKey]: "" })}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <input
                        id={`${imageKey}-upload`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, imageKey)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => document.getElementById(`${imageKey}-upload`).click()}
                        disabled={uploadingField === imageKey}
                        className="text-slate-600"
                      >
                        <ImageIcon className="w-3 h-3 mr-2" />
                        {uploadingField === imageKey ? "Yükleniyor..." : "Görsel Ekle"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <Label>Doğru Cevap *</Label>
          <Select value={data.correct_answer} onValueChange={(v) => setData({ ...data, correct_answer: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["A", "B", "C", "D", "E"].map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Çözüm Açıklaması</Label>
          <Textarea
            value={data.explanation || ""}
            onChange={(e) => setData({ ...data, explanation: e.target.value })}
            rows={2}
            placeholder="Opsiyonel çözüm açıklaması..."
          />
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>İptal</Button>
          <Button 
            onClick={() => {
              const missing = [];
              
              // Soru metni kontrolü
              if (!data.question_text && !data.question_image) {
                toast.error("Soru metni veya görseli ekleyin");
                return;
              }
              
              // A ve B şıkları zorunlu
              if (!data.option_a && !data.option_a_image) {
                missing.push('option_a');
              }
              if (!data.option_b && !data.option_b_image) {
                missing.push('option_b');
              }
              
              // C, D, E için atlama kontrolü
              const hasC = data.option_c || data.option_c_image;
              const hasD = data.option_d || data.option_d_image;
              const hasE = data.option_e || data.option_e_image;
              
              // C boşken D dolu olamaz
              if (!hasC && hasD) {
                missing.push('option_c');
                toast.error("C şıkkı boşken D şıkkı dolu olamaz");
              }
              
              // D boşken E dolu olamaz
              if (!hasD && hasE) {
                missing.push('option_d');
                toast.error("D şıkkı boşken E şıkkı dolu olamaz");
              }
              
              if (missing.length > 0) {
                setMissingFields(missing);
                if (missing.includes('option_a') || missing.includes('option_b')) {
                  toast.error("A ve B şıkları zorunludur");
                }
                return;
              }
              
              setMissingFields([]);
              onSave(data);
            }} 
            disabled={isLoading}
            style={{backgroundColor: '#0000CD'}}
            className="hover:opacity-90"
          >
            {isLoading ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </div>
    </div>
  );
}