/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { resolve } from 'path';
import * as ts from 'typescript';
import { PackageParser } from './parser';
import { Esm2015ReflectionHost } from './host/esm2015_host';

export function mainNgcc(args: string[]): number {
  const rootPath = args[0];
  const packagePath = resolve(rootPath, 'fesm2015');
  const entryPointPath = resolve(packagePath, 'common.js');
  const options: ts.CompilerOptions = { allowJs: true, rootDir: packagePath };
  const host = ts.createCompilerHost(options);
  const packageProgram = ts.createProgram([entryPointPath], options, host);
  const entryPointFile = packageProgram.getSourceFile(entryPointPath)!;
  const typeChecker = packageProgram.getTypeChecker();

  const packageParser = new PackageParser(new Esm2015ReflectionHost(typeChecker));
  const decoratedClasses = packageParser.getDecoratedClasses(entryPointFile);

  console.error('Decorated Classes', decoratedClasses.map(m => m.decorators));

  return 0;
}


