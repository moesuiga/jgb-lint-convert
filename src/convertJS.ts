import { parse } from '@babel/parser';
import generate from '@babel/generator';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { readConfigAsync, IConvertConfigValue, IConvertConfig } from './config';
import _ from 'lodash';

const TaConfig: IConvertConfig = {
  'wx.Ta': {
    replacedKey: 'tuhuTA.track',
    import: 'localModules/init/ta',
  },
  'wx.Ta.ta': {
    replacedKey: 'tuhuTA.track',
    import: 'localModules/init/ta',
  },
};

export async function convertJS(code: string) {
  let changed = false;
  // remove some code like "type MyPage = BasePage"
  const replacedTypes = [
    'JPage',
    'BasePage',
    'IMyPage',
    'AuthInterestsOptions',
    'AuthVehicleInfoOptions',
    'UploadImageOptions',
    'AuthQAOptions'
  ];
  code = code.replace(new RegExp(`^type\\s+[^=]+\\s*=\\s*(${replacedTypes.join('|')});?$`, 'gm'), function (match) {
    console.log('\n=======\n', match, '\n=======\n',)
    changed = true;
    return '';
  });
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'decorators-legacy', 'classPrivateMethods', 'classPrivateProperties', 'classProperties', 'asyncGenerators', 'exportDefaultFrom', 'doExpressions', 'dynamicImport', 'exportNamespaceFrom', 'functionBind'],
  });

  // collect names similar "import { name } from 'module'"
  const importedNames = new Map<string, string[]>();
  // collect default names similar "import name from 'module'"
  const importedDefaults = new Map<string, string[]>();
  // collect namespaces similar "import * as name from 'module'"
  const importedNamespaces = new Map<string, string[]>();

  const matchedConfig = [] as IConvertConfigValue[];
  let convertConfig = await readConfigAsync();

  traverse(ast, {
    ImportDeclaration(node) {
      const sourceFile = node.node.source.value;
      const { specifiers } = node.node;
      specifiers.forEach((s) => {
        // similar `import obj from 'module';`
        if (t.isImportDefaultSpecifier(s)) {
          const names = [] as string[];
          if (importedDefaults.has(sourceFile)) {
            names.push(...importedDefaults.get(sourceFile));
          }
          names.push(s.local.name);
          importedDefaults.set(sourceFile, names);
        }
        // similar `import { obj } from 'module'`
        else if (t.isImportSpecifier(s)) {
          const names = [] as string[];
          if (importedNames.has(sourceFile)) {
            names.push(...importedNames.get(sourceFile));
          }
          names.push(s.local.name);
          importedNames.set(sourceFile, names);
        }
      });
    },
    MemberExpression(node) {
      if (t.isAssignmentExpression(node.parent)) return;

      const result = getTargetMemberExpression(node);
      if (result) {
        const key = result.key.join('.');
        let config: IConvertConfigValue;
        if ((config = convertConfig[key])) {
          result.node.replaceWith(t.identifier(config.replacedKey));
          if (!matchedConfig.includes(config)) {
            matchedConfig.push(config);
          }
        } else if ((config = TaConfig[key])) {
          const replacedKey = convertTA(result.node);
          if (replacedKey) {
            config = Object.assign({}, config, { replacedKey });

            if (!matchedConfig.find((c) => _.isEqual(c, config))) {
              matchedConfig.push(config);
            }
          }
        }
      }
    },
  });
  // 过滤掉已在文件中引入的变量
  const needAddConfig = matchedConfig.filter((c) => {
    if (c.isDefault && importedDefaults.has(c.import)) {
      const originalImported = importedDefaults.get(c.import);
      let [key] = c.replacedKey.split('.');
      // e.g. wx.isFull => isFull, wx.systemInfo.isIOS => isIOS()
      [key] = key.split('(');
      return !originalImported?.includes(key);
    }
    if (importedNames.has(c.import)) {
      const originalImported = importedNames.get(c.import);
      let [key] = c.replacedKey.split('.');
      // e.g. wx.isFull => isFull, wx.systemInfo.isIOS => isIOS()
      [key] = key.split('(');
      return !originalImported?.includes(key);
    }
    return true;
  });
  console.log('\n============\n')
  console.log('current imported => ', [...importedNames.entries()], [...importedDefaults.entries()])
  console.log('\n============\n')
  console.log('matched ', matchedConfig);
  console.log('\n============\n')
  console.log('need add => ', needAddConfig)
  if (matchedConfig.length) {
    changed = true;
    const map = new Map<string, {
      value: string;
      isDefault: boolean;
    }[]>();
    needAddConfig.forEach((c) => {
      const importSpecifiers = [] as {value: string; isDefault: boolean}[];
      if (map.has(c.import)) {
        importSpecifiers.push(...map.get(c.import));
      }
      importSpecifiers.push({ value: c.replacedKey, isDefault: !!c.isDefault});
      map.set(c.import, importSpecifiers);
    });

    for (const [importFile, importDeclarations] of map) {
      const importAst = t.importDeclaration(
        importDeclarations.map((d) => {
          let [s] = d.value.split('.');
          // e.g. wx.isFull => isFull, wx.systemInfo.isIOS => isIOS()
          [s] = s.split('(');
          if (d.isDefault) {
            return t.importDefaultSpecifier(t.identifier(s));
          }
          return t.importSpecifier(t.identifier(s), t.identifier(s));
        }),
        t.stringLiteral(importFile)
      );

      ast.program.body.unshift(importAst);
    }
  }

  return { result: generate(ast, {}, code), changed };
}

