// ============================================================
// إدارة الأزرار على الشاشة + دعم اللمس والماوس والكونسول
// ============================================================
export const inputState = {
  steerLeft: false,
  steerRight: false,
  brake: false,
  boost: false,
  boostEnergy: 100,
  maxBoost: 100,
  boostDrain: 45,
  boostRegen: 12
};

export function initUI() {
  // --- ربط الأزرار الموجودة في index.html ---
  bindButton('btnLeft',  () => inputState.steerLeft = true,  () => inputState.steerLeft = false);
  bindButton('btnRight', () => inputState.steerRight = true, () => inputState.steerRight = false);
  bindButton('btnBrake', () => inputState.brake = true,      () => inputState.brake = false);
  bindButton('btnBoost', () => inputState.boost = true,      () => inputState.boost = false);

  // --- كيبورد للتجربة على الكمبيوتر ---
  window.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') inputState.steerLeft = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') inputState.steerRight = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') inputState.brake = true;
    if (e.code === 'Space' || e.code === 'ShiftLeft') inputState.boost = true;
  });

  window.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') inputState.steerLeft = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') inputState.steerRight = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') inputState.brake = false;
    if (e.code === 'Space' || e.code === 'ShiftLeft') inputState.boost = false;
  });
}

function bindButton(id, onPress, onRelease) {
  const el = document.getElementById(id);
  if (!el) return;

  const press = (e) => {
    e.preventDefault();
    el.classList.add('pressed');
    onPress();
  };
  const release = () => {
    el.classList.remove('pressed');
    onRelease();
  };

  el.addEventListener('touchstart', press, { passive: false });
  el.addEventListener('mousedown', press);
  document.addEventListener('touchend', release, { passive: false });
  document.addEventListener('mouseup', release);
}

// تحديث شريط البوست
export function updateBoostBar() {
  const fill = document.getElementById('boostFill');
  if (fill) fill.style.width = inputState.boostEnergy + '%';
}