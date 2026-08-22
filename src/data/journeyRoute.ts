/**
 * The pilgrimage route drawn over the Journey map artwork (`assets/journey/journey_map.png`),
 * traced by eye against that specific image so it follows the real painted trail rather than
 * being an arbitrary line: it starts on the path at the bottom-left, winds up around the lake,
 * crosses the lower stone bridge, continues up the right bank, crosses the upper footbridge
 * (which leads back toward the left), and climbs the left bank to the Grotto near the top. All
 * coordinates are in the *original* artwork's pixel space (941x1672) — see
 * ApparitionJourneyScene.ts#toWorldXY() for how they're scaled into the scene.
 *
 * Don't hand-edit ROUTE_WAYPOINTS without re-checking it against the actual image (e.g. via a
 * grid-overlay crop) — these were placed by visually tracing the path, not computed.
 */
const ROUTE_WAYPOINTS: Array<{ x: number; y: number }> = [
  { x: 140, y: 1635 },
  { x: 230, y: 1560 },
  { x: 170, y: 1470 },
  { x: 260, y: 1380 },
  { x: 190, y: 1290 },
  { x: 280, y: 1200 },
  { x: 380, y: 1140 },
  { x: 560, y: 1095 },
  { x: 630, y: 1010 },
  { x: 600, y: 900 },
  { x: 465, y: 890 },
  { x: 380, y: 800 },
  { x: 300, y: 720 },
  { x: 230, y: 660 },
  { x: 190, y: 610 },
  { x: 185, y: 590 },
];

/** Catmull-Rom interpolation through 4 control points at parameter t in [0,1]. */
function catmullRom(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const t2 = t * t;
  const t3 = t2 * t;
  const x =
    0.5 *
    (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  const y =
    0.5 *
    (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
  return { x, y };
}

/** Densely-sampled smooth curve through ROUTE_WAYPOINTS, for drawing the route line. */
function sampleCurve(stepsPerSegment: number): Array<{ x: number; y: number }> {
  const padded = [ROUTE_WAYPOINTS[0], ...ROUTE_WAYPOINTS, ROUTE_WAYPOINTS[ROUTE_WAYPOINTS.length - 1]];
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < ROUTE_WAYPOINTS.length - 1; i++) {
    const [p0, p1, p2, p3] = [padded[i], padded[i + 1], padded[i + 2], padded[i + 3]];
    for (let s = 0; s < stepsPerSegment; s++) {
      points.push(catmullRom(p0, p1, p2, p3, s / stepsPerSegment));
    }
  }
  points.push(ROUTE_WAYPOINTS[ROUTE_WAYPOINTS.length - 1]);
  return points;
}

/** The route line as a dense point list, in original-image space — for drawing only. */
export function getRouteCurvePoints(): Array<{ x: number; y: number }> {
  return sampleCurve(40);
}

/**
 * `count` points evenly spaced by *arc length* along the route (not by the Catmull-Rom
 * parameter, which would bunch points up on tight curves) — these are the 18 apparition node
 * positions, index 0 = bottom (apparition 1) through index `count - 1` = the Grotto
 * (apparition 18).
 */
export function getRouteNodePoints(count: number): Array<{ x: number; y: number }> {
  const dense = sampleCurve(40);
  const cumulative: number[] = [0];
  for (let i = 1; i < dense.length; i++) {
    const dx = dense[i].x - dense[i - 1].x;
    const dy = dense[i].y - dense[i - 1].y;
    cumulative.push(cumulative[i - 1] + Math.hypot(dx, dy));
  }
  const total = cumulative[cumulative.length - 1];

  const result: Array<{ x: number; y: number }> = [];
  let seg = 0;
  for (let n = 0; n < count; n++) {
    const target = (total * n) / (count - 1);
    while (seg < cumulative.length - 2 && cumulative[seg + 1] < target) seg++;
    const segLen = cumulative[seg + 1] - cumulative[seg];
    const t = segLen === 0 ? 0 : (target - cumulative[seg]) / segLen;
    result.push({
      x: lerp(dense[seg].x, dense[seg + 1].x, t),
      y: lerp(dense[seg].y, dense[seg + 1].y, t),
    });
  }
  return result;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
