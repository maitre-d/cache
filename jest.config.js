module.exports = {
	verbose: true,
	injectGlobals: true,
	globals: { Uint8Array: Uint8Array },
	setupFilesAfterEnv: [
		'jest-extended',
	]
};
