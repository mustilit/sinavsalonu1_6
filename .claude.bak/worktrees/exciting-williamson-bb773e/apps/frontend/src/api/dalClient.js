/**
 * Dal backend API client - replaces base44 SDK
 * Maps our backend endpoints to the format expected by Sınav Salonu UI
 * Tüm istekler @/lib/api/apiClient üzerinden geçer (tek nokta, 401 yönetimi)
 */
import api from '@/lib/api/apiClient';

// --- Auth ---
export const auth = {
  async login(email, password) {
    const body = {
      email: typeof email === 'string' ? email.trim().toLowerCase() : email,
      password: typeof password === 'string' ? password : String(password),
    };
    const { data } = await api.post('/auth/login', body);
    if (!data || (!data.user && !data.token)) {
      throw new Error('Beklenmeyen sunucu yanıtı');
    }
    return data;
  },
  async register(email, username, password) {
    const { data } = await api.post('/auth/register', { email, username, password });
    return data;
  },
  async registerEducator(email, username, password) {
    const { data } = await api.post('/auth/register/educator', { email, username, password });
    return data;
  },
  async me() {
    const { data } = await api.get('/auth/me');
    const user = data?.user ?? data;
    if (!user) return null;
    try {
      const { data: prefs } = await api.get('/me/preferences');
      const merged = { ...user, ...(prefs && typeof prefs === 'object' ? prefs : {}) };
      merged.full_name = merged.full_name ?? merged.username;
      return merged;
    } catch {
      return { ...user, full_name: user.full_name ?? user.username };
    }
  },
  async updateMe(body) {
    const { data } = await api.patch('/me/preferences', body);
    return data?.preferences ?? data ?? {};
  },
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('dal_auth');
    localStorage.removeItem('base44_access_token');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('dal_auth');
  },
  redirectToLogin(returnUrl) {
    window.location.href = '/Login' + (returnUrl ? `?from=${encodeURIComponent(returnUrl)}` : '');
  },
  isAuthenticated() {
    return !!(
      sessionStorage.getItem('token') || sessionStorage.getItem('dal_auth') ||
      localStorage.getItem('token') || localStorage.getItem('dal_auth')
    );
  },
};

// --- Entities (mapped to Dal backend) ---

// ExamType: GET /site/exam-types (public) or /admin/exam-types
const examTypeAdapter = (e) => ({
  id: e.id,
  name: e.name,
  slug: e.slug,
  is_active: e.active !== false,
});

function roleToUserType(role) {
  const r = (role || '').toString().toUpperCase();
  if (r === 'EDUCATOR') return 'educator';
  if (r === 'ADMIN') return 'admin';
  return 'candidate';
}

function educatorStatusFromUser(u) {
  const role = (u?.role || '').toString().toUpperCase();
  if (role !== 'EDUCATOR') return null;
  const meta = (u?.metadata && typeof u.metadata === 'object') ? u.metadata : {};
  if (meta?.educator_status) return String(meta.educator_status);
  return u?.educatorApprovedAt ? 'approved' : 'pending';
}

function userAdapter(u) {
  return {
    id: u.id,
    email: u.email,
    full_name: u.username,
    username: u.username,
    role: u.role,
    user_type: roleToUserType(u.role),
    educator_status: educatorStatusFromUser(u),
    rejection_reason: u?.metadata?.rejection_reason ?? null,
    created_date: u.createdAt,
    createdAt: u.createdAt,
    metadata: u.metadata ?? {},
  };
}

