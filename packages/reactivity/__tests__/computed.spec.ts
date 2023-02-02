import { reactive } from "../reactive";
import { effect } from "../effect";
import { computed } from "../computed";

describe('reactivity/comupted', () => {
  it('lazily', () => {
    let dummy;
    const observed = reactive({ value: 1 });
    const spy = jest.fn(() => {
      dummy = observed.value;
    });
    const cValue = effect(
      spy,
      {
        lazy: true
      }
    );
    expect(spy).toHaveBeenCalledTimes(0);
    expect(dummy).toBe(undefined);
    cValue();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(dummy).toBe(1);
  });

  test('effect function could return result', () => {
    const observed = reactive({
      value1: 1,
      value2: 2
    });
    const spy = jest.fn(() => {
      return observed.value1 + observed.value2
    });
    const cValue = effect(spy, {
      lazy: true
    });
    expect(spy).toHaveBeenCalledTimes(0);
    expect(cValue()).toBe(3);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('computed could return result lazily', () => {
    const observed = reactive({ value1: 1, value2: 2 });
    const spy = jest.fn(() => {
      return observed.value1 + observed.value2;
    });
    const cValue = computed(spy);
    expect(spy).toHaveBeenCalledTimes(0);
    const res = cValue.value;
    expect(res).toBe(3);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should not compute until needed', () => {
    const value = reactive({ foo: 1 });
    const getter = jest.fn(() => value.foo);
    const cValue = computed(getter);

    // lazy
    expect(getter).not.toHaveBeenCalled()

    expect(cValue.value).toBe(1)
    expect(getter).toHaveBeenCalledTimes(1)

    // should not compute again
    cValue.value
    expect(getter).toHaveBeenCalledTimes(1)

    // should not compute until needed
    value.foo = 2
    expect(getter).toHaveBeenCalledTimes(1)

    // now it should compute
    expect(cValue.value).toBe(2)
    expect(getter).toHaveBeenCalledTimes(2)

    // should not compute again
    cValue.value
    expect(getter).toHaveBeenCalledTimes(2)
  });

  it('should trigger effect', () => {
    const value = reactive({ foo: 1 });
    const cValue = computed(() => value.foo);
    let dummy;
    effect(() => {
      dummy = cValue.value;
    });
    expect(dummy).toBe(1);
    value.foo = 2;
    expect(dummy).toBe(2);
  })
});