import prisma from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET(request: NextRequest) {
    try {
        const token = await getToken({ req: request });

        if (!token?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const user = await prisma.users.findUnique({
            where: { email: token.email as string },
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                plan: true,
                usageCount: true,
                usageLimit: true,
                subscriptionExpiresAt: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(user);
    } catch (err) {
        console.error("Account fetch error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

const updateNameSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

export async function PATCH(request: NextRequest) {
    try {
        const token = await getToken({ req: request });

        if (!token?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const parsed = updateNameSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || "Invalid input" },
                { status: 400 }
            );
        }

        const updatedUser = await prisma.users.update({
            where: { email: token.email as string },
            data: { name: parsed.data.name.trim() },
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                plan: true,
                usageCount: true,
                usageLimit: true,
                subscriptionExpiresAt: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(updatedUser);
    } catch (err) {
        console.error("Account update error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
