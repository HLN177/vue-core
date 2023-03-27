import { effect } from "../effect";
import { reactive } from "../reactive";
import { proxyRefs, ref, toRef, toRefs } from "../ref";

describe('reactivity/ref', () => {
  it('should hold a value', () => {
    const observed = ref(1);
    expect(observed.value).toBe(1);
    observed.value = 2;
    expect(observed.value).toBe(2);
  });

  it('should be reactive', () => {
    const observed = ref(1);
    const spy = jest.fn(() => observed.value);
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.value = 2;
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should hold same value using toRefs', () => {
    const observed1 = reactive({
      foo: 1,
      bar: 2
    });

    const observed2 = {
      ...toRefs(observed1)
    };
    
    expect(observed2.foo.value).toBe(1);
    expect(observed2.bar.value).toBe(2);
  });

  it('should trigger effect using toRefs', () => {
    const observed1 = reactive({
      foo: 1,
      bar: 2
    });

    const observed2 = {
      ...toRefs(observed1)
    };
    
    const spy = jest.fn(() => {
      return observed2.foo.value;
    });

    effect(spy);

    expect(spy).toHaveBeenCalledTimes(1);
    observed1.foo = 100;
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should able to set ref value using toRef', () => {
    const observed1 = reactive({
      foo: 1,
      bar: 2
    });

    const refFoo = toRef(observed1, 'foo');
    expect(refFoo.value).toBe(1);
    refFoo.value = 100;
    expect(refFoo.value).toBe(100);
  });

  it('should unref using proxyRefs', () => {
    const observed1 = reactive({
      foo: 1,
      bar: 2
    });

    const observed2 = {
      ...toRefs(observed1)
    };

    const observed3 = proxyRefs(observed2);
    expect(observed3.foo).toBe(1);
    expect(observed3.bar).toBe(2);
  });

  it('should able to set value while using proxyRefs', () => {
    const observed1 = reactive({
      foo: 1,
      bar: 2
    });

    const observed2 = {
      ...toRefs(observed1)
    };

    const observed3 = proxyRefs(observed2);
    expect(observed3.foo).toBe(1);
    observed3.foo = 100;
    expect(observed3.foo).toBe(100);
    expect(observed2.foo.value).toBe(100);
  });
});