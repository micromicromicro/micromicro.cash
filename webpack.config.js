const CopyWebpackPlugin = require('copy-webpack-plugin')
const sass = require('node-sass')
const rfg = require('rfg-api').init()
const path = require('path')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
let rfgMarkups = null
let rfgMarkupsPromise = null


const transformRfg = (content, _) => {
	let promise
	if (rfgMarkups === null) {
		if (rfgMarkupsPromise === null) {
			rfgMarkupsPromise = fs.readFileAsync('faviconData.json').then(data => {
				rfgMarkups = JSON.parse(data).favicon.html_code
				return rfgMarkups
			})
		}
		promise = rfgMarkupsPromise
	} else {
		promise = Promise.resolve(rfgMarkups)
	}
	return promise.then(markups => new Promise((resolve, reject) => {
		return rfg.injectFaviconMarkups(content, markups, null, (error, data) => {
			if (error != null) {
				reject(error)
			} else {
				resolve(data)
			}
		})
	}))
}


module.exports = {
	context: path.join(__dirname, 'intermediate'),
	//entry: ['babel-polyfill', './intermediate/app/app.js'],
	entry: {
		'index': './index.js',
		'api': './api.js',
		'app/app': './app/app.js',
	},
	output: {
		path: __dirname + '/build',
		filename: '[name].js',
	},
	module: {
		rules: [
			/*
			{
				exclude: /node_modules/,
				test: /\.js$/,
				use: [
					{
						loader: 'babel-loader',
						options: {
							presets: ['env'],
						},
					},
				],
			},
			*/
		],
	},
	plugins: [
		new CopyWebpackPlugin([
			{
				from: '**/*', 
				ignore: [ '*.js', '*.html', '*.scss' ],
			},
			{
				from: '**/!(_*).scss',
				to: '[path][name].css',
				transform: (content, path) => new Promise((resolve, reject) => {
					sass.render({
						data: content.toString(),
					}, (error, data) => {
						if (error != null) {
							reject(new Error('SASS error [' + path + ':' + error.line + ':' + error.column + ']:\n' + error.message))
						} else {
							resolve(data.css)
						}
					})
				}),
			},
			{
				from: '**/*.html',
				transform: (content, _) => {
					let promise
					if (rfgMarkups === null) {
						if (rfgMarkupsPromise === null) {
							rfgMarkupsPromise = fs.readFileAsync('faviconData.json').then(data => {
								rfgMarkups = JSON.parse(data).favicon.html_code
								return rfgMarkups
							})
						}
						promise = rfgMarkupsPromise
					} else {
						promise = Promise.resolve(rfgMarkups)
					}
					return promise.then(markups => new Promise((resolve, reject) => {
						return rfg.injectFaviconMarkups(content, markups, null, (error, data) => {
							if (error != null) {
								reject(error)
							} else {
								resolve(data)
							}
						})
					}))
				},
			},
		]),
	],
}
