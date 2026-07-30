/**
 * Dependency-injection composition root (Requirement 31.4).
 *
 * The single place where concrete infrastructure adapters are constructed and
 * wired into application services. Application/domain code never imports
 * concrete adapters — only the ports.
 */
import { prisma } from '../prisma/client';
import { RedisCache } from '../cache/RedisCache';
import { ProductRepositoryPrisma } from '../prisma/ProductRepositoryPrisma';
import { AuditRepositoryPrisma } from '../prisma/AuditRepositoryPrisma';
import { MarketplaceRepositoryPrisma } from '../prisma/MarketplaceRepositoryPrisma';
import { ProductReadRepositoryPrisma } from '../prisma/ProductReadRepositoryPrisma';
import { SearchRepositoryPrisma } from '../prisma/SearchRepositoryPrisma';
import { CartRepositoryPrisma } from '../prisma/CartRepositoryPrisma';
import { BundleRepositoryPrisma } from '../prisma/BundleRepositoryPrisma';
import { NewsletterRepositoryPrisma } from '../prisma/NewsletterRepositoryPrisma';
import { OrderRepositoryPrisma } from '../prisma/OrderRepositoryPrisma';
import { OrderService } from '../../application/order/OrderService';
import { AuthUserRepositoryPrisma } from '../auth/AuthUserRepositoryPrisma';
import { DeliveryRepositoryPrisma } from '../prisma/DeliveryRepositoryPrisma';
import { DeliveryService } from '../../application/delivery/DeliveryService';
import { PaymentRepositoryPrisma } from '../prisma/PaymentRepositoryPrisma';
import { CouponRepositoryPrisma } from '../prisma/CouponRepositoryPrisma';
import { WalletRepositoryPrisma } from '../prisma/WalletRepositoryPrisma';
import { AddressRepositoryPrisma } from '../prisma/AddressRepositoryPrisma';
import { CheckoutService } from '../../application/checkout/CheckoutService';
import { RazorpayGateway } from '../gateways/RazorpayGateway';
import { RazorpayConfig } from '../gateways/RazorpayConfig';
import { SubscriptionRepositoryPrisma } from '../prisma/SubscriptionRepositoryPrisma';
import { SubscriptionService } from '../../application/subscription/SubscriptionService';
import { RewardsRepositoryPrisma } from '../prisma/RewardsRepositoryPrisma';
import { RewardsService } from '../../application/rewards/RewardsService';
import { AdminRepositoryPrisma } from '../prisma/AdminRepositoryPrisma';
import { AdminService } from '../../application/admin/AdminService';
import { WishlistRepositoryPrisma } from '../prisma/WishlistRepositoryPrisma';
import { WishlistService } from '../../application/wishlist/WishlistService';
import { MarketplaceService } from '../../application/marketplace/MarketplaceService';
import { ProductService } from '../../application/product/ProductService';
import { OpenFoodFactsGateway } from '../gateways/OpenFoodFactsGateway';
import { OcrSpaceGateway } from '../gateways/OcrSpaceGateway';
import type { OcrGateway } from '../../domain/ports/gateways';
import { SearchService } from '../../application/search/SearchService';
import { CartService } from '../../application/cart/CartService';
import { BundleService } from '../../application/bundle/BundleService';
import { NewsletterService } from '../../application/newsletter/NewsletterService';
import { GradingService } from '../../application/grading/GradingService';

let cache: RedisCache | null = null;
function getCache(): RedisCache {
  if (!cache) cache = new RedisCache(process.env.REDIS_URL);
  return cache;
}

export interface Container {
  marketplace: MarketplaceService;
  product: ProductService;
  search: SearchService;
  cart: CartService;
  bundle: BundleService;
  newsletter: NewsletterService;
  order: OrderService;
  authUsers: AuthUserRepositoryPrisma;
  delivery: DeliveryService;
  checkout: CheckoutService;
  subscription: SubscriptionService;
  rewards: RewardsService;
  admin: AdminService;
  wishlist: WishlistService;
  grading: GradingService;
  ocr: OcrGateway;
  razorpay: RazorpayConfig;
}

let container: Container | null = null;

export function getContainer(): Container {
  if (container) return container;
  const marketplaceRepo = new MarketplaceRepositoryPrisma(prisma);
  const productRepo = new ProductRepositoryPrisma(prisma);
  const productReadRepo = new ProductReadRepositoryPrisma(prisma);
  const searchRepo = new SearchRepositoryPrisma(prisma);
  const cartRepo = new CartRepositoryPrisma(prisma);
  const bundleRepo = new BundleRepositoryPrisma(prisma);
  const newsletterRepo = new NewsletterRepositoryPrisma(prisma);
  const orderRepo = new OrderRepositoryPrisma(prisma);
  const auditRepo = new AuditRepositoryPrisma(prisma);
  const razorpayConfig = new RazorpayConfig();

  container = {
    marketplace: new MarketplaceService(marketplaceRepo, getCache()),
    product: new ProductService(productReadRepo, new OpenFoodFactsGateway()),
    search: new SearchService(searchRepo),
    cart: new CartService(cartRepo),
    bundle: new BundleService(bundleRepo),
    newsletter: new NewsletterService(newsletterRepo),
    order: new OrderService(orderRepo),
    authUsers: new AuthUserRepositoryPrisma(prisma),
    delivery: new DeliveryService(new DeliveryRepositoryPrisma(prisma), getCache()),
    checkout: new CheckoutService(
      cartRepo,
      orderRepo,
      new PaymentRepositoryPrisma(prisma),
      new RazorpayGateway(razorpayConfig),
      new CouponRepositoryPrisma(prisma),
      new WalletRepositoryPrisma(prisma),
      new AddressRepositoryPrisma(prisma),
    ),
    subscription: new SubscriptionService(new SubscriptionRepositoryPrisma(prisma)),
    rewards: (() => {
      const rewardsRepo = new RewardsRepositoryPrisma(prisma);
      return new RewardsService(rewardsRepo, rewardsRepo);
    })(),
    admin: new AdminService(new AdminRepositoryPrisma(prisma)),
    wishlist: new WishlistService(new WishlistRepositoryPrisma(prisma)),
    grading: new GradingService(productRepo, auditRepo),
    ocr: new OcrSpaceGateway(process.env.OCRSPACE_API_KEY),
    razorpay: razorpayConfig,
  };
  return container;
}
