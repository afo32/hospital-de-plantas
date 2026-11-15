import { registerSchema } from '@hdp/shared';
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

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState('');
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  async function submit() {
    setGeneral('');
    const result = validate(registerSchema, { name, email, password });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await signUp(result.data);
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
      <AuthHeader title="Crea tu jardín" subtitle="Toda gran arboleda empezó con una semilla" />

      <TextField
        label="¿Cómo te llamas?"
        value={name}
        onChangeText={setName}
        error={errors.name}
        placeholder="Tu nombre"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <TextField
        ref={emailRef}
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
        placeholder="Mínimo 8 caracteres"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      {general ? (
        <AppText color={colors.berry} center>
          {general}
        </AppText>
      ) : null}

      <Button label="Crear cuenta" onPress={submit} loading={loading} />

      <GoogleSection onError={setGeneral} />

      <View style={styles.footer}>
        <AppText color={colors.barkSoft}>¿Ya tienes cuenta?</AppText>
        <Link href="/login" replace>
          <AppText variant="bodyStrong" color={colors.moss}>
            Entra
          </AppText>
        </Link>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', justifyContent: 'center', gap: space.xs, flexWrap: 'wrap' },
});
