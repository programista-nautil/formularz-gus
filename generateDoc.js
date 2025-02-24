const { google } = require('googleapis')
const { authorize } = require('./googleAuth')
require('dotenv').config()

const TEMPLATE_DOC_ID = '1isWrnneAuczgSCm2Vfdy4-NuTWT9BI9AVw86lkh0B0k'
const FOLDER_ID = '1zBgoC7awLF9c8RYHa6AhJgfxxZ7n8TUB'

async function generateDocument(data) {
	try {
		const auth = await authorize()
		const drive = google.drive({ version: 'v3', auth })
		const docs = google.docs({ version: 'v1', auth })

		// Tworzenie kopii szablonu w określonym folderze
		const copy = await drive.files.copy({
			fileId: TEMPLATE_DOC_ID,
			requestBody: {
				name: `Dokument ${new Date().toISOString()}`,
				parents: [FOLDER_ID],
			},
		})

		const newDocId = copy.data.id
		console.log(`Utworzono kopię: ${newDocId}`)

		// 🔹 Nadanie uprawnień wszystkim użytkownikom
		await drive.permissions.create({
			fileId: newDocId,
			requestBody: {
				role: 'writer',
				type: 'anyone',
			},
		})
		console.log('Dokument udostępniony publicznie!')

		// Pobranie zawartości dokumentu
		const doc = await docs.documents.get({ documentId: newDocId })

		const requests = []

		// 🔹 Funkcja do obsługi checkboxów
		function getCheckbox(value) {
			return value === 'TAK' ? '☑' : '☐' // Uzupełniony lub pusty checkbox
		}

		// 🔹 Iteracja przez wszystkie elementy dokumentu
		doc.data.body.content.forEach(element => {
			if (element.paragraph?.elements) {
				let fullText = element.paragraph.elements.map(e => e.textRun?.content || '').join('')

				Object.entries(data).forEach(([key, value]) => {
					const variable = `{{${key}}}`
					const yesCheckbox = `{{yes_checkbox_${key}}}`
					const noCheckbox = `{{no_checkbox_${key}}}`

					// 🔹 Standardowe zmienne tekstowe
					if (fullText.includes(variable)) {
						console.log(`Znaleziono: ${variable} -> Zamieniam na: ${value}`)
						requests.push({
							replaceAllText: {
								containsText: { text: variable, matchCase: true },
								replaceText: value || 'Brak danych',
							},
						})
					}

					// 🔹 Zamiana TAK/NIE checkboxów z wyświetleniem "TAK ☐ NIE ☐"
					if (fullText.includes(yesCheckbox) || fullText.includes(noCheckbox)) {
						console.log(`Znaleziono checkbox dla: ${key}`)
						const yesValue = getCheckbox(value === 'TAK' ? 'TAK' : 'NIE')
						const noValue = getCheckbox(value === 'NIE' ? 'TAK' : 'NIE')

						requests.push({
							replaceAllText: {
								containsText: { text: yesCheckbox, matchCase: true },
								replaceText: `TAK ${yesValue}`,
							},
						})

						requests.push({
							replaceAllText: {
								containsText: { text: noCheckbox, matchCase: true },
								replaceText: `NIE ${noValue}`,
							},
						})
					}
				})
			}

			// 🔹 Sprawdzanie tabel
			if (element.table) {
				element.table.tableRows.forEach(row => {
					row.tableCells.forEach(cell => {
						let cellText = cell.content
							.map(c => (c.paragraph?.elements ? c.paragraph.elements.map(e => e.textRun?.content || '').join('') : ''))
							.join('')

						Object.entries(data).forEach(([key, value]) => {
							const variable = `{{${key}}}`
							const yesCheckbox = `{{yes_checkbox_${key}}}`
							const noCheckbox = `{{no_checkbox_${key}}}`

							// 🔹 Standardowe zmienne tekstowe w tabeli
							if (cellText.includes(variable)) {
								console.log(`Znaleziono w tabeli: ${variable} -> Zamieniam na: ${value}`)
								requests.push({
									replaceAllText: {
										containsText: { text: variable, matchCase: true },
										replaceText: value || 'Brak danych',
									},
								})
							}

							// 🔹 Zamiana checkboxów TAK/NIE w tabeli
							if (cellText.includes(yesCheckbox) || cellText.includes(noCheckbox)) {
								console.log(`Znaleziono checkbox w tabeli dla: ${key}`)
								const yesValue = getCheckbox(value === 'TAK' ? 'TAK' : 'NIE')
								const noValue = getCheckbox(value === 'NIE' ? 'TAK' : 'NIE')

								requests.push({
									replaceAllText: {
										containsText: { text: yesCheckbox, matchCase: true },
										replaceText: `TAK ${yesValue}`,
									},
								})

								requests.push({
									replaceAllText: {
										containsText: { text: noCheckbox, matchCase: true },
										replaceText: `NIE ${noValue}`,
									},
								})
							}
						})
					})
				})
			}
		})

		// 🔹 Aktualizacja dokumentu jeśli znaleziono zmienne
		if (requests.length > 0) {
			console.log('Zamiana zmiennych:', requests)
			await docs.documents.batchUpdate({
				documentId: newDocId,
				requestBody: { requests },
			})
			console.log('Dokument uzupełniony!')
		}

		return `https://docs.google.com/document/d/${newDocId}`
	} catch (error) {
		console.error('Błąd generowania dokumentu:', error)
		throw error
	}
}

module.exports = { generateDocument }
