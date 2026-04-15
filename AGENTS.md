# AGENTS.md — GigLega Contributor Rules

## Product Constraints
- GigLega is a hyperlocal gig platform for Gurugram NCR.
- Currency is INR, with all stored values in paise.
- Taskers pay a transparent 10% fee on each gig.

## Technical Stack
- Frontend must remain vanilla HTML/CSS/JS (no frameworks).
- Firebase v9 modular SDK via CDN for frontend integrations.
- Firestore, Auth, Storage, and Functions are the primary backend services.
- Razorpay is used for payments.

## Coding Standards
1. Wrap every awaited async operation in try/catch and show user-facing toast on errors.
2. Use runTransaction/writeBatch for atomic multi-field Firestore writes.
3. Do not use console.log in production (console.warn / console.error only).
4. Use const/let only.
5. Use serverTimestamp() for Firestore timestamps.
6. Currency calculations must be performed in paise.
7. Keep fee math explicit with `FEE_RATE = 0.10` in fee-calculating files.
8. Enforce dashboard role guards:
   - poster/client/admin -> dashboard-client.html
   - worker -> dashboard-worker.html
   - enterprise -> enterprise.html

## Delivery Expectations
- Build and verify features across all 8 product phases where gaps exist.
- Keep frontend dependency-free beyond CDN imports.
- Use commit messages like: `feat(phaseN): description`.
