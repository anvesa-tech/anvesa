import { listCoupons } from '@/infrastructure/prisma/adminQueries';
import { CouponManager } from '../../_components/CouponManager';

export const dynamic = 'force-dynamic';

/** Coupons management (Requirement 9, 27). */
export default async function CouponsPage() {
  const coupons = await listCoupons().catch(() => []);
  return (
    <>
      <div className="nb-topbar">
        <div>
          <h1 className="nb-h1">Coupons</h1>
          <p className="nb-sub">{coupons.length} coupon(s)</p>
        </div>
      </div>
      <CouponManager coupons={coupons} />
    </>
  );
}
