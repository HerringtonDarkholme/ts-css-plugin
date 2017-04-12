// tsModule is a type level only, should not export
import * as tsModule from './node_modules/typescript/lib/tsserverlibrary'
import * as path from 'path'
import {processCss} from './postcss'

type TS = typeof tsModule

import * as fs from 'fs'

function log(str: string) {
  if (process.env['TS-CSS-DEBUG']) {
    fs.appendFileSync('/tmp/ts-css-plugin.log', str)
  }
}

function init({typescript: ts}: {typescript: TS}) {
  return {
    create, getExternalFiles
  }

  function create(info: ts.server.PluginCreateInfo) {
    changeSourceFiles(info)
    info.languageServiceHost.resolveModuleNames = (moduleNames, containinFile) => {
      const options = info.languageServiceHost.getCompilationSettings()
      return moduleNames.map(name => {
        if (!isImportCSS(name)) {
          return ts.resolveModuleName(name, containinFile, options, ts.sys).resolvedModule!
        }
        return {
          resolvedFileName: path.join(path.dirname(containinFile), path.basename(name)),
          extension: ts.Extension.Ts

        }
      })
    }
    return info.languageService
  }


  function changeSourceFiles(info: ts.server.PluginCreateInfo) {
    const clssf = ts.createLanguageServiceSourceFile;
    const ulssf = ts.updateLanguageServiceSourceFile;
    function createLanguageServiceSourceFile(fileName: string, scriptSnapshot: ts.IScriptSnapshot, scriptTarget: ts.ScriptTarget, version: string, setNodeParents: boolean, scriptKind?: ts.ScriptKind, cheat?: string): ts.SourceFile {
      if (isCSS(fileName)) {
        const text = processCss(scriptSnapshot.getText(0, scriptSnapshot.getLength()))
        log('css script created: ' + text)
        scriptSnapshot = {
            getChangeRange: old => undefined,
            getLength: () => text.length,
            getText: (start, end) => text.slice(start, end),
        };
      }
      var sourceFile = clssf(fileName, scriptSnapshot, scriptTarget, version, setNodeParents, scriptKind);
      return sourceFile;
    }

    function updateLanguageServiceSourceFile(sourceFile: ts.SourceFile, scriptSnapshot: ts.IScriptSnapshot, version: string, textChangeRange: ts.TextChangeRange, aggressiveChecks?: boolean, cheat?: string): ts.SourceFile {
      if (isCSS(sourceFile.fileName)) {
        const text = processCss(scriptSnapshot.getText(0, scriptSnapshot.getLength()))
        log('css script changed: ' + text)
        scriptSnapshot = {
            getChangeRange: old => undefined,
            getLength: () => text.length,
            getText: (start, end) => text.slice(start, end),
        };
      }
      var sourceFile = ulssf(sourceFile, scriptSnapshot, version, textChangeRange, aggressiveChecks);
      return sourceFile;
    }
    ts.createLanguageServiceSourceFile = createLanguageServiceSourceFile;
    ts.updateLanguageServiceSourceFile = updateLanguageServiceSourceFile;
  }

  function getExternalFiles(project: ts.server.ConfiguredProject) {
    return project.getFileNames().filter(isCSS)
  }

  function isCSS(filename: string) {
    return filename.slice(filename.lastIndexOf('.')) === '.css'
  }

  function isImportCSS(filename: string) {
    return isCSS(filename) && filename.slice(0, 2) === './'
  }
}

export = init
