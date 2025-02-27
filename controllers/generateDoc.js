const { google } = require('googleapis')
const { authorize } = require('./googleAuth')
require('dotenv').config()

const TEMPLATE_DOC_ID = '1isWrnneAuczgSCm2Vfdy4-NuTWT9BI9AVw86lkh0B0k'

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
				parents: [process.env.FOLDER_ID],
			},
		})

		const newDocId = copy.data.id

		// 🔹 Nadanie uprawnień wszystkim użytkownikom
		await drive.permissions.create({
			fileId: newDocId,
			requestBody: {
				role: 'writer',
				type: 'anyone',
			},
		})
		// Pobranie zawartości dokumentu
		const doc = await docs.documents.get({ documentId: newDocId })

		const requests = []

		// 🔹 Obsługa e-maila sekretariatu (wpisanie każdej litery osobno)
		if (data.email_secretariat) {
			const emailUppercase = data.email_secretariat.toUpperCase().split('')

			emailUppercase.forEach((char, index) => {
				const variable = `{{e${index + 1}}}`
				requests.push({
					replaceAllText: {
						containsText: { text: variable, matchCase: true },
						replaceText: char,
					},
				})
			})
		}

		// 🔹 Funkcja do obsługi checkboxów
		function getCheckbox(value) {
			return value === 'TAK' ? '☑' : '☐' // Uzupełniony lub pusty checkbox
		}

		function getSignLangCheckbox(selectedValue, checkboxValue) {
			const valueMap = {
				'od razu': 'od razu',
				'1 dzień': 'w ciągu 1 dnia roboczego',
				'2-3 dni': 'w ciągu 2-3 dni roboczych',
				'powyżej 3 dni': 'powyżej 3 dni roboczych',
			}

			return valueMap[selectedValue] === checkboxValue ? '☑' : '☐'
		}

		// 🔹 Funkcja do obsługi dynamicznych checkboxów dla wielu opcji
		function getMultiCheckbox(valueArray, options) {
			// Upewniamy się, że `valueArray` to zawsze tablica
			if (!Array.isArray(valueArray)) {
				valueArray = [valueArray]
			}

			// Normalizujemy wartości, aby uniknąć problemów z porównaniem (np. spacje, różne formatowanie)
			const normalizedValues = valueArray.map(v => v.trim().toLowerCase())

			return options.map(opt => (normalizedValues.includes(opt.trim().toLowerCase()) ? '☑' : '☐'))
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
						requests.push({
							replaceAllText: {
								containsText: { text: variable, matchCase: true },
								replaceText: value || 'Brak danych',
							},
						})
					}

					// 🔹 Zamiana TAK/NIE checkboxów z wyświetleniem "TAK ☐ NIE ☐"
					if (fullText.includes(yesCheckbox) || fullText.includes(noCheckbox)) {
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

					if (key === 'sign_lang_time') {
						const options = [
							'od razu',
							'w ciągu 1 dnia roboczego',
							'w ciągu 2-3 dni roboczych',
							'powyżej 3 dni roboczych',
						]

						options.forEach((opt, index) => {
							const checkboxVariable = `{{checkbox_sign_lang_time_${index + 1}}}`
							requests.push({
								replaceAllText: {
									containsText: { text: checkboxVariable, matchCase: true },
									replaceText: getSignLangCheckbox(value, opt),
								},
							})
						})
					}

					// 🔹 Checkboxy dla room_access_solutions (3 opcje)
					if (key === 'room_access_solutions' && Array.isArray(value)) {
						const options = ['Rozwiązania architektoniczne', 'Środki techniczne', 'Zainstalowane urządzenia']
						const checkboxes = getMultiCheckbox(value, options)

						options.forEach((opt, index) => {
							const checkboxVariable = `{{checkbox_room_access_solutions_${index + 1}}}`
							requests.push({
								replaceAllText: {
									containsText: { text: checkboxVariable, matchCase: true },
									replaceText: checkboxes[index],
								},
							})
						})
					}

					// 🔹 Checkboxy dla evacuation_methods (3 opcje)
					if (key === 'evacuation_methods' && Array.isArray(value)) {
						const options = [
							'Procedury ewakuacji lub ratowania',
							'Sprzęt lub miejsce do ewakuacji lub ratowania',
							'Pracowników przeszkolonych z procedur ewakuacji lub ratowania',
						]
						const checkboxes = getMultiCheckbox(value, options)

						options.forEach((opt, index) => {
							const checkboxVariable = `{{checkbox_evacuation_methods_${index + 1}}}`
							requests.push({
								replaceAllText: {
									containsText: { text: checkboxVariable, matchCase: true },
									replaceText: checkboxes[index],
								},
							})
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
								requests.push({
									replaceAllText: {
										containsText: { text: variable, matchCase: true },
										replaceText: value || 'Brak danych',
									},
								})
							}

							// 🔹 Zamiana checkboxów TAK/NIE w tabeli
							if (cellText.includes(yesCheckbox) || cellText.includes(noCheckbox)) {
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

							if (cellText.includes(`{{checkbox_sign_lang_time_`)) {
								const options = [
									'od razu',
									'w ciągu 1 dnia roboczego',
									'w ciągu 2-3 dni roboczych',
									'powyżej 3 dni roboczych',
								]

								options.forEach((opt, index) => {
									const checkboxVariable = `{{checkbox_sign_lang_time_${index + 1}}}`
									requests.push({
										replaceAllText: {
											containsText: { text: checkboxVariable, matchCase: true },
											replaceText: getSignLangCheckbox(value, opt),
										},
									})
								})
							}

							if (cellText.includes(`{{checkbox_room_access_solutions_`)) {
								const options = ['Rozwiązania architektoniczne', 'Środki techniczne', 'Zainstalowane urządzenia']
								const selectedValues = Array.isArray(value) ? value : [value] // Upewnienie się, że `value` to tablica
								const checkboxes = getMultiCheckbox(selectedValues, options)

								options.forEach((opt, index) => {
									const checkboxVariable = `{{checkbox_room_access_solutions_${index + 1}}}`
									requests.push({
										replaceAllText: {
											containsText: { text: checkboxVariable, matchCase: true },
											replaceText: checkboxes[index],
										},
									})
								})
							}

							if (cellText.includes(`{{checkbox_evacuation_methods_`)) {
								const options = [
									'Procedury ewakuacji lub ratowania',
									'Sprzęt lub miejsce do ewakuacji lub ratowania',
									'Pracowników przeszkolonych z procedur ewakuacji lub ratowania',
								]
								const selectedValues = Array.isArray(value) ? value : [value] // Upewnienie się, że `value` to tablica
								const checkboxes = getMultiCheckbox(selectedValues, options)

								options.forEach((opt, index) => {
									const checkboxVariable = `{{checkbox_evacuation_methods_${index + 1}}}`
									requests.push({
										replaceAllText: {
											containsText: { text: checkboxVariable, matchCase: true },
											replaceText: checkboxes[index],
										},
									})
								})
							}
						})
					})
				})
			}
		})

		// 🔹 Aktualizacja dokumentu jeśli znaleziono zmienne
		if (requests.length > 0) {
			await docs.documents.batchUpdate({
				documentId: newDocId,
				requestBody: { requests },
			})
			console.log('Dokument uzupełniony!')
		}

		// 🔹 Usuwanie pozostałych zmiennych {{tekst}}
		const cleanRequests = []
		const regex = /{{(.*?)}}/g

		// 🔹 Iteracja przez wszystkie elementy dokumentu
		doc.data.body.content.forEach(element => {
			if (element.paragraph?.elements) {
				let fullText = element.paragraph.elements.map(e => e.textRun?.content || '').join('')

				let match
				while ((match = regex.exec(fullText)) !== null) {
					cleanRequests.push({
						replaceAllText: {
							containsText: { text: match[0], matchCase: false },
							replaceText: '',
						},
					})
				}
			}

			// 🔹 Sprawdzanie tabel
			if (element.table) {
				element.table.tableRows.forEach(row => {
					row.tableCells.forEach(cell => {
						let cellText = cell.content
							.map(c => (c.paragraph?.elements ? c.paragraph.elements.map(e => e.textRun?.content || '').join('') : ''))
							.join('')

						let match
						while ((match = regex.exec(cellText)) !== null) {
							cleanRequests.push({
								replaceAllText: {
									containsText: { text: match[0], matchCase: false },
									replaceText: '',
								},
							})
						}
					})
				})
			}
		})

		// 🔹 Druga aktualizacja usuwająca pozostałe zmienne
		if (cleanRequests.length > 0) {
			await docs.documents.batchUpdate({
				documentId: newDocId,
				requestBody: { requests: cleanRequests },
			})
		}

		return `https://docs.google.com/document/d/${newDocId}`
	} catch (error) {
		console.error('Błąd generowania dokumentu:', error)
		throw error
	}
}

module.exports = { generateDocument }
