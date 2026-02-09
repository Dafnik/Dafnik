class TestResizeObserver {
  static instances: TestResizeObserver[] = [];
  private readonly callback: ResizeObserverCallback;
  private readonly observed = new Set<Element>();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    TestResizeObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observed.add(target);
  }

  unobserve(target: Element) {
    this.observed.delete(target);
  }

  disconnect() {
    this.observed.clear();
  }

  static flush() {
    for (const instance of TestResizeObserver.instances) {
      const entries = [...instance.observed].map((target) => ({target})) as ResizeObserverEntry[];
      if (entries.length > 0) {
        instance.callback(entries, instance as unknown as ResizeObserver);
      }
    }
  }

  static reset() {
    TestResizeObserver.instances = [];
  }
}

function mockCanvasRect(canvas: HTMLCanvasElement) {
  const rect = {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width: 300,
    height: 150,
    right: 300,
    bottom: 150,
    toJSON: () => ({}),
  };

  Object.defineProperty(canvas, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect,
  });
}

export {TestResizeObserver, mockCanvasRect};
