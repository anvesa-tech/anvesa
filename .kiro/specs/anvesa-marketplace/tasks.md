# Implementation Plan: ANVESA Marketplace

## Overview

This plan implements ANVESA as a TypeScript monorepo: a Next.js 15 + tRPC backend (`Backend_System`) and a React Native + Expo client (`ANVESA_App`), following Clean Architecture (Presentation → Application → Domain → Infrastructure) with the strict inward dependency rule.

Work is sequenced to honor the dependency rule and to front-load the two trust-critical concerns first: the pure `Grading_Engine` and its integrity guarantees, and the money math (cart, coupon, wallet, checkout). The domain layer (entities, value objects, pure functions) is built and property-tested before application services, which are built before infrastructure adapters and tRPC routers. The mobile client, admin panel, and external wiring follow.

Property-based tests use `fast-check` with Vitest, run a minimum of 100 iterations (`{ numRuns: 100 }`), implement exactly one test per design property, and are tagged `// Feature: anvesa-marketplace, Property {number}: {property_text}`. Unit, integration, and smoke tests complement them per the Testing Strategy. Test sub-tasks are marked optional with `*`.

## Tasks

- [x] 1. Bootstrap monorepo, tooling, and CI/CD
  - Create the monorepo workspace (pnpm/turborepo) with two packages: `backend/` (Next.js 15 + tRPC) and `app/` (React Native + Expo), plus a shared `packages/config` for lint/tsconfig
  - Configure strict TypeScript (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), ESLint, and Prettier at the root with per-package extends
  - Add Vitest + `fast-check` to the backend and a Vitest config to the client for pure client-rule/design-system tests
  - Scaffold the Clean Architecture directory skeleton on the backend (`presentation/`, `application/`, `domain/`, `infrastructure/`) and on the client (`src/presentation/`, `src/application/`, `src/domain/`, `src/infrastructure/`)
  - Add `dependency-cruiser` config encoding the allowed import direction (presentation→application→domain→infrastructure only; no persistence access outside repositories)
  - Add GitHub Actions workflow (typecheck → lint/format → unit+property tests → integration → dependency lint → build) and a `Dockerfile` + `docker-compose` for ephemeral Postgres + Redis
  - _Requirements: 31.1, 31.2, 31.3, 31.4, 29.8_

- [x] 2. Define the data layer: Prisma schema, migrations, indexes, and RLS
  - [x] 2.1 Author the complete Prisma schema
    - Define all models from the design (User, Profile, RefreshToken, Category, Brand, Vendor, Product, ProductImage, ProductVariant, Nutrition, Ingredient, ProductGrade, GradeReasoning, ProductFlag, AffiliateLink, Cart, CartItem, Order, OrderItem, OrderStatusEvent, Payment, Coupon, Wallet, WalletTransaction, Xp, Badge, Streak, ScanHistory, ScanReward, Subscription, SubscriptionItem, Bundle, BundleProduct, NewsletterArticle, SavedProduct, RecentlyViewed, Feedback, DeliverySlot, Pincode, DeviceToken, Notification, Admin, AuditLog) and all enums
    - Add unique constraints for exactly-once/dedupe semantics (`ScanReward(userId,productId,utcDay)`, `Badge(userId,key)`, `WalletTransaction(idempotencyKey)`, `Pincode(userId,code)`, `DeviceToken(userId,token)`, `SavedProduct(userId,productId)`, `RecentlyViewed(userId,productId)`)
    - Add all browse/search/order-lookup/leaderboard indexes from the Key Indexing Strategy
    - _Requirements: 29.8, 12.3, 18.5, 23.4, 24.6, 26.1_
  - [x] 2.2 Generate the initial migration and add the pg_trgm index
    - Run the initial Prisma migration; add a raw-SQL migration creating the `pg_trgm` GIN index on `Product.name` for case-insensitive contains search
    - _Requirements: 9.1, 29.8_
  - [x] 2.3 Author Supabase Row Level Security policies
    - Write SQL RLS policies restricting user-owned tables (orders, wallet, profiles, addresses, saved_products, recently_viewed, notifications, pincodes, scan_history) to the owning `userId`, with a service-role bypass for backend workers and public read for catalog tables
    - _Requirements: 30.3, 20.4_
  - [ ]* 2.4 Write integration test for RLS enforcement
    - Verify one user cannot read another user's owned rows at the database level (complements Property 51)
    - _Requirements: 30.3_

