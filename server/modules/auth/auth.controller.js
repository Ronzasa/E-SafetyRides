import { registerUser, loginUser, forgotPassword, resetPassword } from './auth.service.js';

const NAME_REGEX = /^[A-Za-z][A-Za-z\s'-]{1,49}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

export async function register(req, res) {
    try {
        const { name, email, password, confirmPassword } = req.body;

        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (!NAME_REGEX.test(name)) {
            return res.status(400).json({ error: 'name must be 2-50 letters (spaces, hyphens, apostrophes allowed)' });
        }
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ error: 'invalid email format' });
        }
        if (!PASSWORD_REGEX.test(password)) {
            return res.status(400).json({ error: 'password must be at least 6 characters with letters and numbers' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'passwords do not match' });
        }

        const user = await registerUser({ name, email, password });
        res.status(201).json({ success: true, user });
    } catch (err) {
        if (err.code === 'EMAIL_IN_USE') {
            return res.status(409).json({ error: err.message });
        }
        console.error('register error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
}

export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required' });
        }
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ error: 'invalid email format' });
        }

        const { user, token } = await loginUser({ email, password });
        res.status(200).json({ user, token });
    } catch (err) {
        if (err.code === 'INVALID_CREDENTIALS') {
            return res.status(401).json({ error: err.message });
        }
        console.error('login error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
}

export async function me(req, res) {
    res.status(200).json({ user: req.user });
}

export async function forgotPasswordController(req, res) {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'email is required' });
        }
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ error: 'invalid email format' });
        }

        const result = await forgotPassword(email);
        // Always return the same message whether the email exists or not (security: prevents email enumeration)
        res.status(200).json({ success: true, message: 'If that email is registered, a password reset link has been generated.', resetLink: result.resetLink });
    } catch (err) {
        console.error('forgotPassword error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
}

export async function resetPasswordController(req, res) {
    try {
        const { token, newPassword, confirmPassword } = req.body;
        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({ error: 'token, newPassword and confirmPassword are required' });
        }
        if (!PASSWORD_REGEX.test(newPassword)) {
            return res.status(400).json({ error: 'password must be at least 6 characters with letters and numbers' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'passwords do not match' });
        }

        await resetPassword(token, newPassword);
        res.status(200).json({ success: true, message: 'Password has been reset. You can now log in with your new password.' });
    } catch (err) {
        if (err.code === 'INVALID_TOKEN' || err.code === 'TOKEN_EXPIRED') {
            return res.status(400).json({ error: err.message });
        }
        console.error('resetPassword error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
}