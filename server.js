require('dotenv').config()
const express = require('express')
const nodemailer = require('nodemailer')
const cors = require('cors')

const app = express()
app.use(express.json())
app.use(cors())

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
})

app.post('/send-form', async (req, res) => {
	try {
		const {
			num_buildings,
			barriers,
			barrier_count,
			room_access,
			room_access_count,
			layout_info,
			layout_info_count,
			dog_access,
			dog_access_count,
			evacuation,
			evacuation_count,
			comments,
			user_email,
		} = req.body

		let emailText = `
Dostępność architektoniczna
Liczba budynków, w których podmiot prowadzi podstawową działalność i/lub obsługę interesantów: ${num_buildings}

1. Czy podmiot zapewnia w tym budynku (tych budynkach) wolne od barier poziome i pionowe przestrzenie komunikacyjne?
${barriers}`

		if (barriers === 'Częściowo') {
			emailText += `\nliczba budynków: ${barrier_count}`
		}

		emailText += `\n\n2. Czy podmiot zastosował rozwiązania architektoniczne umożliwiające dostęp do wszystkich pomieszczeń?
${room_access}`

		if (room_access === 'Częściowo') {
			emailText += `\nLiczba budynków z dostępem do wszystkich pomieszczeń: ${room_access_count}`
		}

		emailText += `\n\n3. Czy podmiot zapewnia informację na temat rozkładu pomieszczeń co najmniej w sposób wizualny i dotykowy lub głosowy?
${layout_info}`

		if (layout_info === 'Częściowo') {
			emailText += `\nLiczba budynków z informacją o rozkładzie pomieszczeń: ${layout_info_count}`
		}

		emailText += `\n\n4. Czy podmiot umożliwia wstęp do budynku osobie korzystającej z psa asystującego?
${dog_access}`

		if (dog_access === 'Częściowo') {
			emailText += `\nLiczba budynków, do których podmiot zapewnia wstęp dla psa asystującego: ${dog_access_count}`
		}

		emailText += `\n\n5. Czy podmiot zapewnia osobom ze szczególnymi potrzebami możliwość ewakuacji lub uratowania w inny sposób?
${evacuation}`

		if (evacuation === 'Częściowo') {
			emailText += `\nLiczba budynków z możliwością ewakuacji: ${evacuation_count}`
		}

		emailText += `\n\nKomentarze i uwagi dotyczące dostępności architektonicznej:
${comments}`

		const mailOptions = {
			from: process.env.EMAIL_USER,
			to: user_email, // Zmień na właściwy adres
			subject: 'Formularz GUS - Dostępność Architektoniczna',
			text: emailText,
		}

		await transporter.sendMail(mailOptions)
		res.send('Formularz został wysłany pomyślnie!')
	} catch (error) {
		console.error('Błąd wysyłania maila:', error)
		res.status(500).send('Błąd serwera!')
	}
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`))
