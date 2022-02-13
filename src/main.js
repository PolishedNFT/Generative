const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { createCanvas, loadImage } = require('canvas');
const { performance } = require('perf_hooks');
const settings = require('./settings.js');

const config = {
	total: settings.total || 1,
	details: {
		name: '',
		description: '',
		tags: [],
		...settings.details,
	},
	image: {
		width: 1024,
		height: 1024,
		...settings.image,
	},
	uri: {
		image: (name) => `uri://hash/${name}.png`,
		metadata: (name) => `uri://hash/${name}`,
		...settings.uri,
	},
	layers: settings.layers || [],
	injectDna: settings.injectDna || [],
	build: {
		threshold: 1000000000,
		clean: true,
		path: (name = '') => path.resolve(__dirname, `../build/${name}`),
		image: (name) => config.build.path(`images/${name}.png`),
		metadata: (name) => config.build.path(`metadata/${name}`),
		manifest: () => config.build.path(`manifest.json`),
		optimized: (name, size) => config.build.path(`optimized/${size}x${size}/${name}.png`),
		optimize: [
			600,
			200,
			100,
		],
		...settings.build,
	},
};

function shuffle(arr) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));

		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
}

function padLeft(num, digits) {
	let str = String(num);

	if (str.length === digits) {
		return str;
	}

	while (str.length !== digits) {
		str = `0${str}`;
	}

	return str;
}

function ensureFolderStructure() {
	const buildDir = config.build.path();

	if (config.build.clean) {
		if (fs.existsSync(buildDir)) {
			fs.rmdirSync(buildDir, { recursive: true });
		}
	}

	if (!fs.existsSync(buildDir)) {
		fs.mkdirSync(buildDir);
	}

	if (!fs.existsSync(`${buildDir}/images`)) {
		fs.mkdirSync(`${buildDir}/images`);
	}

	if (!fs.existsSync(`${buildDir}/metadata`)) {
		fs.mkdirSync(`${buildDir}/metadata`);
	}

	if (!fs.existsSync(`${buildDir}/optimized`)) {
		fs.mkdirSync(`${buildDir}/optimized`);
	}

	for (let i = 0; i < config.build.optimize.length; i++) {
		const size = config.build.optimize[i];

		if (!fs.existsSync(`${buildDir}/optimized/${size}x${size}/`)) {
			fs.mkdirSync(`${buildDir}/optimized/${size}x${size}/`);
		}
	}
}

function injectDna(sequence) {
	const dna = {
		sequence,
		paths: {},
		attributes: []
	};

	const components = sequence
		.split(',')
		.filter(c => c.length)
		.map(c => c.split(':'));

	for (const [trait, value] of components) {
		const layer = config.layers.find(l => l.trait === trait);
		if (!layer) {
			throw new Error(`[!] Failed to find trait ${trait}`);
		}

		const variation = layer.variations.find(v => v.value === value);
		if (!variation) {
			throw new Error(`[!] Failed to find variation ${variation}`);
		}

		dna.paths[layer.order] = variation.path;

		dna.attributes.push({
			trait_type: trait,
			value,
		});
	}

	return dna;
}

function generateDna(layers) {
	const dna = {
		sequence: '',
		paths: {},
		attributes: [],
	};

	layers.forEach(({ trait, variations, order }) => {
		shuffle(variations);

		const totalWeight = variations.reduce((a, c) => { a += c.weight; return a; }, 0);

		let trackWeight = Math.floor(Math.random() * totalWeight);

		for (const { value, path, weight } of variations) {
			trackWeight -= weight;

			if (trackWeight <= 0) {
				dna.sequence += `${trait}:${value},`;

				dna.paths[order] = path;

				dna.attributes.push({
					trait_type: trait,
					value,
				});

				break;
			}
		}
	});

	return dna;
}

async function renderImage(paths) {
	const canvas = createCanvas(config.image.width, config.image.height);
	const ctx = canvas.getContext("2d");

	ctx.clearRect(0, 0, config.image.width, config.image.height);
	ctx.imageSmoothingEnabled = false;

	for (const order in Object.keys(paths)) {
		const image = await loadImage(paths[order]);

		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';

		ctx.drawImage(image, 0, 0, config.image.width, config.image.height);
	}

	return canvas.toBuffer('image/png');
}

async function optimizeImages(manifest) {
	console.log('---------------------------------');
	console.log('[@] Optimizing images...');

	for (let i = 0; i < config.build.optimize.length; i++) {
		const size = config.build.optimize[i];

		await Promise.all(manifest.metadata.map(({ tokenId }) => {
			return sharp(config.build.image(tokenId))
				.resize({
					width: size,
					height: size,
					kernel: 'nearest',
				})
				.toFile(config.build.optimized(tokenId, size));
		})).then(() => {
			console.log(`[+] Optimized for ${size}x${size}`);
		});
	}
}

async function compile() {
	const total = config.total;

	let failed = 0;
	const failureThreshold = config.build.threshold;

	const collection = new Set();
	const metadatas = [];

	while (collection.size !== total) {
		const tokenId = collection.size;

		const { sequence, paths, attributes } =
			(tokenId < config.injectDna.length)
				? injectDna(config.injectDna[tokenId])
				: generateDna(config.layers);

		if (collection.has(sequence)) {
			failed++;

			if (failed >= failureThreshold) {
				return metadatas;
			}

			continue;
		}

		collection.add(sequence);

		const metadata = {
			image: config.uri.image(tokenId),
			tokenId,
			name: `${config.details.name} - ${config.details.description} - ${tokenId}`,
			attributes,
		};

		metadatas.push(metadata);

		fs.writeFileSync(config.build.metadata(tokenId), JSON.stringify(metadata, null, 2));

		const bytes = await renderImage(paths);
		fs.writeFileSync(config.build.image(tokenId), bytes);

		console.log(`[+] Generated ${padLeft(tokenId+1, String(total).length)}/${total} | ${padLeft(tokenId, String(total).length)} : [dna: ${sequence}]`);
	}

	return metadatas;
}

async function main() {
	console.log(`Generative Art Compiler [v1.0.0]`);
	console.log('---------------------------------');

	const startTime = performance.now();

	ensureFolderStructure();

	const manifest = {
		...config.details,
		total: config.total,
		metadata: [],
	};

	const metadatas = await compile();

	manifest.metadata = [
		...manifest.metadata,
		...metadatas,
	];

	fs.writeFileSync(config.build.manifest(), JSON.stringify(manifest, null, 2));

	await optimizeImages(manifest);

	const endTime = (Math.abs(performance.now() - startTime) / 1000).toFixed(4);

	console.log('---------------------------------');
	console.log(`Compiled ${metadatas.length} unique images in ${endTime}s`);
	console.log(`Find your images at ${config.build.path()}`);
}

main();
