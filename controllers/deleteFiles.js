const { google } = require('googleapis')
const { authorize } = require('./googleAuth')

async function deleteGeneratedDocuments() {
	try {
		const auth = await authorize()
		const drive = google.drive({ version: 'v3', auth })

		// Pobranie listy plików w folderze
		const response = await drive.files.list({
			q: `'${process.env.FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.document'`,
			fields: 'files(id, name)',
		})

		const files = response.data.files

		if (!files || files.length === 0) {
			console.log('Brak plików do usunięcia.')
			return
		}

		// Filtrowanie plików do usunięcia (wykluczenie szablonu)
		const filesToDelete = files.filter(file => !file.name.includes('raport_o_stanie_zapewniania_dostepnosci'))

		if (filesToDelete.length === 0) {
			console.log('Nie znaleziono wygenerowanych plików do usunięcia.')
			return
		}

		for (const file of filesToDelete) {
			console.log(`Usuwam plik: ${file.name} (ID: ${file.id})`)
			await drive.files.delete({ fileId: file.id })
		}

		console.log('Wszystkie wygenerowane pliki zostały usunięte.')
	} catch (error) {
		console.error('Błąd podczas usuwania plików:', error)
		throw error
	}
}

// Eksport funkcji do użycia w `server.js`
module.exports = { deleteGeneratedDocuments }
