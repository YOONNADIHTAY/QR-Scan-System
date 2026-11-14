import { Routes, Route, NavLink, Navigate, useParams, useLocation } from 'react-router-dom';
import GeneratePage from './pages/GeneratePage';
import SavedPage from './pages/SavedPage';
import ScanPage from './pages/ScanPage';
import { IconGenerate, IconQrCodes } from './components/Icons';

function ProfileRedirect() {
  const { id } = useParams();
  return <Navigate to={`/edit/${id}`} replace />;
}

function SidebarLink({ to, end, icon, children, match }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => {
        const active = match ? match(isActive) : isActive;
        return active ? 'nav-item active' : 'nav-item';
      }}
    >
      <span className="nav-icon" aria-hidden="true">
        {icon}
      </span>
      <span>{children}</span>
    </NavLink>
  );
}

function AppShell() {
  const location = useLocation();
  const isGenerate = location.pathname === '/' || location.pathname.startsWith('/edit');

  return (
    <div className="dash">
      <aside className="dash-sidebar">
        <div className="brand">
          <img
            className="brand-mark"
            src="/29-jewellery-logo.png"
            alt="29 Jewellery"
          />
          <div className="brand-text">
            <strong>29 Jewellery</strong>
            <small>QR Studio</small>
          </div>
        </div>

        <nav className="dash-nav">
          <SidebarLink to="/" end match={() => isGenerate} icon={<IconGenerate />}>
            Generate
          </SidebarLink>
          <SidebarLink to="/saved" icon={<IconQrCodes />}>
            My QR Codes
          </SidebarLink>
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            <img
              className="sidebar-user-avatar"
              src="/29-jewellery-logo.png"
              alt=""
            />
            <div>
              <strong>Staff Admin</strong>
              <small>QR workspace</small>
            </div>
          </div>
        </div>
      </aside>

      <div className={`dash-main ${isGenerate ? 'is-generate' : 'is-saved'}`}>
        <Routes>
          <Route path="/" element={<GeneratePage />} />
          <Route path="/edit/:id" element={<GeneratePage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/new" element={<Navigate to="/" replace />} />
          <Route path="/profile/:id" element={<ProfileRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/scan/:id" element={<ScanPage />} />
      <Route path="*" element={<AppShell />} />
    </Routes>
  );
}