- [x] 3. Build the pure Grading_Engine domain module (trust anchor)
  - [x] 3.1 Define grading value objects and the typed input boundary
    - In `domain/grading`, define `NutritionFacts`, `IngredientRef`, `CompositionAttributes`, `GradingInput`, `Grade`, `GradeFactor`, `RedFlag`, `GradedResult` types containing only composition data — with no field, parameter, or import path for advertising/sponsorship/payment/partnership signals
    - _Requirements: 12.1, 12.2_
  - [x] 3.2 Implement `computeGrade` as a pure, total, deterministic function
    - Implement the scoring from nutrition/ingredient/composition inputs returning exactly one `Grade` plus reasoning factors and red flags; no clock, randomness, or I/O
    - Implement `inputHash` derivation over composition inputs for determinism auditing
    - _Requirements: 12.1, 12.3, 12.6, 8.3_
  - [x]* 3.3 Write property test: grade depends only on composition
    - **Property 1: Grade depends only on composition, never on commercial signals**
    - **Validates: Requirements 12.1, 12.2, 12.4, 12.6**
    - Use `arbComposition` + `arbCommercialSignals`; assert grade is invariant across arbitrary commercial signals
  - [x]* 3.4 Write property test: exactly one grade from the scale
    - **Property 2: Every grade is exactly one value from the defined scale**
    - **Validates: Requirements 12.3**
  - [x]* 3.5 Write property test: determinism for identical inputs
    - Part of **Property 1** determinism dimension; assert identical inputs yield identical grades regardless of brand/listing
    - **Validates: Requirements 12.6**

- [x] 4. Money math domain: pure cart, coupon, wallet, and checkout functions
  - [x] 4.1 Implement pure cart-total and quantity-validation functions
    - In `domain/commerce`, implement `cartTotal(items)` = Σ price×qty and `validateQty(qty, stock)` (reject <1 or >stock)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 6.6_
  - [x]* 4.2 Write property test: cart total invariant
    - **Property 6: Cart total invariant**
    - **Validates: Requirements 13.1, 13.2, 13.3**
  - [x]* 4.3 Write property test: invalid quantities rejected without mutation
    - **Property 7: Invalid cart quantities are rejected without mutating the cart**
    - **Validates: Requirements 6.6, 13.4, 13.5**
  - [x] 4.4 Implement pure coupon and checkout-total functions
    - Implement `applyCoupon(subtotal, coupon)` (cap discount at subtotal, never negative) and `checkoutTotal(subtotal, coupon, wallet, delivery)` = max(0, subtotal − coupon − wallet + delivery)
    - _Requirements: 14.1, 16.2_
  - [x]* 4.5 Write property test: coupon discount capped, total non-negative
    - **Property 8: Coupon discount is capped and never drives totals negative**
    - **Validates: Requirements 14.1**
  - [x]* 4.6 Write property test: checkout total formula with zero floor
    - **Property 14: Checkout total formula with zero floor**
    - **Validates: Requirements 16.2**
  - [x] 4.7 Implement pure wallet application and cashback functions
    - Implement `applyWallet(balance, amount, outstanding)` (accept iff 0 < amount ≤ min(balance, outstanding)) and `creditCashback(balance, amount)`
    - _Requirements: 15.2, 15.3, 15.4, 15.5, 15.6_
  - [x]* 4.8 Write property test: wallet deducts exactly and records debit
    - **Property 11: Wallet application deducts exactly and records a debit**
    - **Validates: Requirements 15.2, 15.6**
  - [x]* 4.9 Write property test: invalid wallet amounts rejected without change
    - **Property 12: Invalid wallet amounts are rejected without changing the balance**
    - **Validates: Requirements 15.3, 15.4**
  - [x]* 4.10 Write property test: cashback credit increases balance exactly
    - **Property 13: Cashback credit increases balance exactly and records a credit**
    - **Validates: Requirements 15.5**

- [x] 5. Checkout completion truth-table domain functions
  - [x] 5.1 Implement pure checkout outcome resolver
    - Implement `resolveCheckout(paymentConfirmed)` → { createOrder, clearCart } vs { preserveCart, orderUnplaced, paymentFailedRecord }
    - _Requirements: 16.5, 16.6, 17.3, 17.5_
  - [x]* 5.2 Write property test: confirmed payment creates order and clears cart
    - **Property 15: Confirmed payment creates an order and clears the cart**
    - **Validates: Requirements 16.5**
  - [x]* 5.3 Write property test: unconfirmed payment preserves cart, order unplaced
    - **Property 16: Unconfirmed payment preserves the cart and leaves the order unplaced**
    - **Validates: Requirements 16.6, 17.3, 17.5**

