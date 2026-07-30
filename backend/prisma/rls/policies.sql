-- ANVESA Row Level Security policies (Requirement 30.3, 20.4).
--
-- User-owned tables are readable/writable only by their owning user.
-- Ownership is derived from Supabase auth.uid() matching the row's userId.
-- The backend service role bypasses RLS for trusted server-side workers.
-- Catalog tables are publicly readable; writes are restricted to the backend.
--
-- Apply after `prisma migrate deploy`. Prisma does not manage RLS, so these
-- policies live here and are applied via the Supabase SQL editor or a psql
-- migration step in deploy.

-- Helper: current user id as text from the Supabase JWT.
-- (Supabase exposes auth.uid() returning uuid.)

-- ---------- Enable RLS on user-owned tables ----------
alter table "Profile"          enable row level security;
alter table "Address"          enable row level security;
alter table "Order"            enable row level security;
alter table "OrderItem"        enable row level security;
alter table "Wallet"           enable row level security;
alter table "WalletTransaction" enable row level security;
alter table "SavedProduct"     enable row level security;
alter table "RecentlyViewed"   enable row level security;
alter table "Notification"     enable row level security;
alter table "Pincode"          enable row level security;
alter table "ScanHistory"      enable row level security;
alter table "DeviceToken"      enable row level security;
alter table "Review"           enable row level security;
alter table "Subscription"     enable row level security;

-- ---------- Owner-only policies ----------
-- Profile
create policy "profile_owner_select" on "Profile"
  for select using (auth.uid()::text = "userId");
create policy "profile_owner_modify" on "Profile"
  for all using (auth.uid()::text = "userId") with check (auth.uid()::text = "userId");

-- Address
create policy "address_owner_all" on "Address"
  for all using (auth.uid()::text = "userId") with check (auth.uid()::text = "userId");

-- Order (owner read; writes happen through the backend service role)
create policy "order_owner_select" on "Order"
  for select using (auth.uid()::text = "userId");

-- Wallet
create policy "wallet_owner_select" on "Wallet"
  for select using (auth.uid()::text = "userId");

-- SavedProduct
create policy "saved_owner_all" on "SavedProduct"
  for all using (auth.uid()::text = "userId") with check (auth.uid()::text = "userId");

-- RecentlyViewed
create policy "recent_owner_all" on "RecentlyViewed"
  for all using (auth.uid()::text = "userId") with check (auth.uid()::text = "userId");

-- Notification
create policy "notif_owner_select" on "Notification"
  for select using (auth.uid()::text = "userId");

-- Pincode
create policy "pincode_owner_all" on "Pincode"
  for all using (auth.uid()::text = "userId") with check (auth.uid()::text = "userId");

-- ScanHistory
create policy "scan_owner_all" on "ScanHistory"
  for all using (auth.uid()::text = "userId") with check (auth.uid()::text = "userId");

-- DeviceToken
create policy "device_owner_all" on "DeviceToken"
  for all using (auth.uid()::text = "userId") with check (auth.uid()::text = "userId");

-- Review (owner may write their own; everyone may read via backend)
create policy "review_owner_write" on "Review"
  for all using (auth.uid()::text = "userId") with check (auth.uid()::text = "userId");

-- Subscription
create policy "sub_owner_all" on "Subscription"
  for all using (auth.uid()::text = "userId") with check (auth.uid()::text = "userId");

-- WalletTransaction & OrderItem are reachable only through their parent via the
-- backend service role; deny direct client access by enabling RLS with no
-- permissive client policy (service role bypasses RLS).

-- ---------- Catalog: public read, backend-only write ----------
-- Catalog tables (Product, Brand, Category, Nutrition, Ingredient,
-- ProductGrade, etc.) keep RLS disabled for anon SELECT via the API layer,
-- while all writes are performed by the backend using the service role key.
-- If exposed directly to PostgREST, enable RLS and add read-only policies:
--   alter table "Product" enable row level security;
--   create policy "product_public_read" on "Product" for select using (true);
