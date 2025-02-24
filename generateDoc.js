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

		// 🔹 Iteracja przez wszystkie elementy dokumentu
		doc.data.body.content.forEach(element => {
			if (element.paragraph?.elements) {
				let fullText = element.paragraph.elements.map(e => e.textRun?.content || '').join('')

				Object.entries(data).forEach(([key, value]) => {
					const variable = `{{${key}}}`
					if (fullText.includes(variable)) {
						console.log(`Znaleziono: ${variable} -> Zamieniam na: ${value}`)
						requests.push({
							replaceAllText: {
								containsText: { text: variable, matchCase: true },
								replaceText: value || 'Brak danych',
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
							if (cellText.includes(variable)) {
								console.log(`Znaleziono w tabeli: ${variable} -> Zamieniam na: ${value}`)
								requests.push({
									replaceAllText: {
										containsText: { text: variable, matchCase: true },
										replaceText: value || 'Brak danych',
									},
								})
							}
						})
					})
				})
			}
		})

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
