import { PlantFinder } from '@/components/PlantFinder';
import { Screen } from '@/components/Screen';

export default function SearchScreen() {
  return (
    <Screen title="Buscar" subtitle="Toda planta tiene su nombre">
      <PlantFinder />
    </Screen>
  );
}
