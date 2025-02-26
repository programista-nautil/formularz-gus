require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { generateDocument } = require('./controllers/generateDoc')
const { deleteGeneratedDocuments } = require('./controllers/deleteFiles')
const { transporter, handleArchitecturalForm, handleInformationalForm } = require('./controllers/sendMail')

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

// Główna funkcja obsługująca formularze
app.post('/send-form', async (req, res) => {
	try {
		const { formType, user_email } = req.body

		let emailText = ''

		if (formType === 'architectural') {
			emailText = handleArchitecturalForm(req.body)
		} else if (formType === 'informational') {
			emailText = handleInformationalForm(req.body)
		} else {
			return res.status(400).send('Nieznany typ formularza.')
		}

		const mailOptions = {
			from: process.env.EMAIL_USER,
			to: user_email,
			subject: `Formularz GUS - ${
				formType === 'architectural' ? 'Dostępność Architektoniczna' : 'Dostępność Informacyjno-Komunikacyjna'
			}`,
			text: emailText,
		}

		await transporter.sendMail(mailOptions)
		res.send('Formularz został wysłany pomyślnie!')
	} catch (error) {
		console.error('Błąd wysyłania maila:', error)
		res.status(500).send('Błąd serwera!')
	}
})

app.post('/generate-document', async (req, res) => {
	try {
		console.log('Dane z requesta:', JSON.stringify(req.body, null, 2))

		const docUrl = await generateDocument(req.body)
		res.json({ success: true, url: docUrl })
	} catch (error) {
		res.status(500).json({ success: false, error: error.message })
	}
})

// Endpoint do ręcznego wywołania usuwania plików curl -X DELETE http://localhost:3000/delete-generated-docs
app.delete('/delete-generated-docs', async (req, res) => {
	try {
		await deleteGeneratedDocuments()
		res.json({ success: true, message: 'Wygenerowane dokumenty zostały usunięte.' })
	} catch (error) {
		res.status(500).json({ success: false, error: error.message })
	}
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`))
