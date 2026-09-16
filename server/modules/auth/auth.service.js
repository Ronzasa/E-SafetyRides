import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../config/firebase.js';

const usersRef = db.collection('users');
const SALT_ROUNDS = 10;

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

    const user = toPublicUser(docRef.id, { name, email: normalisedEmail, role: 'passenger' });
    const token = signToken(docRef.id, 'passenger');
    return { user, token };
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