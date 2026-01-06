const nodemailer = require('nodemailer');
const Busboy = require('busboy');

exports.handler = async (event, context) => {
  // 1. CORS Headers (SABSE ZAROORI HISSA)
  // '*' ka matlab hai kisi bhi domain (yespakistan ya yaspakistan) ko allow kro.
  const headers = {
    'Access-Control-Allow-Origin': '*', 
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // 2. Browser ki Pre-flight check (OPTIONS Request) handle karein
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Successful preflight call.' })
    };
  }

  // Sirf POST allow karein
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  // 3. Data Parse Logic
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

    // 4. Email Content Logic (Dynamic)
    const userName = fields.name || fields.full_name || fields.your_name || "User";
    const userEmail = fields.email || fields.email_address || fields.your_email || "no-reply@example.com";
    const formTitle = fields.form_name || fields.story_title || "New Website Submission";

    let emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #009876;">New Submission Received</h2>
        <hr style="border: 1px solid #eee; margin-bottom: 20px;" />
    `;

    if (fields.name || fields.full_name || fields.your_name) {
        emailHtml += `<p><strong>Name:</strong> ${userName}</p>`;
    }
    if (fields.email || fields.email_address || fields.your_email) {
        emailHtml += `<p><strong>Email:</strong> ${userEmail}</p>`;
    }

    // Dynamic Loop for other fields
    for (const [key, value] of Object.entries(fields)) {
        const skipKeys = ['name', 'full_name', 'your_name', 'email', 'email_address', 'your_email', 'form_name', 'attachment'];
        
        // Sirf wo field dikhayen jo khali na ho
        if (!skipKeys.includes(key) && value && value.trim() !== "") {
            let label = key.replace(/_/g, ' ').replace(/-/g, ' ');
            label = label.charAt(0).toUpperCase() + label.slice(1);

            if (value.length > 50) {
                emailHtml += `
                  <div style="margin-top: 15px; margin-bottom: 15px;">
                    <strong style="color: #555;">${label}:</strong><br/>
                    <div style="background: #f9f9f9; padding: 10px; border-radius: 5px; margin-top: 5px;">${value}</div>
                  </div>`;
            } else {
                emailHtml += `<p><strong>${label}:</strong> ${value}</p>`;
            }
        }
    }
    emailHtml += `</div>`;

    // 5. Send Email via Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Yes Pakistan Form" <${process.env.GMAIL_USER}>`,
      to: process.env.RECEIVER_EMAIL,
      replyTo: userEmail,
      subject: `New Submission: ${formTitle}`,
      html: emailHtml,
      attachments: files.length > 0 ? [files[0]] : [],
    };

    await transporter.sendMail(mailOptions);

    // ✅ SUCCESS RESPONSE with HEADERS
    return {
      statusCode: 200,
      headers, // <--- Ye wapis bhejna bohat zaroori hai
      body: JSON.stringify({ message: 'Success! Form submitted.' })
    };

  } catch (error) {
    console.error('Error:', error);
    // ❌ ERROR RESPONSE with HEADERS
    return {
      statusCode: 500,
      headers, // <--- Error mein bhi headers hone chahiye
      body: JSON.stringify({ message: error.message })
    };
  }
};