- [x] 6. Checkpoint - grading and money math
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Domain ports, DI container, and repository/gateway infrastructure
  - [x] 7.1 Define repository and gateway ports in the domain layer
    - Declare interfaces (ProductRepository, CartRepository, OrderRepository, WalletRepository, CouponRepository, AuditRepository, RewardsRepository, SubscriptionRepository, DeliveryRepository, etc.) and external gateway ports (PaymentGateway, NotificationGateway, AiGateway, SmsGateway, StorageGateway, MapsGateway, CachePort)
    - _Requirements: 31.3, 31.4_
  - [x] 7.2 Implement Prisma repository adapters
    - Implement concrete Prisma-backed repositories for the ports, keeping all persistence access inside this layer
    - _Requirements: 31.3_
  - [x] 7.3 Implement Redis cache adapter and DI composition root
    - Implement `CachePort` over Redis (cache-aside, TTL, ephemeral locks) and build `infrastructure/di/container.ts` wiring concrete adapters into application services via constructor injection
    - _Requirements: 29.6, 31.4_
  - [x] 7.4 Implement the Security_Layer tRPC middleware chain
    - Implement `publicProcedure`, `protectedProcedure`, `adminProcedure`, `vendorProcedure`; JWT verification, role checks, Zod schema validation, rate limiting (100/60s), signed-upload-URL issuance (≤15 min), and audit logging
    - _Requirements: 30.1, 30.2, 30.4, 30.5, 30.6, 30.7, 30.8, 27.7_
  - [x]* 7.5 Write property test: access-token gating
    - **Property 49: Access-token gating**
    - **Validates: Requirements 30.1, 30.2**
  - [x]* 7.6 Write property test: API rate limiting by window
    - **Property 47: Request rate limiting by window**
    - **Validates: Requirements 1.7, 30.6**
  - [x]* 7.7 Write property test: schema validation rejects malformed payloads
    - **Property 53: Schema validation rejects malformed payloads**
    - **Validates: Requirements 27.2, 28.4, 30.7**
  - [x]* 7.8 Write property test: upload validation by size and type
    - **Property 52: Upload validation by size and type**
    - **Validates: Requirements 30.5**
  - [ ]* 7.9 Write property test: row-level ownership isolation
    - **Property 51: Row-level ownership isolation**
    - **Validates: Requirements 20.4, 30.3**

- [x] 8. GradingService (only grade writer) and override guard
  - [x] 8.1 Implement GradingService.recomputeFor and persistComputedGrade
    - Read composition via ProductRepository, call `computeGrade`, persist grade + reasoning + inputHash; this is the single writer of grade rows
    - _Requirements: 12.7, 27.8, 28.2_
  - [x] 8.2 Implement the grade-override guard and audit
    - Add schema/guard that rejects any admin or vendor request carrying a grade value with an authorization error, leaves the stored grade unchanged, and writes an AuditLog entry (requester identity, attempted value, timestamp)
    - _Requirements: 12.5, 27.9, 28.3, 30.8_
  - [x]* 8.3 Write property test: override attempts rejected, unchanged, audited
    - **Property 3: Grade override attempts are rejected, leave the grade unchanged, and are audited**
    - **Validates: Requirements 12.5, 27.9, 28.3, 30.8**
  - [x]* 8.4 Write property test: grade recomputed and persisted on composition change
    - **Property 4: Grade is recomputed and persisted consistently on composition change**
    - **Validates: Requirements 12.7, 27.8, 28.2**

- [x] 9. Cart_Service, Coupon_Service, Wallet_Service (application layer)
  - [x] 9.1 Implement Cart_Service
    - getCart/addItem/quickAdd/updateQty/removeItem/addBundle over CartRepository using pure cart math; stock checks reject over/out-of-stock; guest carts persist ≥30 days
    - _Requirements: 6.1, 6.6, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 22.3, 22.5_
  - [x] 9.2 Implement Coupon_Service
    - apply/remove validating existence, active, not-expired, usage-limit, min-order, single-coupon-per-order; recompute totals
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_
  - [x]* 9.3 Write property test: ineligible coupons rejected, total unchanged
    - **Property 9: Ineligible coupons are rejected**
    - **Validates: Requirements 14.3, 14.4**
  - [x]* 9.4 Write property test: coupon apply/remove round-trip
    - **Property 10: Coupon apply/remove round-trip restores the total**
    - **Validates: Requirements 14.6**
  - [x] 9.5 Implement Wallet_Service
    - getWallet (recency-desc transactions), applyToOrder, idempotent credit keyed by idempotencyKey
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 24.6_
  - [ ]* 9.6 Write unit tests for single-coupon-per-order and guest cart persistence
    - Example cases for 14.5 and 13.6
    - _Requirements: 14.5, 13.6_

- [x] 10. Checkout_Service, Payment_Service, and payment signature verification
  - [x] 10.1 Implement Razorpay signature verification and PaymentGateway adapter
    - Implement HMAC signature verification (pure verifier) and the Razorpay adapter for order creation + verify
    - _Requirements: 17.1, 17.2, 17.4_
  - [x]* 10.2 Write property test: payment success iff valid signature
    - **Property 17: Payment success requires a valid signature**
    - **Validates: Requirements 17.2**
  - [x] 10.3 Implement Payment_Service and Checkout_Service
    - createOrder/verify persisting payment records; checkout begin/computeTotals/place requiring address+slot+payment, empty-cart block, out-of-zone pincode flow, transactional order-create + cart-clear on confirm
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 17.3, 17.4, 17.5_
  - [ ]* 10.4 Write integration test: Razorpay order creation + webhook signature round-trip
    - _Requirements: 17.1_

