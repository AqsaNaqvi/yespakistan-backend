
// const nodemailer = require('nodemailer');
// const Busboy = require('busboy');
// const axios = require('axios'); // Captcha verify karne ke liye

// exports.handler = async (event, context) => {
//   // 1. CORS Headers
//   const headers = {
//     'Access-Control-Allow-Origin': '*', 
//     'Access-Control-Allow-Headers': 'Content-Type, Accept',
//     'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
//   };

//   // 2. Pre-flight check
//   if (event.httpMethod === 'OPTIONS') {
//     return {
//       statusCode: 200,
//       headers,
//       body: JSON.stringify({ message: 'Successful preflight call.' })
//     };
//   }

//   if (event.httpMethod !== 'POST') {
//     return { statusCode: 405, headers, body: 'Method Not Allowed' };
//   }

//   // --- SECURITY HELPER: Malicious Content Check ---
//   const isMalicious = (data) => {
//     const forbiddenPatterns = [
//       /<script/i, /javascript:/i, /<iframe/i, /<object/i,
//       /document\.cookie/i, /eval\(/i, /base64/i
//     ];
//     const contentString = JSON.stringify(data).toLowerCase();
//     for (let pattern of forbiddenPatterns) {
//       if (pattern.test(contentString)) return true;
//     }
//     return false;
//   };

//   // 3. Data Parse Logic
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

//     // --- SECURITY CHECK 1: Malicious Content ---
//     if (isMalicious(fields)) {
//       return {
//         statusCode: 403,
//         headers,
//         body: JSON.stringify({ message: 'Security Alert: Malicious scripts detected.' })
//       };
//     }

//     // --- SECURITY CHECK 2: reCAPTCHA v2 Verification ---
//     const token = fields['g-recaptcha-response'];
//     const secret = process.env.RECAPTCHA_SECRET_KEY;

//     if (!token) {
//       return {
//         statusCode: 400,
//         headers,
//         body: JSON.stringify({ message: 'Captcha token missing. Please try again.' })
//       };
//     }

//     // Stable Verification via URLSearchParams
//     const params = new URLSearchParams();
//     params.append('secret', secret);
//     params.append('response', token);

//     const recaptchaRes = await axios.post(
//       'https://www.google.com/recaptcha/api/siteverify', 
//       params.toString(), 
//       { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
//     );

//     if (!recaptchaRes.data.success) {
//       console.log("Google Rejection:", recaptchaRes.data);
//       return {
//         statusCode: 403,
//         headers,
//         body: JSON.stringify({ message: 'Captcha verification failed. Please refresh and try again.' })
//       };
//     }

//     // 4. Email Content Logic (Exactly as you provided)
//     const userName = fields.name || fields.full_name || fields.your_name || "User";
//     const userEmail = fields.email || fields.email_address || fields.your_email || "no-reply@example.com";
//     const formTitle = fields.form_name || fields.story_title || "New Website Submission";

//     let emailHtml = `
//       <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
//         <h2 style="color: #009876;">Form received from Yespakistan website</h2>
//         <hr style="border: 1px solid #eee; margin-bottom: 20px;" />
//     `;

//     if (fields.name || fields.full_name || fields.your_name) {
//         emailHtml += `<p><strong>Name:</strong> ${userName}</p>`;
//     }
//     if (fields.email || fields.email_address || fields.your_email) {
//         emailHtml += `<p><strong>Email:</strong> ${userEmail}</p>`;
//     }

//     // Dynamic Loop for other fields (Skip security keys)
//     for (const [key, value] of Object.entries(fields)) {
//         // g-recaptcha-response ko skip kiya taake email mein kachra na aaye
//         const skipKeys = ['name', 'full_name', 'your_name', 'email', 'email_address', 'your_email', 'form_name', 'attachment', 'g-recaptcha-response'];
        
//         if (!skipKeys.includes(key) && value && value.trim() !== "") {
//             let label = key.replace(/_/g, ' ').replace(/-/g, ' ');
//             label = label.charAt(0).toUpperCase() + label.slice(1);

//             if (value.length > 50) {
//                 emailHtml += `
//                   <div style="margin-top: 15px; margin-bottom: 15px;">
//                     <strong style="color: #555;">${label}:</strong><br/>
//                     <div style="background: #f9f9f9; padding: 10px; border-radius: 5px; margin-top: 5px;">${value}</div>
//                   </div>`;
//             } else {
//                 emailHtml += `<p><strong>${label}:</strong> ${value}</p>`;
//             }
//         }
//     }
//     emailHtml += `</div>`;

//     // 5. Send Email via Gmail
//     const transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: {
//         user: process.env.GMAIL_USER,
//         pass: process.env.GMAIL_PASS,
//       },
//     });

//     const mailOptions = {
//       from: `"Yes Pakistan Form" <${process.env.GMAIL_USER}>`,
//       to: `${process.env.RECEIVER_EMAIL}`, 
//       replyTo: userEmail,
//       subject: `New Submission: ${formTitle}`,
//       html: emailHtml,
//       attachments: files.length > 0 ? [files[0]] : [],
//     };

