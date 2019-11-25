
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {AbsoluteFsPath, FileSystem} from '../../../src/ngtsc/file_system';
import {NGCC_VERSION} from '../packages/build_marker';
import {EntryPointJsonProperty, Package} from '../packages/entry_point';
import {EntryPointBundle} from '../packages/entry_point_bundle';
import {FileToWrite} from '../rendering/utils';
import {FileWriter} from './file_writer';

export const UNKNOWN_PACKAGE_VERSION = '0.0.0.0';

/**
 * This FileWriter writes the transformed file to a configured cache.
 */
export class CacheFileWriter implements FileWriter {
  constructor(protected fs: FileSystem, private cacheRoot: AbsoluteFsPath) {}

  writeBundle(
      bundle: EntryPointBundle, transformedFiles: FileToWrite[],
      _formatProperties?: EntryPointJsonProperty[]) {
    const cacheDirectory = this.computeCacheDirectory(bundle.entryPoint.package);

    transformedFiles.forEach(
        file => this.writeFile(cacheDirectory, bundle.entryPoint.package.path, file));

    this.writeManifest(cacheDirectory, bundle.entryPoint.name, transformedFiles);
  }

  private computeCacheDirectory(pkg: Package): AbsoluteFsPath {
    return this.fs.resolve(
        this.cacheRoot, NGCC_VERSION, pkg.name, pkg.version || UNKNOWN_PACKAGE_VERSION);
  }

  private writeFile(cacheDirectory: AbsoluteFsPath, packagePath: AbsoluteFsPath, file: FileToWrite):
      void {
    const filePath = this.fs.resolve(cacheDirectory, this.fs.relative(packagePath, file.path));
    this.fs.ensureDir(this.fs.dirname(filePath));
    this.fs.writeFile(filePath, file.contents);
  }

  private writeManifest(
      cacheDirectory: AbsoluteFsPath, entryPointName: string,
      transformedFile: FileToWrite[]): void {
    const manifestPath = this.fs.resolve(cacheDirectory, entryPointName, 'ngcc.manifest.json');
  }
}
