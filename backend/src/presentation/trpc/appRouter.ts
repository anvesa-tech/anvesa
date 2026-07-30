import { router } from './trpc';
import { marketplaceRouter } from './routers/marketplace';
import { productRouter } from './routers/product';
import { searchRouter } from './routers/search';
import { cartRouter } from './routers/cart';
import { bundleRouter } from './routers/bundle';
import { newsletterRouter } from './routers/newsletter';
import { orderRouter } from './routers/order';
import { sessionRouter } from './routers/session';
import { deliveryRouter } from './routers/delivery';
import { checkoutRouter } from './routers/checkout';
import { rewardsRouter } from './routers/rewards';
import { subscriptionRouter } from './routers/subscription';
import { adminRouter } from './routers/admin';
import { wishlistRouter } from './routers/wishlist';
import { scannerRouter } from './routers/scanner';

/**
 * Root tRPC router. Additional routers (checkout, rewards, admin, ...) compose
 * here as they are implemented.
 */
export const appRouter = router({
  session: sessionRouter,
  marketplace: marketplaceRouter,
  product: productRouter,
  search: searchRouter,
  cart: cartRouter,
  bundle: bundleRouter,
  newsletter: newsletterRouter,
  order: orderRouter,
  delivery: deliveryRouter,
  checkout: checkoutRouter,
  rewards: rewardsRouter,
  subscription: subscriptionRouter,
  admin: adminRouter,
  wishlist: wishlistRouter,
  scanner: scannerRouter,
});

export type AppRouter = typeof appRouter;
