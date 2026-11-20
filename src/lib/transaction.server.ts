import type { Prisma } from "@prisma/client";
import prisma from "./prisma";

export function isDatabaseConflict(error: unknown): boolean {
    return Boolean(
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error.code === "P2034" || error.code === "P2002"),
    );
}

export async function transaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
    for (let attempt = 0; ; attempt++) {
        try {
            return await prisma.$transaction(work, {
                maxWait: 5000,
                timeout: 10000,
            });
        } catch (error) {
            if (!isDatabaseConflict(error) || attempt >= 4) throw error;
            await new Promise((resolve) =>
                setTimeout(resolve, 10 * (attempt + 1)),
            );
        }
    }
}
