const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { performance } = require('perf_hooks');

let workPath;

const optimize = [
	5000,
	1024,
	512,
	256,
];

async function optimizeImages(manifest) {
	console.log('---------------------------------');
	console.log('[@] Optimizing images...');

	for (let i = 0; i < optimize.length; i++) {
		const size = optimize[i];

		await Promise.all(manifest.metadata.map(({ tokenId }) => {
			return sharp(`${workPath}/images/${tokenId}.png`)
				.resize({
					width: size,
					height: size,
					kernel: 'nearest',
				})
				.toFile(`${workPath}/optimized/${size}x${size}/${tokenId}.png`);
		})).then(() => {
			console.log(`[+] Optimized for ${size}x${size}`);
		});
	}
}

async function loadManifest(filePath) {
	const content = await fs.promises.readFile(filePath);
	return JSON.parse(content);
}

async function main() {
	console.log('Generative Art Optimizer [v1.0.0]');
	console.log('---------------------------------');

	const startTime = performance.now();

	if (process.argv.length !== 3) {
		console.log('[!] Missing work path');
		console.log('[?] Usage: npm run start /path/to/work/dir/');
		return;
	}

	workPath = process.argv[2];

	if (!fs.existsSync(`${workPath}/optimized`)) {
		fs.mkdirSync(`${workPath}/optimized`);
	}

	for (let i = 0; i < optimize.length; i++) {
		const size = optimize[i];

		if (!fs.existsSync(`${workPath}/optimized/${size}x${size}/`)) {
			fs.mkdirSync(`${workPath}/optimized/${size}x${size}/`);
		}
	}

	const manifest = await loadManifest(`${workPath}/manifest.json`);
	await optimizeImages(manifest);

	const endTime = (Math.abs(performance.now() - startTime) / 1000).toFixed(4);

	console.log('---------------------------------');
	console.log(`Compiled ${metadatas.length} unique images in ${endTime}s`);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
