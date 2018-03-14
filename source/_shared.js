import Big from 'big.js'
import lc from 'laconic-es6'

Big.NE = -1000
Big.PE = 1000

Array.prototype.flat = function() {
	return this.reduce((a, b) => a.concat(b), [])
}

export const basePath = 'https://api.' + window.location.host + '/v1/'

export const uon = x => {
	return x == null
}

export const uonoe = x => {
	return x == null || x.length === 0
}

export const baseCurrency = 'ltc'

export const lct = (text) => document.createTextNode(text)

// majorPlaces is number of places to move across decimal to get major unit
// minPlaces is number of places to move across decimal to get minor unit
const ltcsym = () => lc.img({class: 'font', src: '/app/font_litecoin.svg', alt: 'LTC'})
export const currencyInfo = new Map([
	['btc', {
		majorPlaces: 10,
		minPlaces: 2,
		sym: () => ['₿ '],
		symbol: () => ['₿ '],
		label: () => ['₿ (BTC)'],
	}],
	['ltc', {
		majorPlaces: 10,
		minPlaces: 2,
		sym: () => [ltcsym(), ' '],
		symbol: () => [ltcsym(), ' '],
		label: () => [ltcsym(), ' (LTC)'],
	}],
	['usd', {
		majorPlaces: 2,
		minPlaces: 0,
		sym: () => ['$ '],
		symbol: () => ['USD $ '],
		label: () => ['$ (USD)'],
	}],
	['eur', {
		majorPlaces: 2,
		minPlaces: 0,
		sym: () => ['€ '],
		symbol: () => ['€ '],
		label: () => ['€ (EUR)'],
	}],
	['jpy', {
		majorPlaces: 0,
		minPlaces: 0,
		sym: () => ['¥ '],
		symbol: () => ['¥ '],
		label: () => ['¥ (JPY)'],
	}],
])

let asyncGeneration = 0

export const incAsyncGeneration = () => {
	asyncGeneration += 1
}

export const qualifyPath = (path) => {
	if (path.startsWith('https://')) {
		return path
	}
	return 'https://' + window.location.host + path
}

export class AssertionError extends Error {
	constructor(message) {
		super()
		this.name = 'AssertionError'
		this.message = message
	}
}

class WrongGeneration extends Error {
	constructor() {
		super()
		this.name = 'WrongGeneration'
	}
}

class CheckGeneration {
	constructor() {
		this.id = asyncGeneration
	}

	checked(proc) {
		return (...args) => {
			this.check()
			return proc(...args)
		}
	}

	check() {
		if (asyncGeneration != this.id)
			throw new WrongGeneration()
	}
}

export const toDom = (...element) => {
	return element.map(e => e.dom).flat()
}

export const clearElement = element => {
	element.innerHTML = ''
}

export const mountReady = (mount, ...element) => {
	clearElement(mount)
	toDom(...element).forEach(e => {
		if (typeof e == 'string' || e instanceof String)
			e = lct(e)
		mount.appendChild(e)
	})
}

export const mountReadyTagged = ({mount, tags, elements}) => {
	clearElement(mount)
	tags.forEach(e => mount.classList.add(e))
	toDom(...elements).forEach(e => {
		if (typeof e == 'string' || e instanceof String)
			e = lct(e)
		mount.appendChild(e)
	})
}

export const mount = (id, ...element) => {
	const mount = document.getElementById(id)
	if (mount === null)
		throw new ReferenceError('Mount point unavailable')
	mountReady(mount, ...element)
}

