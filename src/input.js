export class Input {
  constructor(target) {
    this.target = target;
    this.keys = new Set();
    this.pressedKeys = new Set();
    this.pointerDelta = { x: 0, y: 0 };
    this.wheelDelta = 0;
    this.isDragging = false;
    this.pointerInputEnabled = true;

    window.addEventListener('keydown', (event) => {
      if (!this.keys.has(event.code)) this.pressedKeys.add(event.code);
      this.keys.add(event.code);
    });

    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => this.clearKeyboard());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.clearKeyboard();
    });

    target.addEventListener('pointerdown', (event) => {
      if (!this.pointerInputEnabled) return;

      this.isDragging = true;
      target.setPointerCapture(event.pointerId);
    });

    target.addEventListener('pointermove', (event) => {
      if (!this.pointerInputEnabled) return;
      if (!this.isDragging) return;

      this.pointerDelta.x += event.movementX;
      this.pointerDelta.y += event.movementY;
    });

    target.addEventListener('pointerup', (event) => {
      if (!this.pointerInputEnabled) return;

      this.isDragging = false;
      target.releasePointerCapture(event.pointerId);
    });

    target.addEventListener('pointercancel', () => {
      this.isDragging = false;
    });

    target.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        if (!this.pointerInputEnabled) return;

        this.wheelDelta += event.deltaY;
      },
      { passive: false },
    );
  }

  isKeyDown(code) {
    return this.keys.has(code);
  }

  consumePressed(code) {
    const wasPressed = this.pressedKeys.has(code);
    this.pressedKeys.delete(code);
    return wasPressed;
  }

  clearKeyboard() {
    this.keys.clear();
    this.pressedKeys.clear();
  }

  setPointerInputEnabled(enabled) {
    this.pointerInputEnabled = enabled;

    if (!enabled) {
      this.isDragging = false;
      this.pointerDelta.x = 0;
      this.pointerDelta.y = 0;
      this.wheelDelta = 0;
    }
  }

  consumePointerDelta() {
    const delta = { ...this.pointerDelta };
    this.pointerDelta.x = 0;
    this.pointerDelta.y = 0;
    return delta;
  }

  consumeWheelDelta() {
    const delta = this.wheelDelta;
    this.wheelDelta = 0;
    return delta;
  }
}
