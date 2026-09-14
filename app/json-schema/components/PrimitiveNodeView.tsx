/**
 * PrimitiveNodeView: Renders primitive types
 *
 * Displays type, enum/const, default value, and constraints
 */

import type { PrimitiveNode } from "../ast-types";
import {
  ConstraintsBlock,
  CopyPathButton,
  DefaultBadge,
  DescriptionBlock,
  EnumValuesBlock,
  LeafDot,
  MetaBadge,
  TreeRow,
  TypeBadge,
} from "./tree-ui";
import { sanitizeText } from "../security";

interface PrimitiveNodeViewProps {
  node: PrimitiveNode;
}

export function PrimitiveNodeView({ node }: PrimitiveNodeViewProps) {
  return (
    <div>
      <TreeRow>
        <LeafDot />

        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <TypeBadge type={node.type} />
          {node.enum && <MetaBadge>{node.enum.length} values</MetaBadge>}
          {node.const !== undefined && (
            <MetaBadge mono>const: {JSON.stringify(node.const)}</MetaBadge>
          )}
          {node.default !== undefined && <DefaultBadge value={node.default} />}
        </div>

        <div className="ml-auto">
          <CopyPathButton path={node.sourcePath} />
        </div>
      </TreeRow>

      {node.description && (
        <DescriptionBlock text={sanitizeText(node.description)} />
      )}
      {node.enum && <EnumValuesBlock values={node.enum} />}
      {node.constraints && node.constraints.length > 0 && (
        <ConstraintsBlock constraints={node.constraints} />
      )}
    </div>
  );
}
