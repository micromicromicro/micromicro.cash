import lc from 'laconic-es6'
import moment from 'moment'
import {
	uon, mount, myGet, format_price_nosym,
	format_decimal,
	currencyInfo,
	baseCurrency,
	basePath,
} from './_shared.js'
import Big from 'big.js'

(async () => {
	const ratesP = myGet(basePath + 'rates')
	const pricesP = myGet(basePath + 'prices')
	const rates = await ratesP
	const prices = await pricesP
	const currencies = ['usd', 'eur', 'jpy', 'ltc']
	const rows = []
	const baseCurrencyInfo = currencyInfo.get(baseCurrency)
	const format_base = value => [
		...baseCurrencyInfo.sym(),
		format_decimal(value.div(Math.pow(10, baseCurrencyInfo.majorPlaces))),
	]

	// Convert row (1)
	{
		let row = [lc.td('Convert')]
		for (let currency of currencies) {
			const rate = rates[currency]
			if (uon(rate)) row.push(null)
			else row.push(lc.td({class: currency},
				...format_base(new Big(rate).times(Math.pow(10, currencyInfo.get(currency).majorPlaces)))))
		}
		rows.push(row)
	}

	// Rate rows (2+)
	Object.keys(prices.prices).forEach(k => {
		const row = [lc.td({
			account: 'Account',
			create_in: 'Receive Addr.',
			slow_transaction: 'Receive slow',
			fast_transaction: 'Receive fast',
		}[k])]
		const price = prices.prices[k]
		for (let currency of currencies) {
			const rate = rates[currency]
			row.push(lc.td({class: currency},
				...(uon(rate) ?
					format_base(new Big(price)) :
					[
						...currencyInfo.get(currency).sym(),
						format_price_nosym(currency, rates, price) + '*',
					]
				)
			))
		}
		rows.push(row)
	})

	const table = lc.table(
		...rows.map(v => lc.tr(...v)),
	)
	const currency_els = []
	const e_currency = cur => {
		const el = lc.div(cur.toUpperCase())
		el.onclick = () => {
			currency_els.forEach(el2 => {
				if (el2 == el) el2.classList.add('selected')
				else el2.classList.remove('selected')
			})
			currencies.forEach(cur2 => {
				if (cur2 == cur) table.classList.add(cur2)
				else table.classList.remove(cur2)
			})
		}
		currency_els.push(el)
		if (currency_els.length == 1) el.onclick()
		return el
	}
	mount('prices', {dom:[
		lc.div({class: 'priceheader'},
			lc.h1('Rates'),
			lc.div({class: 'priceselect'}, ...currencies.map(cur => e_currency(cur))),
		),
		table,
		lc.span('* Estimate based on current exchange rates. Conversion rates as of ' + moment(rates.stamp).format('LLL') + '. Fees as of ' + moment(prices.stamp).format('LLL')),
	]})
})()
