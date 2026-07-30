import type { PrismaClient } from '@prisma/client';
import type { Article, NewsletterRepository } from '../../application/newsletter/NewsletterService';

/** Prisma-backed newsletter (Requirement 25). */
export class NewsletterRepositoryPrisma implements NewsletterRepository {
  constructor(private readonly db: PrismaClient) {}

  async listArticles(limit: number, cursor?: string): Promise<Article[]> {
    const rows = await this.db.newsletterArticle.findMany({
      orderBy: { publishedAt: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    return rows.map((a) => ({ id: a.id, title: a.title, body: a.body, publishedAt: a.publishedAt }));
  }

  async saveArticle(userId: string, articleId: string): Promise<void> {
    await this.db.savedArticle.upsert({
      where: { userId_articleId: { userId, articleId } },
      update: {},
      create: { userId, articleId },
    });
  }

  async setProgress(userId: string, articleId: string, pct: number): Promise<void> {
    await this.db.readingProgress.upsert({
      where: { userId_articleId: { userId, articleId } },
      update: { percent: pct },
      create: { userId, articleId, percent: pct },
    });
  }

  async listSaved(userId: string): Promise<Article[]> {
    const saved = await this.db.savedArticle.findMany({
      where: { userId },
      orderBy: { savedAt: 'desc' },
      include: { article: true },
    });
    return saved.map((s) => ({
      id: s.article.id,
      title: s.article.title,
      body: s.article.body,
      publishedAt: s.article.publishedAt,
    }));
  }
}
