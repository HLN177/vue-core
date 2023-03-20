import { effect } from "../../effect";
import { reactive } from "../../reactive";

describe('reactivity/collections/map', () => {
  it('should able to access size property', () => {
    let obj = new Map([
      ['bar1', 1],
      ['bar2', 1],
      ['bar3', 1],
    ]);
    const observed = reactive(obj);
    expect(observed.size).toBe(3);
  });

  it('should able to delete', () => {
    let obj = new Map([
      ['bar1', 1],
      ['bar2', 1],
      ['bar3', 1],
    ]);
    const observed = reactive(obj);
    observed.delete('bar1');
    expect(observed.size).toBe(2);
  });

  it('should trigger size dependencies after adding', () => {
    let obj = new Map();
    const observed = reactive(obj);
    const spy = jest.fn(() => observed.size);
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.set('bar1', 1);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should not trigger size dependencies after adding an existing value', () => {
    let obj = new Map();
    const observed = reactive(obj);
    const spy = jest.fn(() => observed.size);
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.set('bar1', 1);
    expect(spy).toHaveBeenCalledTimes(2);
    observed.set('bar1', 1);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should trigger size dependencies after deleting', () => {
    let obj = new Map();
    const observed = reactive(obj);
    const spy = jest.fn(() => observed.size);
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.set('bar1', 1);
    expect(spy).toHaveBeenCalledTimes(2);
    observed.delete('bar1');
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('should not trigger size dependencies after deleting an no-existing value', () => {
    let obj = new Map();
    const observed = reactive(obj);
    const spy = jest.fn(() => observed.size);
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.set('bar1', 1);
    expect(spy).toHaveBeenCalledTimes(2);
    observed.delete('bar1');
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('should not trigger effect when manipulating on original data', () => {
    const original = new Map();
    const observed1 = reactive(original);
    const observed2 = reactive(new Map());
    observed1.set('o2', observed2);
    const spy = jest.fn(() => {
      return observed1.get('o2').size;
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    original.get('o2').set('foo', 1);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should observe forEach iteration', () => {
    const observed = reactive(new Map<string, number>([
      ['bar', 1]
    ]));

    const spy = jest.fn(() => {
      observed.forEach((value: string, key: number) => {
        console.log(value);
        console.log(key);
      });
    });

    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.set('foo', 2);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should observe nested values in iterations (forEach)', () => {
    const key = 'bar';
    const observed = reactive(new Map<string, Set<any>>([
      [key, new Set([1, 2, 3])]
    ]));
    const spy = jest.fn(() => {
      observed.forEach((value: any, key: unknown) => {
        console.log(value.size);
      });
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.get(key).delete(1);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should observe forEach iteration while value changed', () => {
    const observed = reactive(new Map<string, number>([
      ['bar', 1]
    ]));

    const spy = jest.fn(() => {
      observed.forEach((value: string, key: number) => {
        console.log(value);
        console.log(key);
      });
    });

    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.set('bar', 2);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should observe values in iterations (for...of...)', () => {
    const observed = reactive(new Map([
      ['key1', 'value1'],
      ['key2', 'value2'],
    ]));

    const spy = jest.fn(() => {
      for (const [key, value] of observed) {
        console.log(key, value);
      }
    });

    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.set('key3', 'value3');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should observe nested values in iterations (for...of)', () => {
    const key = 'foo';
    const observed = reactive(new Map([
      [key, { foo: 1 }]
    ]));
    const spy = jest.fn(() => {
      for (const [key, value] of observed) {
        value.foo;
      }
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.get(key).foo = 2;
    expect(spy).toHaveBeenCalledTimes(2);
  })

  it('should observe nested values in iterations (values)', () => {
    const key = {};
    const observed = reactive(new Map([[key, { foo: 1 }]]))
    const spy = jest.fn(() => {
      for (const value of observed.values()) {
        value.foo;
      }
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.get(key).foo = 2;
    expect(spy).toHaveBeenCalledTimes(2);
  })

  it('should observe nested values in iterations (entries)', () => {
    const key = {};
    const observed = reactive(new Map([
      [key, { foo: 1 }]
    ]));
    const spy = jest.fn(() => {
      for (const [key, value] of observed.entries()) {
        value.foo;
      }
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.get(key).foo = 2;
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should observe keys in iterations (keys)', () => {
    const observed = reactive(new Map([
      ['key1', 'value1'],
      ['key2', 'value2'],
    ]));

    const spy = jest.fn(() => {
      for (let key of observed.keys()) {
        console.log(key);
      }
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.delete('key1');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should not observe values in iterations (keys)', () => {
    const observed = reactive(new Map([
      ['key1', 'value1'],
      ['key2', 'value2'],
    ]));

    const spy = jest.fn(() => {
      for (let key of observed.keys()) {
        console.log(key);
      }
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.set('key2', 'value3');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});