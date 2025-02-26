const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')

const SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/documents']

async function authorize() {
	const auth = new google.auth.GoogleAuth({
		keyFile: path.join(__dirname, 'credentials.json'),
		scopes: SCOPES,
	})
	return auth.getClient()
}

module.exports = { authorize }
