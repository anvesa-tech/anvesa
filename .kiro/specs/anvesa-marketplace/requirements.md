# Requirements Document

## Introduction

ANVESA is a production-ready, enterprise-grade clean-food marketplace mobile application built on the principle "Buy what's verified, not what's marketed." Every product listed in the marketplace is verified using an objective, integrity-protected grading system. The in-app scanner is one feature that feeds the marketplace, but the marketplace itself is the hero experience.

The application spans a React Native + Expo mobile client and a Next.js 15 backend using tRPC, Prisma, Supabase (Postgres/Storage/Auth), and Redis, with Razorpay payments, OneSignal notifications, Google Maps, a Vision-Camera-based scanner (barcode + OCR), and Anthropic Claude for AI-driven analysis. The system follows Clean Architecture with strict separation between Presentation, Application, Domain, and Infrastructure layers.

The single most important business rule is grading integrity: the grading algorithm must never be influenced by advertising, sponsored listings, payments, or brand partnerships. A brand may pay to be listed but may never pay for a higher grade, and this must be enforced at the backend.

This document specifies requirements across authentication, health profiles, the marketplace, product pages, scanning, the grading engine, shopping and checkout, delivery zoning, subscriptions, functional bundles, rewards, newsletter, notifications, the admin panel, vendor management, performance, security, architecture, and the design system.

## Glossary

- **ANVESA_App**: The React Native mobile client that provides the user-facing presentation layer across the Marketplace, Scanner, Rewards, Orders, and Profile tabs.
- **Backend_System**: The Next.js 15 + tRPC server application that hosts all business logic, exposes typed API procedures, and coordinates domain services.
- **Auth_Service**: The backend component responsible for authentication, session management, tokens, and login methods (OTP, Guest, Apple, Google).
- **Profile_Service**: The backend component that manages user health profiles and personal attributes.
- **Marketplace_Service**: The backend component that serves the marketplace homepage, product groups, and category browsing.
- **Product_Service**: The backend component that serves product detail data including images, nutrition, ingredients, grades, flags, alternatives, reviews, and related products.
- **Search_Service**: The backend component that handles product search and filter application.
- **Scanner_Service**: The ANVESA_App component that captures barcodes and food-label images and initiates analysis.
- **Grading_Engine**: The backend component that computes an objective product grade solely from product composition and nutrition data.
- **AI_Analysis_Service**: The backend component that uses the Anthropic Claude API to generate ingredient analysis, health summaries, and grade reasoning text.
- **Cart_Service**: The backend component that manages the shopping cart and its items.
- **Wishlist_Service**: The backend component that manages saved (wishlisted) products.
- **Coupon_Service**: The backend component that validates and applies coupons.
- **Wallet_Service**: The backend component that manages the user wallet balance and wallet transactions.
- **Checkout_Service**: The backend component that orchestrates checkout including address, delivery slot, coupons, wallet, and payment.
- **Payment_Service**: The backend component that integrates with Razorpay to process and verify payments.
- **Delivery_Service**: The backend component that determines delivery eligibility by geographic zone and manages pincode collection and delivery slots.
- **Order_Service**: The backend component that creates orders and manages order status and tracking.
- **Subscription_Service**: The backend component that manages recurring subscriptions and their lifecycle.
- **Bundle_Service**: The backend component that manages functional product bundles.
- **Rewards_Service**: The backend component that manages Satya XP, badges, achievements, streaks, cashback, and leaderboards.
- **Newsletter_Service**: The backend component that manages articles, saved articles, sharing, and reading progress.
- **Notification_Service**: The backend component that dispatches push notifications via OneSignal.
- **Admin_Panel**: The web-based administrative interface used by administrators to manage the platform.
- **Vendor_Service**: The backend component that manages vendor accounts and vendor-supplied product data.
- **Security_Layer**: The cross-cutting backend component enforcing authentication, authorization, Row Level Security, rate limiting, request validation, signed upload URLs, and audit logging.
- **Persistence_Layer**: The Prisma + Supabase Postgres data storage layer with Redis caching.
- **Satya_XP**: The experience-point reward currency earned by users through scans, purchases, and engagement.
- **Grade**: An objective letter or score rating assigned to a product by the Grading_Engine reflecting nutritional and ingredient quality.
- **Red_Flag**: A named concern about a product (for example, high sugar or presence of a harmful additive) surfaced to the user.
- **Delivery_Zone**: The serviceable geographic area, initially a 5-kilometer radius around CDS Corporate, Cyber Park, Gurugram.
- **Guest_User**: A user who transacts without creating a persistent authenticated account.
- **Better_Alternative**: A product with a higher Grade that the system recommends in place of a scanned or viewed product.

## Requirements

### Requirement 1: OTP Authentication

**User Story:** As a new or returning user, I want to log in using a one-time password sent to my phone, so that I can access my account without managing a password.

#### Acceptance Criteria

