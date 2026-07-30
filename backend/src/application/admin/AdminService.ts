import { clampPageSize } from '../../domain/admin/pagination';

export interface AdminAnalytics {
  products: number;
  orders: number;
  customers: number;
  totalXp: number;
}

export interface AdminOrderRow {
  id: string;
  status: string;
  totalCents: number;
  createdAt: Date;
}

export interface AdminProductRow {
  id: string;
  name: string;
  brand: string;
  grade: string | null;
  isListed: boolean;
}

export interface AdminRepository {
  countProducts(): Promise<number>;
  countOrders(): Promise<number>;
  countCustomers(): Promise<number>;
  sumXp(): Promise<number>;
  listOrders(limit: number): Promise<AdminOrderRow[]>;
  listProducts(limit: number): Promise<AdminProductRow[]>;
  setProductListed(productId: string, isListed: boolean): Promise<void>;
}

/**
 * Admin_Panel services (Requirement 27). Analytics aggregation and paginated
 * listings with a clamped page size. Grades are never set here — product
 * grading goes through GradingService and override attempts are rejected.
 */
export class AdminService {
  constructor(private readonly repo: AdminRepository) {}

  async analytics(): Promise<AdminAnalytics> {
    const [products, orders, customers, totalXp] = await Promise.all([
      this.repo.countProducts(),
      this.repo.countOrders(),
      this.repo.countCustomers(),
      this.repo.sumXp(),
    ]);
    return { products, orders, customers, totalXp };
  }

  listOrders(pageSize?: number): Promise<AdminOrderRow[]> {
    return this.repo.listOrders(clampPageSize(pageSize));
  }

  listProducts(pageSize?: number): Promise<AdminProductRow[]> {
    return this.repo.listProducts(clampPageSize(pageSize));
  }

  /** Toggle a product's marketplace visibility (Requirement 27). */
  setProductListed(productId: string, isListed: boolean): Promise<void> {
    return this.repo.setProductListed(productId, isListed);
  }
}
