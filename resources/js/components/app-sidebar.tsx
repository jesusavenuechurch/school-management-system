import { Link, usePage } from '@inertiajs/react';
import {
    Inbox,
    Award,
    BookMarked,
    CalendarRange,
    FileText,
    PenLine,
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
import { index as marksIndex } from '@/routes/marks';
import { index as reportsIndex } from '@/routes/reports';
import { index as scalesIndex } from '@/routes/scales';
import { classes, journey } from '@/routes/setup';
import { index as subjectsIndex } from '@/routes/setup/subjects';
import { index as yearsIndex } from '@/routes/setup/years';
import { index as applicationsIndex } from '@/routes/applications';
import { index as staffIndex } from '@/routes/staff';
import { index as studentsIndex } from '@/routes/students';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { auth, school } = usePage().props;
    const isAdmin = auth.roles.includes('admin');
    const isTeacher = auth.roles.includes('teacher');

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
            tone: 'text-primary',
        },
        ...(isAdmin
            ? [
                  {
                      title: 'Students',
                      href: studentsIndex(),
                      icon: UsersRound,
                      tone: 'text-sky',
                  },
                  {
                      title: 'Applications',
                      href: applicationsIndex(),
                      icon: Inbox,
                      tone: 'text-coral',
                  },
                  {
                      title: 'Staff',
                      href: staffIndex(),
                      icon: UserRoundCog,
                      tone: 'text-board',
                  },
              ]
            : []),
        ...(isAdmin || isTeacher
            ? [
                  {
                      title: 'Marks',
                      href: marksIndex(),
                      icon: PenLine,
                      tone: 'text-[color-mix(in_oklch,var(--sun)_65%,var(--ink))]',
                  },
                  {
                      title: 'Report cards',
                      href: reportsIndex(),
                      icon: FileText,
                      tone: 'text-leaf',
                  },
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
        { title: 'Marking scales', href: scalesIndex(), icon: Award },
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