- [x] 11. Order_Service and order status state machine
  - [x] 11.1 Implement the order status state machine (pure)
    - Encode allowed transitions (PLACED→CONFIRMED→PACKED→OUT_FOR_DELIVERY→DELIVERED; cancel edges) and `isValidTransition(from,to)`
    - _Requirements: 27.5_
  - [x]* 11.2 Write property test: order-status transition validity
    - **Property 59: Order-status transition validity**
    - **Validates: Requirements 27.5**
  - [x] 11.3 Implement Order_Service
    - create (confirmation with id/items/total/address/slot), transitionStatus (persist timestamped history + notify), getTracking (ownership-enforced, earliest→latest), listOrders (recency-desc, cursor)
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 27.4_
  - [x]* 11.4 Write property test: order status history chronologically ordered
    - **Property 29: Order status history is chronologically ordered**
    - **Validates: Requirements 20.2, 20.3**
  - [x]* 11.5 Write property test: order confirmation completeness
    - **Property 30: Order confirmation completeness**
    - **Validates: Requirements 20.1**

- [x] 12. Checkpoint - commerce, payment, orders
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Auth_Service and session/token management
  - [x] 13.1 Implement OTP domain rules and Auth_Service OTP flow
    - E.164 validation, 6-digit code, Redis TTL (5-min validity, 5-attempt lockout, 5-per-15-min request cap) via SmsGateway; issue access(15m)+refresh(30d)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  - [x]* 13.2 Write property test: E.164 phone validation
    - **Property 45: E.164 phone validation**
    - **Validates: Requirements 1.1**
  - [x]* 13.3 Write property test: OTP attempt lockout
    - **Property 46: OTP attempt lockout**
    - **Validates: Requirements 1.5**
  - [x] 13.4 Implement social/guest auth, guest migration, and token lifecycle
    - Apple/Google identity-token verification, guest session (30-day), guest→account migration with cart merge, refresh/logout with revocation via RefreshToken store
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x]* 13.5 Write property test: guest cart merge keeps higher quantity
    - **Property 48: Guest cart merge keeps the higher quantity**
    - **Validates: Requirements 2.4, 2.5**
  - [x]* 13.6 Write property test: refresh-token state gating
    - **Property 50: Refresh-token state gating**
    - **Validates: Requirements 3.1, 3.2**
  - [ ]* 13.7 Write unit tests for OTP success/mismatch/expiry, social sign-in, logout revocation
    - _Requirements: 1.3, 1.4, 1.6, 2.1, 2.2, 2.3, 3.3_

- [x] 14. Profile_Service and health-profile validation
  - [x] 14.1 Implement health-profile validation and Profile_Service
    - Range/enum validation (age 1-120, height 30-300, weight 1-500, gender/activity/diet enums); reject leaves prior profile unchanged; upsert + read most-recent
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_
  - [x]* 14.2 Write property test: profile range validation with unchanged prior state
    - **Property 54: Health-profile range validation with unchanged prior state**
    - **Validates: Requirements 4.1, 4.2**
  - [x]* 14.3 Write property test: profile update round-trip
    - **Property 55: Health-profile update round-trip**
    - **Validates: Requirements 4.3**

