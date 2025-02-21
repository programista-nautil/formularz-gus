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

// Funkcja obsługująca formularz dostępności architektonicznej
function handleArchitecturalForm(data) {
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
	} = data

	let emailText = `
Dostępność architektoniczna
Liczba budynków, w których podmiot prowadzi podstawową działalność i/lub obsługę interesantów: ${num_buildings}

1. Czy podmiot zapewnia w tym budynku (tych budynkach) wolne od barier poziome i pionowe przestrzenie komunikacyjne?
${barriers}`

	if (barriers === 'Częściowo') {
		emailText += `\nLiczba budynków: ${barrier_count}`
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

	return emailText
}

// Funkcja obsługująca formularz dostępności informacyjno-komunikacyjnej
function handleInformationalForm(data) {
	const {
		contact_phone,
		contact_mail,
		contact_sms,
		contact_av,
		contact_fax,
		contact_sign_online,
		contact_sign_personal,
		sign_lang_time,
		contact_guide,
		hearing_support,
		hearing_devices_count,
		website_count,
		machine_readable_text,
		machine_readable_text_count,
		pjm_video,
		pjm_video_count,
		easy_read_text,
		easy_read_text_count,
		communication_request,
		communication_details,
	} = data

	let emailText = `
Dostępność informacyjno-komunikacyjna

1. Czy podmiot zapewnia osobom ze szczególnymi potrzebami obsługę w następujący sposób?
a. Kontakt telefoniczny: ${contact_phone}
b. Kontakt korespondencyjny: ${contact_mail}
c. Przesyłanie wiadomości tekstowych (SMS, MMS, komunikatory): ${contact_sms}
d. Komunikacja audiowizualna: ${contact_av}
e. Przesyłanie faksów: ${contact_fax}
f. Tłumacz języka migowego online: ${contact_sign_online}
g. Pomoc tłumacza języka migowego (kontakt osobisty): ${contact_sign_personal}`

	if (contact_sign_personal === 'TAK') {
		emailText += `\n   Czas oczekiwania na tłumacza: ${sign_lang_time}`
	}

	emailText += `\n\nh. Kontakt z pomocą tłumacza-przewodnika: ${contact_guide}`

	emailText += `\n\n2. Czy podmiot posiada urządzenia lub środki techniczne do obsługi osób słabosłyszących? ${hearing_support}`

	if (hearing_support === 'TAK') {
		emailText += `\n   Liczba urządzeń: ${hearing_devices_count}`
	}

	emailText += `\n\n3. Liczba prowadzonych przez podmiot stron internetowych: ${website_count}`

	emailText += `\n\n4. Czy podmiot zapewnia informacje na stronie internetowej?`
	emailText += `\na. Tekst odczytywalny maszynowo: ${machine_readable_text}`

	if (machine_readable_text === 'Częściowo') {
		emailText += `\n   Liczba stron z tekstem odczytywalnym: ${machine_readable_text_count}`
	}

	emailText += `\nb. Nagrania PJM: ${pjm_video}`

	if (pjm_video === 'Częściowo') {
		emailText += `\n   Liczba stron z nagraniami PJM: ${pjm_video_count}`
	}

	emailText += `\nc. Tekst łatwy do czytania (ETR): ${easy_read_text}`

	if (easy_read_text === 'Częściowo') {
		emailText += `\n   Liczba stron z tekstem ETR: ${easy_read_text_count}`
	}

	emailText += `\n\n5. Czy podmiot zapewniał możliwość komunikacji w preferowanej formie? ${communication_request}`

	if (communication_request === 'TAK') {
		emailText += `\n   Szczegóły komunikacji: ${communication_details}`
	}

	return emailText
}

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

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`))
