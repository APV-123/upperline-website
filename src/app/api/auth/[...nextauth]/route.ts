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
      const email = profile?.email;

      if (typeof email !== "string") return false;

      return email.toLowerCase().endsWith("@upperlineco.com");
    },

    async redirect({ baseUrl }) {
      // ✅ Always send user to admin after login
      return `${baseUrl}/admin`;
    },

    async jwt({ token, profile }) {
      // ✅ Persist user info in token
      if (profile) {
        if (typeof profile.email === "string") {
          token.email = profile.email;
        }
        if (typeof profile.name === "string") {
          token.name = profile.name;
        }
      }
      return token;
    },

    async session({ session, token }) {
      // ✅ Make session usable in UI
      if (session.user) {
        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
        if (typeof token.name === "string") {
          session.user.name = token.name;
        }
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