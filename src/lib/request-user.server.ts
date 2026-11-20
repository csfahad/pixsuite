import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import prisma from "./prisma";
import { RequestError } from "./request-error.server";

export async function requestUserId(request: NextRequest): Promise<string>;
export async function requestUserId(
    request: NextRequest,
    optional: true,
): Promise<string | null>;
export async function requestUserId(
    request: NextRequest,
    optional = false,
): Promise<string | null> {
    const token = await getToken({ req: request });
    if (typeof token?.email !== "string") {
        if (optional) return null;
        throw new RequestError(401, "Unauthorized");
    }
    const user = await prisma.users.findUnique({
        where: { email: token.email },
        select: { id: true },
    });
    if (!user) throw new RequestError(404, "User not found");
    return user.id;
}