- [x] 15. Marketplace_Service, Product_Service, Wishlist_Service, Search_Service
  - [x] 15.1 Implement Marketplace_Service with caching and pagination
    - Nine fixed groups; ProductCard with image/grade/brand/price/discount; Redis-cached TTL; cursor pagination (default 20); exclude inactive-vendor products
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 28.5_
  - [x]* 15.2 Write property test: product card completeness
    - **Property 18: Product card completeness**
    - **Validates: Requirements 5.2**
  - [ ]* 15.3 Write property test: pagination covers all items, no gaps/duplicates
    - **Property 27: Pagination covers all items with no gaps or duplicates**
    - **Validates: Requirements 5.3, 25.1, 29.1**
  - [x] 15.4 Implement Product_Service detail, alternatives, recently-viewed, reviews
    - Detail completeness; better-alternatives (same category, strictly higher grade, ordered, capped 10 detail / 3 scan); recently-viewed dedupe + cap; review purchase-auth + rating/text validation
    - _Requirements: 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 10.4, 10.5_
  - [x]* 15.5 Write property test: product detail completeness
    - **Property 19: Product detail completeness**
    - **Validates: Requirements 8.1, 8.3**
  - [ ]* 15.6 Write property test: better alternatives same-category, higher grade, ordered, capped
    - **Property 20: Better alternatives are same-category, strictly higher grade, ordered, and capped**
    - **Validates: Requirements 8.4, 10.4, 10.5**
  - [ ]* 15.7 Write property test: recently viewed deduped, most-recent-first, capped
    - **Property 25: Recently viewed is deduplicated, most-recent-first, and capped**
    - **Validates: Requirements 7.2, 7.3, 7.4**
  - [ ]* 15.8 Write property test: review authorization and validation
    - **Property 56: Review authorization and validation**
    - **Validates: Requirements 8.6, 8.7, 8.8**
  - [x] 15.9 Implement Wishlist_Service
    - add/remove saved products; list ordered most-recently-saved-first with dedupe
    - _Requirements: 6.2, 6.3, 7.1_
  - [x] 15.10 Implement Search_Service with filters
    - Case-insensitive contains over name/brand/category; empty/whitespace skips text match; conjunctive health filters; exclude inactive-vendor products; cursor pagination
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 28.5_
  - [x]* 15.11 Write property test: search text matching complete and sound
    - **Property 21: Search text matching is complete and sound**
    - **Validates: Requirements 9.1**
  - [x]* 15.12 Write property test: empty/cleared queries return unfiltered set
    - **Property 22: Empty or cleared queries return the unfiltered set**
    - **Validates: Requirements 9.2, 9.5**
  - [x]* 15.13 Write property test: applied filters satisfied by every result
    - **Property 23: Applied filters are satisfied by every result (conjunction)**
    - **Validates: Requirements 9.3, 9.4**
  - [x]* 15.14 Write property test: recency-descending ordering
    - **Property 26: Recency-descending ordering**
    - **Validates: Requirements 7.1, 15.1, 20.6, 25.6**

- [x] 16. Vendor_Service and inactive-vendor exclusion
  - [x] 16.1 Implement Vendor_Service
    - create vendor; associate submitted product data + trigger GradingService recompute; reject direct grade-set with audit; schema validation; deactivate excludes products from marketplace/search/detail
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5_
  - [ ]* 16.2 Write property test: inactive-vendor products excluded everywhere
    - **Property 24: Inactive-vendor products are excluded everywhere**
    - **Validates: Requirements 28.5**

- [x] 17. AI_Analysis_Service (grade-safe enrichment)
  - [x] 17.1 Implement AI_Analysis_Service over Claude gateway
    - analyze(ingredients, nutrition, profile?) with 10s timeout; on error/timeout return objective grade + red flags flagged `analysisUnavailable`; no write path to grades
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [x]* 17.2 Write property test: AI analysis never alters the grade
    - **Property 5: AI analysis never alters the grade**
    - **Validates: Requirements 11.4**
  - [ ]* 17.3 Write unit/integration tests: AI fallback returns grade+flags; Claude happy path
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 18. Checkpoint - catalog, search, auth, AI
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Delivery_Service: geofence, pincode, and slots
  - [x] 19.1 Implement Haversine geofence and pincode validation (pure)
    - `isServiceable(lat,lng)` ≤5km from CDS Corporate, Cyber Park, Gurugram; `isValidPincode` 6-digit numeric
    - _Requirements: 18.1, 18.2, 18.3_
  - [x]* 19.2 Write property test: geofence serviceability boundary
    - **Property 39: Geofence serviceability boundary**
    - **Validates: Requirements 18.1, 18.2**
  - [x]* 19.3 Write property test: pincode format validation
    - **Property 40: Pincode format validation**
    - **Validates: Requirements 18.3**
  - [x] 19.4 Implement Delivery_Service pincode registration and slots
    - Idempotent pincode registration per user; getSlots (next 7 days, capacity status); reserveSlot 10-min Redis-TTL hold with auto-release; reject full-slot selection
    - _Requirements: 18.4, 18.5, 19.1, 19.2, 19.3, 19.4_
  - [x]* 19.5 Write property test: pincode registration idempotent per user
    - **Property 41: Pincode registration is idempotent per user**
    - **Validates: Requirements 18.4, 18.5**
  - [ ]* 19.6 Write property test: delivery slots within next seven days
    - **Property 42: Delivery slots fall within the next seven days**
    - **Validates: Requirements 19.1**
  - [ ]* 19.7 Write property test: slot reservation released on hold expiry
    - **Property 43: Slot reservation is released on hold expiry**
    - **Validates: Requirements 19.3**
  - [x]* 19.8 Write property test: full slots reject selection
    - **Property 44: Full slots reject selection**
    - **Validates: Requirements 19.4**

