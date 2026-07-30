-- ============================================================================
-- ANVESA — complete database schema (single file)
-- Buy what's verified, not what's marketed.
--
-- Idempotent, ordered setup for a fresh PostgreSQL / Supabase database:
--   1. Extensions
--   2. Enums
--   3. Tables
--   4. Indexes (incl. pg_trgm search index)
--   5. Foreign keys
--   6. Row Level Security policies (Supabase Auth: auth.uid())
--
-- Apply with:  psql "$DATABASE_URL" -f prisma/anvesa_database.sql
-- Reflects the final schema (Payment.orderId nullable for order-less failed
-- attempts) and aligns with Supabase-managed auth.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----------------------------------------------------------------------------
-- 2. ENUMS
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN', 'VENDOR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "Grade" AS ENUM ('A', 'B', 'C', 'D');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'SUCCESS', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CouponType" AS ENUM ('PERCENT', 'FLAT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "WalletTxnType" AS ENUM ('CREDIT', 'DEBIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SubStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_SAY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "Diet" AS ENUM ('VEG', 'NON_VEG', 'VEGAN', 'EGGETARIAN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 3. TABLES
-- ----------------------------------------------------------------------------

-- Identity & profile ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "appleSub" TEXT,
    "googleSub" TEXT,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" "Gender" NOT NULL,
    "heightCm" INTEGER NOT NULL,
    "weightKg" INTEGER NOT NULL,
    "conditions" TEXT[],
    "goals" TEXT[],
    "activityLevel" "ActivityLevel" NOT NULL,
    "diet" "Diet" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- Catalog --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "barcode" TEXT,
    "categoryId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "vendorId" TEXT,
    "isListed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Nutrition" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "energyKcal" DOUBLE PRECISION NOT NULL,
    "sugarG" DOUBLE PRECISION NOT NULL,
    "sodiumMg" DOUBLE PRECISION NOT NULL,
    "proteinG" DOUBLE PRECISION NOT NULL,
    "fatG" DOUBLE PRECISION NOT NULL,
    "satFatG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fibreG" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "Nutrition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Ingredient" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isAdditive" BOOLEAN NOT NULL DEFAULT false,
    "isAllergen" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- Grade is written ONLY by the Grading_Engine (GradingService). No API accepts
-- a grade value; override attempts are rejected and audited.
CREATE TABLE IF NOT EXISTS "ProductGrade" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "grade" "Grade" NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inputHash" TEXT NOT NULL,
    CONSTRAINT "ProductGrade_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GradeReasoning" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "factor" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "detail" TEXT NOT NULL,
    CONSTRAINT "GradeReasoning_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductFlag" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    CONSTRAINT "ProductFlag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AffiliateLink" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    CONSTRAINT "AffiliateLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- Cart & commerce ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Cart" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "couponId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PLACED',
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "walletCents" INTEGER NOT NULL DEFAULT 0,
    "deliveryCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "addressId" TEXT NOT NULL,
    "slotId" TEXT,
    "couponId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrderStatusEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id")
);

-- orderId is nullable: order-less failed payment attempts are recorded too.
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "razorpayRef" TEXT,
    "signature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" INTEGER NOT NULL,
    "minOrderCents" INTEGER NOT NULL DEFAULT 0,
    "usageLimit" INTEGER NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- Wallet & rewards -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "type" "WalletTxnType" NOT NULL,
    "reason" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Xp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "reachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Xp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Badge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Streak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scanStreak" INTEGER NOT NULL DEFAULT 0,
    "lastScanDay" TEXT,
    "purchaseStreak" INTEGER NOT NULL DEFAULT 0,
    "lastPurchaseDay" TEXT,
    CONSTRAINT "Streak_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ScanHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "utcDay" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ScanReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "utcDay" TEXT NOT NULL,
    "xpAwarded" INTEGER NOT NULL,
    CONSTRAINT "ScanReward_pkey" PRIMARY KEY ("id")
);

-- Subscriptions & bundles ----------------------------------------------------
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SubStatus" NOT NULL DEFAULT 'ACTIVE',
    "nextDeliveryAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SubscriptionItem" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    CONSTRAINT "SubscriptionItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Bundle" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    CONSTRAINT "Bundle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BundleProduct" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    CONSTRAINT "BundleProduct_pkey" PRIMARY KEY ("id")
);

