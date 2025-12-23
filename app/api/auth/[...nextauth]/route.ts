import { NextAuthOptions } from 'next-auth'
import NextAuth from 'next-auth/next'
import GoogleProvider from "next-auth/providers/google";
import { upsertUser } from '@/lib/supabase';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

export const authOptions: NextAuthOptions = {
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/',
    },
    callbacks: {
        async redirect({ url, baseUrl }) {
            // Allow relative callback URLs
            if (url.startsWith("/")) return `${baseUrl}${url}`
            // Allow callback URLs on the same origin
            if (new URL(url).origin === baseUrl) return url
            return baseUrl
        },
        async signIn({ user, account, profile }) {
            // Validate that we have required profile data
            if (!profile?.email || !user.id) {
                throw new Error('Missing required profile information')
            }

            try {
                // Google profile has given_name and family_name
                const googleProfile = profile as any;
                const givenName = googleProfile.given_name || null;
                const familyName = googleProfile.family_name || null;

                // Upsert user: creates if doesn't exist, updates if exists
                await upsertUser({
                    email: profile.email,
                    nextauth_id: user.id,
                    first_names: givenName,
                    last_names: familyName,
                    status: 'active',
                });

                return true; // Allow sign in
            } catch (error) {
                console.error('Error creating/updating user:', error);
                // You can choose to allow sign-in even if DB operation fails
                // or block it for security
                return false; // Block sign in if DB operation fails
            }
        },
        // Store user info in JWT token
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
            }
            return token;
        },
        // Make user info available in session
        async session({ session, token }) {
            if (session.user && token.id) {
                (session.user as any).id = token.id as string;
            }
            return session;
        }
    },
    providers: [
        GoogleProvider({
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
        }),
    ]
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

