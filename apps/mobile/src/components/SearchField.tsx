import { StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, radius, space } from '@/theme/tokens';
import { SearchLeafIcon } from './icons';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

/** Buscador de plantas por nombre común o científico. */
export function SearchField({ value, onChangeText, placeholder = 'Busca por nombre: monstera, romero…' }: Props) {
  return (
    <View style={styles.wrap}>
      <SearchLeafIcon color={colors.barkSoft} size={22} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.barkSoft}
        style={styles.input}
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Buscar planta"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.vellum,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.bark,
  },
});
