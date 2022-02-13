module.exports = {
	total: 1,
	details: {
		name: '',
		description: '',
		tags: [],
	},
	image: {
		width: 1024,
		height: 1024,
	},
	uri: {
		image: (name) => `uri://hash/${name}.png`,
		metadata: (name) => `uri://hash/${name}`,
	},
	layers: []
};
