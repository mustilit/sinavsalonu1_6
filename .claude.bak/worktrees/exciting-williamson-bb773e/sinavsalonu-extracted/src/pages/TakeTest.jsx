import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Flag,
  AlertCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Grid3x3,
  Trash2,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ReportQuestionModal from "@/components/test/ReportQuestionModal";
import StarRating from "@/components/ui/StarRating";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function TakeTest() {
  const urlParams = new URLSearchParams(window.location.search);
  const testId = urlParams.get("id");
  const isReviewMode = urlParams.get("review") === "true";

  const [user, setUser] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(null);
  const [testStarted, setTestStarted] = useState(false);
  const [testFinished, setTestFinished] = useState(false);
  const [result, setResult] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [layoutPreference, setLayoutPreference] = useState("vertical");
  const [showAnswerSheet, setShowAnswerSheet] = useState(false);
  const [progressId, setProgressId] = useState(null);
  const [testRating, setTestRating] = useState(0);
  const [educatorRating, setEducatorRating] = useState(0);
  const [testComment, setTestComment] = useState("");
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

  const { data: test } = useQuery({
    queryKey: ["test", testId],
    queryFn: async () => {
      const tests = await base44.entities.Test.filter({ id: testId });
      return tests[0];
    },
    enabled: !!testId,
  });

  const { data: testPackage } = useQuery({
    queryKey: ["testPackage", test?.test_package_id],
    queryFn: async () => {
      const packages = await base44.entities.TestPackage.filter({ id: test.test_package_id });
      return packages[0];
    },
    enabled: !!test?.test_package_id,
  });

  const { data: purchase } = useQuery({
    queryKey: ["purchase", user?.email, test?.test_package_id],
    queryFn: () => base44.entities.Purchase.filter({ user_email: user.email, test_package_id: test.test_package_id }, "-created_date", 1),
    enabled: !!user && !!test?.test_package_id,
  });

  const { data: previousResult } = useQuery({
    queryKey: ["previousResult", testId, user?.email],
    queryFn: async () => {
      const results = await base44.entities.TestResult.filter({ 
        test_id: testId, 
        user_email: user.email 
      }, "-created_date", 1);
      return results[0];
    },
    enabled: !!testId && !!user && isReviewMode,
  });

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["questions", testId, purchase?.length, previousResult?.answers?.length],
    queryFn: async () => {
      // Always use snapshot if available (even if test is deleted by educator)
      if (purchase?.length > 0 && purchase[0].questions_snapshot?.length > 0) {
        const testQuestions = purchase[0].questions_snapshot.filter(q => q.test_id === testId);
        return testQuestions;
      }
      // Fallback to current questions only if no snapshot exists
      return base44.entities.Question.filter({ test_id: testId }, "order_index");
    },
    enabled: !!testId && !!user && (!isReviewMode || !!previousResult),
  });

  const { data: allResults = [] } = useQuery({
    queryKey: ["testAverages", testId],
    queryFn: () => base44.entities.TestResult.filter({ test_id: testId }),
    enabled: !!testId && testFinished,
  });

  const { data: existingTestReview } = useQuery({
    queryKey: ["testReview", test?.test_package_id, user?.email],
    queryFn: async () => {
      const reviews = await base44.entities.Review.filter({
        test_package_id: test.test_package_id,
        reviewer_email: user.email,
        review_type: "test",
      });
      return reviews[0] || null;
    },
    enabled: !!user?.email && !!test?.test_package_id && testFinished,
  });

  const { data: existingEducatorReview } = useQuery({
    queryKey: ["educatorReview", testPackage?.educator_email, user?.email],
    queryFn: async () => {
      const reviews = await base44.entities.Review.filter({
        educator_email: testPackage.educator_email,
        reviewer_email: user.email,
        review_type: "educator",
      });
      return reviews[0] || null;
    },
    enabled: !!user?.email && !!testPackage?.educator_email && testFinished,
  });

  // Load saved progress
  const { data: savedProgress } = useQuery({
    queryKey: ["testProgress", testId, user?.email],
    queryFn: async () => {
      const progress = await base44.entities.TestProgress.filter({ 
        user_email: user.email, 
        test_id: testId,
        is_completed: false
      }, "-created_date", 1);
      return progress[0];
    },
    enabled: !!testId && !!user && !isReviewMode,
  });

  // Load previous answers in review mode
  useEffect(() => {
    if (isReviewMode && previousResult?.answers && questions.length > 0) {
      const answersMap = {};
      previousResult.answers.forEach(a => {
        answersMap[a.question_id] = a.selected_answer;
      });
      setAnswers(answersMap);
      setTestStarted(true);
    }
  }, [isReviewMode, previousResult, questions.length]);

  // Load saved progress
  useEffect(() => {
    if (savedProgress && questions.length > 0 && !isReviewMode) {
      setProgressId(savedProgress.id);
      setAnswers(savedProgress.answers || {});
      setFlagged(new Set(savedProgress.flagged_questions || []));
      setCurrentIndex(savedProgress.current_question_index || 0);
      if (savedProgress.time_remaining_seconds !== null && savedProgress.time_remaining_seconds !== undefined) {
        setTimeLeft(savedProgress.time_remaining_seconds);
      }
      setTestStarted(true);
      setStartTime(new Date(savedProgress.started_at).getTime());
    }
  }, [savedProgress, questions.length, isReviewMode]);

  const reportQuestionMutation = useMutation({
   mutationFn: (data) => base44.entities.QuestionReport.create({
     ...data,
     question_id: questions[currentIndex]?.id,
     test_package_id: test?.test_package_id,
     test_package_title: testPackage?.title,
     reporter_email: user?.email,
     reporter_name: user?.full_name,
     educator_email: testPackage?.educator_email,
     question_snapshot: questions[currentIndex],
     status: "pending",
     deadline_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
   }),
   onSuccess: () => {
     toast.success("Hata bildirimi gönderildi");
     setShowReportModal(false);
   }
  });

  const handleSubmitTestReview = async () => {
    if (testRating === 0) return;
    try {
      await base44.entities.Review.create({
        reviewer_email: user.email,
        reviewer_name: user.full_name,
        review_type: "test",
        test_package_id: test.test_package_id,
        test_package_title: testPackage.title,
        educator_email: testPackage.educator_email,
        educator_name: testPackage.educator_name,
        rating: testRating,
        comment: testComment,
      });
      queryClient.invalidateQueries({ queryKey: ["testReview", test.test_package_id, user?.email] });
      toast.success("Test puanınız kaydedildi!");
    } catch (error) {
      toast.error("Bir hata oluştu!");
    }
  };

  const handleSubmitEducatorReview = async () => {
    if (educatorRating === 0) return;
    try {
      await base44.entities.Review.create({
        reviewer_email: user.email,
        reviewer_name: user.full_name,
        review_type: "educator",
        educator_email: testPackage.educator_email,
        educator_name: testPackage.educator_name,
        rating: educatorRating,
        comment: educatorComment,
      });
      queryClient.invalidateQueries({ queryKey: ["educatorReview", testPackage.educator_email, user?.email] });
      toast.success("Eğitici puanınız kaydedildi!");
    } catch (error) {
      toast.error("Bir hata oluştu!");
    }
  };

  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: async (resultData) => {
      return await base44.entities.TestResult.create(resultData);
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["previousResult", testId, user?.email] });
      queryClient.invalidateQueries({ queryKey: ["myResults", user?.email] });
      toast.success("Test tamamlandı!");
    },
    onError: () => {
      setTestFinished(false); // Reset if submission fails
      toast.error("Test kaydedilemedi, lütfen tekrar deneyin");
    },
  });

  const saveProgressMutation = useMutation({
    mutationFn: async (progressData) => {
      if (progressId) {
        return await base44.entities.TestProgress.update(progressId, progressData);
      } else {
        return await base44.entities.TestProgress.create(progressData);
      }
    },
    onSuccess: (data) => {
      if (!progressId) {
        setProgressId(data.id);
      }
    },
  });

  const handleFinish = useCallback(() => {
    if (testFinished || submitMutation.isPending) return;
    
    setTestFinished(true);
    
    const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    
    let correct = 0, wrong = 0, empty = 0;
    const answerDetails = questions.map((q) => {
      const selected = answers[q.id];
      const isCorrect = selected === q.correct_answer;
      if (!selected) empty++;
      else if (isCorrect) correct++;
      else wrong++;
      return { question_id: q.id, selected_answer: selected || "", is_correct: isCorrect };
    });

    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

    submitMutation.mutate({
      user_email: user.email,
      test_id: testId,
      test_title: test?.title,
      test_package_id: test?.test_package_id,
      test_package_title: testPackage?.title,
      answers: answerDetails,
      correct_count: correct,
      wrong_count: wrong,
      empty_count: empty,
      score,
      time_spent_seconds: timeSpent,
      completed_at: new Date().toISOString(),
    });

    if (progressId) {
      base44.entities.TestProgress.update(progressId, { is_completed: true });
    }
  }, [answers, questions, user, testId, test, testPackage, startTime, progressId, testFinished, submitMutation]);

  // Timer for countdown
  useEffect(() => {
    if (!testStarted || testFinished || isReviewMode) return;
    if (!test?.duration_minutes || !test?.is_timed) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [testStarted, testFinished, test, isReviewMode, handleFinish]);

  const startTest = () => {
    setTestStarted(true);
    const now = Date.now();
    setStartTime(now);
    if (test?.duration_minutes && test?.is_timed) {
      setTimeLeft(test.duration_minutes * 60);
    }

    // Create initial progress
    saveProgressMutation.mutate({
      user_email: user.email,
      test_id: testId,
      test_title: test?.title,
      test_package_id: test?.test_package_id,
      test_package_title: testPackage?.title,
      answers: {},
      flagged_questions: [],
      current_question_index: 0,
      time_remaining_seconds: (test?.duration_minutes && test?.is_timed) ? test.duration_minutes * 60 : null,
      elapsed_time_seconds: 0,
      started_at: new Date(now).toISOString(),
      last_activity: new Date(now).toISOString(),
      is_completed: false,
    });
  };

  const saveAndExit = () => {
    const elapsedSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    
    saveProgressMutation.mutate({
      user_email: user.email,
      test_id: testId,
      test_title: test?.title,
      test_package_id: test?.test_package_id,
      test_package_title: testPackage?.title,
      answers: answers,
      flagged_questions: Array.from(flagged),
      current_question_index: currentIndex,
      time_remaining_seconds: timeLeft,
      elapsed_time_seconds: elapsedSeconds,
      started_at: new Date(startTime).toISOString(),
      last_activity: new Date().toISOString(),
      is_completed: false,
    });
    
    toast.success("İlerlemeniz kaydedildi");
    setTimeout(() => {
      window.location.href = createPageUrl("MyTests");
    }, 1000);
  };

  const handleAnswer = (answer) => {
    if (isReviewMode) return; // Cannot change answers in review mode
    setAnswers((prev) => ({ ...prev, [questions[currentIndex].id]: answer }));
  };

  const clearAnswer = () => {
    if (isReviewMode) return; // Cannot change answers in review mode
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[questions[currentIndex].id];
      return next;
    });
  };

  const toggleFlag = () => {
    const qId = questions[currentIndex].id;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isReviewMode && !previousResult) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Sonuç Bulunamadı</h1>
          <p className="text-slate-500 mb-6">Bu test için henüz tamamlanmış bir sonuç bulunamadı.</p>
          <Link to={createPageUrl("MyTests")}>
            <Button className="bg-indigo-600 hover:bg-indigo-700">Testlerime Dön</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (testFinished && result && !isReviewMode) {
    const avgScore = allResults.length > 0 
      ? Math.round(allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length)
      : 0;

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className={cn(
            "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6",
            result.score >= 70 ? "bg-emerald-100" : result.score >= 50 ? "bg-amber-100" : "bg-rose-100"
          )}>
            {result.score >= 70 ? (
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            ) : (
              <AlertCircle className="w-10 h-10 text-amber-600" />
            )}
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Test Tamamlandı!</h1>
          <p className="text-slate-500 mb-2">{test?.title}</p>
          <p className="text-sm text-slate-400 mb-8">{testPackage?.title}</p>

          <div className="text-6xl font-bold text-slate-900 mb-2">{result.score}</div>
          <p className="text-slate-500 mb-2">100 üzerinden</p>
          
          {allResults.length > 1 && (
            <p className="text-sm text-slate-500 mb-8">
              Diğer adayların ortalaması: <span className="font-semibold">{avgScore}</span>
            </p>
          )}

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-emerald-600">{result.correct_count}</p>
              <p className="text-sm text-emerald-700">Doğru</p>
            </div>
            <div className="bg-rose-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-rose-600">{result.wrong_count}</p>
              <p className="text-sm text-rose-700">Yanlış</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-slate-600">{result.empty_count}</p>
              <p className="text-sm text-slate-700">Boş</p>
            </div>
          </div>

          {/* Test Rating */}
          {!existingTestReview && (
            <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-2">Bu testi değerlendir</h3>
              <p className="text-sm text-slate-600 mb-4">{testPackage?.title}</p>
              <div className="flex items-center gap-4 mb-3">
                <StarRating value={testRating} onChange={setTestRating} size="lg" />
                {testRating > 0 && (
                  <span className="text-sm text-slate-600">{testRating}/5</span>
                )}
              </div>
              <Textarea
                placeholder="Yorumunuz (opsiyonel)"
                value={testComment}
                onChange={(e) => setTestComment(e.target.value)}
                className="mb-3"
                rows={2}
              />
              <Button
                onClick={handleSubmitTestReview}
                disabled={testRating === 0}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700"
              >
                Testi Puanla
              </Button>
            </div>
          )}

          {/* Educator Rating */}
          {!existingEducatorReview && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-2">Eğiticiyi değerlendir</h3>
              <p className="text-sm text-slate-600 mb-4">{testPackage?.educator_name}</p>
              <div className="flex items-center gap-4 mb-3">
                <StarRating value={educatorRating} onChange={setEducatorRating} size="lg" />
                {educatorRating > 0 && (
                  <span className="text-sm text-slate-600">{educatorRating}/5</span>
                )}
              </div>
              <Textarea
                placeholder="Yorumunuz (opsiyonel)"
                value={educatorComment}
                onChange={(e) => setEducatorComment(e.target.value)}
                className="mb-3"
                rows={2}
              />
              <Button
                onClick={handleSubmitEducatorReview}
                disabled={educatorRating === 0}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Eğiticiyi Puanla
              </Button>
            </div>
          )}

          <div className="mt-6 flex gap-3 justify-center flex-wrap">
            <Button 
              variant="outline"
              onClick={() => {
                window.location.href = createPageUrl("TakeTest") + `?id=${testId}&review=true`;
              }}
            >
              Gözden Geçir
            </Button>
            <Link to={createPageUrl("MyTests")}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">Testlerime Dön</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!testStarted && !isReviewMode) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{test?.title}</h1>
          <p className="text-slate-500 mb-2">{testPackage?.title}</p>
          <p className="text-slate-500 mb-8">Teste başlamaya hazır mısın?</p>

          <div className="grid grid-cols-2 gap-4 mb-8 max-w-sm mx-auto">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-slate-900">{questions.length}</p>
              <p className="text-sm text-slate-500">Soru</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-slate-900">
                {test?.is_timed && test?.duration_minutes ? test.duration_minutes : "∞"}
              </p>
              <p className="text-sm text-slate-500">Dakika</p>
            </div>
          </div>

          <Button 
            size="lg" 
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={startTest}
          >
            Teste Başla
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          {isReviewMode && (
            <Badge className="bg-indigo-100 text-indigo-700">
              Gözden Geçirme Modu
            </Badge>
          )}
          <Badge variant="outline" className="text-sm">
            {currentIndex + 1} / {questions.length}
          </Badge>
          <Progress value={progress} className="w-32 h-2" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAnswerSheet(true)}
            className="text-indigo-600"
          >
            <Grid3x3 className="w-4 h-4 mr-2" />
            Cevaplarım
          </Button>

          {/* Timer next to Cevaplarım button */}
          {!isReviewMode && testStarted && (
            test?.is_timed && timeLeft !== null ? (
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
                timeLeft < 60 ? "bg-rose-100 text-rose-700 animate-pulse" : 
                timeLeft < test?.duration_minutes * 60 * 0.1 ? "bg-amber-100 text-amber-700" : 
                "bg-emerald-100 text-emerald-700"
              )}>
                <Clock className="w-4 h-4" />
                <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
              </div>
            ) : startTime && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <Clock className="w-4 h-4" />
                <span className="font-mono font-semibold">
                  {formatTime(Math.floor((Date.now() - startTime) / 1000))}
                </span>
              </div>
            )
          )}
          
          {isReviewMode && previousResult?.time_spent_seconds && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <Clock className="w-4 h-4" />
              <span className="font-mono font-semibold text-sm">Süre: {formatTime(previousResult.time_spent_seconds)}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {isReviewMode ? (
            <Link to={createPageUrl("MyTests")}>
              <Button variant="outline">
                Testlerime Dön
              </Button>
            </Link>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={saveAndExit}
              >
                Kaydet ve Çık
              </Button>
              <Button 
                variant="outline" 
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={handleFinish}
              >
                Testi Bitir
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Soru {currentIndex + 1}</h2>
          <div className="flex gap-2">
            {!isReviewMode && answers[currentQuestion?.id] && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAnswer}
                className="text-rose-500"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Boş Bırak
              </Button>
            )}
            {testPackage?.has_solutions && currentQuestion?.explanation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSolution(!showSolution)}
                className="text-indigo-600"
              >
                <Lightbulb className="w-4 h-4 mr-1" />
                Çözüm
              </Button>
            )}
            {!isReviewMode && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReportModal(true)}
                  className="text-rose-500"
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Hata Bildir
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFlag}
                  className={cn(
                    flagged.has(currentQuestion?.id) ? "text-amber-600" : "text-slate-400"
                  )}
                >
                  <Flag className="w-4 h-4 mr-1" />
                  {flagged.has(currentQuestion?.id) ? "İşaretli" : "İşaretle"}
                </Button>
              </>
            )}
          </div>
        </div>

        <p className="text-slate-700 text-lg mb-8 leading-relaxed">
          {currentQuestion?.question_text}
        </p>

        {currentQuestion?.question_image && (
          <img 
            src={currentQuestion.question_image} 
            alt="Soru görseli" 
            className="max-w-full h-auto rounded-xl mb-8"
          />
        )}

        {showSolution && currentQuestion?.explanation && (
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl mb-6">
            <p className="text-sm font-medium text-indigo-700 mb-1">Çözüm:</p>
            <p className="text-indigo-900">{currentQuestion.explanation}</p>
          </div>
        )}

        <div className="space-y-3">
          {["A", "B", "C", "D", "E"].map((opt) => {
            const optionText = currentQuestion?.[`option_${opt.toLowerCase()}`];
            const optionImage = currentQuestion?.[`option_${opt.toLowerCase()}_image`];
            if (!optionText && !optionImage) return null;
            
            const isSelected = answers[currentQuestion?.id] === opt;
            const isCorrect = currentQuestion?.correct_answer === opt;
            
            return (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={isReviewMode}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4",
                  isReviewMode && "cursor-default",
                  isReviewMode && isCorrect && "border-emerald-600 bg-emerald-50",
                  isReviewMode && isSelected && !isCorrect && "border-rose-600 bg-rose-50",
                  !isReviewMode && isSelected && "border-indigo-600 bg-indigo-50",
                  !isReviewMode && !isSelected && "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                  isReviewMode && !isCorrect && !isSelected && "border-slate-200"
                )}
              >
                <span className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm flex-shrink-0",
                  isReviewMode && isCorrect && "bg-emerald-600 text-white",
                  isReviewMode && isSelected && !isCorrect && "bg-rose-600 text-white",
                  !isReviewMode && isSelected && "bg-indigo-600 text-white",
                  (!isReviewMode && !isSelected) || (isReviewMode && !isCorrect && !isSelected) && "bg-slate-100 text-slate-600"
                )}>
                  {opt}
                </span>
                
                <div className="flex-1 flex flex-col gap-2">
                  {optionText && (
                    <span className="text-slate-700">{optionText}</span>
                  )}
                  {optionImage && (
                    <img 
                      src={optionImage} 
                      alt={`${opt} şıkkı görseli`}
                      className="max-w-xs w-full h-auto rounded border border-slate-200"
                      style={{ maxHeight: '150px', objectFit: 'contain' }}
                    />
                  )}
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isReviewMode && isCorrect && (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  )}
                  {isReviewMode && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <ReportQuestionModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={(data) => reportQuestionMutation.mutate(data)}
        questionNumber={currentIndex + 1}
      />

      <Dialog open={showAnswerSheet} onOpenChange={setShowAnswerSheet}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cevaplarım</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            {questions.map((q, idx) => {
              const userAnswer = answers[q.id];
              const isCorrect = isReviewMode && userAnswer === q.correct_answer;
              const isWrong = isReviewMode && userAnswer && userAnswer !== q.correct_answer;
              const isEmpty = !userAnswer;
              
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setShowAnswerSheet(false);
                  }}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-4",
                    idx === currentIndex && "ring-2 ring-indigo-600 ring-offset-2",
                    isReviewMode && isCorrect && "bg-emerald-50 border-emerald-200",
                    isReviewMode && isWrong && "bg-rose-50 border-rose-200",
                    isEmpty && "bg-slate-50 border-slate-200",
                    !isReviewMode && userAnswer && "bg-indigo-50 border-indigo-200",
                    !isReviewMode && !userAnswer && "bg-white border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center font-semibold",
                    isReviewMode && isCorrect && "bg-emerald-600 text-white",
                    isReviewMode && isWrong && "bg-rose-600 text-white",
                    isEmpty && "bg-slate-200 text-slate-600",
                    !isReviewMode && userAnswer && "bg-indigo-600 text-white",
                    !isReviewMode && !userAnswer && "bg-slate-100 text-slate-600"
                  )}>
                    {idx + 1}
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 line-clamp-1">
                      {q.question_text}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">
                        Cevabınız: <span className="font-semibold">{userAnswer || "Boş"}</span>
                      </span>
                      {isReviewMode && userAnswer && (
                        <span className="text-xs text-slate-500">
                          • Doğru: <span className="font-semibold">{q.correct_answer}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isReviewMode && isCorrect && (
                      <Badge className="bg-emerald-100 text-emerald-700">Doğru</Badge>
                    )}
                    {isReviewMode && isWrong && (
                      <Badge className="bg-rose-100 text-rose-700">Yanlış</Badge>
                    )}
                    {isEmpty && (
                      <Badge variant="outline" className="text-slate-500">Boş</Badge>
                    )}
                    {flagged.has(q.id) && (
                      <Flag className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {isReviewMode && (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Doğru: {questions.filter((q, idx) => answers[q.id] === q.correct_answer).length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Yanlış: {questions.filter((q, idx) => answers[q.id] && answers[q.id] !== q.correct_answer).length}</span>
                  </div>
                </>
              )}
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-500" />
                <span>Boş: {questions.filter(q => !answers[q.id]).length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-indigo-600"></div>
                <span>Cevaplanan: {Object.keys(answers).length}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Önceki
        </Button>

        {/* Question dots */}
        <div className="hidden md:flex gap-1 flex-wrap justify-center max-w-md">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "w-8 h-8 rounded-lg text-xs font-medium transition-all",
                idx === currentIndex && "ring-2 ring-indigo-600 ring-offset-2",
                answers[q.id] 
                  ? "bg-indigo-600 text-white" 
                  : flagged.has(q.id)
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600"
              )}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <Button
          onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
          disabled={currentIndex === questions.length - 1}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          Sonraki
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}