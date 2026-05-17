import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, Star, User, TrendingUp } from "lucide-react";
import api from "@/api/dalClient";

export default function Educators() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allTests = [], isLoading } = useQuery({
    queryKey: ["allPublishedTests"],
    queryFn: () => base44.entities.TestPackage.filter({ is_published: true }),
  });

  // Public educators (backend supports featured educators)
  const { data: featured = [] } = useQuery({
    queryKey: ["featuredEducators"],
    queryFn: async () => {
      const res = await api.get("/site/featured-educators");
      const data = res?.data ?? res;
      return Array.isArray(data) ? data : (data?.items ?? []);
    },
  });

  // Calculate educator stats
  const educators = Object.values(
    allTests.reduce((acc, test) => {
      
      if (!acc[test.educator_email]) {
        acc[test.educator_email] = {
          email: test.educator_email,
          name: test.educator_name,
          bio: null,
          testCount: 0,
          totalSales: 0,
          avgRating: 0,
          ratingCount: 0,
        };
      }
      acc[test.educator_email].testCount++;
      acc[test.educator_email].totalSales += test.total_sales || 0;
      if (test.average_rating > 0) {
        acc[test.educator_email].avgRating += test.average_rating;
        acc[test.educator_email].ratingCount++;
      }
      return acc;
    }, {})
  ).map((edu) => ({
    ...edu,
    avgRating: edu.ratingCount > 0 ? (edu.avgRating / edu.ratingCount).toFixed(1) : 0,
  }))
  .sort((a, b) => b.totalSales - a.totalSales);

  // Merge featured educator metadata when possible (id/email mismatch is tolerated)
  if (Array.isArray(featured) && featured.length) {
    for (const f of featured) {
      const key = f?.id ?? f?.email;
      if (!key) continue;
      const e = educators.find((x) => x.email === key);
      if (!e) continue;
      if (f?.bio) e.bio = f.bio;
      if (f?.name) e.name = f.name;
    }
  }

  const filteredEducators = educators.filter((edu) =>
    !searchQuery || (edu.name?.toLowerCase() ?? "").includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Eğiticiler</h1>
        <p className="text-slate-500 mt-2">Platformdaki tüm eğiticileri keşfet</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Eğitici ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 border-slate-200"
          />
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 h-40 animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-slate-200 rounded-full" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredEducators.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Search className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900">Eğitici bulunamadı</h3>
          <p className="text-slate-500 mt-2">Farklı bir arama terimi deneyin</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-6">{filteredEducators.length} eğitici bulundu</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEducators.map((educator) => (
              <Link
                key={educator.email}
                to={createPageUrl("EducatorProfile") + `?email=${encodeURIComponent(educator.email)}`}
                className="group bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-xl hover:border-indigo-200 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors truncate mb-3">
                      {educator.name}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                        <span>{educator.testCount} Test</span>
                      </div>
                      {educator.avgRating > 0 && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span>{educator.avgRating} Puan</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        <span>{educator.totalSales} Satış</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <Button variant="ghost" size="sm" className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                    Testleri Görüntüle
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}