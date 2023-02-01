import { reactive, effect } from "../reactive";

describe('reactivity/reactive/array', () => {
  it('should observe elements by index', () => {
    const observed = reactive(['foo']);
    const spy = jest.fn(() => observed[0]);
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed[0] = 'bar';
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("'should trigger length dependencies when adding non-existing index on array", () => {
    const observed = reactive(['foo']);
    const spy = jest.fn(() => observed.length);
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed[1] = 'bar';
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should not trigger length dependencies when adding existing index on array', () => {
    const observed = reactive(['foo']);
    const spy = jest.fn(() => observed.length);
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed[0] = 'bar';
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should not trigger length dependencies when using 'delete' on array", () => {
    const observed = reactive(['foo', 'bar']);
    const spy = jest.fn(() => observed.length);
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    delete observed[1];
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should trigger index dependencies precisely while length of array changed', () => {
    const observed = reactive(['foo', 'bar']);
    const spy1 = jest.fn(() => observed[0]);
    const spy2 = jest.fn(() => {
      if (!observed[1]) {
        console.log('missing');
      }
    });
    effect(spy1);
    effect(spy2);
    observed.length = 1;
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(2);
  });

  it('for ... in array', () => {
    const observed = reactive(['bar']);
    let result = '';
    const spy = jest.fn(() => {
      result = '';
      for (let key in observed) {
        result += observed[key];
      }
    });
    effect(spy);
    expect(result).toBe('bar');
    observed[1] = 'foo';
    expect(result).toBe('barfoo');
    observed.length = 0;
    expect(result).toBe('');
  });

  it('for ... of array', () => {
    const observed = reactive(['bar']);
    let result = '';
    const spy = jest.fn(() => {
      result = '';
      // Essencially, symbol.iterator in array is a function munipulating length and index
      for (let item of observed) {
        result += item;
      }
    });
    effect(spy);
    expect(result).toBe('bar');
    expect(spy).toHaveBeenCalledTimes(1);
    observed[0] = 'bbr';
    expect(result).toBe('bbr');
    expect(spy).toHaveBeenCalledTimes(2);
    observed[1] = 'foo';
    expect(result).toBe('bbrfoo');
    expect(spy).toHaveBeenCalledTimes(3);
    observed.length = 1;
    expect(result).toBe('bbr');
    expect(spy).toHaveBeenCalledTimes(4);
    // In fact, 'values' function of Array is actually return the iterator in array
    expect(Array.prototype.values === Array.prototype[Symbol.iterator]).toBe(true);
  });

  it('should reactive “includes”', () => {
    const observed = reactive(['bar', 'foo']);
    const spy = jest.fn(() => observed.includes('bar')); // Essentially access length and index
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed[0] = 'wow';
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should reactive “includes” related to obj', () => {
    let result;
    const obj = {};
    const observed = reactive([obj, 'bar']);
    const spy = jest.fn(() => {
      result = observed.includes(observed[0]);
    });
    effect(spy);
    expect(result).toBe(true);
  });

  it('should "includes" primitive obj', () => {
    const obj = {};
    const arr = reactive([obj]);
    expect(arr.includes(obj)).toBe(true);
  });
  it('should not track length depencies when using push', () => {
    const observed = reactive([1]);
    const spy1 = jest.fn(() => {
      observed.push(2);
    });
    const spy2 = jest.fn(() => {
      observed.push(2);
    });
    effect(spy1);
    effect(spy2);
    expect(spy1).toBeCalledTimes(1);
    expect(spy2).toBeCalledTimes(1);
    effect(() => {
      observed.length = 0;
    });
    expect(spy1).toBeCalledTimes(1);
    expect(spy2).toBeCalledTimes(1);
  });
});