//     await transporter.sendMail(mailOptions);

//     return {
//       statusCode: 200,
//       headers,
//       body: JSON.stringify({ message: 'Success! Form submitted.' })
//     };

//   } catch (error) {
//     console.error('Error:', error);
//     return {
//       statusCode: 500,
//       headers,
//       body: JSON.stringify({ message: error.message })
//     };
//   }
// };


const nodemailer = require('nodemailer');
const Busboy = require('busboy');
const axios = require('axios'); // Captcha verify karne ke liye
const { createClient } = require('@supabase/supabase-js'); // 🚀 1. Supabase Import

// 🚀 2. Supabase Client Initialize
const supabaseUrl = process.env.SUPABASE_URL || 'https://pzsrbgwvubnxgfnufsug.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY; // Aapki Secret Key
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  // 1. CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*', 
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // 2. Pre-flight check
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Successful preflight call.' })
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  // =========================================================================
  // 🚀 3. PAGE TRACKING & COOKIE HANDLER (SUPABASE)
  // =========================================================================
  // Agar request tracking ki aayi ho toh ye block handle karega
  const contentType = (event.headers['content-type'] || event.headers['Content-Type'] || '').toLowerCase();
  const isTrackingRequest = (event.path && event.path.includes('track-page')) || contentType.includes('application/json');

  if (isTrackingRequest) {
    try {
      let bodyData = {};
      if (event.body) {
        bodyData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      }

      // Check karein ke tracking data mojood hai
      if (bodyData.visitor_id && bodyData.page_path) {
        const ip_address = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
        const user_agent = event.headers['user-agent'] || 'unknown';

        const { error: dbError } = await supabase
          .from('visitor_page_views')
          .insert([
            {
              visitor_id: bodyData.visitor_id,
              page_path: bodyData.page_path,
              page_title: bodyData.page_title || '',
              referrer: bodyData.referrer || 'Direct',
              ip_address: ip_address.split(',')[0].trim(), // Clean single IP
              user_agent: user_agent
            }
          ]);

        if (dbError) {
          console.error('Supabase Tracking Error:', dbError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: dbError.message })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Page view tracked' })
        };
      }
    } catch (parseError) {
      console.error('Tracking parse error:', parseError);
      // Agar JSON parse fail ho toh aage chalne dein
    }
  }

  // =========================================================================
  // 4. EXISTING FORM SUBMISSION LOGIC (BUSBOY, RECAPTCHA & GMAIL)
  // =========================================================================

  // --- SECURITY HELPER: Malicious Content Check ---
  const isMalicious = (data) => {
    const forbiddenPatterns = [
      /<script/i, /javascript:/i, /<iframe/i, /<object/i,
      /document\.cookie/i, /eval\(/i, /base64/i
    ];
    const contentString = JSON.stringify(data).toLowerCase();
    for (let pattern of forbiddenPatterns) {
      if (pattern.test(contentString)) return true;
    }
    return false;
  };

  // Data Parse Logic
  const fields = {};
  const files = [];

  const parseMultipart = () => new Promise((resolve, reject) => {
    const incomingContentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!incomingContentType) return reject(new Error('Content-Type header missing'));

    const busboy = Busboy({ headers: { 'content-type': incomingContentType } });

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

    // --- SECURITY CHECK 1: Malicious Content ---
    if (isMalicious(fields)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ message: 'Security Alert: Malicious scripts detected.' })
      };
    }

    // --- SECURITY CHECK 2: reCAPTCHA v2 Verification ---
    const token = fields['g-recaptcha-response'];
    const secret = process.env.RECAPTCHA_SECRET_KEY;

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Captcha token missing. Please try again.' })
      };
    }

    // Stable Verification via URLSearchParams
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);

    const recaptchaRes = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify', 
      params.toString(), 
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (!recaptchaRes.data.success) {
      console.log("Google Rejection:", recaptchaRes.data);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ message: 'Captcha verification failed. Please refresh and try again.' })
      };
    }

    // Email Content Logic
    const userName = fields.name || fields.full_name || fields.your_name || "User";
    const userEmail = fields.email || fields.email_address || fields.your_email || "no-reply@example.com";
    const formTitle = fields.form_name || fields.story_title || "New Website Submission";

    let emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #009876;">Form received from Yespakistan website</h2>
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
        const skipKeys = ['name', 'full_name', 'your_name', 'email', 'email_address', 'your_email', 'form_name', 'attachment', 'g-recaptcha-response', 'visitor_id'];
        
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

    // Send Email via Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Yes Pakistan Form" <${process.env.GMAIL_USER}>`,
      to: `${process.env.RECEIVER_EMAIL}`, 
      replyTo: userEmail,
      subject: `New Submission: ${formTitle}`,
      html: emailHtml,
      attachments: files.length > 0 ? [files[0]] : [],
    };

    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Success! Form submitted.' })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: error.message })
    };
  }
};