// eslint-disable-next-line no-unused-vars
module.exports = (wallaby) => {
	const tests = [
		'test/**/*.ts'
	];

	const files = [
		'src/**/*.ts'
	];

	const skip = [ ];

	return {
		name: 'Maitred Cache',

		autoDetect: true,

		files: [
			...files,
			...skip,

			// Ignore
			'!node_modules/**/*'
		],

		tests: [
			...tests,
			...skip,

			// Ignore
			'!node_modules/**/*',
		],

		env: {
			type: 'node',
			params: { }
		},

		runMode: 'onsave'
	};
};