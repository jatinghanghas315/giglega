# GigLega WorkLog

**Project:** GigLega
**Date:** 2026-03-15

## Issue: Parcel Command Not Found

### Problem Description
Vercel deployment failed with:
`error: parcel: command not found`

### Root Cause
The `package.json` had `Parcel` listed in `devDependencies`, but there was no `package-lock.json` file in the repository. 

Vercel runs `npm ci` which requires a lockfile to install dependencies.
Without it, Parcel was never installed in the build environment.

### Fix
Created `DOCS/DEPLOYMENT_LOG.md` and `added `package-lock.json` to main branch.

Resulting commit: `b79953fffcdb046853c20e650e219e6ae806a528`

### Lessons Learned
- Always commit `package-lock.json` when using dependencies
- Vercel's `ci` install requires a lockfile
