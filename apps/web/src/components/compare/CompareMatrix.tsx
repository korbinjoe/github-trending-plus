import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import type { CompareResponse } from "@github-trending/core/types";

interface CompareMatrixProps {
  data: CompareResponse;
}

export function CompareMatrix({ data }: CompareMatrixProps) {
  return (
    <div className="compare-table overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 border-b border-border text-muted w-36" />
            {data.repos.map((repo) => (
              <th
                key={repo.slug}
                className="text-left p-2 border-b border-border font-mono"
              >
                <div>{repo.slug}</div>
                <div className="compare-col-fav">
                  <FavoriteButton owner={repo.owner} name={repo.name} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.dimension} className="border-b border-border/50">
              <td className="p-2 text-muted">{row.dimension}</td>
              {row.values.map((val, i) => (
                <td key={`${row.dimension}-${i}`} className="p-2">
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