class AsyncWebsockets {
	constructor(path) {
		this.ws = new WebSocket(path)
		this.promises = []
		this.messages = []
		const this2 = this
		this.getNextPromise = () => {
			if (this2.promises.length > 0) {
				let promise = this2.promises[0]
				this2.promises.splice(0, 1)
				return promise
			}
			return null
		}
		this.openPromise = new Promise((resolve, reject) => {
			this.promises.push({
				resolve: resolve,
				reject: reject,
			})
		})
		this.ws.onopen = () => {
			const promise = this2.getNextPromise()
			promise.resolve(this)
		}
		this.processMessage = (resolve, reject, message) => {
			if (message.hasOwnProperty('error')) {
				const e = new Error(message.error.message)
				reject(e)
				return
			}
			resolve(message)
		}
		this.ws.onmessage = event => {
			let message = JSON.parse(event.data)
			let promise = this2.getNextPromise()
			if (promise !== null) {
				this2.processMessage(promise.resolve, promise.reject, message)
			} else {
				this2.messages.push(message)
			}
		}
		this.ws.onerror = _ => {
			for (let i = 0; i < this2.promises.length; ++i) {
				this2.promises[i].reject(new Error('Unknown error in connection'))
			}
		}
		this.ws.onclose = _ => {
			for (let i = 0; i < this2.promises.length; ++i) {
				this2.promises[i].reject(new Error('Connection unexpectedly closed'))
			}
		}
	}

	close() {
		this.ws.close()
	}

	send(body) {
		this.ws.send(JSON.stringify(body))
	}

	read() {
		let generation = new CheckGeneration()
		return new Promise((resolve, reject) => {
			if (this.messages.length > 0) {
				let message = this.messages[0]
				this.messages.splice(0, 1)
				this.processMessage(resolve, reject, message)
			} else {
				this.promises.push({
					resolve: generation.checked(resolve),
					reject: generation.checked(reject),
				})
			}
		})
	}
}

export const myWs = (path) => {
	let out = new AsyncWebsockets(qualifyPath(path).replace(/^http(s?:.*)/, 'ws$1'))
	return out.openPromise
}

export const myPost = async (path, body) => {
	let generation = new CheckGeneration()
	let head = await fetch(path, { 'method': 'POST', body: JSON.stringify(body) })
	generation.check()
	let out = await head.json()
	generation.check()
	if (out.hasOwnProperty('error')) {
		throw new Error(out.error.message)
	}
	return out
}

export const myGet = async (path) => {
	let generation = new CheckGeneration()
	let head = await fetch(path, { 'method': 'GET' })
	generation.check()
	let out = await head.json()
	generation.check()
	if (out.hasOwnProperty('error')) {
		throw new Error(out.error.message)
	}
	return out
}

export const myGetText = async (path) => {
	let generation = new CheckGeneration()
	let head = await fetch(path, { 'method': 'GET' })
	generation.check()
	let out = await head.text()
	generation.check()
	return out
}

export const mountError = e => {
	if (e.name == 'AssertionError') {
		console.error('ASSERT', e.message)
	} else {
		mount('errors', {dom: [document.createTextNode(e.message)]})
		window.scrollTo(0, 0)
	}
}

export const safe = async (proc) => {
	try {
		await proc()
	} catch (e) {
		if (e.name == 'WrongGeneration') {
			// nop
		} else
			mountError(e)
	}
}

export const atRefresh = cb => {
	setTimeout(() => safe(cb), 0)
}

export const format_decimal = (value) => {
	const halves = /(\d+)(\.(\d+?)0*)?$/.exec(value.toPrecision(10))
	let displayValue
	{
		const left = halves[1]
		const parts = []
		for (let i = 0; i < left.length / 3; ++i) {
			parts.push(left.substr(
				Math.max(0, left.length - (i + 1) * 3),
				Math.min(3, left.length - i * 3),
			))
		}
		parts.reverse()
		displayValue = parts.join(' ')
	}
	if (!uon(halves[3])) {
		const right = halves[3]
		const parts = []
		for (let i = 0; i < right.length / 3; ++i) {
			parts.push(right.substr(i * 3, 3))
		}
		displayValue += ' . ' + parts.join(' ')
	}
	return displayValue
}

export const format_price_nosym = (currency, rates, value) => {
	if (value === null) {
		value = 0
	}
	value = new Big(value)
	const factor = currency === baseCurrency ? 1 : rates[currency]
	const majorPlaces = currencyInfo.get(currency).majorPlaces
	return format_decimal(value.div(Math.pow(10, majorPlaces)).div(factor))
}

export const format_price = (currency, rates, value) => {
	return [...currencyInfo.get(currency).symbol(), lct(format_price_nosym(currency, rates, value))]
}

