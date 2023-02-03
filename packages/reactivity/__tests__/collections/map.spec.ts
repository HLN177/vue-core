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
});