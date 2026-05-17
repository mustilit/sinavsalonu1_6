import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import TestPackageCard from "@/components/ui/TestPackageCard";
import { Search, SlidersHorizontal, X, Star } from "lucide-react";
import { createPageUrl } from "@/utils";
import { buildPageUrl, useAppNavigate } from "@/lib/navigation";

export default function Explore() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get("q") || "";
  const initialExamType = urlParams.get("exam_type") || "";

  const { user } = useAuth();
  const navigate = useAppNavigate();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedExamType, setSelectedExamType] = useState(initialExamType);
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [selectedEducator, setSelectedEducator] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: examTypes = [] } = useQuery({
    queryKey: ["examTypes"],
    queryFn: () => base44.entities.ExamType.filter({ is_active: true }),
  });

  const { data: allTests = [], isLoading } = useQuery({
    queryKey: ["tests"],
    queryFn: () => base44.entities.TestPackage.filter({ is_published: true, is_active: true }, "-created_date"),
  });

  const { data: allQuestions = [] } = useQuery({
    queryKey: ["allQuestions"],
    queryFn: () => base44.entities.Question.list(),
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases", user?.id],
    queryFn: () => base44.entities.Purchase.filter({}),
    enabled: !!user,
  });

  const { data: results = [] } = useQuery({
    queryKey: ["results", user?.email],
    queryFn: () => user ? base44.entities.TestResult.filter({ user_email: user.email }) : [],
    enabled: !!user,
  });

  const purchasedIds = new Set(purchases.map(p => p.test_package_id));
  const completedIds = new Set(results.map(r => r.test_package_id));

  // Calculate real question counts
  const questionCounts = allQuestions.reduce((acc, q) => {
    acc[q.test_package_id] = (acc[q.test_package_id] || 0) + 1;
    return acc;
  }, {});

  // Enrich tests with real question counts
  const testsWithRealCounts = allTests.map(test => ({
    ...test,
    question_count: questionCounts[test.id] || 0
  }));

  // Filter tests
  const filteredTests = testsWithRealCounts.filter((test) => {
    const matchesSearch = !searchQuery || 
      test.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.educator_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesExamType = !selectedExamType || test.exam_type_id === selectedExamType;
    const matchesDifficulty = !selectedDifficulty || test.difficulty === selectedDifficulty;
    const matchesRating = !minRating || (test.average_rating || 0) >= minRating;
    const matchesEducator = !selectedEducator || test.educator_email === selectedEducator;
    
    let matchesPrice = true;
    if (priceRange === "free") matchesPrice = test.price === 0;
    else if (priceRange === "under50") matchesPrice = test.price < 50;
    else if (priceRange === "50to100") matchesPrice = test.price >= 50 && test.price <= 100;
    else if (priceRange === "over100") matchesPrice = test.price > 100;

    return matchesSearch && matchesExamType && matchesDifficulty && matchesPrice && matchesRating && matchesEducator;
  });

  // Get unique educators for filter
  const educators = [...new Set(allTests.map(t => t.educator_email))].map(email => {
    const test = allTests.find(t => t.educator_email === email);
    return { email, name: test?.educator_name || email };
  });

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedExamType("");
    setSelectedDifficulty("");
    setPriceRange("");
    setMinRating(0);
    setSelectedEducator("");
  };

  const hasActiveFilters = searchQuery || selectedExamType || selectedDifficulty || priceRange || minRating > 0 || selectedEducator;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Testleri Keşfet</h1>
        <p className="text-slate-500 mt-2">Binlerce test arasından sana uygun olanı bul</p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Test, konu veya eğitici ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 border-slate-200"
            />
          </div>
          <Button
            variant="outline"
            className="lg:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filtreler
          </Button>
          <div className={`flex flex-col lg:flex-row gap-4 ${showFilters ? "block" : "hidden lg:flex"}`}>
            <Select value={selectedExamType} onValueChange={setSelectedExamType}>
              <SelectTrigger className="w-full lg:w-44 h-12">
                <SelectValue placeholder="Sınav Türü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Tümü</SelectItem>
                {examTypes.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-full lg:w-36 h-12">
                <SelectValue placeholder="Zorluk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Tümü</SelectItem>
                <SelectItem value="easy">Kolay</SelectItem>
                <SelectItem value="medium">Orta</SelectItem>
                <SelectItem value="hard">Zor</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="w-full lg:w-36 h-12">
                <SelectValue placeholder="Fiyat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Tümü</SelectItem>
                <SelectItem value="free">Ücretsiz</SelectItem>
                <SelectItem value="under50">₺50 Altı</SelectItem>
                <SelectItem value="50to100">₺50 - ₺100</SelectItem>
                <SelectItem value="over100">₺100 Üstü</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedEducator} onValueChange={setSelectedEducator}>
              <SelectTrigger className="w-full lg:w-44 h-12">
                <SelectValue placeholder="Eğitici" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Tüm Eğiticiler</SelectItem>
                {educators.map((edu) => (
                  <SelectItem key={edu.email} value={edu.email}>{edu.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 px-3 h-12 bg-white border rounded-md min-w-[140px]">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-slate-600 w-6">{minRating}+</span>
              <Slider
                value={[minRating]}
                onValueChange={([v]) => setMinRating(v)}
                max={5}
                step={1}
                className="w-16"
              />
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">Aktif filtreler:</span>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-rose-600 hover:text-rose-700">
              <X className="w-4 h-4 mr-1" />
              Temizle
            </Button>
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 h-80 animate-pulse">
              <div className="h-40 bg-slate-200 rounded-t-2xl" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-10 bg-slate-200 rounded mt-6" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Search className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900">Sonuç bulunamadı</h3>
          <p className="text-slate-500 mt-2">Farklı filtreler deneyin veya arama teriminizi değiştirin</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-6">{filteredTests.length} test bulundu</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTests.map((test) => (
              <TestPackageCard
                key={test.id}
                test={test}
                isPurchased={purchasedIds.has(test.id)}
                isCompleted={completedIds.has(test.id)}
                onBuy={() => navigate(buildPageUrl("TestDetail", { id: test.id }))}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}