# Maitre'd Cache
A simple, high performance caching library with support for generic cache drivers.

## Supported Drivers
Maitre'd Cache supports the following drivers:
- Memory [Synchronous]
- Redis [Asynchronous] (NodeJS Only) **[#See IORedis](https://github.com/luin/ioredis#readme)**

**NOTE**: _The cache interface is promise based unless using the memory driver directly, in which case it will 
be synchronous._


### MemoryDriver
The memory driver is a finite cache utilizing local memory to store values.
The cache will automatically prune values to maintain a consistent memory footprint.

Values respect expirations and will be lazily removed on access or during pruning cycles.

#### Advanced Usage
Utilizing the **[Maitre'd CacheReplicator]()** it is possible to sync memory caches across
many instances, enabling horizontally scalable and highly consistent data caching.

### RedisDriver
The redis driver is a centralized cache for storing values. 

#### Important
Unlike the memory driver, the redis driver should be periodically cleaned using the internal ``cleanup`` 
method to clean the segments lists; Otherwise, the segment tracking collection will not be pruned as keys are expired.

## Usage
Maitre'd cache can be utilized through the default cache manager or the individual cache drivers.

### Cache.count
Get the count of keys currently being stored within the cache.

### Cache.fetch
Get a value from the cache using the provided cache key. If a value does not exist, fetch the value from the 
provided callback and store/return it.
```javascript
const cache_key = '<some_key>';
const data = '<any_data>';
const data_generator_func = async () => '<some_method_to_generate_data>';

// If a value is cached for this key data_generator_func will not be called
const data = await Cache.fetch(cache_key, data_generator_func);
```
Customize the segments which will be set.
```javascript
const cache_key = '<some_key>';
const data = '<any_data>';
const data_generator_func = async () => '<some_method_to_generate_data>';

// If a value is cached for this key data_generator_func will not be called
const data = await Cache.fetch(cache_key, data_generator_func, {
  segments: [
    'other_segment',
    (value) => 'some_segment:' + value.id
  ]
});
```
Customize the expiration which will be set.
```javascript
const cache_key = '<some_key>';
const data = '<any_data>';
const data_generator_func = async () => '<some_method_to_generate_data>';

// If a value is cached for this key data_generator_func will not be called
const data = await Cache.fetch(cache_key, data_generator_func, {
  timeout: 600 // 600ms
});
```
Force invalidate and refetch
```javascript
const cache_key = '<some_key>';
const data = '<any_data>';
const data_generator_func = async () => '<some_method_to_generate_data>';

// If a value is cached for this key data_generator_func will not be called
const data = await Cache.fetch(cache_key, data_generator_func, {
  force_new: req.body.refresh
});
```

### Cache.set
Set a value in the cache using the provided cache_key.
```javascript
const cache_key = '<some_key>';
const data = '<any_data>';

const status = await Cache.set(cache_key, data);
if (status) console.log('Value was set');
else throw new Error('Uh oh!');
```
Associate the cached value with the provided segments.
```javascript
const cache_key = '<some_key>';
const data = '<any_data>';

// Uses the default expiration set on the Cache instance
const status = await Cache.set(cache_key, data, ['foo', 'bar']);
if (status) console.log('Value was set');
else throw new Error('Uh oh!');
```
Customize the expiration of the set value.
```javascript
const cache_key = '<some_key>';
const data = '<any_data>';

// Caches the value for 100ms
const status = await Cache.set(cache_key, data, 100);
if (status) console.log('Value was set');
else throw new Error('Uh oh!');
```

### Cache.get
Get a value from the cache using the provided cache_key.
```javascript
const cache_key = '<some_key>';
const data = await Cache.get(cache_key);
```

### Cache.delete
Delete a value from the cache using the provided cache_key.
```javascript
const cache_key = '<some_key>';
const count = await Cache.delete(cache_key);
if (count === 1) console.log('Deletion occurred');
```
Delete a cache_key from the provided segment
```javascript
const cache_key = '<some_key>';
// If the cache_key is not associated with that segment, it will not be removed
const count = await Cache.delete(cache_key, ['foo']);
```
Delete via a pattern from the provided segment(s)
```javascript
// Will delete keys matching 'some:key:*' within the foo and bar segments
const count = await Cache.delete('some:key:*', ['foo', 'bar']);
```
Delete all keys within a segment
```javascript
// Will delete all keys within the foo segment
const count = await Cache.delete('*', ['foo']);
```
Delete all keys (Equivalent to `Cache.flush`)
```javascript
// Will delete all keys within the foo segment
const count = await Cache.delete('*');
```
### Cache.cleanup
Force a manual cleanup of the cache
```javascript
// Count will be the amount of keys cleaned up from the cache
const count = await Cache.cleanup();
```

### Cache.flush
Force the cache to flush all tracked values
```javascript
// Count will be the amount of keys flushed from the cache
const count = await Cache.flush();
```

### Initialization
#### Cache Manager
The following initializes a cache which targets both the memory and redis driver. When a value's set, it will be 
set within both caches. On retrieval, the memory cache will be prioritized over the redis cache. This example omits 
the redis driver from cleanup and flush when it is called via the Cache Manager.
```javascript
import Redis from 'ioredis';
import {Cache, MemoryDriver, RedisDriver} from 'maitred-cache';

export const MemoryCache = new MemoryDriver({
  name: 'memory',
  timeout: 300 * 1000, // 300s
  strategy: MemoryCache.CleanupStrategies.Least_Accessed,
  max_cache_size: '100mb',
  max_record_size: '1kb',
  minimum_prune_size: 100,
});

export const RedisCache = new RedisDriver(new Redis(), {
  name: 'redis',
  timeout: 3600 * 1000, // 1hr
  flush_interval: 5,
  max_queue_size: 100
});

export default new CacheManager({
  name: 'cache',
  driver_methods: {
    default: 'omit',
    // Exclude the redis driver from flushing and from cleanup
    flush: [RedisCache.name],
    cleanup: [RedisCache.name]
  }
// NOTE: Drivers are resolved in the order they are set
}, [MemoryCache, RedisCache]);
```

#### Individual Cache
The individual cache is feature complete with the cache manager.
```javascript
import {MemoryDriver} from 'maitred-cache';

export default new MemoryDriver({
  name: 'memory',
  timeout: 300 * 1000, // 300s
  strategy: MemoryCache.CleanupStrategies.Least_Accessed,
  max_cache_size: '100mb',
  max_record_size: '1kb',
  minimum_prune_size: 100,
});
```

## Performance
The Maitre'd Cache library features the following performance enhancements:
- Segmented Caching
- Lazy Expiration/Lazy Cleanup
- Micro-Queuing (RedisDriver)

### Segments
Segments are special keyspaces cached values can be associated with which allows for high performance 
cache invalidations. 

**For example**:

A query joins records from the `users` and `purchases` tables. 
```javascript
Cache.fetch('<cache_key>', async () => '<...query logic>', {
  segments: [
    (results) => [
      ...results.purchases.map((purchase) => 'purchases:' + purchase.id),
      'users:' + results.user_id
    ]
  ]
});
```
Adding a hook to your data layer to invalidate the Cache on modification of records
```javascript
async function delete_record(record_id) {
  '<...deletion logic>';
  Cache.delete('*', ['purchases', 'purchases:' + record_id]);
  '<etc...>'
}
```
Enables dynamic invalidation of all associated cached records for the targeted segment.

**IMPORTANT** - Proper implementation of Cache segments is necessary for many use cases. 
Feel free to open a request if you require assistance.

### Lazy Expiration / Lazy Cleanup
Cache drivers expire values on retrieval and via lazy cleanup. The expiration strategy
guarantees values will always be alive when returned from a fetch. Values may exist within the
cache in an expired stated until fetched or stumbled upon by the cleanup strategies.

Depending on the driver, cleanup may or may not be called internally (See driver details above). 

### Micro-queuing (RedisDriver)
When possible, asynchronous requests queue until explicitly resolved or until the maximum queue size is reached 
(configurable). Queueing requests helps reduce the overall volume of requests handled by the listening redis server,
increasing throughput.

**For example**:

**GOOD**

All values will be cached in a single request.
```javascript
await Promise.all([
  RedisCache.set('foo', 'bar'),
  RedisCache.set('foo1', 'bar1'),
  RedisCache.set('foo2', 'bar2'),
  RedisCache.set('foo3', 'bar3'),
]);
```

100k requests will be batched as efficiently as possible across a minimal amount of requests. The actual amount of 
requests depends on how fast micro-queue is filled (In this example, it will effectively be `n / max_queue_size`).
```javascript
const pending = [ ];

// 100k requests
for (let i = 0; i < 1E5; i += 1) {
  pending.push(RedisCache.set('foo' + i, 'bar' + i));
}
await Promise.all(pending);
```

**BAD**

All values below will be cached individually, across 4 separate requests.
```javascript
  await RedisCache.set('foo', 'bar');
  await RedisCache.set('foo1', 'bar1');
  await RedisCache.set('foo2', 'bar2');
  await RedisCache.set('foo3', 'bar3');
```

## Typescript
Types are provided within the main distribution.

## Browser Support
Library is distributed as CommonJS and should function properly in the browser so long as the driver being utilized 
is compatible. 
