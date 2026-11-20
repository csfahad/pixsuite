import { NextResponse } from "next/server";

export class RequestError extends Error {
    constructor(
        public status: number,
        message: string,
        public data: Record<string, unknown> = {},
    ) {
        super(message);
    }
}

export function requestErrorResponse(error: unknown, context: string) {
    if (error instanceof RequestError) {
        return NextResponse.json(
            { error: error.message, ...error.data },
            { status: error.status },
        );
    }
    console.error(context, error);
    return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
    );
}
