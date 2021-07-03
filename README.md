# Maitre'd Cache
A simple, high performance caching library with support for generic cache drivers.

## Supported Drivers
Maitre'd Cache supports the following drivers:
- Memory
- Redis (**[IORedis](https://github.com/luin/ioredis#readme)**)

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
Cache.get('<cache_key>', async () => '<...query logic>', {
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
