import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import TestPackageCard from "@/components/ui/TestPackageCard";
import StarRating from "@/components/ui/StarRating";
import { 
  User, 
  BookOpen, 
  Star, 
  TrendingUp, 
  Award,
  ShoppingBag,
  Globe,
  Linkedin
} from "lucide-react";
import { toast } from "sonner";

export default function EducatorProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const educatorEmail = urlParams.get("email");
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [educatorRating, setEducatorRating] = useState(0);
  const [educatorComment, setEducatorComment] = useState("");

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
    queryKey: ["educatorTests", educatorEmail],
    queryFn: () => base44.entities.TestPackage.filter({ 
      educator_email: educatorEmail, 
      is_published: true 
    }, "-created_date"),
    enabled: !!educatorEmail,
  });

  const { data: allQuestions = [] } = useQuery({
    queryKey: ["allQuestions"],
    queryFn: () => base44.entities.Question.list(),
    enabled: !!educatorEmail,
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

  const { data: educatorUser, isLoading: educatorUserLoading } = useQuery({
    queryKey: ["educatorUser", educatorEmail],
    queryFn: async () => {
      try {
        const profiles = await base44.entities.EducatorProfile.filter({ educator_email: educatorEmail });
        return profiles[0] || null;
      } catch (e) {
        console.log("Educator profile data not available");
        return null;
      }
    },
    enabled: !!educatorEmail,
  });

  const { data: examTypes = [] } = useQuery({
    queryKey: ["examTypes"],
    queryFn: () => base44.entities.ExamType.filter({ is_active: true }),
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases", user?.email],
    queryFn: () => user ? base44.entities.Purchase.filter({ user_email: user.email }) : [],
    enabled: !!user,
  });

  const purchasedIds = new Set(purchases.map(p => p.test_package_id));
  const hasPurchasedFromEducator = purchases.length > 0;

  const { data: educatorReviews = [] } = useQuery({
    queryKey: ["educatorReviews", educatorEmail],
    queryFn: () => base44.entities.Review.filter({ educator_email: educatorEmail, review_type: "educator" }),
    enabled: !!educatorEmail,
  });

  const educatorAverageRating = educatorReviews.length > 0 
    ? (educatorReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / educatorReviews.length).toFixed(1)
    : '0';

  const { data: existingEducatorReview } = useQuery({
    queryKey: ["educatorReview", educatorEmail, user?.email],
    queryFn: async () => {
      const reviews = await base44.entities.Review.filter({
        educator_email: educatorEmail,
        reviewer_email: user.email,
        review_type: "educator",
      });
      return reviews[0] || null;
    },
    enabled: !!user?.email && !!educatorEmail,
  });

  const handleSubmitEducatorReview = async () => {
    if (educatorRating === 0) return;
    try {
      await base44.entities.Review.create({
        reviewer_email: user.email,
        reviewer_name: user.full_name,
        review_type: "educator",
        educator_email: educatorEmail,
        educator_name: educatorName,
        rating: educatorRating,
        comment: educatorComment,
      });
      queryClient.invalidateQueries({ queryKey: ["educatorReview", educatorEmail, user?.email] });
      toast.success("Eğitici puanınız kaydedildi!");
      setEducatorRating(0);
      setEducatorComment("");
    } catch (error) {
      toast.error("Bir hata oluştu!");
    }
  };

  if (!educatorEmail || (tests.length === 0 && !isLoading)) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Eğitici bulunamadı</h2>
        <p className="text-slate-500">Bu profil görüntülenemiyor</p>
      </div>
    );
  }

  const educatorName = tests[0]?.educator_name || educatorEmail;
  const totalSales = tests.reduce((sum, test) => sum + (test.total_sales || 0), 0);
  const ratedTests = tests.filter(t => t.average_rating && t.average_rating > 0);
  const avgRating = ratedTests.length > 0
    ? (ratedTests.reduce((sum, test) => sum + test.average_rating, 0) / ratedTests.length).toFixed(1)
    : '0.0';

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="rounded-3xl p-8 lg:p-12 mb-8" style={{backgroundColor: '#0000CD'}}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          {educatorUser?.profile_image_url ? (
            <img 
              src={educatorUser.profile_image_url} 
              alt={educatorName}
              className="w-24 h-24 rounded-2xl object-cover flex-shrink-0 border-4 border-white/20"
            />
          ) : (
            <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
              <User className="w-12 h-12 text-white" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">{educatorName}</h1>
            <p className="mb-4" style={{color: 'rgba(255, 255, 255, 0.8)'}}>Eğitici</p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-lg px-4 py-2">
                <BookOpen className="w-5 h-5 text-white" />
                <span className="text-white font-medium">{tests.length} Test</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-lg px-4 py-2">
                <span className="text-white font-medium">{educatorAverageRating} Puan</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-lg px-4 py-2">
                <TrendingUp className="w-5 h-5 text-white" />
                <span className="text-white font-medium">{totalSales} Satış</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About Educator */}
      {(educatorUser?.bio || educatorUser?.education || educatorUser?.website || educatorUser?.linkedin || educatorUser?.specialized_exam_types?.length > 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Hakkında</h2>
          <div className="space-y-4">
            {educatorUser?.specialized_exam_types?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">Uzmanlık Alanları</h3>
                <div className="flex flex-wrap gap-2">
                  {examTypes
                    .filter(exam => educatorUser.specialized_exam_types.includes(exam.id))
                    .map(exam => (
                      <Badge key={exam.id} style={{backgroundColor: 'rgba(0, 0, 205, 0.1)', color: '#0000CD'}} className="hover:opacity-80">
                         {exam.name}
                       </Badge>
                    ))}
                </div>
              </div>
            )}
            {educatorUser?.education && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">Mezuniyet</h3>
                <p className="text-slate-700">{educatorUser.education}</p>
              </div>
            )}
            {educatorUser?.bio && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">Tanıtım</h3>
                <p className="text-slate-700 leading-relaxed">{educatorUser.bio}</p>
              </div>
            )}
            {(educatorUser?.website || educatorUser?.linkedin) && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">İletişim</h3>
                <div className="flex flex-wrap gap-3">
                  {educatorUser?.website && (
                    <a
                      href={educatorUser.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Globe className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-700">Website</span>
                    </a>
                  )}
                  {educatorUser?.linkedin && (
                    <a
                      href={educatorUser.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Linkedin className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-700">LinkedIn</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Educator Ratings Summary */}
      {educatorReviews.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Eğitici Puanlaması</h2>
          <div className="flex items-center gap-4 mb-6">
            <div>
              <p className="text-4xl font-bold text-slate-900">{educatorAverageRating}</p>
              <p className="text-sm text-slate-500">{educatorReviews.length} değerlendirme</p>
            </div>
            <div className="flex">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} className={`w-5 h-5 ${s <= Math.round(educatorAverageRating) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
              ))}
            </div>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {educatorReviews.map((review) => (
              <div key={review.id} className="pb-3 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`w-4 h-4 ${s <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                    ))}
                  </div>
                  <span className="text-sm text-slate-500">{review.reviewer_name}</span>
                </div>
                {review.comment && <p className="text-sm text-slate-600">{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Educator Rating */}
      {user && hasPurchasedFromEducator && !existingEducatorReview && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Eğiticiyi Değerlendir</h2>
          <p className="text-slate-600 mb-4">Bu eğiticiden test satın aldınız. Deneyiminizi paylaşın!</p>
          <div className="flex items-center gap-4 mb-4">
            <StarRating value={educatorRating} onChange={setEducatorRating} size="lg" />
            {educatorRating > 0 && (
              <span className="text-lg font-medium text-slate-700">{educatorRating}/5</span>
            )}
          </div>
          <Textarea
            placeholder="Yorumunuz (opsiyonel)"
            value={educatorComment}
            onChange={(e) => setEducatorComment(e.target.value)}
            className="mb-4"
            rows={3}
          />
          <Button
            onClick={handleSubmitEducatorReview}
            disabled={educatorRating === 0}
            style={{backgroundColor: '#0000CD'}}
            className="hover:opacity-90"
          >
            Puanı Gönder
          </Button>
        </div>
      )}

      {/* Tests */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Test Paketleri</h2>
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
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
        ) : tests.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900">Henüz test yok</h3>
            <p className="text-slate-500 mt-2">Bu eğiticinin henüz yayınlanmış testi bulunmuyor</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {testsWithRealCounts.map((test) => (
              <TestPackageCard
                key={test.id}
                test={test}
                isPurchased={purchasedIds.has(test.id)}
                onBuy={() => window.location.href = createPageUrl("TestDetail") + `?id=${test.id}`}
                showEducator={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}