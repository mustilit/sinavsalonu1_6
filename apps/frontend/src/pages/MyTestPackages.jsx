import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { entities } from "@/api/dalClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/apiClient";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Edit2,
  Eye,
  EyeOff,
  BookOpen,
  Search,
  Filter,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";

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
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [examTypeFilter, setExamTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const queryClient = useQueryClient();

  const { data: tests = [], isLoading, isError } = useQuery({
    queryKey: ["myTestPackages", user?.id],
    queryFn: () => entities.TestPackage.filter({ educator_owns: true }),
    enabled: !!user,
  });

  const { data: examTypes = [] } = useQuery({
    queryKey: ["examTypes"],
    queryFn: () => entities.ExamType.filter({ is_active: true }),
    enabled: !!user,
  });

  const testsWithRealCounts = tests;

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, is_published }) =>
      is_published
        ? api.put(`/packages/${id}/publish`)
        : api.put(`/packages/${id}/unpublish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myTestPackages"] });
      toast.success("Paket durumu güncellendi");
    },
    onError: (err) => {
      toast.error(err?.message || "İşlem başarısız");
    },
  });

  const filteredTests = testsWithRealCounts.filter((test) => {
    const matchesSearch =
      test.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (test.description || "")?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
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
    const rows = [
      ["Başlık", "Sınav Türü", "Durum", "Test Sayısı", "Soru Sayısı", "Fiyat (₺)", "Satış", "Puan", "Oluşturma Tarihi"],
      ...filteredTests.map(test => [
        test.title,
        test.exam_type_name || "-",
        test.is_published ? "Yayında" : "Taslak",
        (test.tests ?? []).length,
        test.question_count || 0,
        test.price,
        test.total_sales || 0,
        test.average_rating != null ? Number(test.average_rating).toFixed(1) : "-",
        (test.createdAt || test.created_date || "").toString().slice(0, 10),
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Test Paketleri");
    XLSX.writeFile(wb, `test-paketlerim-${new Date().toISOString().split('T')[0]}.xlsx`);
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
      ) : isError ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500">Testler yüklenirken hata oluştu. Sayfayı yenileyin.</p>
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
            const safePrice = test.price ?? (test.priceCents != null ? test.priceCents / 100 : 0);
            return (
              <div
                key={test.id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-semibold text-lg text-slate-900">{test.title}</h3>
                      {test.exam_type_name && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                          {test.exam_type_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-slate-500">
                      <span>{(test.tests ?? []).length} test · {test.question_count || 0} soru</span>
                      <span className="font-semibold text-slate-900">₺{safePrice}</span>
                      <span>{test.total_sales || 0} satış</span>
                      {test.average_rating != null ? (
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-slate-700">{Number(test.average_rating).toFixed(1)}</span>
                          <span className="text-slate-400">({test.rating_count ?? 0})</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Henüz puan yok</span>
                      )}
                    </div>
                  </div>

                  {/* Satır üstü aksiyonlar */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link to={createPageUrl("EditTest") + `?id=${test.id}`} title="Düzenle">
                      <Button size="sm" variant="outline" className="w-8 h-8 p-0">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={togglePublishMutation.isPending}
                      title={test.is_published ? "Yayından Kaldır" : "Yayınla"}
                      className={test.is_published
                        ? "w-8 h-8 p-0 border-amber-200 text-amber-700 hover:bg-amber-50"
                        : "w-8 h-8 p-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50"}
                      onClick={() => togglePublishMutation.mutate({
                        id: test.id,
                        is_published: !test.is_published,
                      })}
                    >
                      {test.is_published
                        ? <EyeOff className="w-3.5 h-3.5" />
                        : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
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
