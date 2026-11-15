import { loginSchema } from '@hdp/shared';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { AuthHeader } from '@/components/AuthHeader';
import { AuthScreen } from '@/components/AuthScreen';
import { Button } from '@/components/Button';
import { GoogleSection } from '@/components/GoogleSection';
import { TextField } from '@/components/TextField';
import { apiErrorToForm, validate, type FieldErrors } from '@/lib/forms';
import { colors, space } from '@/theme/tokens';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  async function submit() {
    setGeneral('');
    const result = validate(loginSchema, { email, password });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await signIn(result.data);
      // Al iniciar sesión, las rutas protegidas llevan solas a "Mi jardín".
    } catch (err) {
      const { fields, general: msg } = apiErrorToForm(err);
      setErrors(fields);
      setGeneral(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeader title="Hospital de Plantas" subtitle="Bienvenido de nuevo al jardín" />

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        placeholder="tu@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      {general ? (
        <AppText color={colors.berry} center>
          {general}
        </AppText>
      ) : null}

      <Button label="Entrar" onPress={submit} loading={loading} />

      <GoogleSection onError={setGeneral} />

      <View style={styles.footer}>
        <AppText color={colors.barkSoft}>¿Aún no tienes cuenta?</AppText>
        <Link href="/register" replace>
          <AppText variant="bodyStrong" color={colors.moss}>
            Crea tu jardín
          </AppText>
        </Link>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', justifyContent: 'center', gap: space.xs, flexWrap: 'wrap' },
});
