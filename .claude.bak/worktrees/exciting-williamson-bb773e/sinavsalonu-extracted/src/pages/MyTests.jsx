import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TestPackageCard from "@/components/ui/TestPackageCard";
import { BookOpen, Search, ShoppingBag, Filter, X } from "lucide-react";

export default function MyTests() {
  const [user, setUser] = useState(null);
  const [selectedExamType, setSelectedExamType] = useState("all");
  const [selectedEducator, setSelectedEducator] = useState("all");
  const [completionFilter, setCompletionFilter] = useState("all");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: purchases = [], isLoading: loadingPurchases } = useQuery({
    queryKey: ["myPurchases", user?.email],
    queryFn: () => base44.entities.Purchase.filter({ user_email: user.email }, "-created_date"),
    enabled: !!user,
  });

  const { data: testPackages = [] } = useQuery({
    queryKey: ["testPackages", purchases?.length],
    queryFn: async () => {
      if (purchases.length === 0) return [];
      const packageIds = purchases.map(p => p.test_package_id);
      const packages = await base44.entities.TestPackage.list();
      // Only show published and active tests
      return packages.filter(p => packageIds.includes(p.id) && p.is_published === true && p.is_active === true);
    },
    enabled: purchases.length > 0,
  });

  const { data: allQuestions = [] } = useQuery({
    queryKey: ["allQuestions"],
    queryFn: () => base44.entities.Question.list(),
    enabled: purchases.length > 0,
  });

  // Calculate real question counts
  const questionCounts = allQuestions.reduce((acc, q) => {
    acc[q.test_package_id] = (acc[q.test_package_id] || 0) + 1;
    return acc;
  }, {});

  // Use real test package data with real question counts
  const testsWithRealCounts = testPackages.map(test => ({
    ...test,
    question_count: questionCounts[test.id] || 0
  }));

  const { data: results = [] } = useQuery({
    queryKey: ["myResults", user?.email],
    queryFn: () => base44.entities.TestResult.filter({ user_email: user.email }),
    enabled: !!user,
  });

  const { data: testProgress = [] } = useQuery({
    queryKey: ["testProgress", user?.email],
    queryFn: () => base44.entities.TestProgress.filter({ user_email: user.email, is_completed: false }),
    enabled: !!user,
  });

  const { data: examTypes = [] } = useQuery({
    queryKey: ["examTypes"],
    queryFn: () => base44.entities.ExamType.filter({ is_active: true }),
  });

  const purchasedTestIds = new Set(purchases.map(p => p.test_package_id));
  const completedTestIds = new Set(results.map(r => r.test_package_id));
  const inProgressTestIds = new Set(testProgress.map(p => p.test_package_id));
  
  let purchasedTests = testsWithRealCounts.filter(t => purchasedTestIds.has(t.id));
  
  // Apply filters
  if (selectedExamType !== "all") {
    purchasedTests = purchasedTests.filter(t => t.exam_type_id === selectedExamType);
  }
  
  if (selectedEducator !== "all") {
    purchasedTests = purchasedTests.filter(t => t.educator_email === selectedEducator);
  }
  
  if (completionFilter === "completed") {
    purchasedTests = purchasedTests.filter(t => completedTestIds.has(t.id));
  } else if (completionFilter === "pending") {
    purchasedTests = purchasedTests.filter(t => !completedTestIds.has(t.id));
  }
  
  const pendingTests = purchasedTests.filter(t => !completedTestIds.has(t.id));
  const completedTests = purchasedTests.filter(t => completedTestIds.has(t.id));

  // Get unique educators
  const educators = [...new Set(testsWithRealCounts.filter(t => purchasedTestIds.has(t.id)).map(t => ({
    email: t.educator_email,
    name: t.educator_name
  })).map(e => JSON.stringify(e)))].map(e => JSON.parse(e));

  const hasActiveFilters = selectedExamType !== "all" || selectedEducator !== "all" || completionFilter !== "all";
  
  const clearFilters = () => {
    setSelectedExamType("all");
    setSelectedEducator("all");
    setCompletionFilter("all");
  };

  const isLoading = loadingPurchases;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Testlerim</h1>
        <p className="text-slate-500 mt-2">Satın aldığın testleri görüntüle ve çöz</p>
      </div>

      {!isLoading && purchases.length > 0 && (
        <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-slate-900">Filtrele</h2>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-auto text-indigo-600 hover:text-indigo-700"
              >
                <X className="w-4 h-4 mr-1" />
                Filtreleri Temizle
              </Button>
            )}
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Sınav Türü</label>
              <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {examTypes.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Eğitici</label>
              <Select value={selectedEducator} onValueChange={setSelectedEducator}>
                <SelectTrigger>
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {educators.map((educator) => (
                    <SelectItem key={educator.email} value={educator.email}>
                      {educator.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Çözülme Durumu</label>
              <Select value={completionFilter} onValueChange={setCompletionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="pending">Bekleyen</SelectItem>
                  <SelectItem value="completed">Tamamlanan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 h-80 animate-pulse">
              <div className="h-40 bg-slate-200 rounded-t-2xl" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900">Henüz test satın almadın</h3>
          <p className="text-slate-500 mt-2 mb-6">Testleri keşfet ve sınava hazırlanmaya başla</p>
          <Link to={createPageUrl("Explore")}>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Search className="w-4 h-4 mr-2" />
              Testleri Keşfet
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {purchasedTests.map((test) => (
            <TestPackageCard
              key={test.id}
              test={test}
              isPurchased={true}
              isCompleted={completedTestIds.has(test.id)}
              isInProgress={inProgressTestIds.has(test.id)}
              showEducator={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}