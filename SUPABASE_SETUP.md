# StrawSync — Supabase Database & Auth Setup Guide

This document describes the manual Supabase Dashboard configuration and environment variables needed to connect StrawSync to your live Supabase project.

---

## 1. Required Environment Variables

Copy `.env.example` to `.env.local` (for local development, git-ignored via `.gitignore`) and configure the same values in **Vercel &rarr; Project Settings &rarr; Environment Variables** for production:

| Variable | Scope | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client + Server | Supabase Dashboard &rarr; **Project Settings &rarr; Data API / API** &rarr; Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client + Server | Supabase Dashboard &rarr; **Project Settings &rarr; API** &rarr; `anon` (public) or `publishable` key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is also accepted) |
| `NEXT_PUBLIC_SITE_URL` | Public / Auth Redirects | `http://localhost:3000` locally, or your production Vercel URL (`https://...vercel.app`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **SERVER-ONLY** (optional) | Supabase Dashboard &rarr; **Project Settings &rarr; API** &rarr; `service_role` / secret key. **NEVER** prefix with `NEXT_PUBLIC_` and **NEVER** commit to Git. |

---

## 2. Apply Database Schema & Row Level Security

Run [supabase/migrations/20261125000001_strawsync_foundation.sql](./supabase/migrations/20261125000001_strawsync_foundation.sql) in one of two ways:

- **Option A — Supabase SQL Editor:** Paste the entire contents of `supabase/migrations/20261125000001_strawsync_foundation.sql` into **SQL Editor &rarr; New query** and execute it.
- **Option B — Supabase CLI:**
  ```bash
  npx supabase link --project-ref <YOUR_PROJECT_REF>
  npx supabase db push
  ```

### Included Tables & Security Guarantees
- Tables: `profiles`, `farmer_listings`, `buyer_requests`, `orders`, `logistics_partners`, `deliveries`, `transactions`, `notifications`, `admin_audit_logs`.
- RLS enabled on all 9 `public` tables using `(select auth.uid())` scalar subqueries and `TO authenticated` clauses (no deprecated `auth.role()`).
- Private helper schema (`private`) holds `SECURITY DEFINER` helpers (`private.is_admin()`, `private.current_user_role()`, `private.is_active_user()`, `private.handle_new_user()`, `private.promote_first_admin(text)`), keeping privileged functions off PostgREST.
- Signup trigger forces `role` to `'farmer' | 'buyer' | 'logistics'` only; `'admin'` cannot be registered through client signup.
- Update triggers block browser clients from changing `profiles.role`, `profiles.account_status`, `profiles.is_verified`, listing verification, logistics verification, or order totals/settlement.

---

## 3. Configure Supabase Authentication URLs

In **Supabase Dashboard &rarr; Authentication &rarr; URL Configuration**:

1. **Site URL:** Set to `http://localhost:3000` (or your Vercel production URL when live).
2. **Redirect URLs (add all environments):**
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/reset-password`
   - `https://<YOUR-VERCEL-DOMAIN>/auth/callback`
   - `https://<YOUR-VERCEL-DOMAIN>/reset-password`
3. **Providers &rarr; Email:** Ensure **Email** provider is enabled for email/password registration, login, and password recovery.

---

## 4. Create the First Admin Account Securely

Public sign-up never allows creating an `admin`. To create the first admin safely:

1. Register the admin email normally via Supabase Auth (Authentication &rarr; Users &rarr; Add User, or normal signup so it gets a valid password hash and `auth.users` row).
2. In **Supabase Dashboard &rarr; SQL Editor**, run:
   ```sql
   select private.promote_first_admin('admin@your-domain.com');
   ```
3. This function only works when **zero** `admin` profiles exist yet; subsequent admins can only be promoted by an active admin or via `service_role`.
