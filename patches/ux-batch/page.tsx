'use client';

import { useState } from 'react';
import CabinetSubpage from '@/components/CabinetSubpage';
import EcoPointsPanel from '@/components/EcoPointsPanel';
import ShopCollectiblesLazy from '@/components/ShopCollectiblesLazy';

export default function DashboardShopPage() {
  const [eco, setEco] = useState<number | undefined>();
  return (
    <CabinetSubpage
      title="Магазин"
      lead="Купите и сразу наденьте. Карты — ниже."
    >
      <div className="shop-stage">
        <EcoPointsPanel mode="shop" onBalanceChange={setEco} />
        <ShopCollectiblesLazy onBalanceChange={setEco} />
      </div>
    </CabinetSubpage>
  );
}
