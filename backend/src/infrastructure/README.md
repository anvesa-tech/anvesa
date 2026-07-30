# Infrastructure layer

Repository *adapters* (Prisma), external gateways (Razorpay, OneSignal,
Anthropic Claude, Google Maps, Supabase Storage, SMS), the Redis cache, and
the dependency-injection composition root. Implements ports declared by the
domain layer.

Depends on: domain (implements its ports), application (wired by the DI root).
This is the ONLY layer permitted to access persistence.
