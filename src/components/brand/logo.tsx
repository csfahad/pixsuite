import type { HTMLAttributes, SVGProps } from "react";
import { BRAND_MARK_PATH } from "@/lib/brand";
import { cn } from "@/lib/utils";

type MarkProps = Omit<SVGProps<SVGSVGElement>, "children">;

export function BrandMark(props: MarkProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            width="64"
            height="64"
            fill="currentColor"
            role="img"
            aria-label="PixSuite"
            {...props}
        >
            <path d={BRAND_MARK_PATH} />
        </svg>
    );
}

export function BrandLogo({
    className,
    ...props
}: HTMLAttributes<HTMLSpanElement>) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-2 text-2xl font-semibold tracking-tight",
                className,
            )}
            role="img"
            aria-label="PixSuite"
            {...props}
        >
            <BrandMark className="h-full w-auto shrink-0" aria-hidden="true" />
            <span>PixSuite</span>
        </span>
    );
}
