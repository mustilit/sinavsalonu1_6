import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import api from "@/api/dalClient";
import { useAuth } from "@/lib/AuthContext";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ReportQuestionModal from "@/components/test/ReportQuestionModal";
import StarRating from "@/components/ui/StarRating";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildPageUrl, useAppNavigate, useLoginRedirect } from "@/lib/navigation";

// Map Dal question/options to Sınav Salonu format
function toUIStyle(questions, stateQuestions) {
  const stateMap = new Map((stateQuestions || []).map((q) => [q.id, q]));
  const letters = ["A", "B", "C", "D", "E"];
  return (questions || []).map((q) => {
    const state = stateMap.get(q.id);
    const options = (q.options || []).map((o) => ({
      ...o,
      isCorrect: o.isCorrect ?? o.is_correct,
    }));
    const correctOpt = options.find((o) => o.isCorrect);
    const correctLetter = correctOpt ? letters[options.indexOf(correctOpt)] : "A";
    const optMap = {};
    letters.forEach((l, i) => {
      if (options[i]) {
        optMap[`option_${l.toLowerCase()}`] = options[i].content;
      }
    });
    const selectedOptionId = state?.selectedOptionId;
    const selectedLetter = selectedOptionId
      ? letters[options.findIndex((o) => o.id === selectedOptionId)]
      : null;
    return {
      id: q.id,
      test_id: q.testId,
      question_text: q.content,
      correct_answer: correctLetter,
      ...optMap,
      options,
      selectedOptionId,
      selected_answer: selectedLetter,
      explanation: q.solutionText || null,
    };
  });
}

