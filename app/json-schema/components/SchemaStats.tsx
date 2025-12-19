import { Card, CardContent } from "@/components/ui/card";
import type { SchemaMetadata } from "../types";

interface SchemaStatsProps {
  metadata: SchemaMetadata;
}

export function SchemaStats({ metadata }: SchemaStatsProps) {
  const formatNumber = (num: number) => num.toLocaleString();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-blue-600">
            {formatNumber(metadata.totalProperties)}
          </div>
          <div className="text-sm text-muted-foreground">Total Properties</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-green-600">
            {formatNumber(metadata.requiredProperties)}
          </div>
          <div className="text-sm text-muted-foreground">Required</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-orange-600">
            {formatNumber(metadata.optionalProperties)}
          </div>
          <div className="text-sm text-muted-foreground">Optional</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-purple-600">
            {metadata.depth}
          </div>
          <div className="text-sm text-muted-foreground">Max Depth</div>
        </CardContent>
      </Card>
    </div>
  );
}

interface SchemaTypeDistributionProps {
  metadata: SchemaMetadata;
}

export function SchemaTypeDistribution({
  metadata,
}: SchemaTypeDistributionProps) {
  const total = Object.values(metadata.types).reduce(
    (sum, count) => sum + count,
    0,
  );

  if (total === 0) return null;

  const typeColors: Record<string, string> = {
    string: "bg-green-500",
    number: "bg-blue-500",
    integer: "bg-cyan-500",
    boolean: "bg-purple-500",
    array: "bg-orange-500",
    object: "bg-indigo-500",
    null: "bg-gray-500",
  };

  const sortedTypes = Object.entries(metadata.types).sort(
    ([, a], [, b]) => b - a,
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Type Distribution
      </h3>
      <div className="space-y-3">
        {sortedTypes.map(([type, count]) => {
          const percentage = (count / total) * 100;
          return (
            <div key={type} className="flex items-center gap-3">
              <div className="w-16 text-sm font-medium text-gray-700">
                {type}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                <div
                  className={`h-full ${typeColors[type] || "bg-gray-500"} flex items-center justify-end pr-2`}
                  style={{ width: `${percentage}%` }}
                >
                  {percentage > 10 && (
                    <span className="text-xs text-white font-medium">
                      {formatNumber(count)}
                    </span>
                  )}
                </div>
              </div>
              {percentage <= 10 && (
                <span className="text-sm text-gray-600 w-8 text-right">
                  {formatNumber(count)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}
