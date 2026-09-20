export class OTPError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OTPError';
    }
}

// In-memory store for OTPs
const tempOtpStore: { [email: string]: { code: string; expiresAt: number } } = {};

export const sendOTP = async (email: string): Promise<void> => {
    const env = (import.meta as any).env || {};
    const serviceId = env.VITE_EMAILJS_SERVICE_ID || '';
    const templateId = env.VITE_EMAILJS_TEMPLATE_ID || '';
    const publicKey = env.VITE_EMAILJS_PUBLIC_KEY || '';

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in-memory with 5 minutes expiry
    tempOtpStore[email.toLowerCase().trim()] = {
        code,
        expiresAt: Date.now() + 5 * 60 * 1000
    };

    // If keys are not configured, log to console and trigger alert for debug access
    if (
        !serviceId || 
        !templateId || 
        !publicKey || 
        serviceId === 'your_emailjs_service_id' || 
        templateId === 'your_emailjs_template_id' || 
        publicKey === 'your_emailjs_public_key'
    ) {
        console.log(`[DEBUG OTP] Verification code for ${email} is: ${code}`);
        alert(`[Debug Mode] Verification code is: ${code}\n\n(Configure your actual EmailJS credentials in the .env file to send real emails to your inbox!)`);
        return;
    }

    const data = {
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
            email: email,             // Matches {{email}} in your template's To Email field
            passcode: code,           // Matches {{passcode}} in your template content
            time: '15 minutes',       // Matches {{time}} in your template content
            to_email: email,          // Backup parameter
            otp_code: code,           // Backup parameter
            project_name: 'Sanjeevani Medical Center'
        }
    };

    try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || 'Failed to send verification email.');
        }
    } catch (err: any) {
        console.error('EmailJS Error:', err);
        // Fallback to debug alert if sending fails
        alert(`[EmailJS Sending Failed]\nError: ${err.message || err}\n\nFallback Verification Code: ${code}`);
    }
};

export const verifyOTP = async (email: string, code: string): Promise<void> => {
    const key = email.toLowerCase().trim();
    const record = tempOtpStore[key];

    if (!record) {
        throw new OTPError("No verification code found for this email. Please request a new one.");
    }

    if (Date.now() > record.expiresAt) {
        delete tempOtpStore[key];
        throw new OTPError("Verification code has expired. Please request a new one.");
    }

    if (record.code !== code.trim()) {
        throw new OTPError("The verification code you entered is incorrect.");
    }

    // Clean up on success
    delete tempOtpStore[key];
};
