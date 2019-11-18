/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// General API
export {Diagnostics} from './src/diagnostics';
// Babel plugins
export {makeEs2015TranslatePlugin} from './src/translate/source_files/es2015_translate_plugin';
export {makeEs5TranslatePlugin} from './src/translate/source_files/es5_translate_plugin';
export {makeLocalePlugin} from './src/translate/source_files/locale_plugin';
// Translation loading API
export {TranslationFile, TranslationLoader} from './src/translate/translation_files/translation_loader';
export {SimpleJsonTranslationParser} from './src/translate/translation_files/translation_parsers/simple_json_translation_parser';
export {TranslationParser} from './src/translate/translation_files/translation_parsers/translation_parser';
export {Xliff1TranslationParser} from './src/translate/translation_files/translation_parsers/xliff1_translation_parser';
export {Xliff2TranslationParser} from './src/translate/translation_files/translation_parsers/xliff2_translation_parser';
export {XtbTranslationParser} from './src/translate/translation_files/translation_parsers/xtb_translation_parser';