1. IF a user submits a phone number that is not in valid E.164 format, THEN THE Auth_Service SHALL reject the request and return a validation error identifying the phone-number field.
2. WHEN a user submits a phone number in valid E.164 format for login, THE Auth_Service SHALL generate a 6-digit numeric one-time password and deliver it to the submitted phone number within 30 seconds.
3. WHEN a user submits a one-time password that matches the active code for the phone number within the 5-minute validity period, THE Auth_Service SHALL create an authenticated session and issue a JWT access token and a refresh token.
4. IF a user submits a one-time password that does not match the active code, THEN THE Auth_Service SHALL reject the login attempt and return an authentication error.
5. IF a user submits an incorrect one-time password 5 times for the same active code, THEN THE Auth_Service SHALL invalidate the active code and require the user to request a new one-time password.
6. IF a user submits a one-time password after the 5-minute validity period has elapsed, THEN THE Auth_Service SHALL reject the login attempt and return an expiration error.
7. WHEN a single phone number requests more than 5 one-time passwords within a 15-minute window, THE Auth_Service SHALL reject further requests and return a rate-limit error indicating the retry-after time.

### Requirement 2: Social and Guest Authentication

**User Story:** As a user, I want to sign in with Apple, Google, or continue as a guest, so that I can choose the entry method that suits me.

#### Acceptance Criteria

1. WHEN a user completes Apple sign-in with a valid Apple identity token, THE Auth_Service SHALL create or link an account and issue a JWT access token and a refresh token.
2. WHEN a user completes Google sign-in with a valid Google identity token, THE Auth_Service SHALL create or link an account and issue a JWT access token and a refresh token.
3. WHEN a user chooses to continue as a guest, THE Auth_Service SHALL create a Guest_User session that permits browsing and guest checkout and that remains valid for 30 days from the last activity.
4. WHEN a Guest_User completes account creation, THE Auth_Service SHALL migrate the guest cart and guest activity to the newly created account.
5. WHEN a guest cart is migrated to an account that already contains cart items, THE Auth_Service SHALL merge the carts and retain the higher quantity for any product variant present in both.
6. IF a social identity token fails verification, THEN THE Auth_Service SHALL reject the login attempt and return an authentication error.

### Requirement 3: Session and Token Management

**User Story:** As a user, I want my session to stay valid securely and refresh automatically, so that I remain logged in without repeated authentication.

#### Acceptance Criteria

1. WHEN a client submits a request with an expired access token and an unexpired, non-revoked refresh token, THE Auth_Service SHALL issue a new access token.
2. IF a client submits a request with a refresh token that is invalid, expired, or revoked, THEN THE Auth_Service SHALL reject the request and return an authentication error.
3. WHEN a user logs out, THE Auth_Service SHALL revoke the refresh token associated with the session.
4. THE Auth_Service SHALL expire each access token 15 minutes after issuance.
5. THE Auth_Service SHALL expire each refresh token 30 days after issuance.

### Requirement 4: Health Profile Management

**User Story:** As a user, I want to record my health profile, so that the app can personalize grades, filters, and recommendations to my needs.

#### Acceptance Criteria

1. WHEN an authenticated user submits health profile data containing age (1 to 120 years), gender (a value from the defined gender set), height (30 to 300 centimeters), weight (1 to 500 kilograms), health conditions, goals, activity level (a value from the defined activity-level set), and diet (a value from the defined diet set), THE Profile_Service SHALL validate each field against its defined range or value set and persist the health profile.
2. IF submitted health profile data contains a field value outside its defined valid range or not within its defined value set, THEN THE Profile_Service SHALL reject the submission, leave any previously stored profile unchanged, and return a validation error identifying the invalid field.
3. WHEN an authenticated user updates an existing health profile with values that pass validation, THE Profile_Service SHALL persist the updated values and return the most recent stored values for subsequent requests.
4. WHERE a user has one or more recorded health conditions in the health profile, THE Product_Service SHALL include Red_Flag information relevant to those conditions in product responses for that user.
5. WHEN an authenticated user requests the health profile and a stored profile exists, THE Profile_Service SHALL return the stored profile values for that user.
6. IF an authenticated user requests the health profile and no profile has been stored for that user, THEN THE Profile_Service SHALL return an empty-profile result and THE ANVESA_App SHALL display a profile-not-set state.

### Requirement 5: Marketplace Homepage and Product Groups

**User Story:** As a shopper, I want the marketplace homepage to present products grouped by category, so that I can browse verified products by the way I shop.

#### Acceptance Criteria

1. WHEN a user opens the Marketplace tab, THE Marketplace_Service SHALL return product groups for Breakfast, Snacks, Beverages, Staples, Kids, Protein, Organic, Dairy, and Healthy Alternatives.
2. WHEN the Marketplace_Service returns a product group, THE Marketplace_Service SHALL include for each product an image reference, Grade, brand name, price, and discount value.
3. WHEN a user scrolls to the end of a product group listing, THE Marketplace_Service SHALL return the next page of products for that group using pagination with the configured page size.
4. WHILE product-group data exists in the cache and the data's configured time-to-live has not elapsed, THE Marketplace_Service SHALL return the cached data.
5. IF the Marketplace_Service cannot retrieve products for a group, THEN THE ANVESA_App SHALL display an error state for that group and provide a control that re-requests that group's products.
6. IF a product group contains no products, THEN THE Marketplace_Service SHALL return an empty product list for that group and THE ANVESA_App SHALL display an empty-group state.

