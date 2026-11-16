import { Link, usePage } from '@inertiajs/react';
import {
    BookMarked,
    CalendarRange,
    LayoutGrid,
    School,
    Sparkles,
    UserRoundCog,
    UsersRound,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { classes, journey } from '@/routes/setup';
import { index as subjectsIndex } from '@/routes/setup/subjects';
import { index as yearsIndex } from '@/routes/setup/years';
import { index as staffIndex } from '@/routes/staff';
import { index as studentsIndex } from '@/routes/students';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { auth, school } = usePage().props;
    const isAdmin = auth.roles.includes('admin');

    const mainNavItems: NavItem[] = [
        { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
        ...(isAdmin
            ? [
                  {
                      title: 'Students',
                      href: studentsIndex(),
                      icon: UsersRound,
                  },
                  { title: 'Staff', href: staffIndex(), icon: UserRoundCog },
              ]
            : []),
    ];

    const setupNavItems: NavItem[] = [
        ...(school && !school.setup_complete
            ? [{ title: 'Setup journey', href: journey(), icon: Sparkles }]
            : []),
        {
            title: 'School year & terms',
            href: yearsIndex(),
            icon: CalendarRange,
        },
        { title: 'Grades & classes', href: classes(), icon: School },
        { title: 'Subjects', href: subjectsIndex(), icon: BookMarked },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} label="School" />
                {isAdmin && <NavMain items={setupNavItems} label="Setup" />}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
