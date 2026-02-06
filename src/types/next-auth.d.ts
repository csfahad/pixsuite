import { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            avatar?: string
            plan?: string
            usageCount?: number
            usageLimit?: number
        } & DefaultSession["user"]
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        avatar?: string
        plan?: string
        usageCount?: number
        usageLimit?: number
    }
}