### Requirement 6: Product Card Interactions

**User Story:** As a shopper, I want quick actions on each product card, so that I can add products to my cart or wishlist without leaving the browse view.

#### Acceptance Criteria

1. WHEN a user activates quick add on a product card, THE Cart_Service SHALL add the selected product variant to the cart and return the updated cart summary.
2. WHEN an authenticated user activates the wishlist control on a product card, THE Wishlist_Service SHALL add the product to the user's saved products.
3. WHEN an authenticated user deactivates the wishlist control on a product card, THE Wishlist_Service SHALL remove the product from the user's saved products.
4. WHEN a user activates quick add, THE ANVESA_App SHALL apply an optimistic update to the cart indicator before the Cart_Service response is received.
5. IF the Cart_Service rejects a quick add, THEN THE ANVESA_App SHALL revert the optimistic cart update to its pre-add state and display an error message indicating the add failed.
6. IF a user attempts a quick add for a product variant that has no available stock, THEN THE Cart_Service SHALL reject the quick add and return an out-of-stock error.

### Requirement 7: Wishlist and Recently Viewed

**User Story:** As a shopper, I want to view my saved products and recently viewed products, so that I can return to items of interest.

#### Acceptance Criteria

1. WHEN an authenticated user requests saved products, THE Wishlist_Service SHALL return the list of products the user has saved ordered from most recently saved to least recently saved.
2. WHEN a user opens a product detail page for a product not already in the user's recently viewed history, THE Product_Service SHALL add the product to the history as the most recent entry.
3. WHEN a user opens a product detail page for a product already in the user's recently viewed history, THE Product_Service SHALL move the product to the most recent position without creating a duplicate entry.
4. WHEN a user requests recently viewed products, THE Product_Service SHALL return the recently viewed products ordered from most recent to least recent, limited to the configured maximum history size.

### Requirement 8: Product Detail Page

**User Story:** As a shopper, I want a detailed product page, so that I can understand a product's grade, composition, and better options before buying.

#### Acceptance Criteria

1. WHEN a user opens a product detail page for a product that exists in the catalog, THE Product_Service SHALL return the product images, nutrition panel data, ingredient list, Grade, grade explanation, grade reasoning, Red_Flag list, Better_Alternative list, reviews, and related products.
2. IF a user opens a product detail page for a product that does not exist in the catalog, THEN THE Product_Service SHALL return a product-not-found result and THE ANVESA_App SHALL display a not-found state.
3. WHEN the Product_Service returns grade reasoning, THE Product_Service SHALL include the factors that determined the Grade.
4. WHEN a user requests Better_Alternative products for a viewed product, THE Product_Service SHALL return products of the same category that have a higher Grade than the viewed product, ordered from highest Grade to lowest Grade and limited to a maximum of 10 products.
5. IF a product has no recorded reviews, THEN THE Product_Service SHALL return an empty review list and THE ANVESA_App SHALL display an empty-reviews state.
6. WHEN a user who has purchased the product submits a review with a rating from 1 to 5 and review text no longer than 2000 characters, THE Product_Service SHALL persist the review and associate the review with the product and the user.
7. IF a user who has not purchased the product submits a review, THEN THE Product_Service SHALL reject the submission and return an authorization error.
8. IF a user submits a review with a rating outside the range 1 to 5 or review text longer than 2000 characters, THEN THE Product_Service SHALL reject the submission and return a validation error.

### Requirement 9: Search and Health Filters

**User Story:** As a shopper, I want to search and filter products by health attributes, so that I can find products that match my dietary needs.

#### Acceptance Criteria

1. WHEN a user submits a non-empty search query, THE Search_Service SHALL return products whose name, brand, or category contains the query using case-insensitive matching.
2. IF a user submits a search query that is empty or contains only whitespace, THEN THE Search_Service SHALL return the unfiltered result set without applying text matching.
3. WHEN a user applies one or more of the filters Low Sugar, Low Sodium, High Protein, Low Fat, High Fibre, Kids Safe, Diabetic Friendly, Weight Loss, Heart Friendly, or Gluten Free, THE Search_Service SHALL return only products that satisfy every applied filter.
4. WHEN a user applies multiple filters simultaneously, THE Search_Service SHALL combine the filters using logical conjunction.
5. WHEN a user clears all filters, THE Search_Service SHALL return the unfiltered result set for the current query.
6. IF no products match the applied search query and filters, THEN THE Search_Service SHALL return an empty result set and THE ANVESA_App SHALL display a no-results state.

