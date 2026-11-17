import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation, useParams } from 'react-router-dom';
import GeneratePage from './pages/GeneratePage';
import SavedPage from './pages/SavedPage';
import ScanPage from './pages/ScanPage';
import LoginPage from './pages/LoginPage';
import RecordOverviewPage from './pages/RecordOverviewPage';
import {
  BulkPage,
  StatsPage,
  TemplatesPage,
  DomainsPage,
  PlansPage,
  SettingsPage,
  UsersPage,
  SecurityPage,
  ContactPage,
  HelpPage,
} from './pages/SidebarPages';
import {
  getAuthProfile,
  getStaffProfileId,
  isAdmin,
  isAuthenticated,
  logout,
} from './auth';
import { useI18n } from './I18nContext';
import InstallAppBanner from './components/InstallAppBanner';
import {
  IconGenerate,
  IconQrCodes,
  IconBulk,
  IconStats,
  IconTemplate,
  IconGlobe,
  IconCard,
  IconSettings,
  IconUser,
  IconShield,
  IconMail,
  IconHelp,
  IconCollapse,
} from './components/Icons';

const SIDEBAR_KEY = 'qr_sidebar_collapsed';

function RequireAuth({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function ProfileToRecordRedirect() {
  const { id } = useParams();
  return <Navigate to={`/record/${id}`} replace />;
}

function StaffHome() {
  const id = getStaffProfileId();
  if (!id) {
    return (
      <div className="page-panel">
        <div className="panel-card sidebar-page-card empty-panel">
          <p>Your QR is not linked yet. Ask an admin to create your customer QR.</p>
        </div>
      </div>
    );
  }
  return <RecordOverviewPage forcedId={id} />;
}

function SidebarLink({ to, end, icon, children, match, title }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={title || (typeof children === 'string' ? children : undefined)}
      className={({ isActive }) => {
        const active = match ? match(isActive) : isActive;
        return active ? 'nav-item active' : 'nav-item';
      }}
    >
      <span className="nav-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="nav-label">{children}</span>
    </NavLink>
  );
}

function AppShell() {
  const { t } = useI18n();
  const location = useLocation();
  const admin = isAdmin();
  const profile = getAuthProfile();
  const isGenerate =
    location.pathname === '/' || location.pathname.startsWith('/edit');
  const userLabel = profile?.email || 'User';
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === '1'
  );

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  async function onLogout() {
    await logout();
    window.location.assign('/login');
  }

  return (
    <div className={`dash ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="dash-sidebar">
        <div className="brand">
          <img
            className="brand-mark"
            src="/29-jewellery-logo.png"
            alt="29 Jewellery"
          />
          <div className="brand-text">
            <strong>29 Jewellery</strong>
            <small>{t('brandSub')}</small>
          </div>
          <button
            type="button"
            className="sidebar-collapse"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
            title={collapsed ? t('expandSidebar') : t('collapseSidebar')}
          >
            <IconCollapse />
          </button>
        </div>

        <nav className="dash-nav">
          {admin ? (
            <>
              <SidebarLink to="/" end match={() => location.pathname === '/'} icon={<IconGenerate />}>
                {t('navNewQr')}
              </SidebarLink>
              <SidebarLink to="/bulk" icon={<IconBulk />}>
                {t('navBulk')}
              </SidebarLink>
              <SidebarLink to="/saved" icon={<IconQrCodes />}>
                QR Registry
              </SidebarLink>
              <SidebarLink to="/stats" icon={<IconStats />}>
                {t('navStats')}
              </SidebarLink>
              <SidebarLink to="/templates" icon={<IconTemplate />}>
                {t('navTemplates')}
              </SidebarLink>
              <SidebarLink to="/domains" icon={<IconGlobe />}>
                {t('navDomains')}
              </SidebarLink>
              <SidebarLink to="/plans" icon={<IconCard />}>
                {t('navPlans')}
              </SidebarLink>
              <SidebarLink to="/settings" icon={<IconSettings />}>
                {t('navSettings')}
              </SidebarLink>
              <SidebarLink to="/users" icon={<IconUser />}>
                Customer register
              </SidebarLink>
              <div className="nav-divider" role="separator" />
              <SidebarLink to="/security" icon={<IconShield />}>
                {t('navSecurity')}
              </SidebarLink>
              <SidebarLink to="/contact" icon={<IconMail />}>
                {t('navContact')}
              </SidebarLink>
              <SidebarLink to="/help" icon={<IconHelp />}>
                {t('navHelp')}
              </SidebarLink>
            </>
          ) : (
            <>
              <SidebarLink to="/my-qr" icon={<IconQrCodes />}>
                My QR
              </SidebarLink>
              <SidebarLink to="/settings" icon={<IconSettings />}>
                {t('navSettings')}
              </SidebarLink>
              <SidebarLink to="/help" icon={<IconHelp />}>
                {t('navHelp')}
              </SidebarLink>
            </>
          )}
        </nav>

        <div className="sidebar-foot">
          {admin ? (
            <div className="sidebar-tip">
              <strong>{t('tipTitle')}</strong>
              <span>{t('tipText')}</span>
              <NavLink to="/plans" className="sidebar-tip-btn">
                {t('tipBtn')}
              </NavLink>
            </div>
          ) : (
            <div className="sidebar-tip">
              <strong>Customer workspace</strong>
              <span>View your profile, scans, and edit your QR record.</span>
            </div>
          )}
          <div className="sidebar-user">
            <img
              className="sidebar-user-avatar"
              src="/29-jewellery-logo.png"
              alt=""
            />
            <div>
              <strong>{admin ? t('administrator') : profile?.name || 'Customer'}</strong>
              <small title={userLabel}>{userLabel}</small>
            </div>
          </div>
          <button type="button" className="sidebar-logout" onClick={onLogout}>
            {t('signOut')}
          </button>
        </div>
      </aside>

      <div className={`dash-main ${isGenerate ? 'is-generate' : 'is-saved'}`}>
        <Routes>
          {admin ? (
            <>
              <Route path="/" element={<GeneratePage />} />
              <Route path="/edit/:id" element={<GeneratePage />} />
              <Route path="/record/:id" element={<RecordOverviewPage />} />
              <Route path="/saved" element={<SavedPage />} />
              <Route path="/bulk" element={<BulkPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/domains" element={<DomainsPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/new" element={<Navigate to="/" replace />} />
              <Route path="/profile/:id" element={<ProfileToRecordRedirect />} />
              <Route path="/my-qr" element={<Navigate to="/" replace />} />
              <Route path="/my-profile" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/my-qr" element={<StaffHome />} />
              <Route path="/edit/:id" element={<GeneratePage staffMode />} />
              <Route path="/record/:id" element={<RecordOverviewPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/my-profile" element={<Navigate to="/my-qr" replace />} />
              <Route path="*" element={<Navigate to="/my-qr" replace />} />
            </>
          )}
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <InstallAppBanner />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/scan/:id" element={<ScanPage />} />
        <Route
          path="*"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        />
      </Routes>
    </>
  );
}
