/**
 * Removes the push entitlement (aps-environment) that expo-notifications'
 * config plugin adds. Odo only schedules a local notification (the trial
 * reminder), which does not need it, and the Odo App Store provisioning
 * profile has no Push Notifications capability, so a build with it fails.
 *
 * Listed last in app.json "plugins". Expo applies the expo-notifications
 * plugin after the app.json plugins, and mods run newest first, so this one
 * runs after it and has the last word. Same fix as Attend 1.0.5 (79bd62b).
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
