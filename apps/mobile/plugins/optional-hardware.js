/**
 * Marca como OPCIONALES funciones de hardware que Android da por obligatorias sin que la app las necesite:
 * - android.hardware.screen.portrait: la app va en vertical, pero no hace falta que el dispositivo tenga pantalla vertical (tablets, Chromebooks).
 * - android.hardware.wifi: lo deduce del permiso de estado de red; la app funciona igual con datos móviles.
 * Sin esto, Google Play no deja instalar la app en esos dispositivos.
 */
const { withAndroidManifest } = require('expo/config-plugins');

const OPTIONAL = ['android.hardware.screen.portrait', 'android.hardware.wifi'];

module.exports = function withOptionalHardware(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest['uses-feature'] = (manifest['uses-feature'] ?? []).filter(
      (f) => !OPTIONAL.includes(f.$['android:name']),
    );
    for (const name of OPTIONAL) {
      manifest['uses-feature'].push({ $: { 'android:name': name, 'android:required': 'false' } });
    }
    return cfg;
  });
};
