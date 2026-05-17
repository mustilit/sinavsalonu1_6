import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit2, 
  Eye, 
  EyeOff,
  BookOpen,
  MoreVertical,
  Search,
  Filter,
  Download,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MyTestPackages() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [examTypeFilter, setExamTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["myTestPackages", user?.email],
    queryFn: () => base44.entities.TestPackage.filter({ educator_email: user.email }, "-created_date"),
    enabled: !!user,
  });

  const { data: allQuestions = [] } = useQuery({
    queryKey: ["allQuestions"],
    queryFn: () => base44.entities.Question.list(),
    enabled: !!user,
  });

  const { data: examTypes = [] } = useQuery({
    queryKey: ["examTypes"],
    queryFn: () => base44.entities.ExamType.filter({ is_active: true }),
  });

  // Calculate real question counts
  const questionCounts = allQuestions.reduce((acc, q) => {
    acc[q.test_package_id] = (acc[q.test_package_id] || 0) + 1;
    return acc;
  }, {});

  // Enrich tests with real question counts
  const testsWithRealCounts = tests.map(test => ({
    ...test,
    question_count: questionCounts[test.id] || 0
  }));



  const togglePublishMutation = useMutation({
    mutationFn: ({ id, is_published }) => 
      base44.entities.TestPackage.update(id, { is_published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myTestPackages"] });
    },
  });

  const difficultyLabels = {
    easy: { label: "Kolay", color: "bg-emerald-100 text-emerald-700" },
    medium: { label: "Orta", color: "bg-amber-100 text-amber-700" },
    hard: { label: "Zor", color: "bg-rose-100 text-rose-700" }
  };

  // Filter tests
  const filteredTests = testsWithRealCounts.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         test.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "published" && test.is_published) ||
                         (statusFilter === "draft" && !test.is_published);
    const matchesDifficulty = difficultyFilter === "all" || test.difficulty === difficultyFilter;
    const matchesExamType = examTypeFilter === "all" || test.exam_type_id === examTypeFilter;
    
    return matchesSearch && matchesStatus && matchesDifficulty && matchesExamType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTests = filteredTests.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, difficultyFilter, examTypeFilter]);

  const hasActiveFilters = searchQuery || statusFilter !== "all" || difficultyFilter !== "all" || examTypeFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDifficultyFilter("all");
    setExamTypeFilter("all");
    setCurrentPage(1);
  };

  const exportToExcel = () => {
    const csvContent = [
      ["Başlık", "Durum", "Zorluk", "Soru Sayısı", "Süre (dk)", "Fiyat (₺)", "Satış", "Oluşturma Tarihi"],
      ...filteredTests.map(test => [
        test.title,
        test.is_published ? "Yayında" : "Taslak",
        difficultyLabels[test.difficulty]?.label || test.difficulty,
        test.question_count || 0,
        test.duration_minutes || 60,
        test.price,
        test.total_sales || 0,
        new Date(test.created_date).toLocaleDateString('tr-TR')
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `test-paketlerim-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("Excel dosyası indirildi");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Test Paketlerim</h1>
          <p className="text-slate-500 mt-2">Oluşturduğun tüm test paketleri</p>
        </div>
        <Link to={createPageUrl("CreateTest")}>
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Test
          </Button>
        </Link>
      </div>

      {/* Filters */}
      {!isLoading && tests.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Test ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="published">Yayında</SelectItem>
                <SelectItem value="draft">Taslak</SelectItem>
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Zorluk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Zorluklar</SelectItem>
                <SelectItem value="easy">Kolay</SelectItem>
                <SelectItem value="medium">Orta</SelectItem>
                <SelectItem value="hard">Zor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={examTypeFilter} onValueChange={setExamTypeFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Sınav Türü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Sınavlar</SelectItem>
                {examTypes.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={exportToExcel}
              className="w-full lg:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Excel İndir
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="w-full lg:w-auto">
                <X className="w-4 h-4 mr-2" />
                Temizle
              </Button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900">Henüz test oluşturmadın</h3>
          <p className="text-slate-500 mt-2 mb-6">İlk test paketini oluştur ve satışa başla</p>
          <Link to={createPageUrl("CreateTest")}>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              İlk Testini Oluştur
            </Button>
          </Link>
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <Filter className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900">Sonuç bulunamadı</h3>
          <p className="text-slate-500 mt-2 mb-6">Filtreleri değiştirmeyi deneyin</p>
          <Button variant="outline" onClick={clearFilters}>
            <X className="w-4 h-4 mr-2" />
            Filtreleri Temizle
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedTests.map((test) => {
            const difficulty = difficultyLabels[test.difficulty] || difficultyLabels.medium;
            return (
              <div 
                key={test.id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-slate-900">{test.title}</h3>
                      <Badge className={test.is_published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                        {test.is_published ? "Yayında" : "Taslak"}
                      </Badge>
                      <Badge className={difficulty.color}>{difficulty.label}</Badge>
                    </div>
                    <p className="text-slate-500 text-sm line-clamp-1 mb-3">
                      {test.description || "Açıklama yok"}
                    </p>
                    <div className="flex items-center gap-6 text-sm text-slate-500">
                      <span>{test.question_count || 0} soru</span>
                      <span>{test.duration_minutes || 60} dakika</span>
                      <span className="font-semibold text-slate-900">₺{test.price}</span>
                      <span>{test.total_sales || 0} satış</span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("EditTest") + `?id=${test.id}`}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Düzenle
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => togglePublishMutation.mutate({ 
                          id: test.id, 
                          is_published: !test.is_published 
                        })}
                      >
                        {test.is_published ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Yayından Kaldır
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Yayınla
                          </>
                        )}
                      </DropdownMenuItem>

                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first, last, current, and surrounding pages
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={currentPage === page ? "bg-indigo-600" : ""}
                      >
                        {page}
                      </Button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-2 text-slate-400">...</span>;
                  }
                  return null;
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}


    </div>
  );
}