// ============================================================
// دعم يد التحكم (Gamepad API)
// ============================================================
export const gamepadState = {
  connected: false,
  steer: 0,
  boost: false,
  brake: false,
  gamepadName: ''
};

export function initGamepad() {
  window.addEventListener('gamepadconnected', (e) => {
    gamepadState.connected = true;
    gamepadState.gamepadName = e.gamepad.id;
    console.log('🎮 يد التحكم متصلة:', e.gamepad.id);
  });

  window.addEventListener('gamepaddisconnected', () => {
    gamepadState.connected = false;
    gamepadState.steer = 0;
    gamepadState.boost = false;
    gamepadState.brake = false;
    console.log('🎮 يد التحكم انفصلت');
  });
}

// تُستدعى كل إطار في main.js
export function pollGamepad() {
  if (!gamepadState.connected) return;

  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (const g of gamepads) {
    if (g) { gp = g; break; }
  }
  if (!gp) return;

  // المحور الأيسر (0 = يسار/يمين)
  const axisX = gp.axes[0] || 0;
  gamepadState.steer = Math.abs(axisX) > 0.15 ? axisX : 0;

  // الأزرار (W3C Standard Mapping)
  // 0 = A (Xbox) / Cross (PS) → Boost
  // 1 = B (Xbox) / Circle (PS) → Brake
  // 7 = RT (Xbox) / R2 (PS) → Boost
  gamepadState.boost = !!(gp.buttons[0]?.pressed || gp.buttons[7]?.pressed);
  gamepadState.brake = !!(gp.buttons[1]?.pressed || gp.buttons[6]?.pressed);
}