-- Content & engagement -------------------------------------------------------
CREATE TABLE IF NOT EXISTS "NewsletterArticle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NewsletterArticle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SavedArticle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedArticle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReadingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "percent" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReadingProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SavedProduct" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RecentlyViewed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecentlyViewed_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- Delivery & notifications ---------------------------------------------------
CREATE TABLE IF NOT EXISTS "DeliverySlot" (
    "id" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DeliverySlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Pincode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    CONSTRAINT "Pincode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Admin & audit --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Admin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "attempted" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- 4. INDEXES
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_appleSub_key" ON "User"("appleSub");
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleSub_key" ON "User"("googleSub");
CREATE INDEX IF NOT EXISTS "User_phone_idx" ON "User"("phone");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Profile_userId_key" ON "Profile"("userId");
CREATE INDEX IF NOT EXISTS "Address_userId_idx" ON "Address"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Category_key_key" ON "Category"("key");
CREATE UNIQUE INDEX IF NOT EXISTS "Brand_name_key" ON "Brand"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_barcode_key" ON "Product"("barcode");
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX IF NOT EXISTS "Product_brandId_idx" ON "Product"("brandId");
CREATE INDEX IF NOT EXISTS "Product_vendorId_idx" ON "Product"("vendorId");
CREATE INDEX IF NOT EXISTS "Product_name_idx" ON "Product"("name");
-- Trigram GIN index for case-insensitive product search (ILIKE / contains).
CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx" ON "Product" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ProductImage_productId_idx" ON "ProductImage"("productId");
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE UNIQUE INDEX IF NOT EXISTS "Nutrition_productId_key" ON "Nutrition"("productId");
CREATE INDEX IF NOT EXISTS "Ingredient_productId_idx" ON "Ingredient"("productId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductGrade_productId_key" ON "ProductGrade"("productId");
CREATE INDEX IF NOT EXISTS "ProductGrade_grade_idx" ON "ProductGrade"("grade");
CREATE INDEX IF NOT EXISTS "GradeReasoning_gradeId_idx" ON "GradeReasoning"("gradeId");
CREATE INDEX IF NOT EXISTS "ProductFlag_productId_idx" ON "ProductFlag"("productId");
CREATE INDEX IF NOT EXISTS "Review_productId_idx" ON "Review"("productId");
CREATE UNIQUE INDEX IF NOT EXISTS "Review_productId_userId_key" ON "Review"("productId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Cart_ownerId_key" ON "Cart"("ownerId");
CREATE INDEX IF NOT EXISTS "CartItem_cartId_idx" ON "CartItem"("cartId");
CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_cartId_variantId_key" ON "CartItem"("cartId", "variantId");
CREATE INDEX IF NOT EXISTS "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderStatusEvent_orderId_at_idx" ON "OrderStatusEvent"("orderId", "at");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_orderId_key" ON "Payment"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "Wallet_userId_key" ON "Wallet"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "WalletTransaction_idempotencyKey_key" ON "WalletTransaction"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "WalletTransaction_walletId_at_idx" ON "WalletTransaction"("walletId", "at");
CREATE UNIQUE INDEX IF NOT EXISTS "Xp_userId_key" ON "Xp"("userId");
CREATE INDEX IF NOT EXISTS "Xp_total_idx" ON "Xp"("total");
CREATE UNIQUE INDEX IF NOT EXISTS "Badge_userId_key_key" ON "Badge"("userId", "key");
CREATE UNIQUE INDEX IF NOT EXISTS "Streak_userId_key" ON "Streak"("userId");
CREATE INDEX IF NOT EXISTS "ScanHistory_userId_utcDay_idx" ON "ScanHistory"("userId", "utcDay");
CREATE UNIQUE INDEX IF NOT EXISTS "ScanReward_userId_productId_utcDay_key" ON "ScanReward"("userId", "productId", "utcDay");
CREATE INDEX IF NOT EXISTS "Subscription_status_nextDeliveryAt_idx" ON "Subscription"("status", "nextDeliveryAt");
CREATE INDEX IF NOT EXISTS "SubscriptionItem_subscriptionId_idx" ON "SubscriptionItem"("subscriptionId");
CREATE UNIQUE INDEX IF NOT EXISTS "Bundle_key_key" ON "Bundle"("key");
CREATE INDEX IF NOT EXISTS "BundleProduct_bundleId_idx" ON "BundleProduct"("bundleId");
CREATE INDEX IF NOT EXISTS "NewsletterArticle_publishedAt_idx" ON "NewsletterArticle"("publishedAt");
CREATE INDEX IF NOT EXISTS "SavedArticle_userId_savedAt_idx" ON "SavedArticle"("userId", "savedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "SavedArticle_userId_articleId_key" ON "SavedArticle"("userId", "articleId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReadingProgress_userId_articleId_key" ON "ReadingProgress"("userId", "articleId");
CREATE INDEX IF NOT EXISTS "SavedProduct_userId_savedAt_idx" ON "SavedProduct"("userId", "savedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "SavedProduct_userId_productId_key" ON "SavedProduct"("userId", "productId");
CREATE INDEX IF NOT EXISTS "RecentlyViewed_userId_viewedAt_idx" ON "RecentlyViewed"("userId", "viewedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "RecentlyViewed_userId_productId_key" ON "RecentlyViewed"("userId", "productId");
CREATE INDEX IF NOT EXISTS "DeliverySlot_startAt_idx" ON "DeliverySlot"("startAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Pincode_userId_code_key" ON "Pincode"("userId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "DeviceToken_userId_token_key" ON "DeviceToken"("userId", "token");
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Admin_userId_key" ON "Admin"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_at_idx" ON "AuditLog"("action", "at");

-- ----------------------------------------------------------------------------
-- 5. FOREIGN KEYS
-- ----------------------------------------------------------------------------
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Nutrition" ADD CONSTRAINT "Nutrition_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductGrade" ADD CONSTRAINT "ProductGrade_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GradeReasoning" ADD CONSTRAINT "GradeReasoning_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "ProductGrade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductFlag" ADD CONSTRAINT "ProductFlag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AffiliateLink" ADD CONSTRAINT "AffiliateLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Xp" ADD CONSTRAINT "Xp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScanHistory" ADD CONSTRAINT "ScanHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScanReward" ADD CONSTRAINT "ScanReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionItem" ADD CONSTRAINT "SubscriptionItem_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionItem" ADD CONSTRAINT "SubscriptionItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BundleProduct" ADD CONSTRAINT "BundleProduct_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedArticle" ADD CONSTRAINT "SavedArticle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedArticle" ADD CONSTRAINT "SavedArticle_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "NewsletterArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "NewsletterArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedProduct" ADD CONSTRAINT "SavedProduct_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecentlyViewed" ADD CONSTRAINT "RecentlyViewed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Pincode" ADD CONSTRAINT "Pincode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (Supabase Auth)
--
-- User-owned tables are readable/writable only by the owning user, derived from
-- Supabase's auth.uid(). The backend service role bypasses RLS for trusted
-- server-side work. Catalog tables stay backend-managed (write via service
-- role); expose read-only policies if you serve them directly via PostgREST.
--
-- NOTE: auth.uid() exists only on a Supabase database. On a plain local
-- Postgres these policies are inert unless you provide an auth schema; the
-- application layer (tRPC protectedProcedure + ownership checks) enforces the
-- same rules there.
-- ----------------------------------------------------------------------------
ALTER TABLE "Profile"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Address"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Wallet"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WalletTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedProduct"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecentlyViewed"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pincode"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScanHistory"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeviceToken"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedArticle"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReadingProgress"   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_owner_all" ON "Profile";
CREATE POLICY "profile_owner_all" ON "Profile"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "address_owner_all" ON "Address";
CREATE POLICY "address_owner_all" ON "Address"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "order_owner_select" ON "Order";
CREATE POLICY "order_owner_select" ON "Order"
  FOR SELECT USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "wallet_owner_select" ON "Wallet";
CREATE POLICY "wallet_owner_select" ON "Wallet"
  FOR SELECT USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "saved_owner_all" ON "SavedProduct";
CREATE POLICY "saved_owner_all" ON "SavedProduct"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "recent_owner_all" ON "RecentlyViewed";
CREATE POLICY "recent_owner_all" ON "RecentlyViewed"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "notif_owner_select" ON "Notification";
CREATE POLICY "notif_owner_select" ON "Notification"
  FOR SELECT USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "pincode_owner_all" ON "Pincode";
CREATE POLICY "pincode_owner_all" ON "Pincode"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "scan_owner_all" ON "ScanHistory";
CREATE POLICY "scan_owner_all" ON "ScanHistory"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "device_owner_all" ON "DeviceToken";
CREATE POLICY "device_owner_all" ON "DeviceToken"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "review_owner_write" ON "Review";
CREATE POLICY "review_owner_write" ON "Review"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "sub_owner_all" ON "Subscription";
CREATE POLICY "sub_owner_all" ON "Subscription"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "saved_article_owner_all" ON "SavedArticle";
CREATE POLICY "saved_article_owner_all" ON "SavedArticle"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "reading_progress_owner_all" ON "ReadingProgress";
CREATE POLICY "reading_progress_owner_all" ON "ReadingProgress"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

-- OrderItem and WalletTransaction are reachable only through their parent via
-- the backend service role; RLS is enabled with no permissive client policy.

-- ============================================================================
-- End of ANVESA database setup.
-- ============================================================================


-- ============================================================================
-- Runtime settings (non-secret flags, e.g. Razorpay test/live mode)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);
