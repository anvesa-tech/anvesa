import { isValidProgress } from '../../domain/newsletter/progress';

export interface Article {
  id: string;
  title: string;
  body: string;
  publishedAt: Date;
}

export interface NewsletterRepository {
  listArticles(limit: number, cursor?: string): Promise<Article[]>;
  saveArticle(userId: string, articleId: string): Promise<void>;
  setProgress(userId: string, articleId: string, pct: number): Promise<void>;
  listSaved(userId: string): Promise<Article[]>;
}

export const NEWSLETTER_PAGE_SIZE = 20;

export type ProgressResult = { ok: true } | { ok: false; error: 'INVALID_PROGRESS' };

/**
 * Newsletter_Service (Requirement 25). Paginated articles, idempotent saves,
 * and validated reading progress (0-100 inclusive).
 */
export class NewsletterService {
  constructor(private readonly repo: NewsletterRepository) {}

  listArticles(cursor?: string): Promise<Article[]> {
    return this.repo.listArticles(NEWSLETTER_PAGE_SIZE, cursor);
  }

  saveArticle(userId: string, articleId: string): Promise<void> {
    return this.repo.saveArticle(userId, articleId);
  }

  listSaved(userId: string): Promise<Article[]> {
    return this.repo.listSaved(userId);
  }

  async setProgress(userId: string, articleId: string, pct: number): Promise<ProgressResult> {
    if (!isValidProgress(pct)) return { ok: false, error: 'INVALID_PROGRESS' };
    await this.repo.setProgress(userId, articleId, pct);
    return { ok: true };
  }
}
