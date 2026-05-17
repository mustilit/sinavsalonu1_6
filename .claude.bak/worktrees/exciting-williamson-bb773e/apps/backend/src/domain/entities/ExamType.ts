export type ExamType = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

