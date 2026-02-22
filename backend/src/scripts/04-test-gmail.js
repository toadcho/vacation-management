#!/usr/bin/env node
require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('\n');
console.log('╔════════════════════════════════════════════════════╗');
console.log('║     📧 Gmail API 테스트                            ║');
console.log('╚════════════════════════════════════════════════════╝');
console.log('\n');

async function testGmail() {
  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.log('⚠️  Gmail 설정이 없습니다.\n');
      console.log('💡 .env 파일에 다음을 추가하세요:\n');
      console.log('   GMAIL_USER=your-email@gmail.com');
      console.log('   GMAIL_APP_PASSWORD=your-16-digit-password\n');
      console.log('📚 앱 비밀번호 발급: https://myaccount.google.com/apppasswords\n');
      return;
    }

    console.log('⏳ Gmail 연결 테스트 중...\n');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    await transporter.verify();

    console.log('✅ Gmail SMTP 연결 성공!\n');
    console.log('─'.repeat(56) + '\n');

    console.log('⏳ 테스트 이메일 발송 중...\n');

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: '[테스트] 휴가관리 시스템 이메일 연동 확인',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">✅ Gmail API 테스트 성공!</h2>
          <p>휴가관리 시스템의 이메일 발송 기능이 정상적으로 작동합니다.</p>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #718096; font-size: 14px;">
            이 이메일은 시스템 테스트용으로 발송되었습니다.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('✅ 테스트 이메일 발송 성공!');
    console.log(`📧 수신자: ${process.env.GMAIL_USER}`);
    console.log(`📝 Message ID: ${info.messageId}\n`);

    console.log('─'.repeat(56) + '\n');
    console.log('✨ Gmail API가 정상 작동합니다!');
    console.log('💡 받은편지함을 확인하세요!\n');

  } catch (error) {
    console.log('─'.repeat(56) + '\n');
    console.error('❌ 에러 발생:', error.message);

    console.log('\n💡 해결 방법:\n');

    if (error.message.includes('Invalid login')) {
      console.log('1. Gmail 앱 비밀번호가 올바른지 확인하세요');
      console.log('2. 16자리 비밀번호를 정확히 입력했는지 확인하세요');
      console.log('3. 공백 없이 입력했는지 확인하세요\n');
    } else {
      console.log('1. GMAIL_USER와 GMAIL_APP_PASSWORD를 확인하세요');
      console.log('2. Gmail 앱 비밀번호를 새로 발급받으세요');
      console.log('3. 2단계 인증이 활성화되었는지 확인하세요\n');
    }

    process.exit(1);
  }
}

testGmail();
