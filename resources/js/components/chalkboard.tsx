import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ChalkItem = {
    key: string;
    label: string;
    done: boolean;
    /** Shown in place of the label once done, e.g. "Calendar: 3 terms". */
    doneLabel?: string | null;
    skipped?: boolean;
};

/**
 * The platform's signature object: a chalkboard with a checklist written in
 * chalk. Used wherever someone is getting something ready (school setup now,
 * a teacher's day later). Ticks for `animateKey` are drawn in with a puff of
 * chalk dust; the rest are already on the board.
 */
export default function Chalkboard({
    title,
    items,
    footer,
    animateKey,
    className,
}: {
    title: string;
    items: ChalkItem[];
    footer?: ReactNode;
    animateKey?: string | null;
    className?: string;
}) {
    return (
        <figure
            className={cn(
                'relative rounded-lg border-[10px] border-board-frame bg-board px-6 pt-5 pb-4 font-chalk text-chalk shadow-[inset_0_0_40px_rgba(0,0,0,0.25)]',
                className,
            )}
            aria-label={title}
        >
            {/* Faint smudges of old lessons */}
            <div
                className="pointer-events-none absolute inset-0 overflow-hidden"
                aria-hidden="true"
            >
                <div className="absolute top-6 right-8 h-10 w-32 -rotate-6 rounded-full bg-chalk/5 blur-md" />
                <div className="absolute bottom-10 left-10 h-8 w-40 rotate-3 rounded-full bg-chalk/5 blur-md" />
            </div>

            <figcaption className="relative text-3xl leading-tight font-bold">
                {title}
                <svg
                    viewBox="0 0 120 8"
                    className="mt-0.5 h-2 w-28"
                    aria-hidden="true"
                >
                    <path
                        d="M2 5 q55 5 116 -1"
                        stroke="var(--chalk-yellow)"
                        strokeWidth="2.5"
                        fill="none"
                        strokeLinecap="round"
                    />
                </svg>
            </figcaption>

            <ul className="relative mt-3 space-y-1.5">
                {items.map((item) => {
                    const animate = item.done && item.key === animateKey;

                    return (
                        <li
                            key={item.key}
                            className="flex items-center gap-3 text-[1.45rem] leading-snug"
                        >
                            <span
                                className="relative inline-flex size-5 shrink-0"
                                aria-hidden="true"
                            >
                                <svg
                                    viewBox="0 0 20 20"
                                    className="size-5 overflow-visible"
                                >
                                    <rect
                                        x="1.5"
                                        y="1.5"
                                        width="17"
                                        height="17"
                                        rx="2"
                                        fill="none"
                                        stroke="var(--chalk)"
                                        strokeWidth="2"
                                        opacity={item.skipped ? 0.5 : 1}
                                    />
                                    {item.done && (
                                        <path
                                            d="M4 9.5 l4.5 5.5 l11 -16"
                                            stroke="var(--chalk-yellow)"
                                            strokeWidth="3"
                                            fill="none"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className={
                                                animate
                                                    ? 'chalk-draw'
                                                    : undefined
                                            }
                                            style={
                                                animate
                                                    ? ({
                                                          '--delay': '0.25s',
                                                      } as React.CSSProperties)
                                                    : undefined
                                            }
                                        />
                                    )}
                                    {item.skipped && !item.done && (
                                        <path
                                            d="M5 10 h10"
                                            stroke="var(--chalk)"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            opacity="0.6"
                                        />
                                    )}
                                </svg>
                                {animate &&
                                    [0, 1, 2, 3].map((i) => (
                                        <span
                                            key={i}
                                            className="chalk-dust absolute size-1 rounded-full bg-chalk"
                                            style={
                                                {
                                                    left: `${10 + i * 3}px`,
                                                    top: `${2 + (i % 2) * 6}px`,
                                                    opacity: 0,
                                                    '--dx': `${(i - 1.5) * 8}px`,
                                                    '--dy': `${-8 - i * 3}px`,
                                                    '--delay': `${0.55 + i * 0.05}s`,
                                                } as React.CSSProperties
                                            }
                                        />
                                    ))}
                            </span>
                            <span
                                className={cn(
                                    item.done &&
                                        'text-chalk/75 line-through decoration-chalk/50 decoration-1',
                                    item.skipped &&
                                        !item.done &&
                                        'text-chalk/50',
                                )}
                            >
                                {item.done && item.doneLabel
                                    ? item.doneLabel
                                    : item.label}
                                {item.skipped && !item.done && (
                                    <span className="ml-2 text-lg">
                                        (later)
                                    </span>
                                )}
                                <span className="sr-only">
                                    {item.done
                                        ? ' (done)'
                                        : item.skipped
                                          ? ' (skipped for now)'
                                          : ' (to do)'}
                                </span>
                            </span>
                        </li>
                    );
                })}
            </ul>

            {footer && (
                <div className="relative mt-4 text-xl text-chalk-yellow">
                    {footer}
                </div>
            )}

            {/* Chalk tray */}
            <div
                className="relative -mx-6 mt-4 -mb-4 h-2.5 bg-board-frame"
                aria-hidden="true"
            >
                <span className="absolute -top-1.5 left-6 h-1.5 w-7 rounded-sm bg-chalk" />
                <span className="absolute -top-1.5 left-16 h-1.5 w-4 rounded-sm bg-chalk-yellow" />
                <span className="absolute -top-2 right-8 h-2 w-9 rounded-sm bg-ink/80" />
            </div>
        </figure>
    );
}
