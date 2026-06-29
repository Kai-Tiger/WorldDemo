export class Input {
  constructor(target) {
    this.target = target;
    this.keys = new Set();
    this.pointerDelta = { x: 0, y: 0 };
    this.wheelDelta = 0;
    this.isDragging = false;

    window.addEventListener('keydown', (event) => {
      this.keys.add(event.code);
    });

    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });

    target.addEventListener('pointerdown', (event) => {
      this.isDragging = true;
      target.setPointerCapture(event.pointerId);
    });

    target.addEventListener('pointermove', (event) => {
      if (!this.isDragging) return;

      this.pointerDelta.x += event.movementX;
      this.pointerDelta.y += event.movementY;
    });

    target.addEventListener('pointerup', (event) => {
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
        this.wheelDelta += event.deltaY;
      },
      { passive: false },
    );
  }

  isKeyDown(code) {
    return this.keys.has(code);
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
