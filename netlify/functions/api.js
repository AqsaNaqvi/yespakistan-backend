const nodemailer = require('nodemailer');
const Busboy = require('busboy');
//test comment
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  // DEBUGGING: Agar environment variables load nahi huye to batao
  if (!process.env.BREVO_USER || !process.env.BREVO_PASS) {
      return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Environment Variables Missing on Server' })
      };
  }

  try {
    const fields = {};
    const files = [];

    // Busboy processing inside a Promise
    await new Promise((resolve, reject) => {
      const contentType = event.headers['content-type'] || event.headers['Content-Type'];
      if (!contentType) return reject(new Error('Content-Type header missing'));

      const busboy = Busboy({ headers: { 'content-type': contentType } });

      busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        const buffers = [];
        file.on('data', data => buffers.push(data));
        file.on('end', () => {
          if (buffers.length > 0) {
            files.push({ filename: filename.filename, content: Buffer.concat(buffers), contentType: mimetype });
          }
        });
      });

      busboy.on('field', (fieldname, val) => fields[fieldname] = val);
      busboy.on('finish', resolve);
      busboy.on('error', reject);
      busboy.write(event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body);
      busboy.end();
    });

    // Email Sending
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      auth: {
        user: "info@yespakistan.com",
        // pass: process.env.BREVO_PASS,
        pass: "xsmtpsib-bafe22991c744e0751fee39b05ea4dd0e3063fb62ec1007c03c5730948669409-5PGssHgLgLazIAnL"
      },
    });

    // Verify connection first (Taake pata chale login ghalat hai ya kuch aur)
    try {
        await transporter.verify();
    } catch (verifyError) {
        throw new Error(`SMTP Connection Failed: ${verifyError.message}`);
    }

    const mailOptions = {
      from: `"${fields.name || 'User'}" <${process.env.BREVO_USER}>`,
      to: process.env.RECEIVER_EMAIL,
      replyTo: fields.email,
      subject: `Submission: ${fields.story_title || 'New Entry'}`,
      html: `<p>Name: ${fields.name}</p><p>Email: ${fields.email}</p><p>Message: ${fields.message}</p>`,
      attachments: files.length > 0 ? [files[0]] : [],
    };

    await transporter.sendMail(mailOptions);

    return { statusCode: 200, headers, body: JSON.stringify({ message: 'Success' }) };

  } catch (error) {
    // 🔴 ASAL ERROR YAHAN DIKHEGA
    console.error(error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Submission Failed',
        detailedError: error.message, // Ye apko bataega k masla kya hai
        code: error.code
      })
    };
  }
};