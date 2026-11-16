import { usePage } from '@inertiajs/react';

import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { name, school } = usePage().props;

    return (
        <>
            {school?.logo_url ? (
                <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg border border-sidebar-border bg-white">
                    <img
                        src={school.logo_url}
                        alt=""
                        className="size-full object-contain"
                    />
                </div>
            ) : (
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <AppLogoIcon className="size-5 fill-current" />
                </div>
            )}
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="truncate leading-tight font-semibold">
                    {school?.name ?? name}
                </span>
                {school && (
                    <span className="truncate text-xs text-muted-foreground">
                        {name}
                    </span>
                )}
            </div>
        </>
    );
}
