import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

const handler = NextAuth({
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  ],

  callbacks: {
    async signIn({ profile }) {
      // ✅ Restrict to Upperline emails only
      return (
        profile?.email &&
        profile.email.toLowerCase().endsWith("@upperlineco.com")
      );
    },

    async redirect({ baseUrl }) {
      // ✅ Always send user to homepage after login
      return `${baseUrl}/admin`;
    },

    async jwt({ token, profile }) {
      // ✅ Persist user info in token
      if (profile) {
        token.email = profile.email;
        token.name = profile.name;
      }
      return token;
    },

    async session({ session, token }) {
      // ✅ Make session usable in UI
      if (session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
