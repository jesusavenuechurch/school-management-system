import { Head, Link } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import PublicSchoolHeader from '@/components/public-school-header';
import type { PublicBrand } from '@/components/public-school-header';
import { Button } from '@/components/ui/button';
import { publicMethod as schoolPage } from '@/routes/schools';
import { apply } from '@/routes/schools';

type Props = {
    school: PublicBrand & { phone: string | null };
    reference: string | null;
};

export default function ApplyThanks({ school, reference }: Props) {
    return (
        <>
            <Head title={`Application sent: ${school.name}`} />
            <div className="flex min-h-svh flex-col bg-background">
                <PublicSchoolHeader school={school} />

                <main className="mx-auto w-full max-w-xl flex-1 px-4 py-14 text-center sm:px-6">
                    <CheckCircle2 className="mx-auto size-12 text-leaf" />
                    <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">
                        Application sent
                    </h1>
                    <p className="mt-3 text-muted-foreground">
                        Thank you. {school.name} will look at it and reply on
                        WhatsApp.
                    </p>

                    {reference && (
                        <div className="mx-auto mt-8 max-w-xs rounded-2xl border border-border bg-card p-5">
                            <p className="text-xs tracking-wider text-muted-foreground uppercase">
                                Your reference
                            </p>
                            <p className="mt-1 font-mono text-2xl font-semibold tracking-widest">
                                {reference}
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                                Keep it in case you need to ask the school about
                                your application.
                            </p>
                        </div>
                    )}

                    <div className="mt-8 flex flex-wrap justify-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href={apply(school.slug)}>
                                Apply for another child
                            </Link>
                        </Button>
                        <Button variant="ghost" asChild>
                            <Link href={schoolPage(school.slug)}>
                                Back to the school page
                            </Link>
                        </Button>
                    </div>
                </main>
            </div>
        </>
    );
}
