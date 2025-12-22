# Security Guide: Google OAuth + NextAuth + Supabase

## 🔒 Security Architecture

### Database Security (RLS)
- **Row Level Security (RLS) is enabled** on the `users` table
- **All public access is blocked** - no one can read/write using the publishable key
- This means even if someone gets your publishable key, they can't access your data

### Authentication Flow

1. **User clicks "Sign in with Google"**
   - Client-side redirect to Google

2. **Google authenticates user**
   - User grants permission
   - Google generates an OAuth token

3. **Google redirects to NextAuth callback** (`/api/auth/nextauth/google`)
   - This happens **server-side only** (secure!)
   - NextAuth validates the Google token
   - NextAuth creates a session

4. **In the `signIn` callback (server-side)**
   - Validates profile data (email required)
   - Checks if user exists in Supabase by email
   - Creates new user OR updates existing user
   - Uses **admin client (secret key)** - bypasses RLS
   - Returns `true` to allow sign-in, `false` to block

5. **Session created**
   - NextAuth creates a JWT session
   - User is now authenticated

## 🛡️ Why This Is Secure

### ✅ Security Layers

1. **RLS blocks public access**
   - Even with publishable key, no one can access `users` table
   - Policy: `FOR ALL USING (false)` blocks everything

2. **User creation happens server-side**
   - The `signIn` callback runs on your server
   - Never exposed to the browser
   - Only runs when Google successfully authenticates

3. **Admin client uses secret key**
   - Secret key is **never** exposed to the browser
   - Only exists in `.env.local` (gitignored)
   - Only used in API routes (server-side)

4. **NextAuth validates Google token**
   - Google's token is cryptographically verified
   - Can't be forged or tampered with
   - Only valid Google OAuth tokens work

### 🔐 What Prevents Unauthorized Access

- ❌ **Can't create users without Google auth** - NextAuth callback only runs after Google authentication
- ❌ **Can't access DB with publishable key** - RLS blocks all access
- ❌ **Can't use secret key from browser** - It's only in server environment variables
- ❌ **Can't fake Google tokens** - NextAuth validates cryptographic signatures

## 📋 Environment Variables Needed

```bash
# Public (safe in browser)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key

# Secret (server-side only, NEVER expose)
SUPABASE_SECRET_KEY=your_secret_key

# NextAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_string
```

## 🚀 How It Works

### When User Signs In:

```
Browser → Google OAuth → NextAuth Callback (Server) → Supabase (Admin Client) → Database
         [Public]        [Server-Side Only]            [Secret Key]            [RLS Protected]
```

### Key Points:

1. **Google callback is server-side** - The `/api/auth/nextauth/google` route runs on your server
2. **Admin client bypasses RLS** - But only because it's server-side and uses secret key
3. **User creation is validated** - Only happens after successful Google authentication
4. **Email is required** - Prevents invalid sign-ins

## ⚠️ Important Notes

- **Never expose `SUPABASE_SECRET_KEY`** - Keep it in `.env.local` only
- **RLS is your friend** - It blocks all unauthorized access automatically
- **Server-side operations only** - All database writes happen in API routes
- **Validate everything** - Check email, validate tokens, handle errors

## 🔄 User Flow Example

1. User visits your app → clicks "Sign in with Google"
2. Redirected to Google → authenticates
3. Google redirects to `/api/auth/nextauth/google` (your server)
4. NextAuth validates token → calls `signIn` callback
5. Callback checks if user exists by email
6. Creates/updates user in Supabase using admin client
7. NextAuth creates session → user is signed in
8. User can now access protected routes

This is the **simplest and most secure** approach for Google OAuth + NextAuth + Supabase! 🎉

