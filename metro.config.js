const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const projectRoot = __dirname;
const mobileRoot = path.resolve(projectRoot, 'apps/mobile');
const mobileRequire = createRequire(path.join(mobileRoot, 'package.json'));
const { getDefaultConfig } = mobileRequire('expo/metro-config');
const mobilePackageRoot = (packageName) =>
  path.dirname(mobileRequire.resolve(`${packageName}/package.json`));
const resolveWorkspacePackageRoot = (packageName) => {
  try {
    return mobilePackageRoot(packageName);
  } catch {
    const pnpmRoot = path.resolve(projectRoot, 'node_modules/.pnpm');
    const packageDir = packageName.replace('/', '+');
    const match = fs
      .readdirSync(pnpmRoot)
      .find((name) => name === packageDir || name.startsWith(`${packageDir}@`));

    if (!match) {
      throw new Error(`Unable to resolve ${packageName} from ${pnpmRoot}`);
    }

    return path.resolve(pnpmRoot, match, 'node_modules', packageName);
  }
};

const config = getDefaultConfig(projectRoot);

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
  'expo-router': mobilePackageRoot('expo-router'),
  'react-native': mobilePackageRoot('react-native'),
  'metro-runtime': resolveWorkspacePackageRoot('metro-runtime'),
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
