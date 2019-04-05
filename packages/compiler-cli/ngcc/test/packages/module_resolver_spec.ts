/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as mockFs from 'mock-fs';

import {AbsoluteFsPath} from '../../../src/ngtsc/path';
import {ModuleResolver} from '../../src/packages/module_resolver';

const _ = AbsoluteFsPath.from;

function createMockFileSystem() {
  mockFs({
    '/libs': {
      'local-package': {
        'package.json': 'PACKAGE.JSON for local-package',
        'index.d.ts': `import {X} from './x';`,
        'x.d.ts': `export class X {}`,
        'sub-folder': {
          'index.d.ts': `import {X} from '../x';`,
        },
        'node_modules': {
          'package-1': {
            'sub-folder': {'index.d.ts': `export class Z {}`},
            'package.json': 'PACKAGE.JSON for package-1',
          },
        },
      },
      'node_modules': {
        'package-2': {
          'package.json': 'PACKAGE.JSON for package-2',
          'node_modules': {
            'package-3': {
              'package.json': 'PACKAGE.JSON for package-3',
            },
          },
        },
      },
    },
    '/dist': {
      'package-4': {
        'x.d.ts': `export class X {}`,
        'package.json': 'PACKAGE.JSON for package-4',
        'sub-folder': {'index.d.ts': `import {X} from '@shared/package-4/x';`},
      },
      'sub-folder': {
        'package-4': {
          'package.json': 'PACKAGE.JSON for package-4',
        },
        'package-5': {
          'package.json': 'PACKAGE.JSON for package-5',
          'post-fix': {
            'package.json': 'PACKAGE.JSON for package-5/post-fix',
          }
        },
      }
    },
    '/node_modules': {
      'top-package': {
        'package.json': 'PACKAGE.JSON for top-package',
      }
    }
  });
}

function restoreRealFileSystem() {
  mockFs.restore();
}

