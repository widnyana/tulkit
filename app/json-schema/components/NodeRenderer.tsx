/**
 * NodeRenderer: Polymorphic dispatcher for AST nodes
 *
 * Single entry point for rendering any AST node type.
 * No conditionals here - all polymorphism handled via switch on node.kind
 */

import type { ASTNode } from "../ast-types";
import { AndNodeView } from "./AndNodeView";
import { OrNodeView } from "./OrNodeView";
import { XorNodeView } from "./XorNodeView";
import { NotNodeView } from "./NotNodeView";
import { ObjectNodeView } from "./ObjectNodeView";
import { ArrayNodeView } from "./ArrayNodeView";
import { PrimitiveNodeView } from "./PrimitiveNodeView";

interface NodeRendererProps {
  node: ASTNode;
  level?: number;
}

export function NodeRenderer({ node, level = 0 }: NodeRendererProps) {
  switch (node.kind) {
    case "and":
      return <AndNodeView node={node} level={level} />;
    case "or":
      return <OrNodeView node={node} level={level} />;
    case "xor":
      return <XorNodeView node={node} level={level} />;
    case "not":
      return <NotNodeView node={node} level={level} />;
    case "object":
      return <ObjectNodeView node={node} level={level} />;
    case "array":
      return <ArrayNodeView node={node} level={level} />;
    case "primitive":
      return <PrimitiveNodeView node={node} level={level} />;
  }
}
