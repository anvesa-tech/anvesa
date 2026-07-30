import { redirect } from 'next/navigation';
import { getAdminSession } from '@/infrastructure/auth/adminSession';
import { Nav } from '../_components/Nav';
import '../nb.css';

export const dynamic = 'force-dynamic';

/** Protected admin shell (Requirement 27.7). Non-admins are redirected to login. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  return (
    <div className="nb-body">
      <div className="nb-shell">
        <Nav email={session.email} />
        <main className="nb-main">{children}</main>
      </div>
    </div>
  );
}
