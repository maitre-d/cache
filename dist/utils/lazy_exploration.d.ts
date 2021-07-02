declare type ExplorationStatus = {
    failures: number;
    samples: number;
};
/** Explore a set until the minimum_trials is met or we exceed the retry interval */
export declare function lazy_exploration<Type>(set: Type[], 
/** Callback, false indicates failure */
test: (value: Type) => (boolean | Promise<boolean>), min_trials?: number, failure_threshold?: number): ExplorationStatus | Promise<ExplorationStatus>;
export {};
