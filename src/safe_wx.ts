import { parse } from '@babel/parser';
import generate from '@babel/generator';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

export async function safeWx(code: string) {
  const ast = parse(code, {
    plugins: ['typescript'],
  });
  const sp = 'safeWx';

  traverse(ast, {
    Identifier(node) {
      if (node.node.name !== 'wx') {
        return;
      }
      const hasScope = !!node.scope.bindings.wx;
      if (hasScope) return;
      const r = t.callExpression(t.identifier(sp), [t.identifier('wx')]);
      // @ts-ignore
      this?.safeWx = true;
      if (t.isReturnStatement(node.parent)) {
        node.parent.argument = r;
      } else if (t.isCallExpression(node.parent)) {
        if (t.isMemberExpression(node.parent.callee)) {
          const callee = node.parent.callee;
          if (
            (callee.object as t.Identifier).name === 'Object' &&
            (callee.property as t.Identifier).name === 'assign'
          ) {
            node.replaceWith(r);
          }
        }
      } else if (t.isConditionalExpression(node.parent)) {
        node.replaceWith(r);
      }
    },
  });

  return generate(ast, {}, code);
}
