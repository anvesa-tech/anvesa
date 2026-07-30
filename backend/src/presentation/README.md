# Presentation layer

tRPC routers (typed procedures), REST webhook route handlers (Razorpay,
OneSignal), and Security_Layer middleware chains. Translates transport
concerns into application use-case calls.

Depends on: application. Must NOT access persistence or domain internals
directly.
