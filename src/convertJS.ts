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
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['typescript'],
  });
  const matchedConfig = [] as IConvertConfigValue[];
  let convertConfig = await readConfigAsync();
  let changed = false;
  traverse(ast, {
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
  if (matchedConfig.length) {
    changed = true;
    const map = new Map<string, string[]>();
    matchedConfig.forEach((c) => {
      const importSpecifiers = [] as string[];
      if (map.has(c.import)) {
        importSpecifiers.push(...map.get(c.import));
      }
      importSpecifiers.push(c.replacedKey);
      map.set(c.import, [...new Set(importSpecifiers)]);
    });

    for (const [importFile, importDeclarations] of map) {
      const importAst = t.importDeclaration(
        importDeclarations.map((d: string) => {
          const [s] = d.split('.');
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
        if (
          t.isMemberExpression(callNodePath.parentPath) &&
          t.isCallExpression(callNodePath.parentPath?.parentPath)
        ) {
          const trackId = (callNodePath.parentPath.node as t.MemberExpression)
            .property;
          if (t.isIdentifier(trackId) && trackId.name === 'track') {
            callNodePath.parentPath.parentPath.replaceWith(
              t.callExpression(t.identifier('taSensors'), args)
            );
            return 'taSensors';
          }
        }

        node.replaceWith(t.identifier('tuhuTA.track'));
        callNode.callee = t.memberExpression(
          t.identifier('tuhuTA'),
          t.identifier('track')
        );
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
    const result = getTargetMemberExpression(
      object as NodePath<t.MemberExpression>,
      value
    );
    const property = node.get('property');
    if (result && t.isIdentifier(property.node)) {
      result.key.push(property.node.name);
      result.node = node;
      return result;
    }
  }
}
