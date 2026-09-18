// Resolve a circular projectile against a rotated rectangular paddle.
export function bounceOffPaddle(ball, paddle, radius = 11) {
  const c = Math.cos(paddle.angle), s = Math.sin(paddle.angle);
  const dx = ball.x - paddle.x, dy = ball.y - paddle.y;
  const x = dx * c + dy * s, y = -dx * s + dy * c;
  const halfW = paddle.w / 2, halfH = paddle.h / 2;
  const nearestX = Math.max(-halfW, Math.min(halfW, x));
  const nearestY = Math.max(-halfH, Math.min(halfH, y));
  let nx = x - nearestX, ny = y - nearestY;
  const distance = Math.hypot(nx, ny);
  if (distance >= radius) return false;
  let penetration = radius - distance;
  if (distance > 0) { nx /= distance; ny /= distance; }
  else if (halfW - Math.abs(x) < halfH - Math.abs(y)) {
    nx = x >= 0 ? 1 : -1; ny = 0; penetration = radius + halfW - Math.abs(x);
  } else {
    nx = 0; ny = y >= 0 ? 1 : -1; penetration = radius + halfH - Math.abs(y);
  }
  const worldNX = nx * c - ny * s, worldNY = nx * s + ny * c;
  ball.x += worldNX * (penetration + 0.1);
  ball.y += worldNY * (penetration + 0.1);
  const approach = ball.vx * worldNX + ball.vy * worldNY;
  if (approach >= 0) return false;
  ball.vx -= 2 * approach * worldNX;
  ball.vy -= 2 * approach * worldNY;
  return true;
}
