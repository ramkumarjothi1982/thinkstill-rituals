// Small vector shapes shared by the face rig and the particle field.

export function drawStar(ctx, x, y, r, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

export function drawHeart(ctx, x, y, s, col, hi) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 20, s / 20);
  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.bezierCurveTo(-14, -3, -9, -15, 0, -8);
  ctx.bezierCurveTo(9, -15, 14, -3, 0, 7);
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  if (hi) {
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.ellipse(-5, -7, 2.6, 1.6, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawDrop(ctx, x, y, s) {
  const g = ctx.createLinearGradient(x, y - s, x, y + s);
  g.addColorStop(0, 'rgba(210,245,255,0.95)');
  g.addColorStop(1, 'rgba(120,200,255,0.9)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.bezierCurveTo(x + s * 0.2, y - s * 0.4, x + s * 0.65, y + s * 0.05, x + s * 0.65, y + s * 0.35);
  ctx.arc(x, y + s * 0.35, s * 0.65, 0, Math.PI);
  ctx.bezierCurveTo(x - s * 0.65, y + s * 0.05, x - s * 0.2, y - s * 0.4, x, y - s);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(x - s * 0.22, y + s * 0.28, s * 0.13, s * 0.22, -0.3, 0, Math.PI * 2);
  ctx.fill();
}
