import { registerUser, loginUser } from './auth.service.js';

export async function register(req, res) {
    try {
        const { name, email, password, confirmPassword } = req.body;

        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({ error: 'name, email, password and confirmPassword are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'password must be at least 6 characters' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'passwords do not match' });
        }

        const { user, token } = await registerUser({ name, email, password });
        res.status(201).json({ user, token });
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
    // req.user is set by the auth middleware we'll write next
    res.status(200).json({ user: req.user });
}