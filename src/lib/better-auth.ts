import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";
import { getSiteUrl } from "@/lib/env";

const databaseUrl = process.env.DATABASE_URL;
const connectionPool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    })
  : undefined;

export const auth = betterAuth({
  appName: "Penman Empire",
  baseURL: getSiteUrl(),
  secret:
    process.env.BETTER_AUTH_SECRET ??
    process.env.AUTH_SECRET ??
    "penman-empire-dev-secret-change-me",
  ...(connectionPool ? { database: connectionPool } : {}),
  plugins: [nextCookies()],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      console.info(`[Better Auth] Password reset for ${user.email}: ${url}`);
    },
  },
  emailVerification: {
    sendOnSignUp: false,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      console.info(`[Better Auth] Email verification for ${user.email}: ${url}`);
    },
  },
});
