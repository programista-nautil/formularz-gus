const { google } = require('googleapis')
const { authorize } = require('./googleAuth')

const SHEET_ID = '1ttdyySavO0xv94NQ_7phpT0csOJHY8_9qlJ5fU3noCs'

async function appendToGoogleSheet(architecturalData, informationalData) {
	try {
		const auth = await authorize()
		const sheets = google.sheets({ version: 'v4', auth })

		const sheetName = 'GUS-Nowy'

		// 🕒 Wpisanie aktualnej daty do komórki B1
		const currentDate = new Date().toLocaleString()
		await sheets.spreadsheets.values.update({
			spreadsheetId: SHEET_ID,
			range: `${sheetName}!B1`,
			valueInputOption: 'RAW',
			resource: { values: [[currentDate]] },
		})

		// 🔹 **Dane architektoniczne (dokładne komórki)**
		const architecturalMappings = {
			num_buildings: 'C4',
			barrier_free_all: 'C6',
			barrier_free_partial: 'C7',
			barrier_free_none: 'C8',
			room_access_all: 'C10',
			room_access_none: 'C11',
			room_access_solutions: 'C12',
			layout_info_visual_tactile: 'C14',
			layout_info_visual_voice: 'C15',
			layout_info_all: 'C16',
			dog_access_yes: 'C18',
			dog_access_no: 'C19',
			evacuation_methods: 'C21',
			evacuation_full: 'C22',
			evacuation_partial: 'C23',
			evacuation_none: 'C24',
			arch_comments: 'C26',
		}

		for (const [key, cell] of Object.entries(architecturalMappings)) {
			let value = architecturalData[key] || ''
			if (Array.isArray(value)) value = value.join(', ') // Obsługa checkboxów
			await sheets.spreadsheets.values.update({
				spreadsheetId: SHEET_ID,
				range: `${sheetName}!${cell}`,
				valueInputOption: 'RAW',
				resource: { values: [[value]] },
			})
		}

		// 🔹 **Dane informacyjno-komunikacyjne (dokładne komórki)**
		const informationalMappings = {
			contact_form: 'G5',
			contact_mail: 'G6',
			contact_sms: 'G7',
			contact_av: 'G8',
			contact_fax: 'G9',
			contact_sign_online: 'G10',
			contact_sign_personal: 'G11',
			contact_guide: 'G12',
			hearing_loop: 'G14',
			fm_systems: 'G15',
			ir_systems: 'G16',
			bluetooth_systems: 'G17',
			other_devices: 'G18',
			machine_readable_text: 'G20',
			pjm_video: 'G21',
			easy_read_text: 'G22',
			communication_request: 'G23',
			comments: 'G25',
		}

		for (const [key, cell] of Object.entries(informationalMappings)) {
			let value = informationalData[key] || ''
			if (Array.isArray(value)) value = value.join(', ') // Obsługa checkboxów
			await sheets.spreadsheets.values.update({
				spreadsheetId: SHEET_ID,
				range: `${sheetName}!${cell}`,
				valueInputOption: 'RAW',
				resource: { values: [[value]] },
			})
		}

		// 🔹 **Pola wieloskładnikowe – łączenie wartości w jedną komórkę**
		const combinedMappings = {
			bluetooth_systems: ['G17', ['bluetooth_systems', 'bluetooth_systems_count']],
			communication_request: ['G23', ['communication_request', 'communication_count', 'communication_details']],
			fm_systems: ['G15', ['fm_systems', 'fm_systems_count']],
			hearing_loop: ['G14', ['hearing_loop', 'hearing_loop_count']],
			ir_systems: ['G16', ['ir_systems', 'ir_systems_count']],
			other_devices: ['G18', ['other_devices', 'other_devices_count', 'other_devices_description']],
			contact_sign_personal: ['G11', ['contact_sign_personal', 'sign_lang_time']],
		}

		for (const [key, [cell, fields]] of Object.entries(combinedMappings)) {
			const values = fields
				.map(field => informationalData[field])
				.filter(value => value !== undefined && value !== '')
				.join(', ')

			await sheets.spreadsheets.values.update({
				spreadsheetId: SHEET_ID,
				range: `${sheetName}!${cell}`,
				valueInputOption: 'RAW',
				resource: { values: [[values]] },
			})
		}

		console.log('✅ Dane poprawnie zapisane do arkusza.')
	} catch (error) {
		console.error('❌ Błąd zapisu do Google Sheets:', error)
		throw error
	}
}

module.exports = { appendToGoogleSheet }