### Requirement 10: Product Scanning

**User Story:** As a user, I want to scan a product barcode or food label, so that I can instantly see its grade and health analysis.

#### Acceptance Criteria

1. WHEN a user scans a barcode that matches a product in the catalog, THE Scanner_Service SHALL retrieve the matching product within 3 seconds and THE Product_Service SHALL return the product Grade, ingredient analysis, Red_Flag list, nutrition data, health summary, and up to three Better_Alternative products.
2. WHEN a user captures a food-label image, THE Scanner_Service SHALL extract label text using optical character recognition and submit the extracted text for analysis.
3. IF optical character recognition fails to extract readable text from a captured food-label image, THEN THE Scanner_Service SHALL return an extraction-failed result and THE ANVESA_App SHALL prompt the user to recapture the food label.
4. WHEN a scanned or extracted product has three or more higher-graded alternatives in the same category, THE Product_Service SHALL return exactly three Better_Alternative products.
5. WHEN a scanned or extracted product has fewer than three higher-graded alternatives in the same category, THE Product_Service SHALL return all available higher-graded alternatives in that category.
6. WHERE a Better_Alternative is available in the ANVESA catalog, THE ANVESA_App SHALL present a Buy-from-ANVESA action for that alternative.
7. WHERE a Better_Alternative is not available in the ANVESA catalog, THE ANVESA_App SHALL present an Amazon affiliate action using the product's affiliate link.
8. IF a scanned barcode matches no catalog product and no label analysis is available, THEN THE Scanner_Service SHALL return a not-found result and THE ANVESA_App SHALL offer the user the option to capture the food label.

### Requirement 11: AI-Assisted Analysis

**User Story:** As a user, I want plain-language ingredient analysis and health summaries, so that I can understand what a product's composition means for me.

#### Acceptance Criteria

1. WHEN the Backend_System requests analysis for a set of ingredients and nutrition values, THE AI_Analysis_Service SHALL return an ingredient analysis and a health summary using the Anthropic Claude API.
2. WHERE a user has a stored health profile, THE AI_Analysis_Service SHALL incorporate the user's health conditions and goals into the health summary.
3. IF the Anthropic Claude API returns an error or does not respond within 10 seconds, THEN THE AI_Analysis_Service SHALL return the objective Grade and Red_Flag data without the generated summary and THE ANVESA_App SHALL indicate that the extended analysis is temporarily unavailable.
4. THE AI_Analysis_Service SHALL NOT alter the Grade produced by the Grading_Engine.

### Requirement 12: Grading Integrity (Critical Business Rule)

**User Story:** As a user, I want to trust that grades are objective, so that I can buy what is verified rather than what is marketed.

#### Acceptance Criteria

1. THE Grading_Engine SHALL compute each product Grade solely from the product's nutrition data, ingredient data, and product composition attributes.
2. THE Grading_Engine SHALL exclude advertising status, sponsored-listing status, payment records, and brand-partnership status from every Grade computation input.
3. THE Grading_Engine SHALL assign each product exactly one Grade from the defined Grade scale.
4. WHEN a brand pays for a product listing, THE Backend_System SHALL make the product visible in the marketplace without changing the product's computed Grade.
5. IF any request, including a request from an authenticated administrator or vendor, attempts to set or override a product Grade with a value other than the value computed by the Grading_Engine, THEN THE Backend_System SHALL reject the request, retain the computed Grade unchanged, return an authorization error, and record the attempt in the audit log with the requester identity, the attempted value, and the timestamp.
6. WHEN the Grading_Engine computes a Grade, THE Grading_Engine SHALL produce identical Grades for identical composition inputs regardless of the brand or listing status.
7. WHEN a product's nutrition, ingredient, or composition data changes, THE Grading_Engine SHALL recompute the product Grade from the updated data and persist the recomputed Grade.

### Requirement 13: Shopping Cart

**User Story:** As a shopper, I want to manage items in my cart, so that I can prepare my order before checkout.

#### Acceptance Criteria

1. WHEN a user adds a product variant to the cart with a quantity from 1 to the variant's available stock, THE Cart_Service SHALL persist the cart item with its quantity and return the updated cart total.
2. WHEN a user changes the quantity of a cart item to a value from 1 to the variant's available stock, THE Cart_Service SHALL update the item quantity and recompute the cart total.
3. WHEN a user removes a cart item, THE Cart_Service SHALL delete the item from the cart and recompute the cart total.
4. IF a user sets a cart item quantity that exceeds the available stock for the variant, THEN THE Cart_Service SHALL reject the change, leave the existing cart item unchanged, and return an out-of-stock error.
5. IF a user sets a cart item quantity less than 1, THEN THE Cart_Service SHALL reject the change and return a validation error.
6. WHEN a Guest_User adds items to the cart, THE Cart_Service SHALL persist the guest cart for at least 30 days from the last cart modification.

### Requirement 14: Coupons

