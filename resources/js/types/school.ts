export type CurrentSchool = {
    id: number;
    name: string;
    slug: string;
    currency: string;
    logo_url: string | null;
    levels: string[];
    is_verified: boolean;
    setup_complete: boolean;
};

export type Option = {
    value: string;
    label: string;
};
