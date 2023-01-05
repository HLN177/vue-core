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
});