function convertTA(node: NodePath<t.MemberExpression>) {
  const callNode = node.parent;
  if (t.isCallExpression(callNode)) {
    const obj = callNode.arguments[0];
    if (t.isObjectExpression(obj)) {
      const eventName = findTargetObjectProperty(obj, 'event_action');
      const metadata = findTargetObjectProperty(obj, 'metadata');
      if (t.isObjectProperty(eventName)) {
        const args = [] as any[];
        args.push(eventName.value);
        if (t.isObjectProperty(metadata)) {
          args.push(metadata.value);
        }

        const callNodePath = node.parentPath;
        if (t.isMemberExpression(callNodePath.parentPath) && t.isCallExpression(callNodePath.parentPath?.parentPath)) {
          const trackId = (callNodePath.parentPath.node as t.MemberExpression).property;
          if (t.isIdentifier(trackId) && trackId.name === 'track') {
            callNodePath.parentPath.parentPath.replaceWith(t.callExpression(t.identifier('taSensors'), args));
            return 'taSensors';
          }
        }

        node.replaceWith(t.identifier('tuhuTA.track'));
        callNode.callee = t.memberExpression(t.identifier('tuhuTA'), t.identifier('track'));
        callNode.arguments = args;
        return 'tuhuTA.track';
      }
    }
  }
}

function findTargetObjectProperty(obj: t.ObjectExpression, key: string) {
  return obj.properties.find((p) => {
    if (t.isObjectProperty(p)) {
      if (t.isIdentifier(p.key) && p.key.name === key) {
        return true;
      } else if (t.isStringLiteral(p.key) && p.key.value === key) {
        return true;
      }
    }
  });
}

function getTargetMemberExpression(
  node: NodePath<t.MemberExpression>,
  value = [] as string[]
): { key: string[]; node: NodePath<t.MemberExpression> } | undefined {
  const object = node.get('object');
  if (t.isIdentifier(object.node)) {
    if (object.node.name !== 'wx') {
      return;
    }

    const property = node.get('property');
    if (t.isIdentifier(property.node)) {
      value.push('wx', property.node.name);
      return { key: value, node };
    }
  } else if (t.isMemberExpression(object.node)) {
    const result = getTargetMemberExpression(object as NodePath<t.MemberExpression>, value);
    const property = node.get('property');
    if (result && t.isIdentifier(property.node)) {
      result.key.push(property.node.name);
      result.node = node;
      return result;
    }
  }
}
