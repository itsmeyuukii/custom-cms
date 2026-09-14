import { NextResponse } from "next/server";

export function apiSuccess(data: unknown, meta?: Record<string, unknown>) {
    if (meta) {
        return NextResponse.json({ data, meta });
    } else {
        return NextResponse.json({ data });
    }
}

export function apiError(code: string, message: string, status: number) {
    return NextResponse.json({ error: { code, message } }, { status });
}