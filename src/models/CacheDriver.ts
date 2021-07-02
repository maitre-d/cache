import type {CacheSegment, CacheSegmentHandler, CacheKeyPartial} from 'src/types';

import _ from 'lodash';
import StringHash from 'string-hash';

export type CacheDriverOptions = {
  name: string;
  timeout: number;
  namespace?: string;
  omit_partials?: string[];
}

export class CacheDriver {
  _id: string;
  name: string;
  namespace: string;
  omit_partials: string[];
  timeout: number;

  constructor(options: CacheDriverOptions) {
    this._id = Math.random().toString(36).substr(2, 9);
    this.name = options.name;
    this.timeout = options.timeout;
    this.namespace = options.namespace || 'cache';
    this.omit_partials = options.omit_partials || [];
  }

  flatten_cache_key(partials: CacheKeyPartial): string {
    if (!Array.isArray(partials)) partials = [partials];

    return (partials as (Record<string, unknown>|number|string|boolean)[]).reduce((encoded: string[], partial) => {
      this.omit_partials.forEach((omit) => {
        if (_.has(partial, omit)) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [omit]: _delete, ...withoutOmit } = partial as { [index:string]: unknown };
          partial = withoutOmit;
        }
      });

      if (_.isString(partial)) encoded.push(partial);
      else if (['number', 'boolean'].includes(typeof partial)) encoded.push('' + partial);
      else encoded.push(''+StringHash(JSON.stringify(partial)));

      return encoded;
    }, []).join(':');
  }

  /** Encode keys with namespace information */
  generate_encoded_cache_key(...partials_all: CacheKeyPartial[]): string {
    return this.namespace + ':' + this.flatten_cache_key(_.flatten(partials_all) as CacheKeyPartial);
  }

  /** Parse segments options into segment strings for segment caching */
  parse_segments_to_cache(segments: (CacheSegment|CacheSegmentHandler)[], value: unknown): string[] {
    return segments.reduce((parsed: string[], segment) => {
      if (_.isFunction(segment)) {
        const resolved = segment(value);
        if (Array.isArray(resolved)) parsed.push(...resolved);
        else parsed.push(resolved);
      }
      else if (Array.isArray(segment)) parsed.push(...segment);
      else parsed.push(segment);

      return parsed;
    }, [])
      .filter((segment) => !_.isNil(segment));
  }

  parse_targeted_segments(key: string): string[] {
    const possible_segments = key.substring(0, key.indexOf('*'))
      .split(':')
      .filter((partial) => partial.length > 0);

    return possible_segments.reduce((segments: string[], segment) => {
      if (segments.length > 0) {
        const last_segment = segments[segments.length - 1];
        segments.push([last_segment, segment].join(':'));
      }
      else segments.push(segment);

      return segments;
    }, [])
      .filter((segment) => segment.length > 0);
  }

  parse_wildcard_to_regex(wildcard_string: string): RegExp {
    const escaped_wildcard_string = _.escapeRegExp(wildcard_string).replace(/\\\*/g, '(.+)') + '$';
    return new RegExp('^' + this.namespace + ':' + escaped_wildcard_string);
  }
}