**User Story:** As a shopper, I want to apply coupons to my order, so that I can receive eligible discounts.

#### Acceptance Criteria

1. WHEN a user applies a coupon code that exists, is active, is not expired, is under its usage limit, and meets its minimum-order condition, THE Coupon_Service SHALL apply the coupon discount capped at the cart subtotal so the order total is never below zero, and return the updated order total.
2. IF a user applies a coupon code that does not exist, THEN THE Coupon_Service SHALL reject the coupon and return an invalid-coupon error.
3. IF a user applies a coupon code that has expired or reached its usage limit, THEN THE Coupon_Service SHALL reject the coupon and return an ineligible-coupon error.
4. IF a user applies a coupon whose minimum-order condition is not met by the cart, THEN THE Coupon_Service SHALL reject the coupon and return a condition-not-met error.
5. IF a user applies a coupon while another coupon is already applied to the order, THEN THE Coupon_Service SHALL reject the new coupon and return a single-coupon-per-order error.
6. WHEN a user removes an applied coupon, THE Coupon_Service SHALL remove the discount and recompute the order total.

### Requirement 15: Wallet

**User Story:** As a shopper, I want a wallet with a balance and transaction history, so that I can use stored value and cashback toward purchases.

#### Acceptance Criteria

1. WHEN a user requests the wallet, THE Wallet_Service SHALL return the current wallet balance and the wallet transaction history ordered from most recent to least recent.
2. WHEN a user applies a wallet amount that is greater than zero and no greater than the lesser of the available balance and the order's outstanding total, THE Wallet_Service SHALL deduct the applied amount and record a debit wallet transaction.
3. IF a user attempts to apply a wallet amount greater than the available balance, THEN THE Wallet_Service SHALL reject the application, leave the balance unchanged, and return an insufficient-balance error.
4. IF a user attempts to apply a wallet amount that is zero or less, THEN THE Wallet_Service SHALL reject the application and return a validation error.
5. WHEN cashback is granted to a user, THE Wallet_Service SHALL credit the cashback amount to the wallet balance and record a credit wallet transaction.
6. WHEN a wallet transaction is recorded, THE Wallet_Service SHALL persist the transaction amount, type (credit or debit), and timestamp.

### Requirement 16: Checkout Orchestration

**User Story:** As a shopper, I want a checkout flow that combines address, delivery slot, coupons, wallet, and payment, so that I can complete my purchase in one guided process.

#### Acceptance Criteria

1. WHEN a user begins checkout, THE Checkout_Service SHALL require a selected delivery address, a selected delivery slot, and a payment method before order placement.
2. WHEN a user proceeds through checkout, THE Checkout_Service SHALL compute the order total as the cart subtotal minus applied coupon discount minus applied wallet amount plus delivery charges, and SHALL NOT set the order total below zero.
3. IF a user begins checkout with an empty cart, THEN THE Checkout_Service SHALL block order placement and return an empty-cart error.
4. IF the selected delivery address is outside the Delivery_Zone, THEN THE Checkout_Service SHALL block order placement and invoke the pincode collection flow.
5. WHEN payment is confirmed, THE Checkout_Service SHALL create an order through the Order_Service and clear the user's cart.
6. IF payment is not confirmed, THEN THE Checkout_Service SHALL retain the cart and return the order to an unplaced state.

### Requirement 17: Payment Processing

**User Story:** As a shopper, I want to pay securely through Razorpay, so that my transactions are processed reliably.

#### Acceptance Criteria

1. WHEN a user initiates payment for an order total, THE Payment_Service SHALL create a Razorpay payment order for the computed amount.
2. WHEN Razorpay returns a payment success signature, THE Payment_Service SHALL verify the signature before marking the payment as successful.
3. IF the Razorpay payment signature fails verification, THEN THE Payment_Service SHALL mark the payment as failed, reject order placement, preserve the associated cart, return the order to an unplaced state, and return a payment-verification error.
4. WHEN a payment is marked successful, THE Payment_Service SHALL persist the payment record with the amount, status, and Razorpay reference.
5. WHEN a payment fails or is cancelled, THE Payment_Service SHALL persist the payment record with a failed status and preserve the associated cart.

### Requirement 18: Delivery Zone and Pincode Collection

**User Story:** As a user outside the serviceable area, I want to register my pincode for future service, so that I can be notified when delivery becomes available.

#### Acceptance Criteria

1. WHEN a user submits a delivery location within a 5-kilometer radius of CDS Corporate, Cyber Park, Gurugram, THE Delivery_Service SHALL mark the location as within the Delivery_Zone and permit checkout.
2. IF a user submits a delivery location more than 5 kilometers from CDS Corporate, Cyber Park, Gurugram, THEN THE Delivery_Service SHALL mark the location as unserviceable and prompt the user to submit a pincode.
3. IF a user submits a pincode that is not a 6-digit numeric value, THEN THE Delivery_Service SHALL reject the submission and return a validation error.
4. WHEN a user submits a valid 6-digit pincode from an unserviceable location, THE Delivery_Service SHALL persist the pincode with the user's identifier for future notification.
5. WHEN a user submits a pincode that is already registered for that user, THE Delivery_Service SHALL retain the single existing registration without creating a duplicate.
6. WHEN delivery service becomes available for a stored pincode, THE Notification_Service SHALL notify the users associated with that pincode.

