import type { SVGAttributes } from 'react';

/**
 * Platform mark: an open book (formal, older students) under a rising sun
 * (warm, younger learners). The book uses currentColor; the sun always uses
 * the platform's sun accent.
 */
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="11" r="5.5" fill="var(--sun)" />
            <path d="M3 17.5c6.2-2.4 12-1.6 16 2V35c-4-3.2-9.8-3.9-16-1.6z" />
            <path d="M37 17.5c-6.2-2.4-12-1.6-16 2V35c4-3.2 9.8-3.9 16-1.6z" />
        </svg>
    );
}