- [x] 20. Notification_Service and OneSignal gateway
  - [x] 20.1 Implement Notification_Service
    - Dedup token registration; category-preference suppression; dispatch with up to 3 retries then record failure; remove invalid tokens
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 18.6, 20.5_
  - [x]* 20.2 Write property test: disabled notification categories suppressed
    - **Property 60: Disabled notification categories are suppressed**
    - **Validates: Requirements 26.2, 26.4**
  - [x]* 20.3 Write property test: save/token operations idempotent
    - **Property 58: Save operations are idempotent**
    - **Validates: Requirements 25.2, 26.1**
  - [ ]* 20.4 Write integration tests: OneSignal register/dispatch/invalid-token, pincode fan-out, order-status notify
    - _Requirements: 26.2, 26.3, 26.5, 18.6, 20.5_

- [x] 21. Rewards_Service: XP, streaks, badges, cashback, leaderboard
  - [x] 21.1 Implement pure streak logic and scan-reward dedupe
    - `nextStreak(lastDay, today, current)` consecutive-UTC-day increment / same-day no-op / reset; scan reward keyed by (userId, productId, utcDay)
    - _Requirements: 23.1, 23.2, 24.1, 24.2, 24.3, 24.4, 24.5_
  - [x]* 21.2 Write property test: scan reward once per product per UTC day
    - **Property 31: Scan reward is granted exactly once per product per UTC day**
    - **Validates: Requirements 23.1, 23.2**
  - [x]* 21.3 Write property test: consecutive-day streak logic
    - **Property 32: Consecutive-day streak logic**
    - **Validates: Requirements 24.1, 24.2, 24.3, 24.4, 24.5**
  - [x] 21.4 Implement XP awards, one-time grants, cashback, and leaderboard
    - Transactional XP awards (failure leaves total unchanged); exactly-once badges/achievements/cashback via unique constraints; cashback via Wallet_Service; leaderboard top-100 XP-desc with earliest-reached tiebreak
    - _Requirements: 23.3, 23.4, 23.5, 23.6, 23.7, 24.6_
  - [x]* 21.5 Write property test: one-time grants idempotent
    - **Property 33: One-time grants are idempotent**
    - **Validates: Requirements 23.4, 23.5, 24.6**
  - [x]* 21.6 Write property test: leaderboard ordering and bound
    - **Property 34: Leaderboard ordering and bound**
    - **Validates: Requirements 23.6**
  - [x]* 21.7 Write property test: failed XP award leaves total unchanged
    - **Property 35: Failed XP award leaves the total unchanged**
    - **Validates: Requirements 23.7**

- [x] 22. Subscription_Service and Bundle_Service
  - [x] 22.1 Implement Subscription_Service and the due-order worker
    - create (milk/bread/eggs/vegetables/fruits, 2-day schedule); generateDueOrders advancing schedule by 2 days, skipping+flagging out-of-stock items and notifying; pause/resume/cancel lifecycle
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6_
  - [x]* 22.2 Write property test: due active subscriptions generate one order, advance two days
    - **Property 36: Due active subscriptions generate an order and advance by two days**
    - **Validates: Requirements 21.2**
  - [x]* 22.3 Write property test: non-active subscriptions never generate orders
    - **Property 37: Non-active subscriptions never generate orders**
    - **Validates: Requirements 21.4, 21.6**
  - [x] 22.4 Implement Bundle_Service
    - Six fixed bundles (multi-brand); per-product availability; partial-availability flag identifying unavailable product; add-to-cart inserts in-stock subset only
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_
  - [x]* 22.5 Write property test: bundle add inserts exactly the in-stock subset
    - **Property 38: Bundle add inserts exactly the in-stock subset**
    - **Validates: Requirements 22.3, 22.4, 22.5**

- [x] 23. Newsletter_Service
  - [x] 23.1 Implement Newsletter_Service
    - listArticles (recency-desc, 20/page); dedup save; reading progress 0-100 validation + persist; share link; listSaved recency-desc
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6_
  - [x]* 23.2 Write property test: reading-progress validation and round-trip
    - **Property 57: Reading-progress validation and round-trip**
    - **Validates: Requirements 25.3, 25.4**

- [x] 24. Admin_Panel services and analytics
  - [x] 24.1 Implement admin CRUD services with pagination clamp
    - Admin create/update/delete for products/brands/coupons/bundles/articles through backend services with schema validation; grade computed on nutrition/ingredient submission; override rejected + audited; paginated lists default 20 / max 50; analytics aggregation; non-admin denied
    - _Requirements: 27.1, 27.2, 27.3, 27.6, 27.7, 27.8, 27.9_
  - [x]* 24.2 Write property test: admin page size clamped
    - **Property 28: Admin page size is clamped**
    - **Validates: Requirements 27.3**
  - [ ]* 24.3 Write integration test: analytics aggregation
    - _Requirements: 27.6_