export default function TakeTest() {
  const urlParams = new URLSearchParams(window.location.search);
  const testId = urlParams.get("id");
  const attemptIdParam = urlParams.get("attemptId");
  const isReviewMode = urlParams.get("review") === "true";

  const { user } = useAuth();
  const navigate = useAppNavigate();
  const loginUrl = useLoginRedirect();
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
  const [showAnswerSheet, setShowAnswerSheet] = useState(false);
  const [activeAttemptId, setActiveAttemptId] = useState(attemptIdParam);
  const [testRating, setTestRating] = useState(0);
  const [educatorRating, setEducatorRating] = useState(0);
  const [testComment, setTestComment] = useState("");
  const [educatorComment, setEducatorComment] = useState("");

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases", user?.id, testId],
    queryFn: () => base44.entities.Purchase.filter({ test_package_id: testId }),
    enabled: !!user && !!testId,
  });

  const purchase = purchases[0];
  const attemptFromPurchase = purchase?.attempt;
  const resolvedAttemptId = activeAttemptId || attemptFromPurchase?.id;

  useEffect(() => {
    if (attemptFromPurchase?.id && !activeAttemptId) {
      setActiveAttemptId(attemptFromPurchase.id);
    }
  }, [attemptFromPurchase?.id, activeAttemptId]);

  const { data: attemptState } = useQuery({
    queryKey: ["attemptState", resolvedAttemptId],
    queryFn: () => base44.entities.Attempt.getState(resolvedAttemptId),
    enabled: !!resolvedAttemptId && !!user,
  });

  const { data: testDetail } = useQuery({
    queryKey: ["testDetail", testId],
    queryFn: async () => {
      const { data } = await api.get(`/tests/${testId}`);
      return data;
    },
    enabled: !!testId && !!attemptState,
  });

  const questions = attemptState && testDetail
    ? toUIStyle(testDetail.questions || [], attemptState.questions)
    : [];
  const isLoading = !!resolvedAttemptId && !!user && !attemptState;

  const test = testDetail
    ? {
        id: testDetail.id,
        title: testDetail.title,
        is_timed: testDetail.isTimed,
        duration_minutes: testDetail.duration,
        has_solutions: testDetail.hasSolutions,
      }
    : null;

  const testPackage = testDetail
    ? {
        id: testDetail.id,
        title: testDetail.title,
        educator_email: testDetail.educatorId,
        educator_name: testDetail.educator?.username || "",
      }
    : null;

  const previousResult = attemptState?.attempt?.status === "SUBMITTED" || attemptState?.attempt?.status === "TIMEOUT"
    ? attemptState
    : null;

  const { data: resultData } = useQuery({
    queryKey: ["attemptResult", resolvedAttemptId],
    queryFn: () => base44.entities.Attempt.getResult(resolvedAttemptId),
    enabled: !!resolvedAttemptId && !!user && testFinished,
  });

  const { data: allResults = [] } = useQuery({
    queryKey: ["testAverages", testId],
    queryFn: () => base44.entities.TestResult.filter({ user_email: user?.email, test_package_id: testId }),
    enabled: !!testId && !!user && testFinished,
  });

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
    enabled: !!user?.email && !!testId && testFinished,
  });

  const { data: existingEducatorReview } = useQuery({
    queryKey: ["educatorReview", testPackage?.educator_email, user?.email],
    queryFn: async () => {
      const reviews = await base44.entities.Review.filter({
        educator_email: testPackage?.educator_email,
        reviewer_email: user.email,
        review_type: "educator",
      });
      return reviews[0] || null;
    },
    enabled: !!user?.email && !!testPackage?.educator_email && testFinished,
  });

  useEffect(() => {
    if (isReviewMode && previousResult && questions.length > 0) {
      const answersMap = {};
      questions.forEach((q) => {
        if (q.selected_answer) answersMap[q.id] = q.selected_answer;
      });
      setAnswers(answersMap);
      setTestStarted(true);
    }
  }, [isReviewMode, previousResult, questions.length]);

  useEffect(() => {
    if (attemptState && questions.length > 0 && !isReviewMode && attemptState.attempt?.status === "IN_PROGRESS") {
      const answersMap = {};
      questions.forEach((q) => {
        if (q.selected_answer) answersMap[q.id] = q.selected_answer;
      });
      setAnswers(answersMap);
      if (typeof attemptState.attempt?.remainingSeconds === "number") {
        setTimeLeft(attemptState.attempt.remainingSeconds);
      }
      setTestStarted(true);
      const started = attemptState.attempt?.startedAt ? new Date(attemptState.attempt.startedAt).getTime() : Date.now();
      setStartTime(started);
    }
  }, [attemptState, questions, isReviewMode]);

  const reportQuestionMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.Objection.create({
        attempt_id: resolvedAttemptId,
        question_id: questions[currentIndex]?.id,
        reason: (data.reason || data.description || '').trim() || `Hata türü: ${data.report_type || 'diğer'}`,
      }),
    onSuccess: () => {
      toast.success("Hata bildirimi gönderildi");
      setShowReportModal(false);
    },
  });

  const handleSubmitTestReview = async () => {
    if (testRating === 0) return;
    try {
      await base44.entities.Review.create({
        reviewer_email: user.email,
        reviewer_name: user.username || user.full_name,
        review_type: "test",
        test_package_id: testId,
        test_package_title: testPackage?.title,
        educator_email: testPackage?.educator_email,
        educator_name: testPackage?.educator_name,
        rating: testRating,
        comment: testComment,
      });
      queryClient.invalidateQueries({ queryKey: ["testReview", testId, user?.id] });
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
        reviewer_name: user.username || user.full_name,
        review_type: "educator",
        educator_email: testPackage?.educator_email,
        educator_name: testPackage?.educator_name,
        rating: educatorRating,
        comment: educatorComment,
      });
      queryClient.invalidateQueries({ queryKey: ["educatorReview", testPackage?.educator_email, user?.email] });
      toast.success("Eğitici puanınız kaydedildi!");
    } catch (error) {
      toast.error("Bir hata oluştu!");
    }
  };

  const queryClient = useQueryClient();

  const finishMutation = useMutation({
    mutationFn: () => base44.entities.Attempt.finish(resolvedAttemptId),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["attemptState", resolvedAttemptId] });
      queryClient.invalidateQueries({ queryKey: ["myResults", user?.email] });
      queryClient.invalidateQueries({ queryKey: ["purchases", user?.id, testId] });
      toast.success("Test tamamlandı!");
    },
    onError: () => {
      setTestFinished(false);
      toast.error("Test kaydedilemedi, lütfen tekrar deneyin");
    },
  });

  const handleFinish = useCallback(() => {
    if (testFinished || finishMutation.isPending) return;
    setTestFinished(true);
    finishMutation.mutate();
  }, [testFinished, finishMutation]);

  useEffect(() => {
    if (!testStarted || testFinished || isReviewMode) return;
    if (!test?.is_timed || !test?.duration_minutes) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          base44.entities.Attempt.timeout(resolvedAttemptId).then(() => {
            setTestFinished(true);
            queryClient.invalidateQueries({ queryKey: ["attemptState", resolvedAttemptId] });
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [testStarted, testFinished, test, isReviewMode, resolvedAttemptId]);

  const answerMutation = useMutation({
    mutationFn: ({ questionId, optionId }) =>
      base44.entities.Attempt.submitAnswer(resolvedAttemptId, questionId, optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attemptState", resolvedAttemptId] });
    },
  });

  const startTest = () => {
    setTestStarted(true);
    const now = Date.now();
    setStartTime(now);
    if (test?.duration_minutes && test?.is_timed) {
      setTimeLeft(test.duration_minutes * 60);
    }
  };

  const saveAndExit = () => {
    toast.success("İlerlemeniz kaydedildi");
    setTimeout(() => {
      navigate(createPageUrl("MyTests"), { replace: true });
    }, 1000);
  };

  const handleAnswer = (optionId) => {
    if (isReviewMode) return;
    const q = questions[currentIndex];
    if (!q) return;
    const letter = q.options?.find((o) => o.id === optionId)
      ? ["A", "B", "C", "D", "E"][q.options.findIndex((o) => o.id === optionId)]
      : null;
    setAnswers((prev) => ({ ...prev, [q.id]: letter }));
    answerMutation.mutate({ questionId: q.id, optionId });
  };

  const clearAnswer = () => {
    if (isReviewMode) return;
    const q = questions[currentIndex];
    if (!q) return;
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[q.id];
      return next;
    });
    answerMutation.mutate({ questionId: q.id, optionId: undefined });
  };

  const toggleFlag = () => {
    const qId = questions[currentIndex]?.id;
    if (!qId) return;
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

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-slate-600 mb-4">Teste başlamak için giriş yapın</p>
        <Link to={loginUrl()}>
          <Button className="bg-indigo-600 hover:bg-indigo-700">Giriş Yap</Button>
        </Link>
      </div>
    );
  }

  if (testId && !purchase) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-slate-600 mb-4">Bu testi henüz satın almadınız</p>
        <Link to={createPageUrl("TestDetail") + `?id=${testId}`}>
          <Button className="bg-indigo-600 hover:bg-indigo-700">Teste Git</Button>
        </Link>
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayResult = resultData || result;
  const score = displayResult?.summary?.percentage ?? displayResult?.attempt?.score ?? 0;
  const correctCount = displayResult?.summary?.correct ?? 0;
  const wrongCount = displayResult?.summary?.wrong ?? 0;
  const blankCount = displayResult?.summary?.blank ?? 0;

  if (testFinished && displayResult && !isReviewMode) {
    const avgScore =
      allResults.length > 0
        ? Math.round(allResults.reduce((sum, r) => sum + (r.score || 0), 0) / allResults.length)
        : 0;

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div
            className={cn(
              "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6",
              score >= 70 ? "bg-emerald-100" : score >= 50 ? "bg-amber-100" : "bg-rose-100"
            )}
          >
            {score >= 70 ? (
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            ) : (
              <AlertCircle className="w-10 h-10 text-amber-600" />
            )}
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">Test Tamamlandı!</h1>
          <p className="text-slate-500 mb-2">{test?.title}</p>
          <p className="text-sm text-slate-400 mb-8">{testPackage?.title}</p>

          <div className="text-6xl font-bold text-slate-900 mb-2">{score}</div>
          <p className="text-slate-500 mb-2">100 üzerinden</p>

          {allResults.length > 1 && (
            <p className="text-sm text-slate-500 mb-8">
              Diğer adayların ortalaması: <span className="font-semibold">{avgScore}</span>
            </p>
          )}

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-emerald-600">{correctCount}</p>
              <p className="text-sm text-emerald-700">Doğru</p>
            </div>
            <div className="bg-rose-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-rose-600">{wrongCount}</p>
              <p className="text-sm text-rose-700">Yanlış</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-slate-600">{blankCount}</p>
              <p className="text-sm text-slate-700">Boş</p>
            </div>
          </div>

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
                navigate(buildPageUrl("TakeTest", { id: testId, review: true }), { replace: true });
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

          <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700" onClick={startTest}>
            Teste Başla
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const letters = ["A", "B", "C", "D", "E"];
  const optionsForCurrent = currentQuestion?.options || [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          {isReviewMode && (
            <Badge className="bg-indigo-100 text-indigo-700">Gözden Geçirme Modu</Badge>
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

          {!isReviewMode && testStarted && (
            test?.is_timed && timeLeft !== null ? (
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
                  timeLeft < 60
                    ? "bg-rose-100 text-rose-700 animate-pulse"
                    : timeLeft < (test?.duration_minutes || 60) * 60 * 0.1
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                )}
              >
                <Clock className="w-4 h-4" />
                <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
              </div>
            ) : (
              startTime && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono font-semibold">
                    {formatTime(Math.floor((Date.now() - startTime) / 1000))}
                  </span>
                </div>
              )
            )
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {isReviewMode ? (
            <Link to={createPageUrl("MyTests")}>
              <Button variant="outline">Testlerime Dön</Button>
            </Link>
          ) : (
            <>
              <Button variant="outline" onClick={saveAndExit}>
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

      <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Soru {currentIndex + 1}</h2>
          <div className="flex gap-2">
            {!isReviewMode && answers[currentQuestion?.id] && (
              <Button variant="ghost" size="sm" onClick={clearAnswer} className="text-rose-500">
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
                  className={cn(flagged.has(currentQuestion?.id) ? "text-amber-600" : "text-slate-400")}
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

        {showSolution && currentQuestion?.explanation && (
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl mb-6">
            <p className="text-sm font-medium text-indigo-700 mb-1">Çözüm:</p>
            <p className="text-indigo-900">{currentQuestion.explanation}</p>
          </div>
        )}

        <div className="space-y-3">
          {optionsForCurrent.map((opt, idx) => {
            const letter = letters[idx];
            const optId = opt.id;
            const isSelected = answers[currentQuestion?.id] === letter;
            const isCorrect = currentQuestion?.correct_answer === letter;

            return (
              <button
                key={opt.id}
                onClick={() => handleAnswer(optId)}
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
                <span
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm flex-shrink-0",
                    isReviewMode && isCorrect && "bg-emerald-600 text-white",
                    isReviewMode && isSelected && !isCorrect && "bg-rose-600 text-white",
                    !isReviewMode && isSelected && "bg-indigo-600 text-white",
                    ((!isReviewMode && !isSelected) || (isReviewMode && !isCorrect && !isSelected)) &&
                      "bg-slate-100 text-slate-600"
                  )}
                >
                  {letter}
                </span>
                <span className="text-slate-700 flex-1">{opt.content}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isReviewMode && isCorrect && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                  {isReviewMode && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-600" />}
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
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center font-semibold",
                      isReviewMode && isCorrect && "bg-emerald-600 text-white",
                      isReviewMode && isWrong && "bg-rose-600 text-white",
                      isEmpty && "bg-slate-200 text-slate-600",
                      !isReviewMode && userAnswer && "bg-indigo-600 text-white",
                      !isReviewMode && !userAnswer && "bg-slate-100 text-slate-600"
                    )}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 line-clamp-1">{q.question_text}</p>
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
                      <Badge variant="outline" className="text-slate-500">
                        Boş
                      </Badge>
                    )}
                    {flagged.has(q.id) && <Flag className="w-4 h-4 text-amber-500" />}
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Önceki
        </Button>

        <div className="hidden md:flex gap-1 flex-wrap justify-center max-w-md">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "w-8 h-8 rounded-lg text-xs font-medium transition-all",
                idx === currentIndex && "ring-2 ring-indigo-600 ring-offset-2",
                answers[q.id] ? "bg-indigo-600 text-white" : flagged.has(q.id) ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
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
