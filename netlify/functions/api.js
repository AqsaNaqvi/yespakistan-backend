// const nodemailer = require('nodemailer');
// const Busboy = require('busboy');

// exports.handler = async (event, context) => {
//   // 1. CORS Headers (Frontend ko allow karein)
//   const headers = {
//     'Access-Control-Allow-Origin': 'https://yespakistan.com',
//     'Access-Control-Allow-Headers': 'Content-Type',
//     'Access-Control-Allow-Methods': 'POST, OPTIONS'
//   };

//   if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

//   // 2. Data Parse Karne Ka Logic
//   const fields = {};
//   const files = [];

//   const parseMultipart = () => new Promise((resolve, reject) => {
//     const contentType = event.headers['content-type'] || event.headers['Content-Type'];
//     if (!contentType) return reject(new Error('Content-Type header missing'));

//     const busboy = Busboy({ headers: { 'content-type': contentType } });

//     busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
//       const buffers = [];
//       file.on('data', data => buffers.push(data));
//       file.on('end', () => {
//         if (buffers.length > 0) {
//           files.push({
//             filename: filename.filename,
//             content: Buffer.concat(buffers),
//             contentType: mimetype
//           });
//         }
//       });
//     });

//     busboy.on('field', (fieldname, val) => fields[fieldname] = val);
//     busboy.on('finish', resolve);
//     busboy.on('error', reject);
//     busboy.write(event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body);
//     busboy.end();
//   });

//   try {
//     await parseMultipart();

//     // 3. Validation (Check required fields)
//     if (!fields.name || !fields.email) {
//       return {
//         statusCode: 400,
//         headers,
//         body: JSON.stringify({ message: 'Name and Email are required.' })
//       };
//     }

//     // 4. GMAIL Configuration (Daakiya)
//     const transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: {
//         user: process.env.GMAIL_USER, // Netlify variable se ayega
//         pass: process.env.GMAIL_PASS, // Netlify variable se ayega
//       },
//     });

//     // 5. Email Setup
//     const mailOptions = {
//       from: `"Yes Pakistan Form" <${process.env.GMAIL_USER}>`, // Bhejne wala (Gmail)
//       to: process.env.RECEIVER_EMAIL, // Receive karne wala (info@yespakistan.com)
//       replyTo: fields.email, // Reply user ko jaye
//       subject: `New Submission: ${fields.story_title || 'Contact Form'}`,
//       html: `
//         <h3>New Form Submission</h3>
//         <p><strong>Name:</strong> ${fields.name}</p>
//         <p><strong>Email:</strong> ${fields.email}</p>
//         <p><strong>Category:</strong> ${fields.category || 'N/A'}</p>
//         <p><strong>Title:</strong> ${fields.story_title || 'N/A'}</p>
//         <hr/>
//         <h4>Message:</h4>
//         <p style="white-space: pre-wrap;">${fields.message}</p>
//       `,
//       attachments: files.length > 0 ? [files[0]] : [],
//     };

//     // Email Send Karein
//     await transporter.sendMail(mailOptions);

//     return {
//       statusCode: 200,
//       headers,
//       body: JSON.stringify({ message: 'Submitted successfully!' }),
//     };

//   } catch (error) {
//     console.error('Error:', error);
//     return {
//       statusCode: 500,
//       headers,
//       body: JSON.stringify({ 
//         message: 'Failed to send email.', 
//         error: error.message 
//       }),
//     };
//   }
// };

const nodemailer = require('nodemailer');
const Busboy = require('busboy');

exports.handler = async (event, context) => {
  // 1. CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': 'https://yaspakistan.com',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  // 2. Data Parse Logic (Same as before)
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

    // ==========================================
    // 3. MAGIC LOGIC: Dynamic Email Generator
    // ==========================================
    
    // Sabse pehle Name aur Email nikal lein (Header ke liye)
    // Agar kisi form mein 'Your Name' ya 'Full Name' use hua hai, to hum check kar lenge
    const userName = fields.name || fields.full_name || fields.your_name || "User";
    const userEmail = fields.email || fields.email_address || fields.your_email || "no-reply@example.com";
    const formTitle = fields.form_name || fields.story_title || "New Website Submission";

    // HTML Email start karein
    let emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #009876;">New Submission Received</h2>
        <hr style="border: 1px solid #eee; margin-bottom: 20px;" />
    `;

    // Specific Fields ko Sabse Upar Dikhayen (Agar hain to)
    if (fields.name || fields.full_name || fields.your_name) {
        emailHtml += `<p><strong>Name:</strong> ${userName}</p>`;
    }
    if (fields.email || fields.email_address || fields.your_email) {
        emailHtml += `<p><strong>Email:</strong> ${userEmail}</p>`;
    }

    // AB BAKI SARE FIELDS KO LOOP KAREIN
    // Ye logic khud dhundegi ke or kya data aya hai
    for (const [key, value] of Object.entries(fields)) {
        
        // 1. Already used fields ko skip karein (Name/Email dubara print na ho)
        // 2. Agar value khali hai (null/empty) to skip karein
        const skipKeys = ['name', 'full_name', 'your_name', 'email', 'email_address', 'your_email', 'form_name', 'attachment'];
        
        if (!skipKeys.includes(key) && value && value.trim() !== "") {
            
            // Key ko khubsurat banayein (e.g. "phone_number" -> "Phone Number")
            let label = key.replace(/_/g, ' ').replace(/-/g, ' ');
            label = label.charAt(0).toUpperCase() + label.slice(1);

            // Agar lamba answer hai (textarea wala) to agli line par dikhayein
            if (value.length > 50) {
                emailHtml += `
                  <div style="margin-top: 15px; margin-bottom: 15px;">
                    <strong style="color: #555;">${label}:</strong><br/>
                    <div style="background: #f9f9f9; padding: 10px; border-radius: 5px; margin-top: 5px;">${value}</div>
                  </div>`;
            } else {
                // Chota answer (e.g. Phone, City)
                emailHtml += `<p><strong>${label}:</strong> ${value}</p>`;
            }
        }
    }

    emailHtml += `</div>`; // Close Div

    // 4. Send Email (Gmail)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Yes Pakistan Form" <${process.env.GMAIL_USER}>`,
      to: process.env.RECEIVER_EMAIL, // info@yespakistan.com
      replyTo: userEmail,
      subject: `New Submission: ${formTitle}`,
      html: emailHtml,
      attachments: files.length > 0 ? [files[0]] : [],
    };

    await transporter.sendMail(mailOptions);

    return { statusCode: 200, headers, body: JSON.stringify({ message: 'Success' }) };

  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ message: error.message }) };
  }
};