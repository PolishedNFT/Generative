# Generative Art Compiler

---

## Create unique generative art using simple layers of transparent images
This tool will take layers of transparent images and merge them together to create a single image, each layer can have variations that are then choosen using a weighted random selection algorithm which generates a unique dna sequence for each image. These sequences are recorded and checked when generating the new images to ensure each image is always unique. Each variation has a weight assigned that helps to estimate the chance it has to be choosen. This results is a lot of unique images with some having more `rarity` than others because of the weighted variations.

`npm run start -- ../build/`

### Quick Start
The only file you need to edit is `settings.js`, each setting is explained below.

```
module.exports = {
	total: 1, // total number of images to generate (the total permutations of layers must be higher than this number)
	details: {
		name: 'MyImageName', // name of the image
		description: '#42', // additional text for image
		tags: [], // search tags
	},
	image: {
		width: 1024, // the size of your image layers & the render size of the generated image
		height: 1024, // should match width
	},
	url: {
		image: (name) => `uri://hash/${name}.png`, // uri of where the image file will be stored (usually ipfs)
		metadata: (name) => `uri://hash/${name}`, // uri of where the metadata file will be stored (usally ipfs)
	},
	layers: [
		{
			order: 1, // higher order numbers have their images placed above the lower orders
			trait: 'Shape', // name of the trait
			variations: [
				{
					value: 'Circle', // value of the trait
					path: '/home/user/images/shape/circle.png', // image path for the trait variation
					weight: 24, // higher weight numbers increases the chance of having the variation picked
				},
				{
					value: 'Triangle',
					path: '/home/user/images/shape/triangle.png',
					weight: 8,
				},
			],
		},
		{
			order: 0,
			trait: 'Background',
			variations: [
				{
					value: 'Green',
					path: '/home/user/images/background/green.png',
					weight: 14,
				},
				{
					value: 'Red',
					path: '/home/user/images/background/red.png',
					weight: 3,
				},
			],
		},
	],
};
```

_Looking inside `src/main.js` will reveal advanced settings in the `config` that can be set in the `settings.js` file for more configuration._
