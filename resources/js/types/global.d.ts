import type { Auth } from '@/types/auth';
import type { CurrentSchool } from '@/types/school';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            school: CurrentSchool | null;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
