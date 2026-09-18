import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bounceOffPaddle } from './physics.js';

test('horizontal paddle reflects an upward shot downward', () => {
  const ball = {x:0,y:18,vx:0,vy:-700};
  assert.equal(bounceOffPaddle(ball,{x:0,y:0,w:150,h:20,angle:0}),true);
  assert.equal(ball.vy,700);
  assert.ok(ball.y>20);
});
test('45-degree paddle redirects an upward shot sideways without changing speed', () => {
  const ball = {x:-12,y:12,vx:0,vy:-700};
  assert.equal(bounceOffPaddle(ball,{x:0,y:0,w:150,h:20,angle:Math.PI/4}),true);
  assert.ok(Math.abs(ball.vy)<0.001);
  assert.ok(Math.abs(ball.vx+700)<0.001);
  assert.ok(Math.abs(Math.hypot(ball.vx,ball.vy)-700)<0.001);
});
test('separated and departing projectiles do not bounce again', () => {
  const paddle={x:0,y:0,w:150,h:20,angle:0};
  assert.equal(bounceOffPaddle({x:0,y:100,vx:0,vy:-700},paddle),false);
  const ball={x:0,y:18,vx:0,vy:700};
  assert.equal(bounceOffPaddle(ball,paddle),false);
  assert.equal(ball.vy,700);
});
