import lc from 'laconic-es6'
import qrcode from 'qrcode-generator-es6'
import qrscan from 'qrscan-es6'
import moment from 'moment'
import {
	uon,
	uonoe,
	lct,
	format_price,
	mount,
	mountError,
	mountReady,
	mountReadyTagged,
	incAsyncGeneration,
	currencyInfo,
	toDom,
	AssertionError,
	clearElement,
	safe,
	atRefresh,
	myPost,
	myGetText,
	myGet,
	qualifyPath,
	baseCurrency,
	basePath,
} from '../_shared.js'
import { qrMicro } from './qr_micro.js'
import { currentTos } from './_tos.js'

if (self !== top)
	throw Error('The micromicro client should be linked to rather than embedded.')

////////////////////////////////////////////////////////////////////////////////
// Config

let config = localStorage.getItem('config')

if (config !== null) { 
	try {
		config = JSON.parse(config)
	} catch (e) {
		config = null
	}
}
if (config === null) {
	config = {
		username: '',
		token: null,
		rates: null,
	}
}

const setConfig = (change) => {
	Object.assign(config, change)
	localStorage.setItem('config', JSON.stringify(config))
}

const addSeenHistory = (inout) => {
	const seenHist = new Set()
	setConfig({
		scanHistory: [inout, ...config.scanHistory].filter(h => {
			const id = JSON.stringify([h.source, h.dest, h.id])
			if (seenHist.has(id)) {
				return false
			}
			seenHist.add(id)
			return true
		}).slice(0, 1000),
	})
}

// Versions cleanup
if (uon(config.currency)) {
	setConfig({currency: baseCurrency})
}

if (uon(config.scanHistory)) {
	setConfig({scanHistory: []})
}

if (uon(config.all_tos)) {
	setConfig({all_tos: {}})
}

////////////////////////////////////////////////////////////////////////////////
// Routing and navigation

const mountRoot = (...element) => {
	mount('root', ...element)
}

const routes = []
let cleanup = []

const go = (path, ...extraArgs) => {
	incAsyncGeneration()
	try {
		cleanup.forEach(c => c())
	} catch (e) {
		mountError(e)
	}
	cleanup.length = 0
	for (let i = 0; i < routes.length; ++i) {
		let route = routes[i]
		let match = path.match(route[0])
		if (match !== null) {
			let found = route[1]
			let args = []
			for (let i = 1; i < match.length; ++i) {
				args.push(match[i])
			}
			history.pushState(null, null, '#' + path)
			found(path, ...args, ...extraArgs)
			return
		}
	}
	throw new AssertionError('Unknown path ' + path)
}

const route = (pattern, page) => {
	routes.push([pattern, page])
}

const authRoute = (pattern, page) => {
	let outer = (path, ...args) => {
		const next = path.length > 0 ? '?next=' + path : ''
		if (!config.token) {
			go('login' + next)
		} else if (config.tos !== currentTos) {
			go('tos' + next)
		} else {
			page(path, ...args)
		}
	}
	route(pattern, outer)
}


////////////////////////////////////////////////////////////////////////////////
// Elements

const e_mount = (...elements) => {
	return {
		dom: [lc.div(...toDom(...elements))],
	}
}

const e_outer = (...elements) => {
	return {
		dom: [
			lc.form(
				{
					class: 'outer',
					onsubmit: () => false,
				},
				...toDom(...elements)
			),
		],
	}
}

const e_body = (...elements) => {
	return {
		dom: [lc.div({class: 'body'}, ...toDom(...elements))],
	}
}

const e_foot = (...elements) => {
	return {
		dom: [lc.div({class: 'foot'}, ...toDom(...elements))],
	}
}

