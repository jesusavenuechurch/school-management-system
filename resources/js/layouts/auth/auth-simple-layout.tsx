import { Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { HeroIllustration } from '@/components/illustrations';
import { home } from '@/routes';
import { publicMethod as publicPage } from '@/routes/schools';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name, brand } = usePage().props as unknown as {
        name: string;
        brand?: { name: string; logo_url: string | null; slug: string };
    };

    return (
        <div className="grid min-h-svh bg-background lg:grid-cols-2">
            <div className="flex flex-col justify-center px-4 py-10 sm:px-6 md:px-10">
                <div className="mx-auto w-full max-w-sm">
                    {brand ? (
                        // Signing in through a school's own page: show the school.
                        <Link
                            href={publicPage(brand.slug)}
                            className="mb-10 flex items-center gap-3 font-semibold"
                        >
                            <span className="flex size-11 items-center justify-center overflow-hidden rounded-xl border border-border bg-white font-display text-ink">
                                {brand.logo_url ? (
                                    <img
                                        src={brand.logo_url}
                                        alt=""
                                        className="size-full object-contain"
                                    />
                                ) : (
                                    brand.name.slice(0, 1)
                                )}
                            </span>
                            <span className="font-display text-lg">
                                {brand.name}
                            </span>
                        </Link>
                    ) : (
                        <Link
                            href={home()}
                            className="mb-10 flex items-center gap-2.5 font-semibold"
                        >
                            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <AppLogoIcon className="size-6 fill-current" />
                            </span>
                            <span className="font-display text-lg">{name}</span>
                        </Link>
                    )}

                    <div className="mb-8 space-y-2">
                        <h1 className="font-display text-3xl font-semibold tracking-tight">
                            {title}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {description}
                        </p>
                    </div>

                    {children}
                </div>
            </div>

            <div className="relative hidden overflow-hidden border-l border-border bg-card lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
                <div className="pointer-events-none absolute inset-0 bg-ruled opacity-60" />
                <HeroIllustration className="relative w-full max-w-lg" />
                <p className="relative mt-8 max-w-sm text-center font-display text-xl text-muted-foreground">
                    {brand
                        ? `Welcome back to ${brand.name}.`
                        : 'For the little ones learning their letters and the seniors preparing for exams.'}
                </p>
            </div>
        </div>
    );
}
