import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Target, Menu, Building2, CheckSquare, FileText, Eye, MoreHorizontal, Settings as SettingsIcon, DollarSign, Trophy, ChevronDown, ChevronRight, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { hasPermission, type Permission, isPlayerRole, isScoutRole } from '@/lib/accessPolicy';
import { ThemeSelector } from '@/components/ThemeSelector';
import { applyTheme, getSavedTheme } from '@/lib/themes';
import { getContractExpiringMonths, setContractExpiringMonths } from '@/lib/settingsUtils';
import logoDark from '@/assets/logo-dark.jpeg';
import logoLight from '@/assets/logo-light.jpeg';
import { useAppContext } from '@/context/PlayerContext';
import { fetchScouts } from '@/services/apiService';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard:view' as Permission },
  { to: '/players', label: 'Players', icon: Users, permission: 'players:view' as Permission },
  { to: '/clubs', label: 'Clubs', icon: Building2, permission: 'clubs:view' as Permission },
  { to: '/scouts', label: 'Coaches', icon: Eye, permission: 'scouts:view' as Permission },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare, permission: 'tasks:view' as Permission },
  { to: '/templates', label: 'Templates', icon: FileText, permission: 'templates:view' as Permission },
  { to: '/matching', label: 'Matching', icon: Target, permission: 'matching:view' as Permission },
  { to: '/contracts', label: 'Contracts', icon: DollarSign, permission: 'commercial:view' as Permission },
  { to: '/pending-approvals', label: 'Approvals', icon: ClipboardList, permission: 'admin:manage' as Permission },
];

