import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../../config/firebase.js';
import { sendPasswordResetEmail } from '../../config/mailer.js';

const usersRef = db.collection('users');
const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function signToken(uid, role) {
    return jwt.sign({ uid, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function toPublicUser(uid, data) {
    return { uid, name: data.name, email: data.email, role: data.role };
}

export async function registerUser({ name, email, password }) {
    const normalisedEmail = email.trim().toLowerCase();

    const existing = await usersRef.where('email', '==', normalisedEmail).limit(1).get();
    if (!existing.empty) {
        const err = new Error('Email already in use');
        err.code = 'EMAIL_IN_USE';
        throw err;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const docRef = await usersRef.add({
        name,
        email: normalisedEmail,
        passwordHash,
        role: 'passenger',
        createdAt: new Date(),
    });

    // Return user only — no token. The user must log in after registering.
    return toPublicUser(docRef.id, { name, email: normalisedEmail, role: 'passenger' });
}

export async function loginUser({ email, password }) {
    const normalisedEmail = email.trim().toLowerCase();

    const snapshot = await usersRef.where('email', '==', normalisedEmail).limit(1).get();
    if (snapshot.empty) {
        const err = new Error('Invalid credentials');
        err.code = 'INVALID_CREDENTIALS';
        throw err;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    const matches = await bcrypt.compare(password, data.passwordHash);
    if (!matches) {
        const err = new Error('Invalid credentials');
        err.code = 'INVALID_CREDENTIALS';
        throw err;
    }

    const user = toPublicUser(doc.id, data);
    const token = signToken(doc.id, data.role);
    return { user, token };
}

export async function forgotPassword(email) {
    const normalisedEmail = email.trim().toLowerCase();

    const snapshot = await usersRef.where('email', '==', normalisedEmail).limit(1).get();
    if (snapshot.empty) {
        // Don't reveal whether the email exists — return quietly.
        return;
    }

    const doc = snapshot.docs[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await doc.ref.update({ resetToken, resetTokenExpiry });

    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(normalisedEmail, resetLink);
}

export async function resetPassword(token, newPassword) {
    const snapshot = await usersRef.where('resetToken', '==', token).limit(1).get();
    if (snapshot.empty) {
        const err = new Error('Invalid or expired reset token');
        err.code = 'INVALID_TOKEN';
        throw err;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    if (!data.resetTokenExpiry || new Date(data.resetTokenExpiry) < new Date()) {
        const err = new Error('Invalid or expired reset token');
        err.code = 'TOKEN_EXPIRED';
        throw err;
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await doc.ref.update({
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
    });
}