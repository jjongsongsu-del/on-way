const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const mobileRoot = path.resolve(projectRoot, 'apps/mobile');

const config = getDefaultConfig(mobileRoot);

config.watchFolders = [
  mobileRoot,
  path.resolve(projectRoot, 'packages/shared'),
  path.resolve(projectRoot, 'node_modules'),
];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(mobileRoot, 'node_modules'),
];
config.resolver.extraNodeModules = {
  '@badagil/shared': path.resolve(projectRoot, 'packages/shared'),
  'expo-router': path.resolve(mobileRoot, 'node_modules/expo-router'),
};
config.resolver.unstable_enableSymlinks = true;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    return context.resolveRequest(
      context,
      path.resolve(mobileRoot, 'src', moduleName.slice(2)),
      platform,
    );
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
