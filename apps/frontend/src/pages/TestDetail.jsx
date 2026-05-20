import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { entities } from "@/api/dalClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PaymentModal } from "@/components/ui/PaymentModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import StarRating from "@/components/ui/StarRating";
import { 
  BookOpen, 
  Star, 
  User, 
  CheckCircle, 
  Award,
  ShoppingCart,
  ArrowLeft,
  Play,
  Eye,
  Bell,
  BellOff
} from "lucide-react";
import { toast } from "sonner";
import { useAppNavigate, useLoginRedirect } from "@/lib/navigation";
import { useServiceStatus } from "@/lib/useServiceStatus";

const difficultyLabels = {
  easy: { label: "Kolay", color: "bg-emerald-100 text-emerald-700" },
  medium: { label: "Orta", color: "bg-amber-100 text-amber-700" },
  hard: { label: "Zor", color: "bg-rose-100 text-rose-700" }
};

export default function TestDetail() {
  const [searchParams] = useSearchParams();
  const testId = searchParams.get("id");
  const queryClient = useQueryClient();

  const { user } = useAuth();
  const navigate = useAppNavigate();
  const loginUrl = useLoginRedirect();
  const { purchasesEnabled } = useServiceStatus();
  const [testRating, setTestRating] = useState(0);
  const [testComment, setTestComment] = useState("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases", user?.id, testId],
    queryFn: () => entities.Purchase.filter({ test_package_id: testId }),
    enabled: !!user && !!testId,
  });

  const isPurchased = purchases.length > 0;

  // Paketin detay bilgisi — her zaman marketplace API'den çekilir (snapshot sorunlarını önler)
  const { data: test, isLoading, isError: isTestError } = useQuery({
    queryKey: ["test", testId],
    queryFn: async () => {
      const tests = await entities.TestPackage.filter({ id: testId });
      return tests[0] ?? null;
    },
    enabled: !!testId,
    staleTime: 60 * 1000,
    retry: 2, // 404 dışı geçici hatalarda (500, ağ) TanStack Query 2 kez daha dener
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["questions", testId],
    queryFn: () => entities.Question.filter({ test_package_id: testId }),
    enabled: !!testId,
  });

  // Paket içindeki ExamTest listesi — test._tests zaten marketplace yanıtından geliyor
  const { data: tests = [] } = useQuery({
    queryKey: ["tests_in_pkg", testId],
    queryFn: () => entities.Test.filter({ test_package_id: testId }, "order_index"),
    enabled: !!testId,
  });

  const realQuestionCount = questions.length;

  const { data: allTestResults = [] } = useQuery({
    queryKey: ["allTestResults", user?.id, testId],
    queryFn: () => entities.TestResult.filter({ user_email: user?.email, test_package_id: testId }),
    enabled: !!user && !!testId,
  });

  const { data: allTestProgress = [] } = useQuery({
    queryKey: ["allTestProgress", user?.id, testId],
    queryFn: () => entities.TestProgress.filter({ user_email: user?.email, test_package_id: testId, is_completed: false }),
    enabled: !!user && !!testId,
  });

  const hasCompletedTest = allTestResults.length > 0;

  // Gerçek exam test ID — review işlemleri için package ID değil bu kullanılmalı
  const reviewTestId = tests[0]?.id ?? null;

  const { data: existingTestReview } = useQuery({
    queryKey: ["myTestReview", reviewTestId, user?.id],
    queryFn: () => entities.Review.myReview(reviewTestId),
    enabled: !!user?.id && !!reviewTestId,
  });

  // Mevcut review yüklenince formu pre-fill et
  useEffect(() => {
    if (existingTestReview?.testRating) {
      setTestRating(existingTestReview.testRating);
      setTestComment(existingTestReview.comment ?? "");
    }
  }, [existingTestReview]);

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", reviewTestId],
    queryFn: () => entities.Review.filter({ test_package_id: reviewTestId }, "-created_date", 10),
    enabled: !!reviewTestId,
  });

  // Calculate average rating from reviews
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const { data: follows = [] } = useQuery({
    queryKey: ["follows", user?.id, test?.educator_email],
    queryFn: () => entities.Follow.filter({ educator_email: test.educator_email }),
    enabled: !!user && !!test?.educator_email,
  });

  const isFollowing = follows.length > 0;



  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await entities.Follow.delete(follows[0].educatorId ?? follows[0].id);
      } else {
        await entities.Follow.create({
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

  const handlePurchase = () => {
    if (!user) {
      navigate(loginUrl(), { replace: true });
      return;
    }
    if (!purchasesEnabled) {
      toast.warning("Satın alma servislerimiz bakımdadır. Lütfen daha sonra tekrar deneyin.");
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const handleSubmitTestReview = async () => {
    if (testRating === 0 || !reviewTestId) return;
    try {
      await entities.Review.create({
        exam_test_id: reviewTestId,
        rating: testRating,
        comment: testComment,
      });
      queryClient.invalidateQueries({ queryKey: ["myTestReview", reviewTestId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["reviews", reviewTestId] });
      toast.success(existingTestReview ? "Puanınız güncellendi!" : "Test puanınız kaydedildi!");
    } catch {
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
        <h2 className="text-2xl font-bold text-slate-900">
          {isTestError ? "Test yüklenemedi" : "Test bulunamadı"}
        </h2>
        <p className="text-slate-500 mt-2 text-sm">
          {isTestError ? "Sunucuya ulaşılamadı, lütfen sayfayı yenileyin." : "Bu test mevcut değil veya yayından kaldırılmış olabilir."}
        </p>
        <div className="flex gap-3 justify-center mt-4">
          {isTestError && (
            <button
              onClick={() => window.location.reload()}
              className="text-indigo-600 underline text-sm"
            >
              Yenile
            </button>
          )}
          <Link to={createPageUrl("Explore")} className="text-indigo-600 inline-block text-sm">
            Testlere Dön
          </Link>
        </div>
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
          {user && isPurchased && hasCompletedTest && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Bu Testi Değerlendir</h2>
              <p className="text-slate-500 text-sm mb-4">
                {existingTestReview
                  ? "Mevcut puanınızı güncelleyebilirsiniz."
                  : "Bu testi tamamladınız. Deneyiminizi paylaşın!"}
              </p>
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
                disabled={testRating === 0 || !reviewTestId}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {existingTestReview ? "Puanı Güncelle" : "Puanı Gönder"}
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
                  // Önce paket detayından gelen question_count'u kullan (her testin gerçek sayısı);
                  // yoksa eski yedek — bu test'e ait toplam soru listesinden filtrele.
                  const testQuestionsCount =
                    testItem.question_count ??
                    questions.filter((q) => q.test_id === testItem.id).length;
                  const testResult = allTestResults.find(r => r.test_id === testItem.id);
                  const testProgress = allTestProgress.find(p => p.test_id === testItem.id);
                  
                  const isCompleted = !!testResult;
                  const isInProgress = !!testProgress;
                  
                  let buttonStyle = { backgroundColor: '#0000CD' };
                  if (isCompleted) buttonStyle = { backgroundColor: '#64748b' };
                  else if (isInProgress) buttonStyle = { backgroundColor: '#f59e0b' };
                  
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
                        {isCompleted ? (
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span className="text-xs">Gözden Geçir</span>
                          </div>
                        ) : isInProgress ? (
                          <div className="flex items-center gap-1">
                            <Play className="w-4 h-4" />
                            <span className="text-xs">Devam Et</span>
                          </div>
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            ) : (
              !purchasesEnabled ? (
                <div className="w-full rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-center">
                  <p className="text-sm font-semibold text-amber-800">🔧 Satın alma servisleri bakımdadır</p>
                  <p className="text-xs text-amber-600 mt-1">Lütfen daha sonra tekrar deneyin.</p>
                </div>
              ) : (
                <Button
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700"
                  onClick={handlePurchase}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Satın Al
                </Button>
              )
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
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        test={test}
      />
    </div>
  );
}