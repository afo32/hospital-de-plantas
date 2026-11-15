import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { Screen } from '@/components/Screen';
import { SegmentedTabs } from '@/components/SegmentedTabs';

const GARDEN_TABS = [
  { value: 'today', label: 'Hoy' },
  { value: 'plants', label: 'Mis plantas' },
] as const;

type GardenTab = (typeof GARDEN_TABS)[number]['value'];

/** Mi jardín: subpestañas Hoy y Mis plantas (se rellenan en la fase 4). */
export default function GardenScreen() {
  const [tab, setTab] = useState<GardenTab>('today');
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0];

  return (
    <Screen
      title="Mi jardín"
      subtitle={firstName ? `Hola, ${firstName}. Cada hoja a su tiempo` : 'Cada hoja a su tiempo'}
      header={<SegmentedTabs options={GARDEN_TABS} value={tab} onChange={setTab} />}
      floating={<Fab onPress={() => router.push('/add')} />}
    >
      {tab === 'today' ? (
        <EmptyState
          title="Nada que regar hoy"
          message="Cuando añadas plantas, aquí verás lo que toca regar hoy y en los próximos días."
        />
      ) : (
        <EmptyState
          title="Tu jardín está esperando"
          message="Pulsa el botón + para añadir tu primera planta."
        />
      )}
    </Screen>
  );
}
