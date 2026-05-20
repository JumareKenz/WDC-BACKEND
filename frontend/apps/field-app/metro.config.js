const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// pnpm creates symlinks for node_modules; Metro must follow them.
const rootNodeModules = path.resolve(__dirname, '../../node_modules');
const packagesDir = path.resolve(__dirname, '../../packages');

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  rootNodeModules,
];
config.watchFolders = [rootNodeModules, packagesDir];

module.exports = config;
