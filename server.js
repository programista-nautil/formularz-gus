require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const { generateDocument } = require('./controllers/generateDoc')
const { deleteGeneratedDocuments } = require('./controllers/deleteFiles')
const { appendToGoogleSheet } = require('./controllers/appendToGoogleSheet')
const {
	transporter,
	handleMainDataForm,
	handleArchitecturalForm,
	handleInformationalForm,
	sendAdminNotification,
} = require('./controllers/sendMail')

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

app.use(express.static(path.join(__dirname)))

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'index.html'))
})

// Główna funkcja obsługująca formularze
app.post('/api/send-form', async (req, res) => {
	try {
		const { formType, user_email, mainData, architectural, informational } = req.body

		let emailText = ''
		let institutionName = 'Nie podano'

		if (formType === 'architectural') {
			emailText = handleArchitecturalForm(req.body)
		} else if (formType === 'informational') {
			emailText = handleInformationalForm(req.body)
		} else if (formType === 'both' && architectural && informational) {
			// Obsługa obu formularzy
			const archText = handleArchitecturalForm(architectural)
			const infoText = handleInformationalForm(informational)
			const mainDataText = handleMainDataForm(mainData)
			emailText = `📌 **Dane podmiotu:**\n${mainDataText}\n\n📌 **Dostępność Architektoniczna:**\n${archText}\n\n📌 **Dostępność Informacyjno-Komunikacyjna:**\n${infoText}`

			if (mainData && mainData.institution_name) {
				institutionName = mainData.institution_name
			}
		} else {
			return res.status(400).send('Nieznany typ formularza lub brak danych.')
		}

		const mailOptions = {
			from: process.env.EMAIL_USER,
			to: user_email,
			subject: `Formularz GUS - ${
				formType === 'both'
					? 'Dostępność Architektoniczna i Informacyjna'
					: formType === 'architectural'
					? 'Dostępność Architektoniczna'
					: 'Dostępność Informacyjno-Komunikacyjna'
			}`,
			text: emailText,
		}

		await transporter.sendMail(mailOptions)

		const notificationDetails = `Użytkownik (e-mail: ${user_email}) wysłał formularz dla instytucji: ${institutionName}.`
		await sendAdminNotification('Wysłano formularz', notificationDetails)

		res.send('Formularz został wysłany pomyślnie!')
	} catch (error) {
		console.error('Błąd wysyłania maila:', error)
		res.status(500).send('Błąd serwera!')
	}
})

app.post('/api/generate-document', async (req, res) => {
	try {
		console.log('Dane z requesta:', JSON.stringify(req.body, null, 2))

		let combinedData

		if (req.body.formType === 'both') {
			// Łączenie danych z obu formularzy w jeden obiekt
			combinedData = {
				...req.body.mainData,
				...req.body.architectural,
				...req.body.informational,
			}
		} else {
			// Jeśli generujemy tylko jeden formularz, używamy przekazanych danych
			combinedData = req.body
		}

		// Generowanie dokumentu z połączonymi danymi
		const docUrl = await generateDocument(combinedData)

		const institutionName = combinedData.institution_name || 'Nie podano'
		const notificationDetails = `Użytkownik wygenerował dokument dla instytucji: ${institutionName}.\nLink do dokumentu: ${docUrl}`
		await sendAdminNotification('Wygenerowano dokument', notificationDetails)

		res.json({ success: true, url: docUrl })
	} catch (error) {
		console.error('Błąd generowania dokumentu:', error)
		res.status(500).json({ success: false, error: error.message })
	}
})

app.post('/api/save-to-sheet', async (req, res) => {
	try {
		const { sheetId, formType, mainData, architectural, informational } = req.body

		if (formType !== 'both' || !architectural || !informational || !sheetId || !mainData) {
			return res.status(400).json({ success: false, message: 'Nieprawidłowe dane formularza.' })
		}

		await appendToGoogleSheet(sheetId, mainData, architectural, informational)

		res.send('Dane zostały zapisane do arkusza GUS-Nowy!')
	} catch (error) {
		console.error('❌ Błąd zapisu do Google Sheets:', error)
		res.status(500).send('Wystąpił błąd podczas zapisu do arkusza.')
	}
})

// Endpoint do ręcznego wywołania usuwania plików curl -X DELETE http://localhost:3000/delete-generated-docs
app.delete('/api/delete-generated-docs', async (req, res) => {
	try {
		await deleteGeneratedDocuments()
		res.json({ success: true, message: 'Wygenerowane dokumenty zostały usunięte.' })
	} catch (error) {
		res.status(500).json({ success: false, error: error.message })
	}
})

const PORT = process.env.PORT || 3011
app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`))
