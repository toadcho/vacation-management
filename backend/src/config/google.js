const { google } = require('googleapis');

// OAuth2 클라이언트 생성
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// Refresh Token 설정
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

// Calendar API
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Gmail API (나중에 사용)
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

module.exports = {
  oauth2Client,
  calendar,
  gmail
};