- [x] 25. Compose tRPC routers and expose all services
  - [x] 25.1 Implement all tRPC routers and appRouter
    - One router per service (auth, profile, marketplace, product, search, scanner, ai, cart, coupon, wallet, checkout, payment, delivery, order, subscription, bundle, rewards, newsletter, notification, admin, vendor) with correct procedure guards; compose into `appRouter`
    - _Requirements: 31.1, 30.1, 30.7_
  - [x] 25.2 Implement Razorpay and OneSignal REST webhook route handlers
    - Signature-verified, idempotent-by-external-reference webhook handlers outside tRPC
    - _Requirements: 17.2, 26.3_
  - [ ]* 25.3 Write smoke test: dependency-cruiser architecture boundaries
    - Assert presentation→application→domain→infrastructure only and no persistence outside repositories
    - _Requirements: 31.1, 31.2, 31.3, 31.4_

- [x] 26. Checkpoint - full backend surface
  - Ensure all tests pass, ask the user if questions arise.

- [x] 27. Mobile client foundation: design system and infrastructure
  - [x] 27.1 Implement design-system tokens, theming, and dark mode
    - Purple primary / green accent, Inter typography, large rounded corners, soft elevation; light/dark themes; base components (Button, Card, Input, Badge, GradeBadge)
    - _Requirements: 32.1, 32.2, 32.3, 32.4, 32.5, 32.6_
  - [ ]* 27.2 Write property test: theme contrast ratios meet WCAG AA
    - **Property 61: Theme contrast ratios meet WCAG AA**
    - **Validates: Requirements 32.3**
  - [ ]* 27.3 Write property test: interactive touch-target minimum size
    - **Property 62: Interactive touch-target minimum size**
    - **Validates: Requirements 32.6**
  - [x] 27.4 Implement client infrastructure: tRPC client, MMKV, React Query persistence
    - Typed tRPC client, MMKV-backed React Query persistence for offline reads, `expo-image` disk cache, Zustand stores (authStore, cartStore, filterStore)
    - _Requirements: 29.2, 29.3, 29.4, 31.2_
  - [x] 27.5 Implement tab navigation shell (Expo Router)
    - Five tabs (Marketplace, Scanner, Rewards, Orders, Profile) with accessible labels and 44×44 touch targets
    - _Requirements: 32.4, 32.6_

- [x] 28. Mobile client: marketplace, product detail, cart/wishlist
  - [x] 28.1 Implement marketplace home with infinite scroll and group error/empty states
    - FlashList + `useInfiniteQuery` (20/page); ProductCard; per-group error retry and empty-group states
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 29.1_
  - [x] 28.2 Implement product detail screen
    - Images, nutrition, ingredients, grade + reasoning, red flags, better alternatives, reviews (with submit), related products; not-found + empty-reviews states
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - [x] 28.3 Implement quick-add/wishlist optimistic updates and cart screen
    - `onMutate` snapshot + `onError` rollback for cart/wishlist; out-of-stock error surfacing; cart quantity edit/remove
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 13.1, 13.2, 13.3, 29.5_
  - [x] 28.4 Implement search and health-filter UI
    - Search box (case-insensitive), filter chips (conjunctive), no-results state, wishlist + recently-viewed views
    - _Requirements: 7.1, 7.4, 9.1, 9.3, 9.5, 9.6_

- [x] 29. Mobile client: scanner
  - [x] 29.1 Implement Scanner_Service client component
    - Vision Camera barcode capture → catalog lookup (≤3s); label image → OCR → submit text; OCR-failure recapture prompt; barcode no-match offers label capture; up to 3 better alternatives
    - _Requirements: 10.1, 10.2, 10.3, 10.8_
  - [x] 29.2 Implement Buy-from-ANVESA vs Amazon affiliate actions
    - Present Buy-from-ANVESA when alternative in catalog, else Amazon affiliate link
    - _Requirements: 10.6, 10.7_
  - [ ]* 29.3 Write unit tests: OCR-failure recapture and affiliate selection
    - _Requirements: 10.3, 10.6, 10.7_

- [x] 30. Mobile client: checkout, orders, rewards, subscriptions, bundles, newsletter, profile
  - [x] 30.1 Implement checkout flow
    - Address + Google Maps geofence check, pincode collection when out-of-zone, slot selection with 10-min hold, coupon + wallet application, Razorpay payment, order confirmation
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 17.1, 18.1, 18.2, 18.3, 19.1, 19.2, 19.4_
  - [x] 30.2 Implement orders list and tracking screens
    - Recency-desc order list; tracking with status history (earliest→latest)
    - _Requirements: 20.3, 20.6_
  - [x] 30.3 Implement rewards, subscriptions, bundles, newsletter, and profile screens
    - Satya XP/badges/streaks/leaderboard; subscription create/pause/resume/cancel; bundles with partial-availability; newsletter list/save/progress/share; health-profile form + profile-not-set state; notification preferences + OneSignal token registration
    - _Requirements: 4.1, 4.6, 21.1, 21.4, 21.5, 21.6, 22.1, 23.6, 25.1, 25.2, 25.3, 25.5, 26.1, 26.4_

