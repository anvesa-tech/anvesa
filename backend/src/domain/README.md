# Domain layer

Innermost layer. Pure entities, value objects, domain policies, and the
`Grading_Engine`. **No I/O, no framework imports.** Defines repository and
gateway *ports* (interfaces) that the infrastructure layer implements.

Depends on: nothing.

Subfolders:
- `grading/` — the pure Grading_Engine (trust anchor, Requirement 12)
- `commerce/` — pure cart, coupon, wallet, checkout math
- `orders/` — order status state machine
- `rewards/` — streak logic, scan-reward dedupe
- `delivery/` — Haversine geofence, pincode validation
- `ports/` — repository and gateway interfaces
