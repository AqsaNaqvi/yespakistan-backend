const nodemailer = require('nodemailer');
const Busboy = require('busboy');

exports.handler = async (event, context) => {
  // ✅ CORS HEADERS (Bohat Zaroori hain alag frontend ke liye)
  const headers = {
    'Access-Control-Allow-Origin': '*', // Security ke liye '*' ko apne frontend URL se replace kar sakti hain baad mein
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Pre-flight request handle karein (Browser check karta hai ke server zinda hai ya nahi)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  const fields = {};
  const files = [];

  // Data parsing logic
  const parseMultipart = () => new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: event.headers,
      limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
    });

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      const buffers = [];
      file.on('data', (data) => buffers.push(data));
      file.on('end', () => {
        files.push({
          filename: filename.filename,
          content: Buffer.concat(buffers),
          contentType: mimetype,
        });
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

    // Required fields validation
    if (!fields.email || !fields.name || !fields.category) {
      return { statusCode: 400, headers, body: JSON.stringify({ message: 'Missing required fields' }) };
    }

    // Brevo Configuration
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASS,
      },
    });

    const mailOptions = {
      from: `"${fields.name}" <${process.env.BREVO_USER}>`, // Sender needs to be verified in Brevo
      to: process.env.RECEIVER_EMAIL, // Admin Email
      replyTo: fields.email,
      subject: `New Story: ${fields.story_title} [${fields.category}]`,
      html: `
        <h3>New Story Submission</h3>
        <p><strong>Name:</strong> ${fields.name}</p>
        <p><strong>Email:</strong> ${fields.email}</p>
        <p><strong>Category:</strong> ${fields.category}</p>
        <p><strong>Title:</strong> ${fields.story_title}</p>
        <hr/>
        <p style="white-space: pre-wrap;">${fields.message}</p>
      `,
      attachments: files.length > 0 ? [files[0]] : [],
    };

    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Story submitted successfully!' }),
    };

  } catch (error) {
    console.error('Backend Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Server Error: ' + error.message }),
    };
  }
};