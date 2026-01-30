const asyncHandler = require('../utils/asyncHandler');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Filter by user role or specific user ID
    const filter = {
        $or: [
            { recipient_role: { $in: req.user.roles } },
            { recipient_id: req.user.id }
        ]
    };

    const notifications = await Notification.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1 });

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ ...filter, is_read: false });

    return res.status(200).json(
        ApiResponse.success({
            notifications,
            unread_count: unreadCount,
            pagination: {
                page,
                limit,
                total
            }
        })
    );
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
        return res.status(404).json(
            ApiResponse.error('Notification not found', 404)
        );
    }

    notification.is_read = true;
    await notification.save();

    return res.status(200).json(
        ApiResponse.success(notification, 'Notification marked as read')
    );
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = asyncHandler(async (req, res) => {
    const filter = {
        $or: [
            { recipient_role: { $in: req.user.roles } },
            { recipient_id: req.user.id }
        ],
        is_read: false
    };

    await Notification.updateMany(filter, { is_read: true });

    return res.status(200).json(
        ApiResponse.success(null, 'All notifications marked as read')
    );
});

// Helper function to create notification (internal use)
exports.createNotificationInternal = async (data) => {
    try {
        const notification = await Notification.create({
            _id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            ...data,
            created_at: new Date()
        });

        // --- [REAL-TIME EMIT] ---
        const { emitToRole, emitToUser } = require('../utils/socket');

        if (notification.recipient_id) {
            emitToUser(notification.recipient_id, 'new_notification', notification);
        } else if (notification.recipient_role) {
            emitToRole(notification.recipient_role, 'new_notification', notification);
        }

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};
