require('dotenv').config()
const express = require('express')
const nodemailer = require('nodemailer')
const cors = require('cors')
const { generateDocument } = require('./generateDoc')
const { deleteGeneratedDocuments } = require('./deleteFiles')

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
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
		barrier_free_all,
		barrier_free_partial,
		barrier_free_none,
		room_access_all,
		room_access_none,
		room_access_solutions,
		layout_info_visual_tactile,
		layout_info_visual_voice,
		layout_info_all,
		dog_access_yes,
		dog_access_no,
		evacuation_methods,
		evacuation_full,
		evacuation_partial,
		evacuation_none,
		comments,
	} = data

	// Formatowanie tablic i wartości
	const formatArray = value => {
		if (!value) return 'Brak'
		return Array.isArray(value) ? value.join(', ') : value
	}
	const formatNumber = value => (value ? value : 0)

	let emailText = `
Dostępność architektoniczna
Liczba budynków, w których podmiot prowadzi podstawową działalność i/lub obsługę interesantów: ${formatNumber(
		num_buildings
	)}

1. Wolne od barier przestrzenie komunikacyjne w budynkach:
   a) Liczba budynków, w których podmiot zapewnia wolne od barier wszystkie przestrzenie komunikacyjne: ${formatNumber(
			barrier_free_all
		)}
   b) Liczba budynków, w których podmiot częściowo zapewnia wolne od barier przestrzenie komunikacyjne: ${formatNumber(
			barrier_free_partial
		)}
   c) Liczba budynków, w których podmiot nie zapewnia wolnych od barier przestrzeni komunikacyjnych: ${formatNumber(
			barrier_free_none
		)}

2. Dostęp do wszystkich pomieszczeń w budynkach:
   a) Liczba budynków, w których podmiot umożliwia dostęp do wszystkich pomieszczeń: ${formatNumber(room_access_all)}
   b) Liczba budynków, w których podmiot nie umożliwia dostępu do wszystkich pomieszczeń: ${formatNumber(
			room_access_none
		)}
   c) Rodzaje rozwiązań zastosowanych w budynkach: ${formatArray(room_access_solutions)}

3. Informacja na temat rozkładu pomieszczeń w budynkach:
   a) Liczba budynków z informacją wizualną i dotykową: ${formatNumber(layout_info_visual_tactile)}
   b) Liczba budynków z informacją wizualną i głosową: ${formatNumber(layout_info_visual_voice)}
   c) Liczba budynków z informacją wizualną, dotykową i głosową: ${formatNumber(layout_info_all)}

4. Dostęp do budynków dla osób korzystających z psa asystującego:
   a) Liczba budynków z zapewnionym wstępem: ${formatNumber(dog_access_yes)}
   b) Liczba budynków bez zapewnionego wstępu: ${formatNumber(dog_access_no)}

5. Ewakuacja lub ratowanie osób wewnątrz budynków:
   a) Podmiot zapewnia następujące rozwiązania: ${formatArray(evacuation_methods)}
   b) Liczba budynków z pełną ewakuacją: ${formatNumber(evacuation_full)}
   c) Liczba budynków z częściową ewakuacją: ${formatNumber(evacuation_partial)}
   d) Liczba budynków bez ewakuacji: ${formatNumber(evacuation_none)}

Komentarze i uwagi dotyczące dostępności architektonicznej:
${comments}
`

	return emailText
}

// Funkcja obsługująca formularz dostępności informacyjno-komunikacyjnej
function handleInformationalForm(data) {
	const {
		contact_form,
		contact_mail,
		contact_sms,
		contact_av,
		contact_fax,
		contact_sign_online,
		contact_sign_personal,
		sign_lang_time,
		contact_guide,
		hearing_loop,
		hearing_loop_count,
		fm_systems,
		fm_systems_count,
		ir_systems,
		ir_systems_count,
		bluetooth_systems,
		bluetooth_systems_count,
		other_devices,
		other_devices_description,
		other_devices_count,
		communication_request,
		communication_count,
		communication_details,
		machine_readable_text,
		pjm_video,
		easy_read_text,
		comments,
	} = data

	let emailText = `
Dostępność informacyjno-komunikacyjna

1. Czy podmiot zapewnia osobom ze szczególnymi potrzebami obsługę w następujący sposób?
a. Zastosowanie formularza kontaktowego: ${contact_form}
b. Kontakt za pomocą poczty elektronicznej: ${contact_mail}
c. Przesyłanie wiadomości tekstowych (SMS, MMS, komunikatory): ${contact_sms}
d. Komunikacja audiowizualna: ${contact_av}
e. Przesyłanie faksów: ${contact_fax}
f. Tłumacz języka migowego online: ${contact_sign_online}
g. Pomoc tłumacza języka migowego (kontakt osobisty): ${contact_sign_personal}`

	if (contact_sign_personal === 'TAK') {
		emailText += `\n   Czas oczekiwania na tłumacza: ${sign_lang_time}`
	}

	emailText += `\n\nh. Kontakt z pomocą tłumacza-przewodnika: ${contact_guide}`

	emailText += `\n\n2. Czy podmiot posiada urządzenia lub środki techniczne do obsługi osób słabosłyszących?`

	if (hearing_loop === 'TAK') {
		emailText += `\n   a) Pętle indukcyjne: TAK, Liczba: ${hearing_loop_count || 0}`
	} else {
		emailText += `\n   a) Pętle indukcyjne: NIE`
	}

	if (fm_systems === 'TAK') {
		emailText += `\n   b) Systemy FM: TAK, Liczba: ${fm_systems_count || 0}`
	} else {
		emailText += `\n   b) Systemy FM: NIE`
	}

	if (ir_systems === 'TAK') {
		emailText += `\n   c) Systemy na podczerwień (IR): TAK, Liczba: ${ir_systems_count || 0}`
	} else {
		emailText += `\n   c) Systemy na podczerwień (IR): NIE`
	}

	if (bluetooth_systems === 'TAK') {
		emailText += `\n   d) Systemy Bluetooth: TAK, Liczba: ${bluetooth_systems_count || 0}`
	} else {
		emailText += `\n   d) Systemy Bluetooth: NIE`
	}

	if (other_devices === 'TAK') {
		emailText += `\n   e) Inne urządzenia: TAK, Opis: ${other_devices_description || 'Brak opisu'}, Liczba: ${
			other_devices_count || 0
		}`
	} else {
		emailText += `\n   e) Inne urządzenia: NIE`
	}

	emailText += `\n\n3. Czy podmiot zapewnia informacje na stronie internetowej?`
	emailText += `\n   a) Tekst odczytywalny maszynowo: ${machine_readable_text}`
	emailText += `\n   b) Nagrania PJM: ${pjm_video}`
	emailText += `\n   c) Tekst łatwy do czytania (ETR): ${easy_read_text}`

	emailText += `\n\n4. Czy podmiot otrzymał wniosek o szczególną formę komunikacji? ${communication_request}`

	if (communication_request === 'TAK') {
		emailText += `\n   Liczba wniosków: ${communication_count || 0}`
		emailText += `\n   Szczegóły komunikacji: ${communication_details || 'Brak dodatkowych informacji'}`
	}

	emailText += `\n\nKomentarze i uwagi dotyczące dostępności informacyjno-komunikacyjnej:
${comments || 'Brak dodatkowych komentarzy'}`

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
