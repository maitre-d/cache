import _ from 'lodash'
import {MemoryDriver} from 'src/index'
import {MemoryCacheCleanupStrategies} from 'src/drivers/memory'

const Cache = new MemoryDriver({
	name: 'memory',
	timeout: -1,
	namespace: 'test',
	omit_partials: ['refresh'],
	strategy: MemoryCacheCleanupStrategies.Least_Accessed,
	max_cache_size: '10kb',
	max_record_size: '1kb',
	minimum_prune_size: '1kb'
});

const generate_bytes = (bytes: number) =>
	Array.from(new Array(Math.ceil(bytes / 2)), () => ' ').join('');

describe('MemoryCache', function() {
	beforeEach(() => Cache.flush());

	describe('fetch', function () {
		it('Should generate and set a value if unset', async () => {
			expect(Cache.get('foo')).toBeUndefined();
			expect(await Cache.fetch('foo', () => 'bar')).toEqual('bar');
			expect(Cache.get('foo')).toEqual('bar');
		});

		it('Should return the set value if found', async () => {
			Cache.set('foo', 'bar');
			expect(await Cache.fetch('foo', () => 'baz')).toEqual('bar');
		});
	});

	describe('set', function() {
		it('Should return true to indicate a value was set in the cache', function() {
			const key = 'foo';
			expect(Cache.set(key, 'bar')).toBeTrue();
			expect(Object.keys(Cache._cache.values)).toBeArrayOfSize(1);
		});

		it('Should encode a unique key for a passed object when set in the cache', function() {
			expect(Cache.set(['foo', { foo: 'bar' }, true], 'bar1')).toBeTrue(); // Not Equivalent
			expect(Cache.set(['foo', { foo: 'baz' }, true], 'bar2')).toBeTrue(); // Not Equivalent
			expect(Object.keys(Cache._cache.values)).toBeArrayOfSize(2);
		});

		it('Should omit keys from encodable objects if within the omit setting', function() {
			expect(Cache.set(['foo', { refresh: true }], 'bar')).toBeTrue(); // Equivalent
			expect(Cache.set(['foo', { }], 'bat')).toBeTrue(); // Equivalent
			expect(Object.keys(Cache._cache.values)).toBeArrayOfSize(1);
			expect(Object.values(Cache._cache.values)[0].value).toEqual('bat');
		});

		it('Should set values into their respective segments within the cache', function() {
			expect(Cache.set('foo', 'bar', 1, ['foo'])).toBeTrue();
			expect(Object.keys(Cache._cache.segments)).toBeArrayOfSize(1);
			const cached_value = Object.values(Cache._cache.values)[0];
			expect(cached_value.segments).toBeArrayOfSize(1);
			for (const segment of cached_value.segments) {
				expect(Cache._cache.segments[segment]).toBeArrayOfSize(1);
				expect(Cache._cache.segments[segment][0]).toEqual(cached_value.id);
			}
		});

		it('Should increment the size of the cache when a value is set in the cache', function() {
			expect(Cache.size).toEqual(0);
			const value = generate_bytes(6);
			Cache.set('foo', value);
			const cached_value = Object.values(Cache._cache.values)[0];
			expect(cached_value.size).toEqual(6);
			expect(Cache.size).toEqual(cached_value.size);
		});

		it ('Should set an expiration for the value being set (if specified)', function () {
			const expiration = 1;
			Cache.set('foo', 'bar', expiration);
			const cached_value = Object.values(Cache._cache.values)[0];
			expect(cached_value.expiration / 1000).toBeCloseTo((+new Date() + expiration) / 1000, 1);
		});

		it ('Should default to the internal timeout for the value being set (if unspecified)', function () {
			Cache.set('foo', 'bar');
			const cached_value = Object.values(Cache._cache.values)[0];
			expect(cached_value.expiration).toEqual(-1);
		});

		it ('Should not set a value whose size exceeds the cache value limit', function () {
			const very_large_object = Array.from(new Array(10000),
				(_, ind) => Math.random() * ind);
			expect(Cache.set('foo', very_large_object)).toBeFalse();
		});

		describe('Pruning', () => {
			describe('Random (Default)', () => {
				it('Should prune values in the cache if the cache will exceed the global maximum (success)', () => {
					Cache.options.strategy = MemoryCacheCleanupStrategies.Random;

					const status = [];
					// 9.99kb
					for (let i = 0; i < 10; i += 1) {
						// We can only fill 1kb at a time
						status.push(Cache.set('fill' + i, generate_bytes(998)));
					}

					status.push(Cache.set('val0', generate_bytes(100)));
					// NOTE: We remove two large keys here because they are under the 1kb threshold
					expect(Cache.size).toEqual(998 * 8 + 100);
					expect(status.every((status) => status === true)).toBeTrue();
				});
			});

			describe('Last Accessed', () => {
				it('Should prune values in the cache if the cache will exceed the global maximum', () => {
					Cache.options.strategy = MemoryCacheCleanupStrategies.Least_Accessed;

					const status = [];
					// 9.99kb
					for (let i = 0; i < 10; i += 1) {
						// We can only fill 1kb at a time
						status.push(Cache.set('fill' + i, generate_bytes(998)));
					}

					// Get something so we have a candidate to remove on the next set
					Cache.get('fill0');

					// >10kb
					expect(Cache.set('val', generate_bytes(21))).toBeTrue();

					// NOTE: If we had not accessed any values up to this point, we would fallback to random deletion
					// NOTE: It'd remove two keys if we had observed more than one here
					expect(Cache.size).toEqual(998 * 9 + 21 + 1);
					expect(status.every((status) => status === true)).toBeTrue();
				});

				it('Should prune values in the cache in the order they are accessed', () => {
					Cache.options.strategy = MemoryCacheCleanupStrategies.Least_Accessed;

					// 3kb each
					// 9.99kb
					for (let i = 0; i < 10; i += 1) {
						// We can only fill 1kb at a time
						Cache.set('fill' + i, generate_bytes(998));
					}

					// Access simulation stuff
					Cache.get('fill1');
					Cache.get('fill1');
					Cache.get('fill2');
					Cache.get('fill2');
					Cache.get('fill2');
					Cache.get('fill3');


					expect(Cache.set('val', generate_bytes(100))).toBeTrue();
					expect(Cache.get('fill2')).toBeUndefined();
				});
			});
		});
	});

	describe('get', function() {
		it('Should get the cache value using the cache_key', function() {
			const key = 'foo';
			const value = 'bar';
			Cache.set(key, value);
			const cached_value = Cache.get(key);

			expect(cached_value).toEqual(value);
		});

		it('Should return undefined if the cache value has expired', async function() {
			const key = 'foo';
			const value = 'bar';
			Cache.set(key, value, 1);
			await new Promise<void>((resolve) => setTimeout(() => resolve(), 5));
			const cached_value = Cache.get(key);
			expect(cached_value).toBeUndefined();
		});
	});

	describe('delete', function() {
		it('Should delete a value from the cache', function() {
			const key = 'foo';
			const value = 'bar';
			Cache.set(key, value);
			expect(Cache.delete(key)).toEqual(1);
			const cached_value = Cache.get(key);
			expect(cached_value).toBeUndefined();
		});

		it('Should delete nothing if nothing matches', function() {
			Cache.set('foo', 'bar');
			expect(Cache.delete('')).toEqual(0);
		});

		it('Should use the segment to delete wildcard keys if possible', function() {
			Cache.set('foo', 'bar', -1, 'foo');
			Cache.set('bing', 'bat', -1, 'foo');
			Cache.set('boo', 'baz');
			expect(Cache.delete('*', 'foo')).toEqual(2);
			expect(Object.keys(Cache._cache.values)).toBeArrayOfSize(1);
		});

		it('Should unset the segment if all keys are removed', function() {
			Cache.set('foo', 'bar', -1, 'foo');
			Cache.set('bing', 'bat', -1, 'foo');
			expect(Cache.delete('*', 'foo')).toEqual(2);
			expect(Object.keys(Cache._cache.segments)).toBeArrayOfSize(0);
			expect(Object.keys(Cache._cache.access_counter)).toBeArrayOfSize(0);
		});

		it('Should unset the access_counter for each key removed', function() {
			Cache.set('foo', 'bar', -1, 'foo');
			Cache.set('bing', 'bat', -1, 'foo');
			Cache.get('foo'); // Increment the counter
			expect(Object.keys(Cache._cache.access_counter)).toBeArrayOfSize(1);
			expect(Cache.delete('*', 'foo')).toEqual(2);
			expect(Object.keys(Cache._cache.access_counter)).toBeArrayOfSize(0);
		});

		it('Should flush the cache if a wildcard key is passed without segments', function() {
			Cache.set('foo', 'bar', -1, 'biz');
			Cache.set('bing', 'bat');
			Cache.set('boo', 'baz');
			expect(Cache.delete('*')).toEqual(3);
			expect(Cache.get('foo')).toBeUndefined();
			expect(Cache.get('bing')).toBeUndefined();
			expect(Cache.get('boo')).toBeUndefined();
		});

		it('Should not remove anything if the segment is empty with a wildcard key', function() {
			Cache.set('foo', 'bar', -1, 'biz');
			Cache.set('bing', 'bat');
			Cache.set('boo', 'baz');
			expect(Cache.delete('*', 'foo')).toEqual(0);
			expect(Cache.get('foo')).not.toBeUndefined();
			expect(Cache.get('bing')).not.toBeUndefined();
			expect(Cache.get('boo')).not.toBeUndefined();
		});

		it('Should further filter the segmented keys if a key is provided', function() {
			Cache.set('foo', 'bar', -1, 'foo');
			Cache.set('bing', 'bat', -1, 'foo');
			expect(Cache.delete('bing', 'foo')).toEqual(1);
			expect(Cache.get('foo')).not.toBeUndefined();
		});

		it('Should further filter the segmented keys if a wildcard has additional filtering', function() {
			Cache.set('foo', 'bar', -1, 'foo');
			Cache.set('bing:bat', 'bat', -1, 'foo');
			Cache.set('bing:boo', 'boo', -1, 'foo');
			expect(Cache.delete('bing:*', 'foo')).toEqual(2);
			expect(Cache.get('foo')).not.toBeUndefined();
		});

		it('Should automatically look for a segment if a wildcard key is passed without segments', function() {
			Cache.set('bing:bat', 'bat', -1, 'bing');
			Cache.set('bing:boo', 'boo', -1, 'bing');
			expect(Cache.delete('bing:*')).toEqual(2);
		});
	});

	describe('cleanup', () => {
		it ('Should prune expired values from the cache', async () => {
			Cache.set('test0', 'bar', -1);
			Cache.set('test1', 'bar', 1);
			Cache.set('test2', 'bar', 2);
			Cache.set('test3', 'bar', 10);
			await new Promise<void>((resolve) => setTimeout(() => resolve(), 5));
			const results = await Cache.cleanup(); //?.
			expect(results).toEqual(2);
		});

		describe.skip('Performance', () => {
			let Cache: MemoryDriver;
			beforeEach(async () => {
				// Initialize a large cache
				Cache = new MemoryDriver({
					name: 'test',
					timeout: -1,
					namespace: 'test',
					omit_partials: ['refresh'],
					strategy: MemoryCacheCleanupStrategies.Least_Accessed,
					max_cache_size: '1gb',
					max_record_size: '1mb',
					minimum_prune_size: '10mb',
				});

				// Fill the cache with a lot of data
				const segments = Array.from(new Array(5000), (_, ind) => 'segment:' + ind);
				const set = [];
				for (let i = 0; i < 1E5; i += 1) {
					let segment;
					if (Math.random() > 0.2) segment = segments[_.random(0, segments.length)];
					set.push(Cache.set('test' + i, generate_bytes(2), _.random(1000, 3000), segment));

					// Flush every 10k records or final cycle
					if (set.length > 1E4 || i === 1E5 - 1) {
						await Promise.all(set.splice(0, 1E4));
					}
				}
			});

			it('Should be performant on cleanup (100k records)', async () => {
				// Wait 5ms
				await new Promise<void>((resolve) => setTimeout(() => resolve(), 2000));
				// Cleanup the results
				const results = await Cache.cleanup(); //?.

				results //?
			});
		});
	});
});
