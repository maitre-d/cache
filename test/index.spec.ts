import _ from 'lodash'
import Redis from 'ioredis'
import async from 'async'
import {v4 as uuidv4} from 'uuid'
import {Cache as CacheManager, MemoryDriver, RedisDriver} from 'src/index'
import {MemoryCacheCleanupStrategies} from 'src/drivers/memory'

const client = new Redis();
const RedisCache = new RedisDriver(client, {
	name: 'test',
	timeout: 10,
	flush_interval: 5,
	max_queue_size: 100
});

const MemoryCache = new MemoryDriver({
	name: 'memory',
	timeout: -1,
  strategy: MemoryCacheCleanupStrategies.Least_Accessed,
	max_cache_size: '100mb',
	max_record_size: '1kb',
	minimum_prune_size: 100,
});

const Cache = new CacheManager({
	name: 'cache',
	driver_methods: {
		default: 'omit'
	}
}, [MemoryCache, RedisCache]);

const generate_bytes = (bytes: number) =>
	Array.from(new Array(Math.ceil(bytes / 2)), () => ' ').join('');

describe('Cache', function() {
	beforeEach(async () => Cache.flush());
	afterAll(async () => client.disconnect());

	describe('fetch', function() {
		it('Should set the cache value using a callback function if unset.', async function() {
			const key = 'foo';
			const value = 'bar';
			const cb = jest.fn(() => value);

			const result = await Cache.fetch(key, cb, { timeout: 1, force_new: false });
			expect(result).toEqual(value);
			expect(cb.mock.calls.length).toBe(1);
		});
	});

	describe('set', function() {
		it('Should return true to indicate a value was set in the cache', async function() {
			const key = 'foo';
			expect(await Cache.set(key, 'bar', 1)).toBeTrue();
		});
	});

	describe('get', function() {
		it('Should retrieve a value set in the cache', async function() {
			const key = 'foo';
			const value = 'bar';
			await Cache.set(key, value);
			expect(await Cache.get(key)).toEqual(value)
		});
	});

	describe('delete', function() {
		it('Should use the segment to delete wildcard keys if possible', async function() {
			const segment = 'foo_bar';
			const iterations = 5;

			await async.times(iterations, async () => {
				const id = uuidv4();
				const key = segment + ':' + id;
				return Cache.set(key, id, -1, segment);
			});

			const deleted = await Cache.delete(segment + ':*');
			expect(deleted).toEqual(iterations);
		});

		it('Should further filter the segmented keys if a wildcard has additional filtering', async function() {
			const segment = 'foo_bar';
			const iterations = 5;
			const partialID = 'baz';

			await Promise.all(Array.from(new Array(iterations), (_, ind) => {
				const id = uuidv4();
				const fuzzy = (ind % 2 > 0) ? 'bar' : 'bax';
				const key = segment + ':' + partialID + ':' + id + ':' + fuzzy;

				return Cache.set(key, id, 20, [ segment ]);
			}));

			const deleted = await Cache.delete(segment + ':' + partialID + ':*:bar');
			expect(deleted).toEqual(2);
		});

		it('Should delete non-wildcard keys', async function() {
			const key = 'foo:bar:baz:1251';
			await Cache.set(key, 1251, 20);
			const deleted = await Cache.delete(key);
			expect(deleted).toEqual(1);
		});

		it('Should delete nothing if nothing matches', async function() {
			const segment = 'foo:bar:baz';
			const deleted = await Cache.delete('bing:bat:biz:baz:*:bar', segment);
			expect(deleted).toEqual(0);
		});

		it('Should remove all keys in a target segment with wildcard as key', async function() {
			const segment = 'foo:bar:baz';
			const altKeys = 'bing:bat:biz'.split(':');
			const iterations = 5;
			const partialID = 'baz';

			await Promise.all(Array.from(new Array(iterations), () => {
				const id = uuidv4();
				const fuzzy = 'bar';

				const altKey = altKeys[Math.floor(Math.random() * (altKeys.length - 1))];
				const key = altKey + ':' + partialID + ':' + id + ':' + fuzzy;

				return Cache.set(key, id, -1, segment);
			}));

			const deleted = await Cache.delete('*', segment);
			expect(deleted).toEqual(iterations); // +1 because we expect the segment to be removed too
		});
	});

	describe('Performance', () => {
		let segments: string[];
		beforeEach(async () => {
			// Fill the cache with a lot of data
			const segment_partials = Array.from(new Array(100), (_, ind) => ind);
			segments = Array.from(new Array(5000), (el, ind) => {
				let partial;
				if (Math.random() > 0.8) {
					const ind = _.random(0, segment_partials.length);
					partial = segment_partials[ind];
				}

				return ['segment', partial,  ind].join(':');
			});
		});

		it('Should be performant on cleanup', async () => {
			const n = 1E5;

			const set = [];
			const defined_segments = [];
			const start = new Date();
			for (let i = 0; i < n; i += 1) {
				let segment;
				if (Math.random() > 0.2) {
					segment = segments[_.random(0, segments.length)];
					defined_segments.push(segment);
				}

				set.push(Cache.set('test:' + i, generate_bytes(2), 100, segment)); //?.
			}

			const time_to_set = +new Date() - +start; //?
			await RedisCache.wait(); //?.
			RedisCache.count; //?

			expect(MemoryCache.count).toEqual(n);
			expect(RedisCache.count).toBeGreaterThan(n * 0.8);

			// Cleanup the results
			// NOTE: Redis cleanup is limited by the Redis server
			// 			 as we rely on redis ttl, which is not guaranteed
			//       millisecond precision.
			const redis_results = await RedisCache.cleanup(); //?.
			const memory_results = await MemoryCache.cleanup(); //?.

			expect(memory_results).toEqual(n);
			expect(redis_results).toBeGreaterThan(n * 0.7);
			expect(RedisCache.failed).toEqual(0);
			expect(RedisCache.count).toBeLessThan(n * 0.3);
			expect(MemoryCache.count).toEqual(0);
		}, 60000);
	});
});
