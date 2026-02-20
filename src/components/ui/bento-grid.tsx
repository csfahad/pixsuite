import { cn } from "@/lib/utils";
import { GlowingEffect } from "@/components/ui/glowing-effect";

export const BentoGrid = ({
    className,
    children,
}: {
    className?: string;
    children?: React.ReactNode;
}) => {
    return (
        <div
            className={cn(
                "mx-auto grid max-w-6xl grid-cols-1 gap-4 md:auto-rows-[18rem] md:grid-cols-3",
                className
            )}
        >
            {children}
        </div>
    );
};

export const BentoGridItem = ({
    className,
    title,
    description,
    header,
    icon,
}: {
    className?: string;
    title?: string | React.ReactNode;
    description?: string | React.ReactNode;
    header?: React.ReactNode;
    icon?: React.ReactNode;
}) => {
    return (
        <div
            className={cn(
                "group/bento relative row-span-1 rounded-xl",
                className
            )}
        >
            <GlowingEffect
                blur={0}
                borderWidth={3}
                spread={80}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
            />
            <div className="relative flex h-full flex-col justify-between space-y-4 rounded-xl border border-neutral-200 bg-linear-to-br from-background via-background to-background p-4 transition duration-200 hover:shadow-xl dark:border-white/20 dark:bg-black dark:shadow-none">
                {header}
                <div className="transition duration-200 group-hover/bento:translate-x-2">
                    {icon}
                    <div className="mb-1 font-sans font-bold text-neutral-600 dark:text-neutral-200">
                        {title}
                    </div>
                    <div className="font-sans text-sm font-normal text-neutral-600 dark:text-neutral-300 line-clamp-3">
                        {description}
                    </div>
                </div>
            </div>
        </div>
    );
};
