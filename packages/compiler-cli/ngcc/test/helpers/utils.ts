/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';

import {AbsoluteFsPath} from '../../../src/ngtsc/path';
import {makeProgram} from '../../../src/ngtsc/testing/in_memory_typescript';
import {BundleProgram} from '../../src/packages/bundle_program';
import {EntryPointFormat, EntryPointJsonProperty} from '../../src/packages/entry_point';
import {EntryPointBundle} from '../../src/packages/entry_point_bundle';
import {Folder} from './mock_file_system';

export {getDeclaration} from '../../../src/ngtsc/testing/in_memory_typescript';

const _Abs = AbsoluteFsPath.from;
/**
 *
 * @param format The format of the bundle.
 * @param files The source files to include in the bundle.
 * @param dtsFiles The typings files to include the bundle.
 */
export function makeTestEntryPointBundle(
    formatProperty: EntryPointJsonProperty, format: EntryPointFormat, isCore: boolean,
    files: {name: AbsoluteFsPath, contents: string, isRoot?: boolean}[],
    dtsFiles?: {name: AbsoluteFsPath, contents: string, isRoot?: boolean}[]): EntryPointBundle {
  const src = makeTestBundleProgram(files);
  const dts = dtsFiles ? makeTestBundleProgram(dtsFiles) : null;
  const isFlatCore = isCore && src.r3SymbolsFile === null;
  return {formatProperty, format, rootDirs: [_Abs('/')], src, dts, isCore, isFlatCore};
}

/**
 * Create a bundle program for testing.
 * @param files The source files of the bundle program.
 */
export function makeTestBundleProgram(files: {name: AbsoluteFsPath, contents: string}[]):
    BundleProgram {
  const {program, options, host} = makeTestProgramInternal(...files);
  const pathString = files[0].name;
  const file = program.getSourceFile(pathString.toString()) !;
  const r3SymbolsInfo = files.find(file => file.name.indexOf('r3_symbols') !== -1) || null;
  const r3SymbolsPath = r3SymbolsInfo && _Abs(r3SymbolsInfo.name.toString());
  const r3SymbolsFile = r3SymbolsPath && program.getSourceFile(r3SymbolsPath.toString()) || null;
  return {program, options, host, path: pathString, file, r3SymbolsPath, r3SymbolsFile};
}

function makeTestProgramInternal(
    ...files: {name: AbsoluteFsPath, contents: string, isRoot?: boolean | undefined}[]): {
  program: ts.Program,
  host: ts.CompilerHost,
  options: ts.CompilerOptions,
} {
  return makeProgram([getFakeCore(), getFakeTslib(), ...files], {allowJs: true, checkJs: false});
}

export function makeTestProgram(
    ...files: {name: AbsoluteFsPath, contents: string, isRoot?: boolean | undefined}[]):
    ts.Program {
  return makeTestProgramInternal(...files).program;
}

// TODO: unify this with the //packages/compiler-cli/test/ngtsc/fake_core package
export function getFakeCore() {
  return {
    name: _Abs('/node_modules/@angular/core/index.d.ts'),
    contents: `
      type FnWithArg<T> = (arg?: any) => T;

      export declare const Component: FnWithArg<(clazz: any) => any>;
      export declare const Directive: FnWithArg<(clazz: any) => any>;
      export declare const Injectable: FnWithArg<(clazz: any) => any>;
      export declare const NgModule: FnWithArg<(clazz: any) => any>;

      export declare const Input: any;

      export declare const Inject: FnWithArg<(a: any, b: any, c: any) => void>;
      export declare const Self: FnWithArg<(a: any, b: any, c: any) => void>;
      export declare const SkipSelf: FnWithArg<(a: any, b: any, c: any) => void>;
      export declare const Optional: FnWithArg<(a: any, b: any, c: any) => void>;

      export declare class InjectionToken {
        constructor(name: string);
      }

      export declare interface ModuleWithProviders<T = any> {}
    `
  };
}

export function getFakeTslib() {
  return {
    name: _Abs('/node_modules/tslib/index.d.ts'),
    contents: `
    export declare function __decorate(decorators: any[], target: any, key?: string | symbol, desc?: any);
    export declare function __param(paramIndex: number, decorator: any);
    export declare function __metadata(metadataKey: any, metadataValue: any);
    `
  };
}

export function convertToDirectTsLibImport(filesystem: {name: AbsoluteFsPath, contents: string}[]) {
  return filesystem.map(file => {
    const contents =
        file.contents
            .replace(
                `import * as tslib_1 from 'tslib';`,
                `import { __decorate, __metadata, __read, __values, __param, __extends, __assign } from 'tslib';`)
            .replace(/tslib_1\./g, '');
    return {...file, contents};
  });
}

export function createFileSystemFromProgramFiles(
    ...fileCollections: ({name: AbsoluteFsPath, contents: string}[] | undefined)[]): Folder {
  const folder: Folder = {};
  fileCollections.forEach(
      files => files && files.forEach(file => folder[file.name.toString()] = file.contents));
  return folder;
}
