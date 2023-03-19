import { effect } from "../../effect";
import { reactive } from "../../reactive";

describe('reactivity/collections/set', () => {
  it('should able to access size property', () => {
    let obj = new Set([1, 2, 3]);
    const observed = reactive(obj);
    expect(observed.size).toBe(3);
  });

  it('should able to delete', () => {
    let obj = new Set([1, 2, 3]);
    const observed = reactive(obj);
    observed.delete(1);
    expect(observed.size).toBe(2);
  });

  it('should trigger size dependencies after adding', () => {
    let obj = new Set([1, 2, 3]);
    const observed = reactive(obj);
    const spy = jest.fn(() => observed.size);
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.add(4);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should not trigger size dependencies after adding an existing value', () => {
    let obj = new Set([1, 2, 3]);
    const observed = reactive(obj);
    const spy = jest.fn(() => observed.size);
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.add(3);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should trigger size dependencies after deleting', () => {
    let obj = new Set([1, 2, 3]);
    const observed = reactive(obj);
    const spy = jest.fn(() => observed.size);
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.delete(3);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should no trigger size dependencies after deleting an no-existing value', () => {
    let obj = new Set([1, 2, 3]);
    const observed = reactive(obj);
    const spy = jest.fn(() => observed.size);
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.delete(4);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should trigger effect related to forEach', () => {
    const observed = reactive(new Set<string>(['bar']));

    const spy = jest.fn(() => {
      observed.forEach((value: string) => {
        console.log(value);
      });
    });

    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.add('foo');
    expect(spy).toHaveBeenCalledTimes(2);
  });
});