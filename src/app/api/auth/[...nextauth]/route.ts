import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

const handler = NextAuth({
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret:
        process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId:
        process.env.AZURE_AD_TENANT_ID!,

      authorization: {
        params: {
          scope:
            "openid profile email offline_access User.Read Mail.ReadWrite Mail.Send",
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email;

      if (typeof email !== "string")
        return false;

      return email
        .toLowerCase()
        .endsWith("@upperlineco.com");
    },

    async redirect({ baseUrl }) {
      return `${baseUrl}/admin`;
    },

    async jwt({
      token,
      account,
      profile,
    }) {
      // Persist Graph access token
      if (account?.access_token) {
        token.accessToken =
          account.access_token;
      }

      // Persist user info
      if (profile) {
        if (
          typeof profile.email ===
          "string"
        ) {
          token.email =
            profile.email;
        }

        if (
          typeof profile.name ===
          "string"
        ) {
          token.name =
            profile.name;
        }
      }

      return token;
    },

    async session({
      session,
      token,
    }) {
      if (session.user) {
        if (
          typeof token.email ===
          "string"
        ) {
          session.user.email =
            token.email;
        }

        if (
          typeof token.name ===
          "string"
        ) {
          session.user.name =
            token.name;
        }
      }

      (
        session as typeof session & {
          accessToken?: string;
        }
      ).accessToken =
        typeof token.accessToken ===
        'string'
          ? token.accessToken
          : undefined;

      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  secret:
    process.env.NEXTAUTH_SECRET,
});

export {
  handler as GET,
  handler as POST,
};