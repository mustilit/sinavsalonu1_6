import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import StarRating from "@/components/ui/StarRating";
import { 
  BookOpen, 
  Clock, 
  Star, 
  User, 
  CheckCircle, 
  Award,
  ShoppingCart,
  ArrowLeft,
  Play,
  Bell,
  BellOff
} from "lucide-react";
import { toast } from "sonner";
import { useAppNavigate, useLoginRedirect } from "@/lib/navigation";

const difficultyLabels = {
  easy: { label: "Kolay", color: "bg-emerald-100 text-emerald-700" },
  medium: { label: "Orta", color: "bg-amber-100 text-amber-700" },
  hard: { label: "Zor", color: "bg-rose-100 text-rose-700" }
};

export default function TestDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const testId = urlParams.get("id");
  const queryClient = useQueryClient();

  const { user } = useAuth();
  const navigate = useAppNavigate();
  const loginUrl = useLoginRedirect();
  const [testRating, setTestRating] = useState(0);
  const [testComment, setTestComment] = useState("");

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases", user?.id, testId],
    queryFn: () => base44.entities.Purchase.filter({ test_package_id: testId }),
    enabled: !!user && !!testId,
  });

  const isPurchased = purchases.length > 0;

  const { data: test, isLoading } = useQuery({
    queryKey: ["test", testId, isPurchased],
    queryFn: async () => {
      // If purchased, use snapshot
      if (purchases.length > 0) {
        return {
          ...purchases[0].test_package_snapshot,
          educator_email: purchases[0].educator_email,
        };
      }
      // Otherwise fetch current test (for unpurchased tests)
      const tests = await base44.entities.TestPackage.filter({ id: testId, is_published: true });
      return tests[0];
    },
    enabled: !!testId && (purchases !== undefined),
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["questions", testId, isPurchased],
    queryFn: () => {
      // If purchased, use snapshot
      if (purchases.length > 0 && purchases[0].questions_snapshot) {
        return purchases[0].questions_snapshot;
      }
      // Otherwise fetch current questions
      return base44.entities.Question.filter({ test_package_id: testId });
    },
    enabled: !!testId && (purchases !== undefined),
  });

  const { data: tests = [] } = useQuery({
    queryKey: ["tests", testId, isPurchased],
    queryFn: () => {
      // If purchased, use snapshot (only if not empty)
      if (purchases.length > 0 && purchases[0].tests_snapshot && purchases[0].tests_snapshot.length > 0) {
        return purchases[0].tests_snapshot;
      }
      // Otherwise fetch current tests
      return base44.entities.Test.filter({ test_package_id: testId }, "order_index");
    },
    enabled: !!testId && (purchases !== undefined),
  });

  const realQuestionCount = questions.length;

  const { data: allTestResults = [] } = useQuery({
    queryKey: ["allTestResults", user?.id, testId],
    queryFn: () => base44.entities.TestResult.filter({ user_email: user?.email, test_package_id: testId }),
    enabled: !!user && !!testId,
  });

  const { data: allTestProgress = [] } = useQuery({
    queryKey: ["allTestProgress", user?.id, testId],
    queryFn: () => base44.entities.TestProgress.filter({ user_email: user?.email, test_package_id: testId, is_completed: false }),
    enabled: !!user && !!testId,
  });

  const hasCompletedTest = allTestResults.length > 0;

  const { data: existingTestReview } = useQuery({
    queryKey: ["testReview", testId, user?.id],
    queryFn: async () => {
      const reviews = await base44.entities.Review.filter({
        test_package_id: testId,
        reviewer_email: user.email,
        review_type: "test",
      });
      return reviews[0] || null;
    },
    enabled: !!user?.id && !!testId,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", testId],
    queryFn: () => base44.entities.Review.filter({ test_package_id: testId, review_type: "test" }, "-created_date", 10),
    enabled: !!testId,
  });

  // Calculate average rating from reviews
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const { data: follows = [] } = useQuery({
    queryKey: ["follows", user?.id, test?.educator_email],
    queryFn: () => base44.entities.Follow.filter({ educator_email: test.educator_email }),
    enabled: !!user && !!test?.educator_email,
  });

  const isFollowing = follows.length > 0;



  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await base44.entities.Follow.delete(follows[0].educatorId ?? follows[0].id);
      } else {
        await base44.entities.Follow.create({
          follower_email: user.email,
          follow_type: "educator",
          educator_email: test.educator_email,
          educator_name: test.educator_name,
          notifications_enabled: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follows"] });
      toast.success(isFollowing ? "Takipten çıkıldı" : "Takip edildi");
    }
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Purchase.create({
        test_package_id: test.id,
      });
    },
    onSuccess: () => {
      toast.success("Test başarıyla satın alındı!");
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
    onError: () => {
      toast.error("Satın alma işlemi başarısız oldu");
    }
  });

  const handlePurchase = () => {
    if (!user) {
      navigate(loginUrl(), { replace: true });
      return;
    }
    purchaseMutation.mutate();
  };

  const handleSubmitTestReview = async () => {
    if (testRating === 0) return;
    try {
      await base44.entities.Review.create({
        reviewer_email: user.email,
        reviewer_name: user.full_name,
        review_type: "test",
        test_package_id: testId,
        test_package_title: test.title,
        educator_email: test.educator_email,
        educator_name: test.educator_name,
        rating: testRating,
        comment: testComment,
      });
      queryClient.invalidateQueries({ queryKey: ["testReview", testId, user?.id] });
      toast.success("Test puanınız kaydedildi!");
      setTestRating(0);
      setTestComment("");
    } catch (error) {
      toast.error("Bir hata oluştu!");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="h-64 bg-slate-200 rounded-2xl mb-8" />
        <div className="h-8 bg-slate-200 rounded w-3/4 mb-4" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900">Test bulunamadı</h2>
        <Link to={createPageUrl("Explore")} className="text-indigo-600 mt-4 inline-block">
          Testlere Dön
        </Link>
      </div>
    );
  }

  const difficulty = difficultyLabels[test.difficulty] || difficultyLabels.medium;

  return (
    <div className="max-w-4xl mx-auto">
      <Link 
        to={createPageUrl("Explore")} 
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Testlere Dön
      </Link>

      {/* Hero */}
      <div className="relative h-64 rounded-2xl overflow-hidden mb-8" style={{backgroundColor: test.cover_image ? 'transparent' : '#0000CD'}}>
        {test.cover_image ? (
          <img src={test.cover_image} alt={test.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-24 h-24 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-6 left-6">
          <Badge className="bg-white/90 text-slate-700">{test.exam_type_name || "Genel"}</Badge>
        </div>
        <div className="absolute bottom-6 right-6">
          <Badge className="bg-white/90 text-slate-700">
            {difficulty.label}{test.has_solutions ? " - Çözümlü" : ""}
          </Badge>
        </div>
        <div className="absolute bottom-6 left-6">
          <h1 className="text-3xl font-bold text-white">{test.title}</h1>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Test Rating */}
          {user && isPurchased && hasCompletedTest && !existingTestReview && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Bu Testi Değerlendir</h2>
              <p className="text-slate-600 mb-4">Bu testi tamamladınız. Deneyiminizi paylaşın!</p>
              <div className="flex items-center gap-4 mb-4">
                <StarRating value={testRating} onChange={setTestRating} size="lg" />
                {testRating > 0 && (
                  <span className="text-lg font-medium text-slate-700">{testRating}/5</span>
                )}
              </div>
              <Textarea
                placeholder="Yorumunuz (opsiyonel)"
                value={testComment}
                onChange={(e) => setTestComment(e.target.value)}
                className="mb-4"
                rows={3}
              />
              <Button
                onClick={handleSubmitTestReview}
                disabled={testRating === 0}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Puanı Gönder
              </Button>
            </div>
          )}

          {/* Description */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Test Hakkında</h2>
            <p className="text-slate-600 leading-relaxed">
              {test.description || "Bu test paketi hakkında henüz bir açıklama eklenmemiş."}
            </p>
          </div>

          {/* Educator */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Eğitici</h2>
            <div className="flex items-center justify-between">
              <Link 
                to={createPageUrl("EducatorProfile") + `?email=${encodeURIComponent(test.educator_email)}`}
                className="flex items-center gap-4 hover:opacity-80 transition-opacity"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-full flex items-center justify-center">
                  <User className="w-7 h-7 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors">
                    {test.educator_name || "Eğitici"}
                  </p>
                </div>
              </Link>
              {user && (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                >
                  {isFollowing ? (
                    <><BellOff className="w-4 h-4 mr-1" /> Takipte</>
                  ) : (
                    <><Bell className="w-4 h-4 mr-1" /> Takip Et</>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Değerlendirmeler</h2>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="pb-4 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
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

          {/* Features */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Özellikler</h2>
            <div className="grid grid-cols-2 gap-4">
              {test.test_count > 0 && (
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-sm text-slate-500">Test Sayısı</p>
                    <p className="font-semibold text-slate-900">{test.test_count}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-sm text-slate-500">Soru Sayısı</p>
                  <p className="font-semibold text-slate-900">{realQuestionCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <Award className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-sm text-slate-500">Zorluk</p>
                  <p className="font-semibold text-slate-900">{difficulty.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <Star className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-sm text-slate-500">Puan</p>
                  <p className="font-semibold text-slate-900">
                    {avgRating > 0 ? avgRating : "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Purchase Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-24">
            {!isPurchased && (
              <div className="text-center mb-6">
                <p className="text-4xl font-bold text-slate-900">
                  {test.price === 0 ? "Ücretsiz" : `₺${test.price || 0}`}
                </p>
                {test.total_sales > 0 && (
                  <p className="text-sm text-slate-500 mt-2">
                    {test.total_sales} kişi satın aldı
                  </p>
                )}
              </div>
            )}

            {isPurchased ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900 mb-3">Testler</h3>
                {tests.map((testItem) => {
                  const testQuestionsCount = questions.filter(q => q.test_id === testItem.id).length;
                  const testResult = allTestResults.find(r => r.test_id === testItem.id);
                  const testProgress = allTestProgress.find(p => p.test_id === testItem.id);
                  
                  const isCompleted = !!testResult;
                  const isInProgress = !!testProgress;
                  
                  let buttonText = "Teste Başla";
                  let buttonStyle = { backgroundColor: '#10b981' };
                  
                  if (isCompleted) {
                    buttonText = "Gözden Geçir";
                    buttonStyle = { backgroundColor: '#6b7280' };
                  } else if (isInProgress) {
                    buttonText = "Teste Devam Et";
                    buttonStyle = { backgroundColor: '#f59e0b' };
                  }
                  
                  return (
                    <Link 
                      key={testItem.id}
                      to={createPageUrl("TakeTest") + `?id=${testItem.id}${isCompleted ? '&review=true' : ''}`}
                    >
                      <Button 
                        style={buttonStyle}
                        className="w-full justify-between h-auto py-3 hover:opacity-90 text-white"
                      >
                        <div className="text-left">
                          <p className="font-medium">{testItem.title}</p>
                          <p className="text-xs opacity-90 mt-0.5">
                           {testQuestionsCount} soru • {testItem.duration_minutes || 60} dk
                          </p>
                        </div>
                        <Play className="w-4 h-4" />
                      </Button>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <Button 
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700"
                onClick={handlePurchase}
                disabled={purchaseMutation.isPending}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {purchaseMutation.isPending ? "İşleniyor..." : "Satın Al"}
              </Button>
            )}

            <div className="mt-6 space-y-3">
              {[
                "Sınırsız erişim",
                "Detaylı çözümler",
                "Performans analizi",
                "Mobil uyumlu"
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}