describe('ModuleResolver', () => {
  beforeEach(createMockFileSystem);
  afterEach(restoreRealFileSystem);

  describe('resolveModule()', () => {
    describe('with relative paths', () => {
      it('should resolve sibling, child and aunt modules', () => {
        const resolver = new ModuleResolver();
        expect(resolver.resolveModuleImport('./x', _('/libs/local-package/index.d.ts'))).toEqual({
          isRelative: true,
          isDeepImport: false,
          resolvedPath: _('/libs/local-package/x.d.ts')
        });
        expect(resolver.resolveModuleImport('./sub-folder', _('/libs/local-package/index.d.ts')))
            .toEqual({
              isRelative: true,
              isDeepImport: false,
              resolvedPath: _('/libs/local-package/sub-folder/index.d.ts')
            });
        expect(resolver.resolveModuleImport('../x', _('/libs/local-package/sub-folder/index.d.ts')))
            .toEqual({
              isRelative: true,
              isDeepImport: false,
              resolvedPath: _('/libs/local-package/x.d.ts')
            });
      });

      it('should return `null` if the resolved module relative module does not exist', () => {
        const resolver = new ModuleResolver();
        expect(resolver.resolveModuleImport('./y', _('/libs/local-package/index.d.ts'))).toBe(null);
      });
    });

    describe('with non-mapped external paths', () => {
      it('should resolve to the package.json of a local node_modules package', () => {
        const resolver = new ModuleResolver();
        expect(resolver.resolveModuleImport('package-1', _('/libs/local-package/index.d.ts')))
            .toEqual({
              isRelative: false,
              isDeepImport: false,
              resolvedPath: _('/libs/local-package/node_modules/package-1'),
            });
        expect(resolver.resolveModuleImport(
                   'package-1', _('/libs/local-package/sub-folder/index.d.ts')))
            .toEqual({
              isRelative: false,
              isDeepImport: false,
              resolvedPath: _('/libs/local-package/node_modules/package-1'),
            });
        expect(resolver.resolveModuleImport('package-1', _('/libs/local-package/x.d.ts'))).toEqual({
          isRelative: false,
          isDeepImport: false,
          resolvedPath: _('/libs/local-package/node_modules/package-1'),
        });
      });

      it('should resolve to the package.json of a higher node_modules package', () => {
        const resolver = new ModuleResolver();
        expect(resolver.resolveModuleImport('package-2', _('/libs/local-package/index.d.ts')))
            .toEqual({
              isRelative: false,
              isDeepImport: false,
              resolvedPath: _('/libs/node_modules/package-2'),
            });
        expect(resolver.resolveModuleImport('top-package', _('/libs/local-package/index.d.ts')))
            .toEqual({
              isRelative: false,
              isDeepImport: false,
              resolvedPath: _('/node_modules/top-package'),
            });
      });

      it('should return `null` if the package cannot be found', () => {
        const resolver = new ModuleResolver();
        expect(resolver.resolveModuleImport('missing-2', _('/libs/local-package/index.d.ts')))
            .toBe(null);
      });

      it('should return `null` if the package is not accessible because it is in a inner node_modules package',
         () => {
           const resolver = new ModuleResolver();
           expect(resolver.resolveModuleImport('package-3', _('/libs/local-package/index.d.ts')))
               .toBe(null);
         });

      it('should identify deep imports into an external module', () => {
        const resolver = new ModuleResolver();
        expect(resolver.resolveModuleImport(
                   'package-1/sub-folder', _('/libs/local-package/index.d.ts')))
            .toEqual({
              isRelative: false,
              isDeepImport: true,
              resolvedPath: _('/libs/local-package/node_modules/package-1/sub-folder'),
            });
      });
    });

    describe('with mapped path external modules', () => {
      it('should resolve to the package.json of simple mapped packages', () => {
        const resolver =
            new ModuleResolver({baseUrl: '/dist', paths: {'*': ['*', 'sub-folder/*']}});

        expect(resolver.resolveModuleImport('package-4', _('/libs/local-package/index.d.ts')))
            .toEqual({isRelative: false, isDeepImport: false, resolvedPath: _('/dist/package-4')});

        expect(resolver.resolveModuleImport('package-5', _('/libs/local-package/index.d.ts')))
            .toEqual({
              isRelative: false,
              isDeepImport: false,
              resolvedPath: _('/dist/sub-folder/package-5'),
            });
      });

      it('should follow the ordering of `paths` when matching mapped packages', () => {
        let resolver: ModuleResolver;

        resolver = new ModuleResolver({baseUrl: '/dist', paths: {'*': ['*', 'sub-folder/*']}});
        expect(resolver.resolveModuleImport('package-4', _('/libs/local-package/index.d.ts')))
            .toEqual({isRelative: false, isDeepImport: false, resolvedPath: _('/dist/package-4')});

        resolver = new ModuleResolver({baseUrl: '/dist', paths: {'*': ['sub-folder/*', '*']}});
        expect(resolver.resolveModuleImport('package-4', _('/libs/local-package/index.d.ts')))
            .toEqual({
              isRelative: false,
              isDeepImport: false,
              resolvedPath: _('/dist/sub-folder/package-4'),
            });
      });

      it('should resolve packages when the path mappings have post-fixes', () => {
        const resolver =
            new ModuleResolver({baseUrl: '/dist', paths: {'*': ['sub-folder/*/post-fix']}});
        expect(resolver.resolveModuleImport('package-5', _('/libs/local-package/index.d.ts')))
            .toEqual({
              isRelative: false,
              isDeepImport: false,
              resolvedPath: _('/dist/sub-folder/package-5/post-fix'),
            });
      });

      it('should match paths against complex path matchers', () => {
        const resolver =
            new ModuleResolver({baseUrl: '/dist', paths: {'@shared/*': ['sub-folder/*']}});
        expect(
            resolver.resolveModuleImport('@shared/package-4', _('/libs/local-package/index.d.ts')))
            .toEqual({
              isRelative: false,
              isDeepImport: false,
              resolvedPath: _('/dist/sub-folder/package-4'),
            });
        expect(resolver.resolveModuleImport('package-5', _('/libs/local-package/index.d.ts')))
            .toBe(null);
      });

      it('should resolve path as "relative" if the mapped path is inside the current package',
         () => {
           const resolver = new ModuleResolver({baseUrl: '/dist', paths: {'@shared/*': ['*']}});
           expect(resolver.resolveModuleImport(
                      '@shared/package-4/x', _('/dist/package-4/sub-folder/index.d.ts')))
               .toEqual({
                 isRelative: true,
                 isDeepImport: false,
                 resolvedPath: _('/dist/package-4/x.d.ts'),
               });
         });

      it('should resolve paths where the wildcard matches more than one path segment', () => {
        const resolver =
            new ModuleResolver({baseUrl: '/dist', paths: {'@shared/*/post-fix': ['*/post-fix']}});
        expect(resolver.resolveModuleImport(
                   '@shared/sub-folder/package-5/post-fix',
                   _('/dist/package-4/sub-folder/index.d.ts')))
            .toEqual({
              isRelative: false,
              isDeepImport: false,
              resolvedPath: _('/dist/sub-folder/package-5/post-fix'),
            });
      });
    });
  });
});