export const AppLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [companyName, setCompanyName] = useState<string>('');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const { scouts } = useAppContext();

  const isPlayer = isPlayerRole(user?.role);
  const isScout = isScoutRole(user?.role);
  const isRestrictedUser = isPlayer || isScout;

  const currentScout = scouts.find(s => s.email?.toLowerCase() === user?.email?.toLowerCase());
  const lockedAreas = (() => {
    if (!isRestrictedUser || !currentScout?.lockedAreas) return [] as string[];

    const normalizeArray = (arr: any[]) => arr
      .filter(item => typeof item === 'string')
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0);

    if (Array.isArray(currentScout.lockedAreas)) {
      return normalizeArray(currentScout.lockedAreas);
    }

    try {
      const parsed = JSON.parse(currentScout.lockedAreas);
      return Array.isArray(parsed) ? normalizeArray(parsed) : [];
    } catch {
      // if it's a plain string like "Clubs, Matching" try splitting by comma
      if (typeof currentScout.lockedAreas === 'string') {
        return currentScout.lockedAreas
          .split(',')
          .map(s => s.trim().toLowerCase())
          .filter(s => s.length > 0);
      }
      return [];
    }
  })();

  const [lockedAreasOverride, setLockedAreasOverride] = useState<string[] | null>(null);
  const scoutsFetchAttemptedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const ensureLockedAreas = async () => {
      // If we already have locked areas from the currentScout or override, nothing to do
      if ((lockedAreas && lockedAreas.length > 0) || (lockedAreasOverride && lockedAreasOverride.length > 0)) return;
      if (!isRestrictedUser || !user?.email) return;
      // Don't attempt repeated remote fetches — try at most once per app load
      if (scoutsFetchAttemptedRef.current) return;
      scoutsFetchAttemptedRef.current = true;

      const normalize = (v: any): string[] => {
        if (!v) return [];
        if (Array.isArray(v)) return v.filter((it: any) => typeof it === 'string').map((s: string) => s.trim().toLowerCase());
        try {
          const parsed = JSON.parse(v);
          if (Array.isArray(parsed)) return parsed.filter((it: any) => typeof it === 'string').map((s: string) => s.trim().toLowerCase());
        } catch { /* ignore */ }
        if (typeof v === 'string') return v.split(',').map((s: string) => s.trim().toLowerCase()).filter((s: string) => s.length > 0);
        return [];
      };

      try {
        // Prefer already-loaded scouts from context to avoid an extra network call
        if (Array.isArray(scouts) && scouts.length > 0) {
          const matchLocal = scouts.find((s: any) => (s.email || '').toLowerCase() === user.email.toLowerCase());
          const rawLockedLocal = matchLocal ? ((matchLocal as any).lockedAreas ?? (matchLocal as any)['locked_areas'] ?? (matchLocal as any)['locked_areas_text'] ?? null) : null;
          const normalizedLocal = normalize(rawLockedLocal);
          if (!cancelled) { setLockedAreasOverride(normalizedLocal); }
          return;
        }

        // Fallback: fetch scouts once
        const remoteScouts = await fetchScouts();
        if (cancelled || !Array.isArray(remoteScouts)) return;
        const match = remoteScouts.find((s: any) => (s.email || '').toLowerCase() === user.email.toLowerCase());
        const rawLocked = match ? ((match as any).lockedAreas ?? (match as any)['locked_areas'] ?? (match as any)['locked_areas_text'] ?? null) : null;
        const normalized = normalize(rawLocked);
        if (!cancelled) setLockedAreasOverride(normalized);
      } catch (err) {
        // swallow — best-effort only
        console.debug('AppLayout: failed to fetch scouts for lockedAreas', err);
        if (!cancelled) setLockedAreasOverride([]);
      }
    };

    ensureLockedAreas();
    return () => { cancelled = true; };
  }, [isRestrictedUser, user?.email, lockedAreas]);

  useEffect(() => {
    applyTheme(getSavedTheme());
  }, []);

  useEffect(() => {
    setContractExpiringMonths(getContractExpiringMonths());
  }, []);

  // Listen for company profile updates from settings page
  useEffect(() => {
    const handleCompanyProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { companyName: updatedName, logoUrl: updatedLogo } = customEvent.detail;
      setCompanyName(updatedName || '');
      setCompanyLogo(updatedLogo || null);
    };

    window.addEventListener('companyProfileUpdated', handleCompanyProfileUpdate);
    return () => {
      window.removeEventListener('companyProfileUpdated', handleCompanyProfileUpdate);
    };
  }, []);

  const NavContent = () => (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.filter(item => hasPermission(user?.role, item.permission) && (!isRestrictedUser || !((lockedAreasOverride ?? lockedAreas).includes(item.label.toLowerCase())))).map(item => {
        const active = location.pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              active ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <item.icon size={18} />
            {item.label}
          </Link>
        );
      })}

      {(!isRestrictedUser || !lockedAreas.includes('settings')) && (
        <div className=''>
          <button
            onClick={() => setSettingsOpen((s) => !s)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground w-full text-left",
            )}
          >
            <SettingsIcon size={18} />
            <span>Settings</span>
            <span className="ml-auto text-sidebar-foreground/70">
              {settingsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>
          <div className={`mt-2 px-3 transform origin-top transition-all duration-200 ${settingsOpen ? 'opacity-100 scale-100 max-h-96' : 'opacity-0 scale-95 max-h-0 pointer-events-none'}`}>
            <hr />
            {/* ThemeSelector moved to Company Profile form */}
            <div className="px-3 py-1">
              <button onClick={() => { navigate('/settings/company-profile'); }} className={cn("w-full flex items-center gap-2 text-left text-[15px] px-2 py-1 rounded-md", location.pathname.startsWith('/settings/company-profile') ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground/80 hover:text-sidebar-foreground')}>
                <Building2 size={14} />
                Company Profile
              </button>
            </div>
            <div className="px-3 py-1">
              <button onClick={() => { navigate('/settings/manage-roles'); }} className={cn("w-full flex items-center gap-2 text-left text-[15px] px-2 py-1 rounded-md", location.pathname.startsWith('/settings/manage-roles') ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground/80 hover:text-sidebar-foreground')}>
                <Users size={14} />
                Manage Roles
              </button>
            </div>
            {/* <div className="px-3 py-1">
              <button onClick={() => { navigate('/settings/manage-positions'); }} className={cn("w-full flex items-center gap-2 text-left text-[15px] px-2 py-1 rounded-md", location.pathname.startsWith('/settings/manage-positions') ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground/80 hover:text-sidebar-foreground')}>
                <Target size={14} />
                Manage Positions
              </button>
            </div> */}
            <div className="px-3 py-1">
              <button onClick={() => { navigate('/settings/sports-management'); }} className={cn("w-full flex items-center gap-2 text-left text-[15px] px-2 py-1 rounded-md", location.pathname.startsWith('/settings/sports-management') ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground/80 hover:text-sidebar-foreground')}>
                <Trophy size={14} />
                Sports Management
              </button>
            </div>
            <div className="px-3 py-1">
              <button onClick={() => { navigate('/settings/sponsors-management'); }} className={cn("w-full flex items-center gap-2 text-left text-[15px] px-2 py-1 rounded-md", location.pathname.startsWith('/settings/sponsors-management') ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground/80 hover:text-sidebar-foreground')}>
                <DollarSign size={14} />
                Sponsors
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );

  const SidebarLogo = () => (
    <Link to="/dashboard" className="flex flex-col items-center justify-center">
      <img src={companyLogo || logoDark} alt={companyName || 'Yourdan Agency'} className="h-14 w-auto object-contain" />
      {companyName && <p className="text-xs text-white mt-2 font-medium">{companyName}</p>}
    </Link>
  );

  const HeaderLogo = () => (
    <Link to="/dashboard" className="flex items-center">
      <img src={logoLight} alt="Yourdan Agency" className="h-10 w-auto object-contain" />
    </Link>
  );

  return (
    <div className="flex h-screen w-full">
      <aside className="hidden md:flex w-60 flex-col border-r border-sidebar-border bg-sidebar shrink-0">
        <div className="p-5 border-b border-sidebar-border"><SidebarLogo /></div>
        <NavContent />
        <div className="mt-auto p-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className='flex items-center gap-2'>
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'Guest')}&background=random&color=fff&size=64`} alt={user?.fullName || 'Guest'} className="h-10 w-10 rounded-full object-cover" />
              <div className='block'>
                <p className="text-sm font-medium font-bold text-white">{user?.fullName || 'Guest'}</p>
                <p className="text-xs text-white ">{user?.role || ''}</p>
              </div>
            </div>
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><MoreHorizontal size={18} className="text-white" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(user?.role === 'Player' || user?.role === 'Scout') && (
                    <DropdownMenuItem onClick={() => { navigate('/my-profile'); }}>
                      Edit My Profile
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => { logout(); navigate('/login'); }}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div style={{ color: 'white', fontSize: '10px', height: '10px', textAlign: 'right' }}>1.0.0.1</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border no-print">
          <HeaderLogo />
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon"><Menu size={20} /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-60 p-0 bg-sidebar">
                <div className="p-5 border-b border-sidebar-border"><SidebarLogo /></div>
                <NavContent />
              </SheetContent>
            </Sheet>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
