import { getReviewQueue, updateReportStatus, getTrends, getOverviewStats, listUsers, getReportDetail } from './admin.service.js';

export async function reviewQueue(req, res) {
    try {
        const status = req.query.status || 'pending';
        const incidents = await getReviewQueue(status);
        res.status(200).json({ success: true, count: incidents.length, incidents });
    } catch (err) {
        console.error('reviewQueue error:', err);
        res.status(500).json({ success: false, error: 'Something went wrong' });
    }
}

export async function moderateReport(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, error: 'status is required' });
        }

        const result = await updateReportStatus(id, status);
        if (!result) {
            return res.status(404).json({ success: false, error: 'Incident not found' });
        }

        res.status(200).json({ success: true, incident: result });
    } catch (err) {
        if (err.code === 'INVALID_STATUS') {
            return res.status(400).json({ success: false, error: err.message });
        }
        console.error('moderateReport error:', err);
        res.status(500).json({ success: false, error: 'Something went wrong' });
    }
}

export async function trends(req, res) {
    try {
        const { area, platform, severity } = req.query;
        const data = await getTrends({ area, platform, severity });
        res.status(200).json({ success: true, ...data });
    } catch (err) {
        console.error('trends error:', err);
        res.status(500).json({ success: false, error: 'Something went wrong' });
    }
}

export async function overview(req, res) {
    try {
        const stats = await getOverviewStats();
        res.status(200).json({ success: true, ...stats });
    } catch (err) {
        console.error('overview error:', err);
        res.status(500).json({ success: false, error: 'Something went wrong' });
    }
}

export async function users(req, res) {
    try {
        const users = await listUsers();
        res.status(200).json({ success: true, count: users.length, users });
    } catch (err) {
        console.error('users error:', err);
        res.status(500).json({ success: false, error: 'Something went wrong' });
    }
}

export async function reportDetail(req, res) {
    try {
        const detail = await getReportDetail(req.params.id);
        if (!detail) {
            return res.status(404).json({ success: false, error: 'Incident not found' });
        }
        res.status(200).json({ success: true, ...detail });
    } catch (err) {
        console.error('reportDetail error:', err);
        res.status(500).json({ success: false, error: 'Something went wrong' });
    }
}