export const entities = {
  User: {
    list: async (sort = '-created_date', limit = 200) => {
      const sortParam = sort === 'created_date' ? 'createdAt' : '-createdAt';
      const { data } = await api.get('/admin/users', { params: { sort: sortParam, limit } });
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      return list.map(userAdapter);
    },
    update: async (id, body) => {
      const { data } = await api.patch(`/admin/users/${id}`, body);
      return userAdapter(data);
    },
    filter: async () => {
      // Not supported; prefer list
      return [];
    },
  },

  EducatorProfile: {
    filter: async () => {
      // Profile is stored on User.metadata in this backend; no separate collection
      return [];
    },
    create: async (body) => {
      // Save into educator metadata
      const metadata = {
        bio: body.bio,
        education: body.education,
        website: body.website,
        linkedin: body.linkedin,
        specialized_exam_types: body.specialized_exam_types,
        profile_image_url: body.profile_image_url,
        cv_url: body.cv_url,
      };
      await api.patch('/educators/me', { metadata });
      return { id: 'me', ...body };
    },
    update: async (_id, body) => {
      const metadata = {
        bio: body.bio,
        education: body.education,
        website: body.website,
        linkedin: body.linkedin,
        specialized_exam_types: body.specialized_exam_types,
        profile_image_url: body.profile_image_url,
        cv_url: body.cv_url,
      };
      await api.patch('/educators/me', { metadata });
      return { id: _id, ...body };
    },
    delete: async () => {},
    list: async () => [],
  },

  ExamType: {
    filter: async (opts = {}) => {
      try {
        const res = await api.get('/site/exam-types');
        const data = res?.data ?? res;
        let list = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
        const mapped = list.map(examTypeAdapter);
        if (opts.is_active === true) return mapped.filter((e) => e.is_active);
        return mapped;
      } catch (err) {
        console.warn('[dalClient] ExamType.filter failed:', err?.message || err);
        return [];
      }
    },
    list: async (sort, limit) => {
      const { data } = await api.get('/admin/exam-types');
      let list = Array.isArray(data) ? data : data?.items ?? [];
      return list.map(examTypeAdapter);
    },
    create: async (body) => {
      const { data } = await api.post('/admin/exam-types', body);
      return examTypeAdapter(data);
    },
    update: async (id, body) => {
      const { data } = await api.patch(`/admin/exam-types/${id}`, body);
      return examTypeAdapter(data);
    },
    delete: async (id) => {
      await api.delete(`/admin/exam-types/${id}`);
    },
  },

  Purchase: {
    filter: async (opts = {}) => {
      // Educator sales: /educators/me/sales
      if (opts.educator_email) {
        try {
          const { data } = await api.get('/educators/me/sales');
          const list = Array.isArray(data) ? data : [];
          return list.map((p) => ({
            id: p.id,
            user_email: p.candidateEmail,
            user_name: p.candidateName ?? p.candidateEmail,
            test_package_id: p.testId,
            test_package_title: p.testTitle,
            price_paid: p.amountCents != null ? p.amountCents / 100 : 0,
            status: p.status === 'ACTIVE' ? 'completed' : p.status === 'REFUNDED' ? 'refunded' : 'pending',
            created_date: p.createdAt,
          }));
        } catch {
          return [];
        }
      }
      const { data } = await api.get('/me/purchases');
      let list = Array.isArray(data) ? data : [];
      if (opts.test_package_id) list = list.filter((p) => (p.testId ?? p.test?.id) === opts.test_package_id);
      return list.map((p) => ({
        id: p.id,
        user_email: opts.user_email,
        test_package_id: p.testId ?? p.test?.id,
        test_id: p.testId,
        test: p.test,
        attempt: p.attempt,
        test_package_snapshot: p.test ? testPackageAdapter(p.test) : null,
      }));
    },
    create: async (body) => {
      const testId = body.test_package_id ?? body.test_id;
      const { data } = await api.post(`/purchases/${testId}`, { discountCode: body.discount_code });
      return data;
    },
  },

  TestPackage: {
    filter: async (opts = {}, sort = '-publishedAt', limit = 50) => {
      if (opts.id) {
        try {
          const { data } = await api.get(`/tests/${opts.id}`);
          return data ? [testPackageAdapter(data)] : [];
        } catch {
          return [];
        }
      }
      // Educator's own tests (including drafts) - use /educators/me/tests
      if (opts.educator_owns === true || opts.my_tests === true) {
        try {
          const res = await api.get('/educators/me/tests');
          const data = res?.data ?? res;
          const list = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
          return (list || []).map((t) => testPackageAdapter(t));
        } catch (err) {
          console.warn('[dalClient] TestPackage.filter educator_owns failed:', err?.message || err);
          return [];
        }
      }
      const params = { limit: limit || 50, sort: 'newest' };
      if (opts.exam_type_id) params.examTypeId = opts.exam_type_id;
      if (opts.educator_email || opts.educatorId) params.educatorId = opts.educatorId ?? opts.educator_email;
      const { data } = await api.get('/marketplace/tests', { params });
      const items = data?.items ?? [];
      return items.map(testPackageAdapter);
    },
    list: async (sort, limit) => {
      const { data } = await api.get('/marketplace/tests', { params: { limit: limit || 100, sort: 'newest' } });
      return (data?.items ?? []).map(testPackageAdapter);
    },
    create: async (body) => {
      const payload = {
        title: body.title,
        examTypeId: body.exam_type_id,
        topicId: body.topic_id,
        isTimed: body.is_timed ?? false,
        duration: body.duration,
        price: body.price != null ? Math.round(body.price * 100) : null,
        questions: (body.questions ?? []).map((q) => ({
          content: q.content,
          order: q.order ?? 0,
          options: (q.options ?? []).map((o) => ({ content: o.content, isCorrect: o.is_correct ?? o.isCorrect ?? false })),
        })),
      };
      const { data } = await api.post('/tests', payload);
      return testPackageAdapter(data);
    },
    update: async (id, body) => {
      const payload = {};
      if (body.title != null) payload.title = body.title;
      if (body.is_published != null) {
        if (body.is_published) await api.put(`/tests/${id}/publish`);
        else await api.put(`/tests/${id}/unpublish`);
        return (await api.get(`/tests/${id}`)).data;
      }
      if (Object.keys(payload).length) await api.patch(`/tests/${id}`, payload);
      const { data } = await api.get(`/tests/${id}`);
      return testPackageAdapter(data);
    },
  },

  // Test = our ExamTest (single test with questions). test_package_id = our test id
  Test: {
    filter: async (opts = {}, sort) => {
      if (opts.test_package_id || opts.test_id) {
        const id = opts.test_package_id ?? opts.test_id;
        const { data } = await api.get(`/tests/${id}`);
        if (!data) return [];
        return [{ id: data.id, test_package_id: data.id, order_index: 0, ...data }];
      }
      return [];
    },
  },

  // Question = ExamQuestion from GET /tests/:id
  Question: {
    filter: async (opts = {}, sort) => {
      if (opts.test_package_id || opts.test_id) {
        const id = opts.test_package_id ?? opts.test_id;
        const { data } = await api.get(`/tests/${id}`);
        if (!data?.questions) return [];
        return (data.questions || []).map((q, i) => ({
          id: q.id,
          test_id: data.id,
          test_package_id: data.id,
          content: q.content,
          order_index: q.order ?? i,
          options: (q.options || []).map((o) => ({ id: o.id, content: o.content, is_correct: o.isCorrect })),
        }));
      }
      return [];
    },
    list: async () => [],
  },

  // TestResult = attempt when SUBMITTED (from /me/purchases)
  TestResult: {
    filter: async (opts = {}) => {
      try {
        const res = await api.get('/me/purchases');
        const data = res?.data ?? res;
        const list = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
        const results = [];
        for (const p of list) {
          if (opts.test_package_id && p.testId !== opts.test_package_id) continue;
          const attempt = p?.attempt ?? p?.attempts?.[0];
          if (attempt && (attempt.status === 'SUBMITTED' || attempt.status === 'TIMEOUT')) {
            const started = attempt.startedAt ? new Date(attempt.startedAt).getTime() : 0;
            const completed = attempt.completedAt ? new Date(attempt.completedAt).getTime() : 0;
            const timeSpent = completed && started ? Math.floor((completed - started) / 1000) : 0;
            const test = p?.test ?? p?.testPackage ?? {};
            results.push({
              id: attempt.id,
              user_email: opts.user_email,
              test_package_id: p.testId ?? p.test_id,
              test_id: p.testId ?? p.test_id,
              test_package_title: test?.title ?? p?.testTitle ?? '',
              score: attempt.score ?? 0,
              correct_count: attempt.correctCount ?? attempt.correct_count ?? null,
              wrong_count: attempt.wrongCount ?? attempt.wrong_count ?? null,
              empty_count: attempt.emptyCount ?? attempt.empty_count ?? null,
              time_spent_seconds: timeSpent,
              created_date: attempt.completedAt ?? attempt.submittedAt ?? p.createdAt ?? p.created_date,
            });
          }
        }
        return results.sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());
      } catch (err) {
        console.warn('[dalClient] TestResult.filter failed:', err?.message || err);
        return [];
      }
    },
  },

  // TestProgress = attempt when IN_PROGRESS
  TestProgress: {
    filter: async (opts = {}) => {
      const { data } = await api.get('/me/purchases');
      const list = Array.isArray(data) ? data : [];
      const progress = [];
      for (const p of list) {
        if (opts.test_package_id && p.testId !== opts.test_package_id) continue;
        if (opts.is_completed === false && p.attempt && p.attempt.status === 'IN_PROGRESS') {
          progress.push({
            id: p.attempt.id,
            user_email: opts.user_email,
            test_package_id: p.testId,
            test_id: p.testId,
            is_completed: false,
          });
        }
      }
      return progress;
    },
    update: async (id, body) => {
      if (body.is_completed) {
        await api.post(`/attempts/${id}/finish`);
      }
      return {};
    },
    create: async () => ({}),
  },

  // Review
  Review: {
    filter: async (opts = {}, sort, limit) => {
      const testId = opts.test_package_id ?? opts.test_id;
      if (!testId) return [];
      const { data } = await api.get(`/tests/${testId}/reviews`, { params: { limit: limit || 20 } });
      const items = data?.items ?? [];
      return items.map((r) => ({
        id: r.id,
        test_package_id: testId,
        reviewer_email: r.candidateId,
        rating: r.testRating,
        review_type: 'test',
        created_date: r.createdAt,
      }));
    },
    create: async (body) => {
      const testId = body.test_package_id ?? body.test_id;
      const { data } = await api.post(`/tests/${testId}/reviews`, {
        testRating: body.rating ?? body.testRating,
        educatorRating: body.educator_rating,
        comment: body.comment,
      });
      return data;
    },
  },

  // DiscountCode: educator's discount codes
  DiscountCode: {
    filter: async (opts = {}, sort) => {
      try {
        const res = await api.get('/educators/me/discount-codes');
      const data = res?.data ?? res;
      const list = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
      return list.map((d) => ({
        id: d.id,
        code: d.code,
        discount_percent: d.percentOff,
        percent_off: d.percentOff,
        max_uses: d.maxUses,
        current_uses: d.usedCount,
        used_count: d.usedCount,
        valid_from: d.validFrom,
        valid_until: d.validUntil,
        description: d.description,
        created_date: d.createdAt,
        is_active: true,
      }));
      } catch {
        return [];
      }
    },
    create: async (body) => {
      const { data } = await api.post('/educators/me/discount-codes', {
        code: body.code,
        percentOff: body.discount_percent ?? body.percent_off ?? body.percentOff ?? 10,
        maxUses: body.max_uses ?? body.maxUses ?? null,
        validFrom: body.valid_from ? new Date(body.valid_from) : null,
        validUntil: body.valid_until ? new Date(body.valid_until) : null,
        description: body.description ?? null,
      });
      return data;
    },
    delete: async (id) => {
      try {
        await api.delete(`/educators/me/discount-codes/${id}`);
      } catch (err) {
        console.warn('[dalClient] DiscountCode.delete failed:', err?.message || err);
      }
    },
  },

  // RefundRequest
  RefundRequest: {
    filter: async (opts = {}) => {
      const { data } = await api.get('/me/refunds');
      return Array.isArray(data) ? data : [];
    },
    create: async (body) => {
      const { data } = await api.post('/refunds', { purchaseId: body.purchase_id ?? body.purchaseId, reason: body.reason });
      return data;
    },
  },

  // Topic
  Topic: {
    list: async (sort) => {
      const { data: examTypes } = await api.get('/site/exam-types');
      const types = Array.isArray(examTypes) ? examTypes : examTypes?.items ?? [];
      const all = [];
      for (const et of types) {
        const { data } = await api.get('/admin/topics', { params: { examTypeId: et.id } });
        const items = Array.isArray(data) ? data : [];
        all.push(...items.map((t) => ({ ...t, exam_type_id: et.id })));
      }
      return all;
    },
    create: async (body) => {
      const { data } = await api.post('/admin/topics', {
        examTypeId: body.exam_type_id ?? body.examTypeId,
        name: body.name,
        slug: body.slug ?? body.name?.toLowerCase().replace(/\s+/g, '-'),
        active: body.active !== false,
      });
      return data;
    },
    update: async (id, body) => {
      const { data } = await api.patch(`/admin/topics/${id}`, body);
      return data;
    },
    delete: async (id) => {
      await api.delete(`/admin/topics/${id}`);
    },
  },

  // Follow
  Follow: {
    filter: async (opts = {}) => {
      const { data } = await api.get('/follows', { params: { followType: 'EDUCATOR' } });
      const list = Array.isArray(data) ? data : data?.items ?? [];
      if (opts.educator_email) {
        const educatorId = opts.educator_email;
        return list.filter((f) => f.educatorId === educatorId || f.educator?.id === educatorId);
      }
      return list;
    },
    create: async (body) => {
      const educatorId = body.educator_id ?? body.educatorId ?? body.educator_email;
      await api.post('/follows', { followType: 'EDUCATOR', educatorId });
      return {};
    },
    delete: async (id) => {
      await api.delete('/follows', { data: { followType: 'EDUCATOR', educatorId: id } });
    },
  },

  // Attempt API (for TakeTest)
  Attempt: {
    getState: async (attemptId) => {
      const { data } = await api.get(`/attempts/${attemptId}/state`);
      return data;
    },
    submitAnswer: async (attemptId, questionId, optionId) => {
      const body = optionId ? { questionId, optionId } : { questionId };
      await api.post(`/attempts/${attemptId}/answers`, body);
    },
    finish: async (attemptId) => {
      const { data } = await api.post(`/attempts/${attemptId}/finish`);
      return data;
    },
    timeout: async (attemptId) => {
      const { data } = await api.post(`/attempts/${attemptId}/timeout`);
      return data;
    },
    getResult: async (attemptId) => {
      const { data } = await api.get(`/attempts/${attemptId}/result`);
      return data;
    },
  },

  // Objection (question report from candidate during/after test)
  Objection: {
    create: async (body) => {
      const { data } = await api.post('/objections', {
        attemptId: body.attempt_id ?? body.attemptId,
        questionId: body.question_id ?? body.questionId,
        reason: body.reason,
        attachmentUrl: body.attachment_url,
      });
      return data;
    },
  },

  // QuestionReport = Objection (educator objections - no list endpoint yet, return [])
  QuestionReport: {
    filter: async (opts = {}) => {
      try {
        const { data } = await api.get('/admin/objections');
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    update: async (id, body) => {
      await api.post(`/educators/objections/${id}/answer`, body);
      return {};
    },
  },
};

// Adapter: Dal ExamTest -> Sınav Salonu TestPackage shape
function testPackageAdapter(t) {
  return {
    id: t.id,
    title: t.title,
    educator_email: t.educator?.email ?? t.educatorId,
    educator_name: t.educator?.username ?? '',
    exam_type_id: t.examTypeId,
    topic_id: t.topicId,
    question_count: t.questionCount ?? t.questions?.length ?? 0,
    price: t.priceCents != null ? t.priceCents / 100 : 0,
    is_published: !!t.publishedAt,
    is_active: t.status !== 'UNPUBLISHED',
    total_sales: t._count?.Purchase ?? 0,
    average_rating: t.ratingAvg ?? null,
    rating_count: t.ratingCount ?? 0,
    is_timed: t.isTimed,
    duration: t.duration,
    created_date: t.createdAt,
    createdAt: t.createdAt,
  };
}

export default api;
export { api };