- [x] 31. Seed data and admin/vendor web panel
  - [x] 31.1 Implement seed scripts and dummy catalog data
    - Seed categories, brands, vendors, products (with nutrition/ingredients → graded via GradingService), variants, bundles, coupons, delivery slots, and articles
    - _Requirements: 5.1, 22.1, 19.1_
  - [x] 31.2 Implement admin/vendor web panel screens
    - Catalog/coupon/bundle/article CRUD, order-status management, vendor management, analytics dashboards wired to admin routers
    - _Requirements: 27.1, 27.3, 27.4, 27.6, 28.1, 28.5_

- [x] 32. Final integration and wiring
  - [x] 32.1 Wire scheduled workers and end-to-end flows
    - Register subscription due-order worker and slot-hold expiry sweeper; connect notification dispatch to order-status and pincode-availability events; verify all routers wired into the client
    - _Requirements: 19.3, 20.5, 21.2, 18.6_
  - [ ]* 32.2 Write smoke tests: indexes exist; design-system dark-mode + a11y labels + dynamic font scaling
    - Assert browse/search/order-lookup indexes; snapshot/a11y checks for 32.1, 32.2, 32.4, 32.5
    - _Requirements: 29.8, 32.1, 32.2, 32.4, 32.5_
  - [ ]* 32.3 Write integration test: cached-read p95 < 500ms and signed-upload URL expiry ≤ 15 min
    - _Requirements: 29.6, 29.7, 30.4_

- [x] 33. Final checkpoint - full system
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each of Properties 1-62 is implemented by exactly one `fast-check` property test (min 100 iterations), tagged `// Feature: anvesa-marketplace, Property {number}: {property_text}`, placed close to the code it validates to catch errors early.
- The dependency rule is honored: domain (Section 3-5) precedes application services (Section 8-24) which precede tRPC routers (Section 25); infrastructure adapters (Section 7) implement domain-declared ports.
- Grading integrity (Properties 1-5) and money math (Properties 6-17) are front-loaded as the highest-value suites.
- Unit, integration, and smoke tests complement property tests per the Testing Strategy for external services, configuration, and UI/accessibility concerns.
- Checkpoints (Sections 6, 12, 18, 26, 33) provide incremental validation gates.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1", "4.1", "4.4", "4.7", "5.1"] },
    { "id": 3, "tasks": ["2.4", "3.2", "4.2", "4.3", "4.5", "4.6", "4.8", "4.9", "4.10", "5.2", "5.3"] },
    { "id": 4, "tasks": ["3.3", "3.4", "3.5", "7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3"] },
    { "id": 6, "tasks": ["7.4", "8.1", "11.1", "13.1", "19.1", "21.1"] },
    { "id": 7, "tasks": ["7.5", "7.6", "7.7", "7.8", "7.9", "8.2", "8.3", "8.4", "11.2", "13.2", "13.3", "19.2", "19.3", "21.2", "21.3"] },
    { "id": 8, "tasks": ["9.1", "9.2", "9.5", "10.1", "13.4", "14.1", "17.1", "20.1", "21.4"] },
    { "id": 9, "tasks": ["9.3", "9.4", "9.6", "10.2", "13.5", "13.6", "13.7", "14.2", "14.3", "17.2", "17.3", "20.2", "20.3", "20.4", "21.5", "21.6", "21.7"] },
    { "id": 10, "tasks": ["10.3", "11.3", "15.1", "15.9", "15.10", "16.1", "19.4", "22.1", "22.4", "23.1"] },
    { "id": 11, "tasks": ["10.4", "11.4", "11.5", "15.2", "15.3", "15.4", "15.5", "15.6", "15.7", "15.8", "15.11", "15.12", "15.13", "15.14", "16.2", "19.5", "19.6", "19.7", "19.8", "22.2", "22.3", "22.5", "23.2", "24.1"] },
    { "id": 12, "tasks": ["24.2", "24.3", "25.1"] },
    { "id": 13, "tasks": ["25.2", "25.3"] },
    { "id": 14, "tasks": ["27.1", "27.4"] },
    { "id": 15, "tasks": ["27.2", "27.3", "27.5", "28.1", "28.2", "28.3", "28.4", "29.1"] },
    { "id": 16, "tasks": ["29.2", "29.3", "30.1", "30.2", "30.3", "31.1", "31.2"] },
    { "id": 17, "tasks": ["32.1"] },
    { "id": 18, "tasks": ["32.2", "32.3"] }
  ]
}
```
