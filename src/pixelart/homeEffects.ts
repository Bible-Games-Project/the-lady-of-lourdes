import Phaser from 'phaser';
import { HOME_PALETTE } from './homePalette';

/**
 * Small atmospheric-effect textures layered over the real Home background image (leaves, warm
 * glows, soft light rays, drifting motes). Unlike the rest of `pixelart/` these are drawn with
 * plain anti-aliased Canvas 2D calls, not the hard-edged nearest-neighbor pixel grid — the Home
 * background itself is a soft painted illustration, not flat pixel art, so these need to blend
 * into *that* rather than into the game's usual crisp pixel style. Keep every one of them small
 * and low-opacity; see HomeScene.ts for how they're used.
 */
export const HOME_FX_KEYS = {
  LEAF_AMBER: 'home_fx_leaf_amber',
  LEAF_GOLD: 'home_fx_leaf_gold',
  LEAF_RUST: 'home_fx_leaf_rust',
  GLOW: 'home_fx_glow',
  RAY: 'home_fx_ray',
  MOTE: 'home_fx_mote',
  WATER_GLINT: 'home_fx_water_glint',
} as const;

function leafCanvas(color: string): HTMLCanvasElement {
  // The leaves are colored from the artwork's own autumn palette, which means they can
  // camouflage almost completely against the busy foliage areas of the background — good for
  // "belongs to the painting", bad for "player can notice something is drifting". A faint halo
  // behind the shape (as if the leaf is gently catching the light) makes it read as a small
  // object in front of the scene regardless of local color, without adding any color that isn't
  // already in the painting.
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  halo.addColorStop(0, 'rgba(255,248,225,0.35)');
  halo.addColorStop(1, 'rgba(255,248,225,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  ctx.translate(cx, cy);
  ctx.rotate(-0.5);
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.bezierCurveTo(3, -3, 3, 3, 0, 4);
  ctx.bezierCurveTo(-3, 3, -3, -3, 0, -4);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, -3.5);
  ctx.lineTo(0, 3.5);
  ctx.stroke();
  return canvas;
}

function glowCanvas(color: string, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

function rayCanvas(): HTMLCanvasElement {
  const w = 14;
  const h = 140;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(255,244,214,0.9)');
  grad.addColorStop(1, 'rgba(255,244,214,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  return canvas;
}

export function registerHomeEffectTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(HOME_FX_KEYS.GLOW)) return;

  scene.textures.addCanvas(HOME_FX_KEYS.LEAF_AMBER, leafCanvas(HOME_PALETTE.foliageAmber));
  scene.textures.addCanvas(HOME_FX_KEYS.LEAF_GOLD, leafCanvas(HOME_PALETTE.foliageGold));
  scene.textures.addCanvas(HOME_FX_KEYS.LEAF_RUST, leafCanvas(HOME_PALETTE.foliageRust));
  scene.textures.addCanvas(HOME_FX_KEYS.GLOW, glowCanvas('rgba(245,201,90,0.9)', 48));
  scene.textures.addCanvas(HOME_FX_KEYS.RAY, rayCanvas());
  scene.textures.addCanvas(HOME_FX_KEYS.MOTE, glowCanvas('rgba(255,236,190,0.95)', 6));
  // Cool blue-white, for the river — distinct from the warm gold used everywhere else (candles,
  // the Lady's light, motes) so it reads as light on water rather than more firelight.
  scene.textures.addCanvas(HOME_FX_KEYS.WATER_GLINT, glowCanvas('rgba(220,236,240,0.85)', 10));
}
