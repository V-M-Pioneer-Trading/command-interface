import { getSprite } from "../../map/sprites/registry";

/**
 * Emits one `<symbol>` per sprite actually on screen. Rects are pre-merged, so
 * a 16x16 shaded planet is ~50 nodes rather than 256, and `crispEdges` keeps
 * the pixel boundaries hard at every zoom level instead of antialiasing them
 * into mush.
 */
export function SpriteDefs({ ids }) {
  return (
    <defs>
      {ids.map((id) => {
        const sprite = getSprite(id);
        if (!sprite) return null;
        return (
          <symbol
            key={id}
            id={id}
            viewBox={`0 0 ${sprite.size} ${sprite.size}`}
            shapeRendering="crispEdges"
          >
            {sprite.rects.map((r, i) => (
              <rect
                key={i}
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                fill={r.fill}
                fillOpacity={r.opacity === 1 ? undefined : r.opacity}
              />
            ))}
          </symbol>
        );
      })}
    </defs>
  );
}
