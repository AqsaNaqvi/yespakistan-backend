const nodemailer = require('nodemailer');
const Busboy = require('busboy');

exports.handler = async (event, context) => {
  // 1. CORS Headers (Frontend ko allow karein)
  const headers = {
    'Access-Control-Allow-Origin': 'https://yespakistan.com',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  // 2. Data Parse Karne Ka Logic
  const fields = {};
  const files = [];

  const parseMultipart = () => new Promise((resolve, reject) => {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType) return reject(new Error('Content-Type header missing'));

    const busboy = Busboy({ headers: { 'content-type': contentType } });

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      const buffers = [];
      file.on('data', data => buffers.push(data));
      file.on('end', () => {
        if (buffers.length > 0) {
          files.push({
            filename: filename.filename,
            content: Buffer.concat(buffers),
            contentType: mimetype
          });
        }
      });
    });

    busboy.on('field', (fieldname, val) => fields[fieldname] = val);
    busboy.on('finish', resolve);
    busboy.on('error', reject);
    busboy.write(event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body);
    busboy.end();
  });

  try {
    await parseMultipart();

    // 3. Validation (Check required fields)
    if (!fields.name || !fields.email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Name and Email are required.' })
      };
    }

    // 4. GMAIL Configuration (Daakiya)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER, // Netlify variable se ayega
        pass: process.env.GMAIL_PASS, // Netlify variable se ayega
      },
    });

    // 5. Email Setup
    const mailOptions = {
      from: `"Yes Pakistan Form" <${process.env.GMAIL_USER}>`, // Bhejne wala (Gmail)
      to: process.env.RECEIVER_EMAIL, // Receive karne wala (info@yespakistan.com)
      replyTo: fields.email, // Reply user ko jaye
      subject: `New Submission: ${fields.story_title || 'Contact Form'}`,
      html: `
        <h3>New Form Submission</h3>
        <p><strong>Name:</strong> ${fields.name}</p>
        <p><strong>Email:</strong> ${fields.email}</p>
        <p><strong>Category:</strong> ${fields.category || 'N/A'}</p>
        <p><strong>Title:</strong> ${fields.story_title || 'N/A'}</p>
        <hr/>
        <h4>Message:</h4>
        <p style="white-space: pre-wrap;">${fields.message}</p>
      `,
      attachments: files.length > 0 ? [files[0]] : [],
    };

    // Email Send Karein
    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Submitted successfully!' }),
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to send email.', 
        error: error.message 
      }),
    };
  }
};