const e_authbody = ({back, tabs, elements}) => {
	const tabElements = []
	if (!uon(tabs)) {
		const buttons = []
		const hash = window.location.hash.slice(1)
		Array.from(tabs.entries()).forEach(([k, v], _) => {
			const button = e_button('tab_' + k.replace(/\//, '_'), v, async () => go(k))
			buttons.push(button)
			if (hash === k)
				button.dom[0].classList.add('active')
		})
		tabElements.push(e_tabs(...buttons))
	}
	return e_outer(
		{
			dom: [
				lc.div({class: 'header'}, 
					...(back ?
						toDom(e_button('back', 'Close', async () => go(''))) :
						[lc.div()]
					),
					lc.a({target: '_blank', href: '/'}, lc.img({alt: 'micromicro', src: 'icon.svg', id: 'icon'})),
				),
				lc.div({class: 'subheader'},
					lc.span(config.username),
					lc.span({class: 'spacer'}, '•'),
					...toDom(e_price(config.account.balance)),
				),
				...toDom(...tabElements),
				...toDom(e_errors()),
			],
		},
		...elements,
	)
}

const e_noauthbody = (path, body, foot) => {
	return e_outer(
		e_body(
			e_logo(),
			{
				dom: [
					lc.div({class: 'noauthheader'}, 
						e_button('gologin', 'Go', async () => {
							let loginpath = 'login'
							if (path.length > 0) loginpath = loginpath + '?next=' + path
							go(loginpath)
						}),
					),
					...toDom(e_errors()),
				],
			},
			...body,
		),
		e_foot(
			...foot,
			e_button('noauth_login', 'Log in or create an account!', async() => {
				let loginpath = 'login'
				if (path.length > 0) loginpath = loginpath + '?next=' + path
				go(loginpath)
			}),
		),
	)
}

const e_logo = () => {
	return {
		dom: [lc.img({alt: 'micromicro', src: '../title.svg', id: 'logo_login'})],
	}
}

const e_errors = () => {
	return {
		dom: [lc.div({id: 'errors'}), lc.div({id: 'messages'})],
	}
}

let _label_unique = [0]

const _inputBase = (makeInput) => {
	return (args) => {
		const {text, initialValue, help} = args
		const unique = (_label_unique++).toString()
		const out = {
			value: initialValue,
		}
		const set = newValue => {
			out.value = newValue
		}
		const label = lc.label({for: unique}, text)
		const newArgs = Object.assign({}, {unique: unique, set: set}, args)
		const input = makeInput(newArgs)
		out.dom = [label, input]
		if (!uon(help)) {
			out.dom.push(lc.span({class: 'help'}, help))
		}
		return out
	}
}

const _inputBaseOpt = (makeInput) => {
	return (args) => {
		const {text, initialValue, blankValue, help} = args
		const initialValue2 = uon(initialValue) ? null : initialValue
		const unique = (_label_unique++).toString()
		let value = (
			initialValue2 !== null ?
				initialValue2 :
				(uon(blankValue) ? null : blankValue)
		)
		const out = {
			value: initialValue2,
		}
		const set = newValue => {
			out.value = value = newValue
		}
		const label = lc.label({for: unique}, text)
		const input = makeInput(Object.assign({}, {unique: unique, set: set}, args))
		const remove = lc.div({
			class: 'remove',
			onclick: () => {
				label.classList.add('disabled')
				input.classList.add('disabled')
				remove.classList.add('disabled')
				out.value = blankValue
			},
		})
		if (initialValue2 === null) {
			label.classList.add('disabled')
			input.classList.add('disabled')
			remove.classList.add('disabled')
		}
		label.onclick = () => {
			label.classList.remove('disabled')
			input.classList.remove('disabled')
			remove.classList.remove('disabled')
			out.value = value
		}
		out.dom = [label, input, remove]
		if (!uon(help)) {
			out.dom.push(lc.span({class: 'help'}, help))
		}
		return out
	}
}

const _textInput = ({unique, initialValue, set, hint, code, focus}) => {
	const code2 = !uon(code) && code === true
	const out = lc.input({
		id: unique,
		type: 'text',
		placeholder: hint,
		value: initialValue,
		autocorrect: code2 ? 'off' : 'on',
		autocapitalize: code2 ? 'off' : 'on',
		onchange: v => { set(v.target.value) },
	})
	if (focus) atRefresh(() => out.focus())
	return out
}

const e_formText = _inputBase(_textInput)
const e_formTextOpt = _inputBaseOpt(_textInput)

const _textAreaInput = ({unique, initialValue, set, hint}) => {
	return lc.textarea({
		id: unique,
		type: 'text',
		placeholder: hint,
		onchange: v => { set(v.target.value) },
		oninput: v => {
			const element = v.target
			const style = window.getComputedStyle(element)
			// Hack
			// https://stackoverflow.com/questions/17772260/textarea-auto-height/24676492#24676492
			element.style.height = '5px'
			element.style.height = (
				element.scrollHeight - 
				(parseInt(style.paddingTop, 10) + parseInt(style.paddingBottom, 10))
			) + 'px'
		},
	}, initialValue)
}

const e_formTextArea = _inputBase(_textAreaInput)
const e_formTextAreaOpt = _inputBaseOpt(_textAreaInput)

const _passInput = ({unique, set, focus}) => {
	const out = lc.input({
		id: unique,
		type: 'password',
		onchange: v => set(v.target.value),
	})
	if (focus) atRefresh(() => out.focus())
	return out
}

const e_formPass = _inputBase(_passInput)
const e_formPassOpt = _inputBaseOpt(_passInput)

const _durationInput = ({unique, initialValue, set}) => {
	return lc.input({
		id: unique,
		type: 'datetime-local',
		value: new Date(new Date().getTime() + initialValue).toISOString(),
		onchange: v => {
			set(new Date(v.target.value) - new Date())
		},
	})
}

const e_formDurationOpt = _inputBaseOpt(_durationInput)

const _priceInput = ({unique, initialValue, set}) => {
	let base = initialValue
	let factor
	let majorPlaces
	const changeCurrency = c => {
		factor = c === baseCurrency ? 1 : config.rates[c]
		majorPlaces = currencyInfo.get(c).majorPlaces
	}
	changeCurrency(config.currency)
	const oldSet = set
	set = () => {
		oldSet(Math.round(base * Math.floor(Math.pow(10, majorPlaces)) * factor))
	}
	return lc.div({class: 'price_input'},
		lc.select(
			{
				onchange: v => {
					changeCurrency(v.target.value)
					set()
				},
			},
			...Array.from(currencyInfo).map(([k, v], _) => lc.option(
				{
					value: k,
					selected: k === config.currency ? '' : undefined,
				},
				...v.label(),
			))
		),
		lc.input({
			id: unique,
			type: 'number',
			step: 'any',
			min: '0',
			value: initialValue / factor / Math.pow(10, majorPlaces),
			onchange: v => {
				base = parseFloat(v.target.value)
				set()
			},
		}),
	)
}

const e_formPrice = _inputBase(_priceInput)
const e_formPriceOpt = _inputBaseOpt(_priceInput)

const _onInput = ({unique, text}) => {
	return lc.p({class: 'bool', id: unique}, text)
}

const e_bool = _inputBaseOpt(_onInput)

const _flipInput = ({unique, initialValue, set, offText, onText}) => {
	const uniqueOn = (_label_unique++).toString()
	const uniqueOff = (_label_unique++).toString()
	let fields = [
		lc.input({
			id: uniqueOn,
			name: unique,
			type: 'radio',
			value: 'on',
			checked: initialValue ? 'checked' : undefined,
			onchange: v => { if (v.target.value == 'on') set(true) },
		}),
		lc.label({for: uniqueOn}, onText),
		lc.input({
			id: uniqueOff,
			name: unique,
			type: 'radio',
			value: 'off',
			checked: !initialValue ? 'checked' : undefined,
			onchange: v => { if (v.target.value == 'off') set(true) },
		}),
		lc.label({for: uniqueOff}, offText),
	]
	return lc.div({class: 'fieldset'}, ...fields)
}

const e_formFlip = _inputBase(_flipInput)

const _listInput = ({unique, initialValue, set, options}) => {
	return lc.select(
		{
			id: unique,
			onchange: v => {
				set(v.target.value)
			},
		},
		...Array.from(options).map(([k, v], _) => lc.option(
			{
				value: k,
				selected: k === initialValue ? true : undefined,
			},
			...v
		))
	)
}

const e_formList = _inputBase(_listInput)
//const e_formListOpt = _inputBaseOpt(_listInput)

const e_submits = (...elements) => {
	return {
		dom: [lc.div({class: 'submits'}, ...toDom(...elements))],
	}
}

const e_button = (id, text, callback) => {
	let running = false
	return {
		dom: [lc.button({
			id: 'button_' + id,
			type: 'submit',
			onclick: () => {
				if (running) return
				running = true
				try {
					safe(callback)
				} finally {
					running = false
				}
			},
		}, lc.div(lc.span(text)))],
	}
}

const e_buttonDownload = (id, text, name, data) => {
	return {
		dom: [lc.a({
			id: 'button_' + id,
			class: 'button',
			download: name,
			href: URL.createObjectURL(new Blob([data])),
		}, lc.div(lc.span(text)))],
	}
}

const e_title = (text) => {
	const h = lc.h3({class: 'apptitle'}, lc.span(text))
	return {
		dom: [h],
		set: text => {
			clearElement(h)
			h.appendChild(lct(text))
		},
	}
}

const e_pages = (...elements) => {
	return {
		dom: [lc.div({class: 'pages'}, ...toDom(...elements))],
	}
}

const e_blankAddress = (text) => {
	return {
		dom: [lc.div({class: 'blank-address'},
			lc.div(
				lc.img({src: 'check.svg'}),
				text,
			),
		)],
	}
}

const e_address = (address, type) => {
	let qr = new qrcode(0, 'H')
	qr.addData(address)
	qr.make()
	const low = {
		micro: [119 / 255 * 360, 92 / 255 * 100, 114 / 255 * 100],
		//base: [35 / 255 * 360, 211 / 255 * 100, 106 / 255 * 100],
		base: [239 / 255 * 360, 0 / 255 * 100, 106 / 255 * 100],
	}[type]
	const high = {
		micro: [152 / 255 * 360, 79 / 255 * 100, 70 / 255 * 100],
		base: [206 / 255 * 360, 120 / 255 * 100, 8 / 255 * 100],
	}[type]
	const obstruction = {
		width: 0.25,
		height: 0.25,
	}
	if (type == 'micro') obstruction.svgData = qrMicro
	else if (type == 'base') obstruction.path = 'qr_' + baseCurrency + '.svg'
	const svg_data = qr.createSvgTag({
		margin: 0,
		cellColor: (c, r) => {
			const modcount = qr.getModuleCount()
			const interp = (Math.pow(c - modcount / 2, 2) + Math.pow(r - modcount / 2, 2)) / Math.pow(modcount, 2)
			return 'hsl(' + 
				(low[0] + (high[0] - low[0]) * interp).toString() + ', ' +
				(low[1] + (high[1] - low[1]) * interp).toString() + '%, ' +
				(low[2] + (high[2] - low[2]) * interp).toString() + '%'+
			')'
		},
		obstruction: obstruction,
	})
	const text = lc.input({type: 'text', value: address, readonly: ''})
	const copy = lc.input({type: 'submit'}, 'Copy')
	let base = lc.div({class: 'address'},
		lc.a({target: '_blank', href: address},
			lc.img({src: 'data:image/svg+xml;utf-8,' + svg_data, alt:'Scan to pay with micromicro!'})),
		lc.div(text, copy),
	)
	copy.onclick = () => {
		text.select()
		document.execCommand('copy')
	}
	return {
		dom: [base],
		setText: value => {
			mountReady(base, {dom: [lct(String(value))]})
		},
	}
}

const e_subform = (...elements) => {
	const toggle = lc.img({src: 'help.svg', class:'help'})
	const form = lc.div({class: 'subform'}, ...toDom(...elements))
	let value = false
	toggle.onclick = () => {
		value = !value
		if (value) {
			form.classList.add('show_help')
		} else {
			form.classList.remove('show_help')
		}
	}
	return {
		dom: [toggle, form],
	}
}

const e_formBar = () => {
	return {
		dom: [lc.div({class: 'bar'})],
	}
}

const e_scan = cb => {
	const base = lc.div({class: 'scan'})
	atRefresh(async () => {
		let key
		try {
			key = await qrscan.start({
				mount: base,
				scannedCallback: cb,
			})
		} catch (e) {
			if (e.name === 'DevicesNotFoundError')
				throw new Error('No cameras found.')
			throw e
		}
		cleanup.push(() => {
			qrscan.stop(key)
		})
	})
	return {
		dom: [base],
	}
}

const e_text = (text) => {
	const set = value => {
		if (value === null) {
			value = ''
		}
		mountReady(base, {dom: [lct(String(value))]})
	}
	let base = lc.p()
	set(text)
	return {
		dom: [base],
		set: set,
	}
}

const e_message = (text) => {
	const set = value => {
		if (value === null) {
			value = ''
		}
		mountReady(base, {dom: [lct(uon(value) ? '' : String(value))]})
	}
	let base = lc.div({class: 'message'})
	set(text)
	return {
		dom: [base],
		set: set,
	}
}

const e_price = (value) => {
	const set = value => {
		mountReady(base, {dom: [...format_price(config.currency, config.rates, value)]})
	}
	let base = lc.div({class: 'price'})
	set(value)
	return {
		dom: [base],
		set: set,
	}
}

const e_tabs = (...tabs) => {
	return {
		dom: [
			lc.div({class: 'tabs'},
				...toDom(...tabs),
			),
		],
	}
}

const e_pager = ({fetch, format, actions}) => {
	const table = lc.div({class: 'table'})
	let fetching = false
	let index = 1
	const rows = []
	const rezebra = () => {
		for (let i = 0; i < rows.length; ++i) {
			const row = rows[i]
			if (i % 2 == 0) {
				row.forEach(e => e.classList.remove('zebra'))
			} else {
				row.forEach(e => e.classList.add('zebra'))
			}
		}
	}
	const pull = () => {
		const rect = table.getBoundingClientRect()
		if (rect.bottom >= document.documentElement.clientHeight * 1.2)
			return
		if (fetching) return
		safe(async () => {
			fetching = true
			try {
				let found = await fetch()
				if (found.length === 0) {
					return
				}
				for (let i of found) {
					i.index = index++
					let compact = true
					const rowcontents = format(i)
					const actions2 = actions(
						i,
						() => {
							rowcontents.forEach(e => {
								e.style.display = 'none'
								table.removeChild(e)
							})
							rows.splice(rows.indexOf(rowcontents), 1)
							rezebra()
						}
					)
					if (actions2.length > 0) {
						rowcontents.push(lc.div({class: 'actions'}, ...toDom(...actions2)))
					}
					rows.push(rowcontents)
					rowcontents.forEach(e => {
						table.appendChild(e)
						e.classList.remove('uncompact')
						e.classList.add('compact')
						e.onclick = () => {
							compact = !compact
							rowcontents.forEach(e => {
								if (compact) {
									e.classList.remove('uncompact')
									e.classList.add('compact')
								} else {
									e.classList.add('uncompact')
									e.classList.remove('compact')
								}
							})
						}
					})
				}
				atRefresh(pull)
				rezebra()
			} finally {
				fetching = false
			}
		})
	}
	pull()
	window.onscroll = pull
	return {
		dom: [table],
	}
}


////////////////////////////////////////////////////////////////////////////////
// Page logic

let refreshAccountInterval = null
let lastRefresh = 0
let lastRatesRefresh = 0


const refreshAccount = () => {
	const now = new Date().getTime()
	if ((now - lastRefresh) < 1000 * 60) return
	forceRefreshAccount()
}


const refreshRates = async () => {
	const now = new Date().getTime()
	if ((now - lastRefresh) < 1000 * 60) return
	if ((now - lastRatesRefresh) < 1000 * 60) return
	lastRatesRefresh = now
	setConfig({
		rates: await myGet(basePath + 'rates'),
	})
}


const forceRefreshAccount = async () => {
	lastRefresh = new Date().getTime()
	// Note: this will get canceled if the page changes
	setConfig({
		account: await myPost(basePath + 'account',
			{
				username: config.username,
				token: config.token,
			},
		),
		rates: await myGet(basePath + 'rates'),
	})
}


if (!uon(config.token)) {
	refreshAccountInterval = setInterval(refreshAccount, 5 * 60 * 1000)
}


route(/^tos(?:\?next=(.*))?$/, (_, next) => {
	const textMount = e_mount()
	const acceptMount = e_mount()
	mountRoot(e_outer(
		e_body(
			e_logo(),
			e_errors(),
			{dom: [lc.h1('Terms of Service')]},
			textMount,
		),
		e_foot(
			acceptMount,
		),
	))
	safe(async () => {
		textMount.dom[0].innerHTML = await myGetText('tos.html')
		mountReady(acceptMount.dom[0], e_submits(
			e_button('accept', 'I Agree', async () => {
				config.all_tos[config.username] = currentTos
				setConfig({tos: currentTos, all_tos: config.all_tos})
				if (uon(next)) go('')
				else go(next)
			}),
		))
	})
})


const finishLogin = async (username, account, next) => {
	lastRefresh = new Date().getTime()
	refreshAccountInterval = setInterval(refreshAccount, 5 * 60 * 1000)
	setConfig({
		username: username,
		token: account.token,
		account: account,
		rates: await myGet(basePath + 'rates'),
		tos: config.all_tos[username],
	})
	if (uon(next)) go('')
	else go(next)
}


route(/^login(?:\?next=(.*))?$/, (_, next) => {
	let username = e_formText({
		text: 'User',
		initialValue: config.username, code: true, focus: true,
		help: 'The username you used when creating an account, or a new username if you\'re creating an account',
	})
	let password = e_formPass({
		text: 'Pass',
		help: 'Your account password, or a new password if you\'re creating an account',
	})
	mountRoot(e_outer(
		e_body(
			e_logo(),
			e_errors(),
			e_subform(
				username,
				e_formBar(),
				password,
			),
		),
		e_foot(
			e_submits(
				e_button('account_login', 'Login', async () => {
					await finishLogin(
						username.value,
						await myPost(basePath + 'account',
							{
								username: username.value,
								password: password.value,
							},
						),
						next,
					)
				}),
				e_button('account_new', 'New Account', async () => {
					let newpath = 'login/confirm'
					if (!uon(next)) newpath = newpath + '?next=' + next
					if (uon(username.value) || username.value.length == 0 || uon(password.value) || password.value.length == 0) {
						throw new Error('You must enter a new username and password')
					}
					go(newpath, username.value, password.value)
				}),
			),
		),
	))
})


route(/^login\/confirm(?:\?next=(.*))?$/, (_, next, username, password) => {
	if (uon(username) || uon(password)) {
		go('login?next=' + next)
	}
	let loginpath = 'login'
	if (!uon(next)) loginpath = loginpath + '?next=' + next
	if (uon(username) || uon(password)) go(loginpath)
	let password2 = e_formPass({text: 'Confirm Pass', focus: true})
	mountRoot(e_outer(
		e_body(
			e_logo(),
			e_errors(),
			e_subform(
				password2,
			),
		),
		e_foot(
			e_submits(
				e_button('account_new', 'Create Account', async () => {
					if (password !== password2.value)
						throw new Error('Passwords don\'t match')
					await finishLogin(
						username,
						await myPost(basePath + 'new_account',
							{
								username: username,
								password: password,
							},
						),
						next,
					)
				}),
				e_button('cancel', 'Cancel', async () => {
					go(loginpath)
				}),
			),
		),
	))
})


const goRoute = (pattern, cb) => {
	authRoute(pattern, (...args) => {
		mountRoot(e_authbody({
			back: true,
			tabs: new Map([
				['go/scan', 'Scan'],
				['go/paste', 'Paste'],
			]),
			elements: cb(...args),
		}))
	})
}


const processAddress = value => {
	if (value.startsWith('https://')) {
		const url = new URL(window.location.href)
		const valueUrl = new URL(value)
		if (valueUrl.origin != url.origin)
			throw new Error('Invalid address')
		go(valueUrl.hash.slice(1))
	} else {
		go('withdraw/' + value)
	}
}


goRoute(/^go\/scan$/, (_) => [
	e_scan(processAddress),
])


goRoute(/^go\/paste/, (_) => {
	const address = e_formText({
		text: 'Address',
		focus: true,
		help: 'A micromicro or Litecoin address',
	})
	return [
		e_body(
			e_subform(
				address
			)
		),
		e_foot(e_submits(
			e_button('go', 'Go', async () => {
				processAddress(address.value)
			})
		)),
	]
})


authRoute(/^in$/, (_) => {
	let slow = e_formFlip({
		text: 'Fast',
		initialValue: false,
		help: 'Tally the transaction immediately. Fees are slightly higher.',
		offText: 'Fast',
		onText: 'Slow',
	})
	let amount = e_formPriceOpt({
		text: 'Amount',
		initialValue: null,
		help: 'The sender must send exactly this amount in the transaction.',
	})
	let receiver_message = e_formTextAreaOpt({
		text: 'Personal memo',
		initialValue: null,
		help: 'This message will only be shown to you.',
	})
	let sender_message = e_formTextAreaOpt({
		text: 'Display message',
		initialValue: null,
		help: 'This note is presented to the sender before paying.',
	})
	let expire = e_formDurationOpt({
		text: 'Expire',
		initialValue: null,
		help: 'Prevent further payments after a time.',
	})
	let once = e_bool({
		text: 'One-time',
		initialValue: false,
		help: 'Delete after one transaction',
		blankValue: false,
	})
	mountRoot(e_authbody({back: true, elements: [
		e_body(e_subform(
			slow,
			e_formBar(),
			amount,
			e_formBar(),
			receiver_message,
			e_formBar(),
			sender_message,
			e_formBar(),
			expire,
			e_formBar(),
			once,
		)),
		e_foot(
			e_submits(
				e_button('receive', 'Receive', async () => {
					let request = {
						tos: config.tos,
						username: config.username,
						token: config.token,
						amount: amount.value,
						receiver_message: receiver_message.value === null ? '' : receiver_message.value,
						sender_message: sender_message.value === null ? '' : sender_message.value,
						slow: slow.value,
						expire: expire.value,
						single_use: once.value,
					}
					let response = await myPost(basePath + 'new_in', request)
					go('in/' + response.id, response)
				})
			),
		),
	]}))
})


route(/^in\/(............)$/, (path, id, preppedInOut) => {
	const addressUrl = qualifyPath('/app/#in/' + id)
	const address = e_address(addressUrl, 'micro')
	const detailsMount = e_mount(e_text('Loading...'))
	const set = inout => {
		let elements = []
		if (uon(config.token) || uon(inout.dest)) {
			elements.push(e_title('Send'))
			let subform = []
			if (uon(config.token)) {
				if (!uon(inout.amount)) {
					elements.push(e_price(inout.amount))
				}
				elements.push(e_message(inout.sender_message))
			} else {
				inout.type = 'i'
				addSeenHistory(inout)
				let getAmount
				if (uon(inout.amount)) {
					const amount = e_formPrice({
						text: 'Amount',
						initialValue: 0,
					})
					subform.push(amount)
					subform.push(e_formBar())
					getAmount = () => amount.value
				} else {
					elements.push(e_price(inout.amount))
					getAmount = () => inout.amount
				}
				const message = e_formTextArea({
					text: 'Personal message',
					initialValue: inout.sender_message,
					hint: 'A note for your records',
					help: 'A note for your records',
				})
				subform.push(message)
				elements.push(e_subform(...subform))
				elements.push(e_submits(
					e_button('send', 'Send', async () => {
						const amount = getAmount()
						const transaction = await myPost(basePath + 'send', {
							tos: config.tos,
							username: config.username,
							token: config.token,
							dest: id,
							amount: parseInt(amount),
							sender_message: message.value,
						})
						config.account.balance -= amount
						setConfig({account: config.account})
						go('success/sent', inout, getAmount(), transaction)
					}),
				))
			}
		} else {
			elements.push(e_title('Receive'))
			elements.push({dom: [lc.p('Use ', lc.strong('Scan'), ' to send money to this address.')]})
			if (!uon(inout.amount)) {
				elements.push(e_price(inout.amount))
			}
			elements.push(e_message(inout.sender_message))
		}
		mountReadyTagged({tags: ['details'], mount: detailsMount.dom[0], elements: elements})
	}
	if (uon(config.token) || uon(preppedInOut)) {
		safe(async () => {
			let inout
			if (uon(config.token)) {
				refreshRates()
				inout = await myGet(basePath + 'in?id=' + id)
			} else {
				inout = await myPost(basePath + 'in', {
					id: id,
					username: config.username,
					token: config.token,
				})
			}
			set(inout)
		})
	} else {
		atRefresh(() => set(preppedInOut))
	}
	if (uon(config.token)) {
		mountRoot(e_noauthbody(
			path,
			[address, detailsMount],
			[],
		))
	} else {
		mountRoot(e_authbody({back: true, elements: [
			e_body(
				address,
				detailsMount,
			),
		]}))
	}
})


const showSuccess = (blank, title, id, transaction) => {
	const detailsMount = e_mount(e_text('Loading...'))
	const buttonsMount = e_mount()
	const set = transaction => {
		let elements = []
		elements.push(e_price(transaction.amount))
		let message
		if (!uon(transaction.receiver_message)) {
			message = transaction.receiver_message
		} else {
			message = transaction.sender_message
		}
		elements.push(e_message(message))
		detailsMount.dom[0].replaceWith(...toDom(...elements))
		buttonsMount.dom[0].replaceWith(...toDom(e_submits(
			e_buttonDownload(
				'download',
				'Download',
				(
					'micromicro - ' +
					new Date(transaction.stamp).toLocaleDateString() +
					' - ' +
					message.replace(/[^ a-zA-Z0-9_=.-]/g, '_') +
					'.json'
				),
				JSON.stringify(transaction)
			),
		)))
	}
	if (uon(transaction)) {
		safe(async () => {
			const transaction = await myPost(basePath + 'transaction', {
				id: id,
				tos: config.tos,
				username: config.username,
				token: config.token,
			})
			set(transaction)
		})
	} else {
		atRefresh(() => set(transaction))
	}
	mountRoot(e_authbody({back: true, elements: [
		e_body(
			e_blankAddress(blank),
			e_title(title),
		),
		e_foot(
			buttonsMount,
		),
	]}))
}


authRoute(/^success\/sent\/(.+)$/, (_, id, transaction) => {
	showSuccess('Sent', 'Send', id, transaction)
})


authRoute(/^out$/, (_) => {
	const amount = e_formPrice({
		text: 'Amount',
		initialValue: null,
		help: 'The sender must send exactly this amount in the transaction.',
	})
	const receiver_message = e_formTextAreaOpt({
		text: 'Display message',
		initialValue: null,
		help: 'This note is presented to the receiver before accepting.',
	})
	const sender_message = e_formTextAreaOpt({
		text: 'Personal memo',
		initialValue: null,
		help: 'This message will only be shown to you.',
	})
	const expire = e_formDurationOpt({
		text: 'Expire',
		initialValue: null,
		help: 'Prevent further payments after a time.',
	})
	const password = e_formPassOpt({
		text: 'Pass',
		help: 'The receiver must enter this password to receive the money.',
	})
	mountRoot(e_authbody({back: true, elements: [
		e_body(e_subform(
			amount,
			e_formBar(),
			receiver_message,
			e_formBar(),
			sender_message,
			e_formBar(),
			expire,
			e_formBar(),
			password,
		)),
		e_foot(
			e_submits(
				e_button('offer', 'Offer', async () => {
					let request = {
						tos: config.tos,
						username: config.username,
						token: config.token,
						amount: amount.value,
						receiver_message: receiver_message.value === null ? '' : receiver_message.value,
						sender_message: sender_message.value === null ? '' : sender_message.value,
						expire: expire.value,
						out_password: password.value,
					}
					let response = await myPost(basePath + 'new_out', request)
					config.account.balance -= amount.value
					setConfig({account: config.account})
					go('out/' + response.id, response)
				})
			),
		),
	]}))
})


authRoute(/^out\/(............)$/, (path, id, preppedInOut) => {
	const addressUrl = qualifyPath('/app/#out/' + id)
	const address = e_address(addressUrl, 'micro')
	const detailsMount = e_mount(e_text('Loading...'))
	const set = inout => {
		let elements = []
		if (uon(config.token) || uon(inout.source)) {
			elements.push(e_title('Receive'))
			elements.push(e_price(inout.amount))
			if (uon(config.token)) {
				elements.push(e_message(inout.receiver_message))
			} else {
				inout.type = 'o'
				addSeenHistory(inout)
				let slow = e_formFlip({
					text: 'Fast',
					initialValue: false,
					help: 'Apply the amount to your balance immediately. Fees are slightly higher.',
					offText: 'Fast',
					onText: 'Slow',
				})
				const message = e_formTextArea({
					text: 'Personal message',
					initialValue: inout.receiver_message,
					hint: 'A note for your records',
					help: 'A note for your records',
				})
				const password = e_formPassOpt({
					text: 'Pass',
					help: 'If this out is password protected, enter the password here.',
				})
				elements.push(e_subform(
					slow,
					e_formBar(),
					message,
					e_formBar(),
					password,
				))
				elements.push(e_submits(
					e_button('receive', 'Accept', async () => {
						const transaction = await myPost(basePath + 'receive', {
							tos: config.tos,
							username: config.username,
							token: config.token,
							source: id,
							slow: slow.value,
							receiver_message: message.value,
							source_password: password.value,
						})
						if (!slow.value) {
							config.account.balance += inout.amount
							setConfig({account: config.account})
						}
						go('success/received/' + transaction.id, transaction)
					}),
				))
			}
		} else {
			elements.push(e_title('Offer'))
			elements.push({dom: [lc.p('Use ', lc.strong('Scan'), ' to receive this offer.')]})
			elements.push(e_price(inout.amount))
			elements.push(e_message(inout.sender_message))
			elements.push(e_submits(
				e_button('delete', 'Delete', async () => {
					await myPost(basePath + 'delete_out', {
						tos: config.tos,
						username: config.username,
						token: config.token,
						id: id,
					})
					go('')
				}),
			))
		}
		mountReadyTagged({
			tags: ['details'],
			mount: detailsMount.dom[0],
			elements: elements,
		})
	}
	if (uon(config.token) || preppedInOut === undefined) {
		safe(async () => {
			let inout
			if (uon(config.token)) {
				refreshRates()
				inout = await myGet(basePath + 'out?id=' + id)
			} else {
				inout = await myPost(basePath + 'out', {
					id: id,
					username: config.username,
					token: config.token,
				})
			}
			set(inout)
		})
	} else {
		atRefresh(() => set(preppedInOut))
	}
	if (uon(config.token)) {
		mountRoot(e_noauthbody(
			path,
			[address, detailsMount],
			[],
		))
	} else {
		mountRoot(e_authbody({back: true, elements: [
			e_body(
				address,
				detailsMount,
			),
		]}))
	}
})


authRoute(/^success\/received\/(.+)$/, (_, id, transaction) => {
	showSuccess('Received', 'Receive', id, transaction)
})


authRoute(/^withdraw\/(.*)$/, (_, address) => {
	const amount = e_formPrice({
		text: 'Amount',
		initialValue: 0,
	})
	mountRoot(e_authbody({back: true, elements: [
		e_body(
			e_address(address, 'base'),
			e_title('Withdraw'),
			e_subform(
				amount,
			),
			e_submits(
				e_button('withdraw', 'Withdraw', async () => {
					await myPost(basePath + 'withdraw', {
						tos: config.tos,
						username: config.username,
						token: config.token,
						address: address,
						amount: Math.floor(amount.value / 100),
					})
					config.account.balance -= amount.value
					setConfig({account: config.account})
					go('')
				}),
			),
		),
	]}))
})


authRoute(/^deposit$/, (_) => {
	const subbody = e_mount(e_text('Loading...'))
	const set = deposit => {
		mountReady(
			subbody.dom[0],
			e_address(deposit.address, 'base'),
		)
	}
	safe(async () => {
		const deposit = await myPost(basePath + 'deposit', {
			tos: config.tos,
			username: config.username,
			token: config.token,
		})
		set(deposit)
	})
	mountRoot(e_authbody({back: true, elements: [
		e_body(
			subbody,
			e_title('Deposit'),
			e_text('Send the litecoin you wish to deposit to the above address within 24h. Leave and return to this page to get a new address.'),
		),
	]}))
})


const listRoute = (pattern, cb) => {
	authRoute(pattern, (...args) => {
		mountRoot(e_authbody({
			back: true,
			tabs: new Map([
				['list/ins', 'Ins'],
				['list/outs', 'Outs'],
				['list/scan', 'Scan'],
				['list/activity', 'Events'],
			]),
			elements: cb(...args),
		}))
	})
}


listRoute(/^list\/ins$/, (_) => {
	const count = 50
	let last = null
	return [
		e_pager({
			fetch: async () => {
				const found = (await myPost(basePath + 'ins', {
					tos: config.tos,
					username: config.username,
					token: config.token,
					start_edge: last,
					count: count,
				})).responses
				if (found.length > 0)
					last = found[found.length - 1].id
				return found
			},
			format: i => [
				lc.span({class: 'col1'}, String(i.index) + '.'),
				lc.span({class: 'col2'}, 
					...(
						uon(i.amount) ? [] : toDom(e_price(i.amount))
					),
				),
				lc.span({class: 'col3'},
					uonoe(i.receiver_message) ?
						lc.span({class: 'hint'}, 'No message') :
						i.receiver_message,
				),
				lc.span({class: 'col-details'},
					...(
						uon(i.expire) ?
							[] : 
							[lc.span({class: 'expires'}, 'Expires ' + moment(i.expire).format('LLL'))]
					),
				),
			],
			actions: (i, deleteRow) => [
				e_button('open', 'Open', async () => {
					go('in/' + String(i.id))
				}),
				e_button('delete', 'Delete', async () => {
					await myPost(basePath + 'delete_in', {
						tos: config.tos,
						username: config.username,
						token: config.token,
						id: i.id,
					})
					deleteRow()
				}),
			],
		}),
	]
})


listRoute(/^list\/outs$/, (_) => {
	const count = 50
	let last = null
	return [
		e_pager({
			fetch: async () => {
				const found = (await myPost(basePath + 'outs', {
					tos: config.tos,
					username: config.username,
					token: config.token,
					start_edge: last,
					count: count,
				})).responses
				if (found.length > 0)
					last = found[found.length - 1].id
				return found
			},
			format: i => [
				lc.span({class: 'col1'}, String(i.index) + '.'),
				lc.span({class: 'col2'}, 
					...toDom(e_price(i.amount)),
				),
				lc.span({class: 'col3'},
					uonoe(i.sender_message) ?
						lc.span({class: 'hint'}, 'No message') :
						i.sender_message,
				),
				lc.span({class: 'col-details'},
					...(
						uon(i.expire) ?
							[] : 
							lc.span({class: 'expires'}, 'Expires ' + moment(i.expire).format('LLL'))
					),
				),
			],
			actions: (i, deleteRow) => [
				e_button('open', 'Open', async () => {
					go('out/' + String(i.id))
				}),
				e_button('delete', 'Delete', async () => {
					await myPost(basePath + 'delete_out', {
						tos: config.tos,
						username: config.username,
						token: config.token,
						id: i.id,
					})
					deleteRow()
				}),
			],
		}),
	]
})


listRoute(/^list\/scan$/, (_) => {
	const count = 50
	let last = 0
	return [
		e_pager({
			fetch: async () => {
				let found = config.scanHistory.slice(
					last, last + count
				)
				last += found.length
				return found
			},
			format: i => {
				const elements = []
				elements.push(lc.span({class: 'col1'}))
				if (i.type == 'i') {
					elements.push(lc.span({class: 'col2'}, '⬅'))
				} else {
					elements.push(lc.span({class: 'col2'}, '➡'))
				}
				let message = i.receiver_message
				if (uon(message)) message = i.sender_message
				if (uonoe(message)) message = lc.span({class: 'hint'}, 'No message')
				elements.push(lc.span({class: 'col3'}, message))
				return elements
			},
			actions: (i, _) => [
				e_button('open', 'Open', async () => {
					go((i.type == 'i' ? 'in/' : 'out/') + String(i.id))
				}),
			].filter(x => !uon(x)),
		}),
	]
})


listRoute(/^list\/activity$/, (_) => {
	const count = 50
	class Pager {
		constructor(path, type) {
			this.path = path
			this.type = type
			this.last = null
			this.last_stamp = null
			this.next = null
			this.iterator = null
			this.next_id = (self) => self.next.id
		}

		page() {
			return myPost(basePath + this.path, {
				tos: config.tos,
				username: config.username,
				token: config.token,
				start_edge: this.last,
				stamp: this.last_stamp,
				count: count,
			})
		}
	}
	const pagers = [
		new Pager('transactions', 't'),
		new Pager('deposits', 'd'),
		new Pager('withdrawals', 'w'),
	]
	const mount = e_mount()
	safe(async () => {
		const handleResponse = async (p, f) => {
			const responses = (await f).responses
			if (responses.length == 0) return
			responses.sort((a, b) => b.stamp - a.stamp)
			p.iterator = responses[Symbol.iterator]()
		}
		const promises = pagers.map(p => [p, p.page()])
		for (let [p, f] of promises) {
			await handleResponse(p, f)
		}
		mountReady(mount.dom[0], e_pager({
			fetch: async () => {
				const out = []
				const fetched = new Set() 
				while (out.length < count && pagers.some(e => e.next !== null || e.iterator !== null)) {
					const promises = new Map()

					// Fetch the next value if it was used last iteration
					// Fetch any new pages if the iterators ran out
					const fetchNext = p => {
						const val = p.iterator.next()
						if (val.done) {
							p.iterator = null
						} else {
							p.next = val.value
							p.last = p.next_id(p)
							p.last_stamp = p.next.stamp
						}
					}

					for (let p of pagers) {
						if (p.iterator !== null && p.next === null) {
							fetchNext(p)
						}
						if (p.iterator !== null || fetched.has(p)) continue
						promises.set(p, await p.page())
						fetched.add(p)
					}
					for (let [p, f] of promises)
						await handleResponse(p, f)
					
					// Fetch next values for iterators refreshed above
					for (let p of pagers) {
						if (p.iterator === null || p.next !== null)
							continue
						fetchNext(p)
					}

					// Take the roughly next newest value
					let best = null
					let bestIndex = null
					for (let i = 0; i < pagers.length; ++i) {
						const pager = pagers[i]
						if (pager.next === null) continue
						const stamp = pager.next.stamp
						if (best !== null && stamp < best) continue
						best = stamp
						bestIndex = i
					}
					if (best !== null) {
						const pager = pagers[bestIndex]
						pager.next.type = pager.type
						out.push(pager.next)
						pager.next = null
					}
				}
				return out
			},
			format: i => {
				const summary = [
				]
				if (i.type === 't') {
					if (!uon(i.source))
						summary.push(lc.span({class: 'dec'}, '⬅'))
				} else {
					if (i.type == 'w') {
						summary.push(lc.span({class: 'dec'}, 'Withdraw'))
					} else {
						summary.push(lc.span({class: 'inc'}, 'Deposit'))
					}
				}
				summary.push(lc.span({class: 'amount'}, ...toDom(e_price(i.amount))))
				if (i.type === 't' && !uon(i.dest)) {
					summary.push(lc.span({class: 'inc'}, '➡'))
				}
				let description
				if (i.type !== 't') {
					description = 'Tx: ' + i.id
				} else {
					if (!uon(i.source))
						description = i.sender_message
					else
						description = i.receiver_message
				}
				return [
					lc.span({class: 'col1'}, moment(i.stamp).fromNow()),
					lc.span({class: 'col2'}, ...summary),
					lc.span({class: 'col3'}, description),
				]
			},
			actions: (_, _2) => [],
		}))
	})
	return [mount]
})


authRoute(/^settings$/, (_) => {
	const currency = e_formList({
		text: 'Display Currency',
		initialValue: config.currency,
		options: new Map(Array.from(currencyInfo).map(([k, v], _) => [k, v.label()])),
	})
	const webhook = e_formTextOpt({
		text: 'Webhook',
		initialValue: config.account.webhook,
		help: 'Send transactions to this URL via HTTP POST.',
	})
	const password = e_formPass({
		text: 'New Pass',
		help: 'Change the password for your account. You must also confirm the new password. Leave empty to keep your current password.',
	})
	const passwordConfirm = e_formPass({
		text: 'Confirm Pass',
		help: 'If you\'re changing your password, enter it again here.',
	})
	const submits = []
	if (!uon(config.account.webhook))
		submits.push(e_button('test_webhook', 'Test Webhook', async () => {
			await myPost(basePath + 'test_webhook', {
				tos: config.tos,
				username: config.username,
				token: config.token,
			})
			mount('messages', {dom: [document.createTextNode('Webhook success')]})
			window.scrollTo(0, 0)
		}))
	submits.push(e_button('save', 'Save', async () => {
		setConfig({currency: currency.value})
		if (webhook.value !== config.account.webhook) {
			await myPost(basePath + 'change_account', {
				tos: config.tos,
				username: config.username,
				token: config.token,
				webhook: webhook.value,
			})
			const account = config.account
			account.webhook = webhook.value
			setConfig({
				account: account,
			})
			go('')
		}
		if (!uon(password.value) && password.value !== '') {
			if (password.value != passwordConfirm.value)
				throw new Error('Passwords don\'t match')
			const resp = await myPost(basePath + 'set_password', {
				tos: config.tos,
				username: config.username,
				token: config.token,
				new_password: password.value,
			})
			setConfig({
				account: resp,
				token: resp.token,
			})
		}
		go('')
	}))
	mountRoot(e_authbody({back: true, elements: [
		e_body(
			e_subform(
				currency,
				e_formBar(),
				webhook,
				e_formBar(),
				password,
				e_formBar(),
				passwordConfirm,
			),
			{dom: [lc.a({href: '/tos.html'}, 'Read the Terms of Service')]},
			{dom: [lc.a({href: 'https://www.reddit.com/r/micromicro'}, 'Get help')]},
		),
		e_foot(
			e_submits(...submits),
		),
	]}))
})


authRoute(/^$/, (_) => {
	mountRoot(e_authbody({back: false, elements: [
		e_body(
			{dom: [lc.div({class: 'artframe'}, lc.img({
				alt: 'Fine art',
				src: '/app/smallart' + (Math.floor(Math.random() * 3) + 1) + '.svg',
			}))]}
		),
		e_foot(
			e_pages(
				e_button('scan', 'Scan', async () => go('go/scan')),
				e_button('receive', 'New (In)', async () => go('in')),
				e_button('presend', 'New (Out)', async () => go('out')),
				e_button('deposit', 'Deposit', async () => go('deposit')),
				e_button('list', 'List', async () => go('list/ins')),
				e_button('refresh', 'Refresh', async () => {
					await forceRefreshAccount()
					go('')
				}),
				e_button('settings', 'Settings', async () => go('settings')),
				e_button('logout', 'Logout', async () => {
					if (refreshAccountInterval !== null) {
						clearInterval(refreshAccountInterval)
						refreshAccountInterval = null
					}
					setConfig({
						token: null,
						account: null,
						tos: null,
					})
					go('login')
				}),
				{ dom: [lc.div({class: 'gap'}, ' ')] },
			),
		),
	]}))
})


go(window.location.hash.slice(1))
