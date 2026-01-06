const nodemailer = require('nodemailer');
const Busboy = require('busboy');

exports.handler = async (event, context) => {
  // 1. CORS Headers (Sab allow karein)
  const headers = {
    'Access-Control-Allow-Origin': 'https://yespakistan.com',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  const fields = {};
  const files = [];

  const parseMultipart = () => new Promise((resolve, reject) => {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType) return reject(new Error('Content-Type header missing'));

    const busboy = Busboy({
      headers: { 'content-type': contentType },
      limits: { fileSize: 5 * 1024 * 1024 }
    });

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      const buffers = [];
      file.on('data', (data) => buffers.push(data));
      file.on('end', () => {
        if (buffers.length > 0) {
            files.push({
            filename: filename.filename,
            content: Buffer.concat(buffers),
            contentType: mimetype,
            });
        }
      });
    });

    busboy.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on('finish', resolve);
    busboy.on('error', reject);

    busboy.write(event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body);
    busboy.end();
  });

  try {
    await parseMultipart();

    // 2. Validation (Category ko hata diya hai taake Internship form fail na ho)
    // Agar Name ya Email na ho to error aye, magar category k baghair chal jaye
    if (!fields.name || !fields.email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Missing Name or Email' })
      };
    }

    // Default Values set karein agar form se na ayen
    const category = fields.category || 'General/Internship';
    const title = fields.story_title || 'New Form Submission';
    const message = fields.message || 'No message content provided.';

    // 3. Brevo Email Logic
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASS,
      },
    });

    const mailOptions = {
      from: `"${fields.name}" <${process.env.BREVO_USER}>`, // Sender
      to: process.env.RECEIVER_EMAIL, // Receiver
      replyTo: fields.email,
      subject: `New Submission: ${title} [${category}]`,
      html: `
        <h3>New Submission Received</h3>
        <p><strong>Name:</strong> ${fields.name}</p>
        <p><strong>Email:</strong> ${fields.email}</p>
        <p><strong>Type/Category:</strong> ${category}</p>
        <p><strong>Title:</strong> ${title}</p>
        <hr/>
        <h4>Message/Details:</h4>
        <p style="white-space: pre-wrap;">${message}</p>
      `,
      attachments: files.length > 0 ? [files[0]] : [],
    };

    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Submitted successfully!' }),
    };

  } catch (error) {
    console.error('Error:', error);
    
    // Agar Password ghalat hai to ye error wapis frontend ko bhejo
    if(error.code === 'EAUTH') {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Email Configuration Error: Invalid Login/Password' }),
        };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Server Error: ' + error.message }),
    };
  }
};