### Requirement 19: Delivery Slots

**User Story:** As a shopper, I want to choose a delivery slot, so that my order arrives at a convenient time.

#### Acceptance Criteria

1. WHEN a user requests delivery slots for a serviceable address, THE Delivery_Service SHALL return the available delivery slots for the next 7 days, each with its start time, end time, and capacity status.
2. WHEN a user selects an available delivery slot, THE Delivery_Service SHALL reserve the slot for the order for 10 minutes.
3. WHEN a reserved slot's 10-minute hold elapses without order placement, THE Delivery_Service SHALL release the reservation and return the slot to available capacity.
4. IF a user selects a delivery slot that has reached capacity, THEN THE Delivery_Service SHALL reject the selection and return a slot-full error.

### Requirement 20: Order Confirmation and Tracking

**User Story:** As a shopper, I want order confirmation and tracking, so that I know my order status from placement to delivery.

#### Acceptance Criteria

1. WHEN an order is created, THE Order_Service SHALL return an order confirmation containing the order identifier, items, total, delivery address, and delivery slot.
2. WHEN an order status changes, THE Order_Service SHALL persist the new status with a timestamp.
3. WHEN a user requests tracking for an order the user owns, THE Order_Service SHALL return the current order status and the status history ordered from earliest to latest.
4. IF a user requests tracking for an order the user does not own, THEN THE Order_Service SHALL reject the request and return an authorization error.
5. WHEN an order status changes, THE Notification_Service SHALL send a status-update notification to the user associated with the order.
6. WHEN a user requests the order list, THE Order_Service SHALL return the user's orders ordered from most recent to least recent.

### Requirement 21: Subscriptions

**User Story:** As a shopper, I want recurring subscriptions for staples, so that I receive milk, bread, eggs, vegetables, and fruits automatically.

#### Acceptance Criteria

1. WHEN a user creates a subscription for milk, bread, eggs, vegetables, or fruits, THE Subscription_Service SHALL persist the subscription with its items, an active status, and a 2-day recurring delivery schedule.
2. WHEN a subscription's scheduled delivery date is reached and the subscription is active, THE Subscription_Service SHALL generate a recurring order for the subscription items and advance the schedule by 2 days.
3. IF a subscription item is out of stock when a recurring order is generated, THEN THE Subscription_Service SHALL generate the recurring order with the available items, identify the unavailable item, and notify the user.
4. WHEN a user pauses a subscription, THE Subscription_Service SHALL set the subscription to paused and suspend recurring order generation.
4. WHEN a user resumes a paused subscription, THE Subscription_Service SHALL set the subscription to active and resume recurring order generation on the next scheduled date.
5. WHEN a user cancels a subscription, THE Subscription_Service SHALL set the subscription to cancelled and stop all future recurring order generation.

### Requirement 22: Functional Bundles

**User Story:** As a shopper, I want curated functional bundles, so that I can buy products aligned to a health goal in one purchase.

#### Acceptance Criteria

1. WHEN a user requests functional bundles, THE Bundle_Service SHALL return the bundles Weight Loss, High Protein, Kids Nutrition, Gut Friendly, Diabetic, and Heart Health.
2. WHEN the Bundle_Service returns a bundle, THE Bundle_Service SHALL include the products in the bundle and the bundle price, and the included products MAY span multiple brands.
3. WHEN a user adds a bundle in which every product is in stock to the cart, THE Cart_Service SHALL add every product in the bundle to the cart and return the updated cart summary.
4. IF a product within a bundle is out of stock, THEN THE Bundle_Service SHALL mark the bundle as partially available and identify the unavailable product.
5. WHEN a user adds a partially available bundle to the cart, THE Cart_Service SHALL add only the in-stock products from the bundle and return the updated cart summary.

### Requirement 23: Satya XP and Rewards

**User Story:** As a user, I want to earn Satya XP and rewards, so that I stay engaged and am recognized for verified purchasing and scanning.

#### Acceptance Criteria

1. WHEN a user completes a scan of a product the user has not already been rewarded for on the current UTC day, THE Rewards_Service SHALL award the configured Satya_XP amount and record a scan reward.
2. IF a user scans a product for which a scan reward has already been granted on the current UTC day, THEN THE Rewards_Service SHALL NOT award additional Satya_XP for that scan.
3. WHEN a user completes a purchase, THE Rewards_Service SHALL award the configured Satya_XP amount for the purchase.
4. WHEN a user's Satya_XP total crosses a badge threshold, THE Rewards_Service SHALL grant the corresponding badge to the user exactly once.
5. WHEN a user achieves an achievement condition, THE Rewards_Service SHALL grant the corresponding achievement to the user exactly once.
6. WHEN a user requests the leaderboard, THE Rewards_Service SHALL return the top 100 users ranked in descending order of Satya_XP, breaking ties by earliest time the Satya_XP total was reached.
7. IF recording a Satya_XP award fails, THEN THE Rewards_Service SHALL leave the user's Satya_XP total unchanged and return an error.

