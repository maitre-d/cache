import type {CacheDriver} from 'src/interfaces/CacheDriver';
import type {CacheHandler, CacheSegment, CacheHandlerOptions, CacheSegments, CacheKeyPartial} from 'src/types'

import _ from 'lodash';
import {MemoryCacheDriver as MemoryDriver} from 'src/drivers/memory';
import {RedisCacheDriver as RedisDriver} from 'src/drivers/redis';

type CacheOptions = {
  name: string;
  omit_replication?: (string|RegExp)[];
  /** Control if a driver is utilized for fetch/set/delete operations */
  driver_methods: {
    default?: ('include'|'omit');
    fetch?: string[];
    set?: string[];
    delete?: string[];
    flush?: string[];
    cleanup?: string[];
  };
}

/** Cache manager responsible for controlling data flow between registered drivers */
export class Cache {
  drivers: CacheDriver[];
  options: CacheOptions;

  constructor(options: CacheOptions, drivers: CacheDriver[] = []) {
    this.drivers = drivers;
    this.options = {
      omit_replication: [],
      ...options,
      driver_methods: {
        default: 'omit',
        fetch: [],
        set: [],
        delete: [],
        flush: [],
        cleanup: [],
        ...(options.driver_methods || {})
      }
    };
  }

  /** Get a list of drivers which are active for the specified action */
  get_active(action: ('fetch'|'set'|'delete'|'cleanup'|'flush')): CacheDriver[] {
    return this.drivers.filter((driver) => {
      const drivers_list: string[] = this.options.driver_methods[action] as string[];
      const driver_included = drivers_list.includes(driver.name);

      if (this.options.driver_methods.default === 'omit') {
        return !driver_included;
      }

      return driver_included;
    });
  }

  /** Add a driver to be managed */
  add(driver: CacheDriver): void {
    this.drivers.push(driver);
  }

  async fetch(key: CacheKeyPartial, cb: CacheHandler, options: CacheHandlerOptions): Promise<unknown> {
    options = {
      segments: [],
      force_new: false,
      ...options
    }

    let value: unknown;
    const misses = [];
    const drivers = this.get_active('fetch');
    if (!options.force_new) {
      for (const driver of drivers) {
        [value] = await Promise.all([driver.get(key)])
        if (typeof value === 'undefined') misses.push(driver);
        else break;
      }
    }
    else misses.push(...drivers);

    if (typeof value === 'undefined') {
      value = await cb();
    }

    // NOTE: We do not need to wait for the value to actually be set
    Promise.all(misses.map((driver) => driver.set(key, value, options.timeout, options.segments))).then();
    return value;
  }

  /** Fetch a value from the active drivers */
  async get(key: CacheKeyPartial): Promise<unknown> {
    const drivers = this.get_active('fetch');

    let value;
    for (const driver of drivers) {
      [value] = await Promise.all([driver.get(key)])
      if (typeof value !== 'undefined') break;
    }

    return value;
  }

  async set(
    key: CacheKeyPartial,
    value: unknown,
    expiration = -1,
    segments: CacheSegments = []): Promise<boolean> {
    const drivers = this.get_active('set');

    return Promise.all(
      drivers.map((driver) =>
        driver.set(key, value, expiration, segments))
    )
      .then((results: boolean[]) =>
        results.every((status) => status));
  }

  async delete(key: CacheKeyPartial, segments: CacheSegment|CacheSegment[] = []): Promise<number> {
    if (!_.isArray(segments)) segments = [segments];

    const drivers = this.get_active('delete');
    return Promise.all(
      drivers.map((driver) =>
        driver.delete(key, segments))
    ).then((results: number[]) => Math.max(...results));
  }

  async cleanup(): Promise<number> {
    const drivers = this.get_active('cleanup');
    return Promise.all(
      drivers.map((driver) => driver.cleanup())
    ).then((results: number[]) => Math.max(...results));
  }

  async flush(): Promise<number> {
    const drivers = this.get_active('flush');
    return Promise.all(
      drivers.map((driver) => driver.flush())
    ).then((results: number[]) => Math.max(...results));
  }
}

/** Driver Re-exports */
export {MemoryDriver, RedisDriver};