// Marks the Android release build as debuggable, but ONLY for the EAS
// "preview" profile (internal test APKs).
//
// Why: RevenueCat's Test Store key (test_…) is refused — the SDK shows
// "Wrong API Key" and closes the app — in any non-debuggable Android build.
// Preview APKs are release builds, so they need this to test purchases
// against the Test Store before Google Play is set up.
//
// Safe by construction: production builds are untouched, and Google Play
// rejects debuggable uploads, so a preview build can never be shipped. The
// app still runs the bundled release JavaScript (BuildConfig.DEBUG stays
// false), so it behaves like the real app.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// with-debuggable-preview';

module.exports = function withDebuggablePreview(config) {
  if (process.env.EAS_BUILD_PROFILE !== 'preview') return config;

  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.contents.includes(MARKER)) return mod;
    const pattern = /(buildTypes\s*\{[\s\S]*?\n\s*release\s*\{)/;
    if (!pattern.test(mod.modResults.contents)) {
      throw new Error('with-debuggable-preview: release buildType not found in app/build.gradle');
    }
    mod.modResults.contents = mod.modResults.contents.replace(
      pattern,
      `$1\n            debuggable true ${MARKER}`,
    );
    return mod;
  });
};
