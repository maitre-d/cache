import _ from 'lodash';
import Redis from 'ioredis'
import {RedisDriver} from 'src/index';

const client = new Redis();
const Cache = new RedisDriver(client, {
	name: 'test',
	timeout: 10,
	namespace: 'test',
	omit_partials: ['refresh'],
	flush_interval: 5,
	max_queue_size: 100
});

const generate_bytes = (bytes: number) =>
	Array.from(new Array(Math.ceil(bytes / 2)), () => ' ').join('');

describe('Cache', function() {
	beforeEach(async () => Cache.flush());
	afterAll(async () => client.disconnect());

	describe('fetch', () => {
		it('Should generate and set a value if unset', async () => {
			expect(await Cache.get('foo')).toBeUndefined();
			expect(await Cache.fetch('foo', () => 'bar')).toEqual('bar');
			expect(await Cache.get('foo')).toEqual('bar');
		});

		it('Should return the set value if found', async () => {
			await Cache.set('foo', 'bar');
			expect(await Cache.fetch('foo', () => 'baz')).toEqual('bar');
		});
	});

	describe('set', () => {
		it('Should return true to indicate a value was set in the cache', async () => {
			const key = 'foo';
			expect(await Cache.set(key, 'bar')).toBeTrue();
			expect(await client.exists(Cache.generate_encoded_cache_key(key))).toEqual(1);
		});

		it('Should encode a unique key for a passed object when set in the cache', async () => {
			const keys = [
				['foo', { foo: 'bar' }, true], // Not Equivalent
				['foo', { foo: 'baz' }, true] // Not Equivalent
			];

			for (const key of keys) {
				const cache_key = Cache.generate_encoded_cache_key(key);
				expect(await Cache.set(key, 'bar')).toBeTrue();
				expect(await client.exists(cache_key)).toEqual(1);
				expect(cache_key).not.toEqual('foo:true');
			}
		});

		it('Should omit keys from encodable objects if within the omit setting', async () => {
			const equivalent_key = ['foo', { }, true];
			expect(await Cache.set(equivalent_key, 'bat')).toBeTrue(); // Equivalent
			expect(await Cache.set(['foo', { refresh: true }, true], 'bar')).toBeTrue();
			expect(await Cache.get(equivalent_key)).toEqual('bar');
		});

		it('Should set values into their respective segments within the cache', async () => {
			expect(await Cache.set('foo', 'bar', 1, ['foo'])).toBeTrue();
			expect(await client.scard(Cache.segment_cache_key)).toEqual(1);
			expect(await client.smembers(Cache.segment_cache_key))
				.toContain(Cache.generate_encoded_cache_key('segment', 'foo'));
		});

		it ('Should set an expiration for the value being set (if specified)', async () => {
			const expiration = 10;
			expect(await Cache.set('foo', 'bar', expiration)).toBeTrue();
			const ttl = await client.pttl(Cache.generate_encoded_cache_key('foo'));
			expect(ttl / 100).toBeCloseTo(expiration / 100, 1);
		});

		it ('Should default to the internal timeout for the value being set (if unspecified)', async () => {
			await Cache.set('foo', 'bar');
			const ttl = await client.pttl(Cache.generate_encoded_cache_key('foo'));
			expect(ttl / 100).toBeCloseTo(Cache.timeout / 100, 1);
		});
	});

	describe('get', () => {
		it('Should get the cache value using the cache_key', async () => {
			const key = 'foo';
			const value = { foo: 'bar' };
			await Cache.set(key, value);
			const cached_value = await Cache.get(key);

			expect(cached_value).toEqual(value);
		});

		it('Should return undefined if the cache value has expired', async () => {
			const key = 'foo';
			const value = 'bar';
			await Cache.set(key, value, 1);
			await new Promise<void>((resolve) => setTimeout(() => resolve(), 5));
			const cached_value = await Cache.get(key);
			expect(cached_value).toBeUndefined();
		});
	});

	describe('delete', () => {
		it('Should delete a value from the cache', async () => {
			const key = 'foo';
			const value = 'bar';
			await Cache.set(key, value);
			expect(await Cache.delete(key)).toEqual(1);
			const cached_value = await Cache.get(key);
			expect(cached_value).toBeUndefined();
		});

		it('Should delete nothing if nothing matches', async () => {
			await Cache.set('foo', 'bar');
			expect(await Cache.delete('')).toEqual(0);
		});

		it('Should use the segment to delete wildcard keys if possible', async () => {
			await Promise.all([
				Cache.set('foo', 'bar', -1, 'foo'),
				Cache.set('bing', 'bat', -1, 'foo'),
				Cache.set('boo', 'baz', -1, 'bar'),
				Cache.set('baz', 'bing')
			]);

			expect(await Cache.delete('*', 'foo')).toEqual(2);
			expect(await client.scard(Cache.segment_cache_key)).toEqual(1);
		});

		it('Should unset the segment if all keys are removed', async () => {
			await Cache.set('foo', 'bar', -1, 'foo');
			await Cache.set('bing', 'bat', -1, 'foo');

			expect(await Cache.delete('*', 'foo')).toEqual(2);
			expect(await client.scard(Cache.segment_cache_key)).toEqual(0);
		});

		it('Should NOT flush the cache if a wildcard key is passed without segments (wildcard-disallowed)', async () => {
			await Promise.all([
				Cache.set('foo', 'bar', -1, 'biz'),
				Cache.set('bing', 'bat'),
				Cache.set('boo', 'baz')
			]);

			expect(await Cache.delete('*')).toEqual(0);

			const keys = await Promise.all([
				Cache.get('foo'),
				Cache.get('bing'),
				Cache.get('boo')
			]);
			expect(keys[0]).not.toBeUndefined();
			expect(keys[1]).not.toBeUndefined();
			expect(keys[2]).not.toBeUndefined();
		});

		it('Should flush the cache if a wildcard key is passed without segments (wildcard-allowed)', async () => {
			await Promise.all([
				Cache.set('foo', 'bar', -1, 'biz'),
				Cache.set('bing', 'bat'),
				Cache.set('boo', 'baz')
			]);

			// NOTE: 5, Because 1 global cache segment key, 1 segment, 3 values
			expect(await Cache.delete('*', [], true)).toEqual(5);

			const keys = await Promise.all([
				Cache.get('foo'),
				Cache.get('bing'),
				Cache.get('boo')
			]);
			expect(keys[0]).toBeUndefined();
			expect(keys[1]).toBeUndefined();
			expect(keys[2]).toBeUndefined();
		});

		it('Should not remove anything if the segment is empty with a wildcard key', async () => {
			await Promise.all([
				Cache.set('foo', 'bar', -1, 'biz'),
				Cache.set('bing', 'bat'),
				Cache.set('boo', 'baz')
			]);

			expect(await Cache.delete('*', 'foo')).toEqual(0);

			const keys = await Promise.all([
				Cache.get('foo'),
				Cache.get('bing'),
				Cache.get('boo')
			]);
			expect(keys[0]).not.toBeUndefined();
			expect(keys[1]).not.toBeUndefined();
			expect(keys[2]).not.toBeUndefined();
		});

		it('Should further filter the segmented keys if a key is provided', async () => {
			await Cache.set('foo', 'bar', -1, 'foo');
			await Cache.set('bing', 'bat', -1, 'foo');
			expect(await Cache.delete('bing', 'foo')).toEqual(1);
			expect(await Cache.get('foo')).not.toBeUndefined();
		});

		it('Should further filter the segmented keys if a wildcard has additional filtering', async () => {
			await Promise.all([
				Cache.set('foo', 'bar', -1, 'foo'),
				Cache.set('bing:bat', 'bat', -1, 'foo'),
				Cache.set('bing:boo', 'boo', -1, 'foo')
			]);
			expect(await Cache.delete('bing:*', 'foo')).toEqual(2);
			expect(await Cache.get('foo')).not.toBeUndefined();
		});

		it('Should automatically look for a segment if a wildcard key is passed without segments', async () => {
			await Cache.set('bing:bat', 'bat', -1, 'bing');
			await Cache.set('bing:boo', 'boo', -1, 'bing');

			expect(await Cache.delete('bing:*')).toEqual(2);
		});
	});

	describe('cleanup', () => {
		it ('Should prune expired values from the cache', async () => {
			await Promise.all([
				Cache.set('test0', 'bar', -1, 'foo'),
				Cache.set('test1', 'bar', 5, 'foo'),
				Cache.set('test2', 'bar', 10, 'bar'),
				Cache.set('test3', 'bar', 1000, 'baz')
			]);

			await new Promise<void>((resolve) => setTimeout(() => resolve(), 100));
			const results = await Cache.cleanup(); //?.

			expect(results).toEqual(2);
		});

		describe.skip('Performance', () => {
			jest.setTimeout(5000); // 5s

			it('Should be performant on cleanup (10k records)', async () => {
				// Fill the cache with a lot of data
				const record_count = 1E4;
				const flush_count = 1E3;
				const segment_count = 3500;
				const start_time = new Date();
				const segments = Array.from(new Array(segment_count), (_, ind) => 'segment' + ind);

				let set = [];
				for (let i = 0; i < record_count; i += 1) {
					const segment = segments[_.random(0, segments.length)];
					const expire = 100; // 100ms
					set.push(Cache.set('test' + i, generate_bytes(1000), expire, segment));

					// Flush every set of records or final cycle
					if (set.length > flush_count || i === record_count - 1) {
						await Promise.all(set);
						set = [];
					}
				}

				+new Date() - +start_time; //?

				// Wait to invalidate the cache
				await new Promise<void>((resolve) => setTimeout(() => resolve(), 100)); //?.

				// Cleanup the results
				const results = await Cache.cleanup() //?.
				results //?
				expect(results / record_count).toBeCloseTo(1, 1);
			});
		});
	});
});