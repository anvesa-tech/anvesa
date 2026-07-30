# Application layer

Use-case orchestration — the named services from the design glossary
(`Marketplace_Service`, `Checkout_Service`, `Rewards_Service`, etc.).
Depends on the domain layer and on repository ports. Contains transaction
boundaries. Receives dependencies via constructor injection.

Depends on: domain (and domain-declared ports only).