### Requirement 24: Streaks and Cashback

**User Story:** As a user, I want scan and purchase streaks with cashback, so that consistent engagement is rewarded.

#### Acceptance Criteria

1. WHEN a user scans a product on the UTC calendar day immediately following the previous scan day, THE Rewards_Service SHALL increment the user's scan streak by one.
2. WHEN a user scans additional products on a UTC calendar day for which the scan streak has already been incremented, THE Rewards_Service SHALL leave the scan streak unchanged.
3. IF a full UTC calendar day passes without a scan following an active scan streak, THEN THE Rewards_Service SHALL reset the scan streak to zero.
4. WHEN a user completes a purchase on the UTC calendar day immediately following the previous purchase day, THE Rewards_Service SHALL increment the user's purchase streak by one.
5. IF a full UTC calendar day passes without a purchase following an active purchase streak, THEN THE Rewards_Service SHALL reset the purchase streak to zero.
6. WHEN a streak reaches a configured cashback milestone for the first time, THE Rewards_Service SHALL grant the milestone cashback to the user's wallet through the Wallet_Service exactly once.

### Requirement 25: Newsletter

**User Story:** As a user, I want to read, save, and share weekly articles and track my reading progress, so that I can learn about clean food over time.

#### Acceptance Criteria

1. WHEN a user requests the newsletter, THE Newsletter_Service SHALL return the available articles ordered from most recent to least recent, paginated at 20 articles per page.
2. WHEN a user saves an article that is not already saved, THE Newsletter_Service SHALL add the article to the user's saved articles without creating a duplicate.
3. WHEN a user updates reading progress for an article with a value from 0 to 100 inclusive, THE Newsletter_Service SHALL persist the reading progress for that user and article.
4. IF a user updates reading progress with a value outside the range 0 to 100, THEN THE Newsletter_Service SHALL reject the update and return a validation error.
5. WHEN a user requests a shareable link for an article, THE Newsletter_Service SHALL return a shareable reference to the article.
6. WHEN a user requests saved articles, THE Newsletter_Service SHALL return the articles the user has saved ordered from most recently saved to least recently saved.

### Requirement 26: Notifications

**User Story:** As a user, I want relevant push notifications, so that I stay informed about orders, rewards, and availability.

#### Acceptance Criteria

1. WHEN a user grants notification permission with a device token not already registered for that user, THE Notification_Service SHALL register the device token for the user through OneSignal without creating a duplicate.
2. WHEN a notifiable event occurs for a user who has a registered device token and has not disabled the event's category, THE Notification_Service SHALL dispatch a push notification to the user's registered device tokens.
3. IF a device token is reported invalid by OneSignal, THEN THE Notification_Service SHALL remove the invalid device token.
4. WHERE a user has disabled a notification category among order updates, rewards, and delivery availability, THE Notification_Service SHALL suppress notifications in that category for the user.
5. IF dispatching a push notification fails, THEN THE Notification_Service SHALL retry the dispatch up to 3 times and record the failure if all retries are exhausted.

### Requirement 27: Admin Panel Management

**User Story:** As an administrator, I want to manage the platform's catalog and operations, so that I can keep products, orders, and content accurate.

#### Acceptance Criteria

1. WHEN an authenticated administrator submits a valid create, update, or delete for a product, brand, coupon, bundle, or newsletter article, THE Admin_Panel SHALL persist the change through the corresponding backend service.
2. IF an administrator submits a create or update that fails schema validation, THEN THE Admin_Panel SHALL reject the change and return a validation error identifying the invalid field.
3. WHEN an administrator views orders, customers, or subscriptions, THE Admin_Panel SHALL return the requested records paginated with a default page size of 20 and a maximum page size of 50.
4. WHEN an administrator applies a valid order-status transition, THE Order_Service SHALL persist the new status and THE Notification_Service SHALL notify the associated user.
5. IF an administrator applies an order-status transition that is not permitted from the order's current status, THEN THE Order_Service SHALL reject the transition and return an invalid-transition error.
6. WHEN an administrator requests analytics, THE Admin_Panel SHALL return aggregated metrics for products, orders, customers, and Satya_XP.
7. IF a non-administrator requests an Admin_Panel operation, THEN THE Security_Layer SHALL deny the request and return an authorization error.
8. WHEN an administrator submits product nutrition or ingredient data, THE Grading_Engine SHALL compute the product Grade.
9. IF an administrator attempts to manually override a computed Grade, THEN THE Admin_Panel SHALL reject the override and THE Backend_System SHALL record the attempt in the audit log.

### Requirement 28: Vendor Management

