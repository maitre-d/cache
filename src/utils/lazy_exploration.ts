type ExplorationStatus = {
  failures: number;
  samples: number;
}

/** Explore a set until the minimum_trials is met or we exceed the retry interval */
export function lazy_exploration<Type>(
  set: Type[],
  /** Callback, false indicates failure */
  test: (value: Type) => (boolean|Promise<boolean>),
  min_trials = 20, failure_threshold = 5): ExplorationStatus|Promise<ExplorationStatus> {

  let is_async_pending: Promise<boolean> | undefined;
  let failures = 0;
  let samples = 0;

  let i = 0;
  let e = 0;
  while (i < min_trials && set.length > 0) {
    const random_key_index = Math.floor(Math.random() * set.length);
    const random_key = set[random_key_index];

    const status = test(random_key);
    set.splice(random_key_index, 1);

    if (status instanceof Promise) {
      is_async_pending = status;
      break;
    }

    if (!status) {
      e += 1;
      failures += 1;
    }

    if (e > failure_threshold) {
      i = 0;
      e = 0;
    }

    samples += 1;
  }

  if (is_async_pending) {
    return (async () => {
      while (i < min_trials && set.length > 0) {
        let status;
        if (is_async_pending) {
          status = await is_async_pending;
          is_async_pending = undefined;
        }
        else {
          const random_key_index = Math.floor(Math.random() * set.length);
          const random_key = set[random_key_index];
          status = await test(random_key);
          set.splice(random_key_index, 1);
        }

        if (!status) {
          e += 1;
          failures += 1;
        }

        if (e > failure_threshold) {
          i = 0;
          e = 0;
        }

        samples += 1;
      }

      return {failures, samples};
    })();
  }

  return {failures, samples};
}