**User Story:** As an administrator, I want to manage vendors and vendor-supplied products, so that supply is organized and accountable.

#### Acceptance Criteria

1. WHEN an administrator creates a vendor, THE Vendor_Service SHALL persist the vendor record.
2. WHEN a vendor submits product data, THE Vendor_Service SHALL associate the product data with the vendor and THE Grading_Engine SHALL compute the product Grade from the submitted composition data.
3. IF a vendor attempts to set a product Grade directly, THEN THE Backend_System SHALL reject the request and record the attempt in the audit log.
4. IF a vendor submits product data that fails schema validation, THEN THE Vendor_Service SHALL reject the submission and return a validation error identifying the invalid field.
5. WHEN an administrator deactivates a vendor, THE Vendor_Service SHALL set the vendor to inactive and exclude the vendor's products from marketplace, search, and product-detail responses.

### Requirement 29: Performance and Caching

**User Story:** As a user, I want the app to feel fast and work with intermittent connectivity, so that browsing and shopping stay smooth.

#### Acceptance Criteria

1. WHEN a user scrolls a product listing, THE ANVESA_App SHALL load additional products through infinite scrolling using paginated requests of 20 products per page.
2. WHEN a user views product images, THE ANVESA_App SHALL serve previously loaded images from the image cache.
3. WHILE the device has no network connectivity, THE ANVESA_App SHALL display previously cached marketplace and product data.
4. IF the device has no network connectivity and no cached data is available for the requested view, THEN THE ANVESA_App SHALL display an offline state.
5. WHEN a user performs a cart or wishlist action, THE ANVESA_App SHALL apply an optimistic update before the server response is received, and SHALL revert the update if the server rejects the action.
6. WHEN a marketplace or product read request is served and the corresponding Redis cache entry has not exceeded its time-to-live, THE Backend_System SHALL return the cached data.
7. THE Backend_System SHALL serve cached marketplace and product read requests within 500 milliseconds at the 95th percentile.
8. THE Persistence_Layer SHALL define database indexes on the columns used for product browsing, search, and order lookup.

### Requirement 30: Security and Data Protection

**User Story:** As a user and platform operator, I want the platform to protect data and enforce access control, so that user data and platform integrity are safe.

#### Acceptance Criteria

1. WHEN a client requests a protected resource with a valid JWT access token, THE Security_Layer SHALL grant access.
2. IF a client requests a protected resource with a missing, malformed, expired, or revoked access token, THEN THE Security_Layer SHALL deny access and return an authentication error.
3. WHEN a user requests data owned by another user, THE Security_Layer SHALL enforce Row Level Security so that only the owning user's data is returned.
4. WHEN a client requests to upload a file, THE Security_Layer SHALL issue a signed upload URL scoped to the intended storage location that expires within 15 minutes.
5. IF a file upload exceeds the configured maximum size or is of a disallowed type, THEN THE Security_Layer SHALL reject the upload and return a validation error.
6. WHEN more than 100 requests are received from a client within a 60-second window, THE Security_Layer SHALL reject further requests and return a rate-limit error.
7. WHEN a request is received, THE Security_Layer SHALL validate the request payload against its schema and reject requests that fail validation.
8. WHEN a security-relevant action occurs, THE Security_Layer SHALL record the action in the audit log with the actor, action, and timestamp.

### Requirement 31: Clean Architecture and Service-Driven Design

**User Story:** As an engineering team, I want the codebase to follow Clean Architecture, so that the system is maintainable, testable, and scalable.

#### Acceptance Criteria

1. THE Backend_System SHALL organize code into Presentation, Application, Domain, and Infrastructure layers.
2. THE ANVESA_App SHALL place business logic in application and domain services rather than in presentation components.
3. WHEN a service accesses persistent data, THE Backend_System SHALL access the data through the repository layer rather than directly from presentation or application layers.
4. WHERE an external dependency is used by a domain or application service, THE Backend_System SHALL provide the dependency through dependency injection.

### Requirement 32: Design System and Accessibility

**User Story:** As a user, I want a consistent, accessible, and premium interface, so that the app is pleasant and usable for everyone.

#### Acceptance Criteria

1. THE ANVESA_App SHALL apply the design system using the purple primary color, the green accent color, Inter typography, large rounded corners, and soft elevation across all screens.
2. WHERE the device is set to dark mode, THE ANVESA_App SHALL render screens using the dark-mode theme.
3. THE ANVESA_App SHALL meet WCAG AA contrast ratios of at least 4.5:1 for normal text and at least 3:1 for large text and interactive-element boundaries.
4. WHERE a screen reader is active, THE ANVESA_App SHALL expose accessible labels for interactive elements to VoiceOver and TalkBack.
5. WHERE the device font size is increased up to 200 percent, THE ANVESA_App SHALL scale text using dynamic font sizing without truncating essential content.
6. THE ANVESA_App SHALL provide touch targets of at least 44 by 44 points for interactive controls.
